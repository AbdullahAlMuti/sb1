# Auth & Billing — Production Readiness Implementation Plan

**Goal:** take the audit findings in [`auth_billing_audit_report.md`](auth_billing_audit_report.md) from **5.0/10 → 10/10** and ship a 100% production-ready auth + billing flow.

**Validation note:** I re-checked every finding against the *current* code on branch `launch-fixes-phase1`. All 12 are real, with two caveats already partially mitigated (noted inline). The onboarding flow was removed in commit `1f03cc9`, so any `onboarding_completed` / `/onboarding` routing is now dead weight — folded into the plan.

---

## Execution order (4 phases)

Security first (exploitable now), then the billing loop (blocks paying users), then UX. Each task lists **file**, **change**, and **acceptance criteria**. A single worker round can land all of it; ship as one PR off `launch-fixes-phase1`.

---

## Phase 1 — Security & Hardening (Critical / High) 🔴

These are exploitable by any authenticated user today. **Do these first.**

### 1.1 — Lock down `create_listing_with_variations` RPC (Critical #3)
- **File:** new migration `supabase/migrations/<ts>_lock_create_listing_rpc.sql`
- **Current state (verified):** [`20260611090100_create_listing_credit_deduction.sql`](supabase/migrations/20260611090100_create_listing_credit_deduction.sql) defines it `SECURITY DEFINER` with **no caller check**; [`20260614050000_harden_function_security.sql`](supabase/migrations/20260614050000_harden_function_security.sql) only pins `search_path` — EXECUTE is still granted to `authenticated`. Any logged-in user can `rpc('create_listing_with_variations', { p_user_id: <victim> })` to write listings / drain credits on another account.
- **Change:**
  ```sql
  REVOKE EXECUTE ON FUNCTION public.create_listing_with_variations(uuid, jsonb, jsonb)
    FROM public, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.create_listing_with_variations(uuid, jsonb, jsonb)
    TO service_role;
  ```
  Plus belt-and-suspenders inside the function body, right after `BEGIN`:
  ```sql
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  ```
- **Verify caller:** confirm the edge function (`create-listing`) invokes this via the **service-role** client, not the user JWT. If it uses the user client, switch it to `SUPABASE_SERVICE_ROLE_KEY`. (Grep `create_listing_with_variations` in `supabase/functions/`.)
- **Acceptance:** a user JWT calling the RPC via PostgREST returns `42501`; the edge function still creates listings; credit deduction unchanged.

### 1.2 — Block billing-column writes on `profiles` (Critical #2)
- **File:** new migration `supabase/migrations/<ts>_protect_profile_billing_columns.sql`
- **Current state (verified):** policy in [`20260604094811_audit_remediation_p1.sql`](supabase/migrations/20260604094811_audit_remediation_p1.sql) is `USING (auth.uid()=id) WITH CHECK (auth.uid()=id)` — no column restriction. A user can `update({ credits: 999999, payment_status:'paid', subscription_status:'active' })`.
- **Change:** add a `BEFORE UPDATE` trigger that rejects changes to protected columns unless the row is being written by `service_role`:
  ```sql
  CREATE OR REPLACE FUNCTION public.guard_profile_billing_columns()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF NEW.credits IS DISTINCT FROM OLD.credits
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.pending_plan_id IS DISTINCT FROM OLD.pending_plan_id
       OR NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot modify billing/role columns' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END $$;

  CREATE TRIGGER trg_guard_profile_billing
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_billing_columns();
  ```
- **Pre-step:** `list_tables` / inspect `profiles` to confirm the exact protected column names (`credits`, `payment_status`, `subscription_status`, `pending_plan_id`, `role`) — adjust the trigger to the real schema. Note `pending_plan_id` is set client-side during signup; if so, **exclude it** from the guard or move that write server-side (see 2.2).
- **Acceptance:** user UPDATE touching a billing column → `42501`; updating `display_name`/`settings` still works; webhook (service role) still updates billing.

### 1.3 — Revoke EXECUTE on metadata-leaking getters (Low #11)
- **File:** same/new migration.
- **Change:** `REVOKE EXECUTE ... FROM public, anon, authenticated` (grant `service_role` only) on `is_user_blocked(uuid)`, `is_subscription_expired(uuid)`, `get_user_plan_name(uuid)` — OR add `auth.uid()=user_id` guards if the client legitimately calls them. Grep usage first; if unused client-side, just revoke.
- **Acceptance:** no client path breaks; arbitrary-UUID enumeration returns permission denied.

### 1.4 — Add missing SELECT RLS policies (Medium #6)
- **Files:** new migration; verify against [`Settings.tsx`](apps/web/src/pages/dashboard/Settings.tsx), [`ExtensionConnect.tsx`](apps/web/src/pages/dashboard/ExtensionConnect.tsx).
- **Change:**
  ```sql
  CREATE POLICY "read own sessions" ON public.extension_sessions
    FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
  CREATE POLICY "read feature flags" ON public.app_feature_flags
    FOR SELECT TO authenticated USING (true);
  ```
  Confirm real table/column names (`extension_sessions` vs `app_feature_flags`) via `list_tables`.
- **Acceptance:** active-sessions list and feature flags populate in the dashboard instead of returning empty.

### 1.5 — Extension AI gate for non-admin users (Critical #4)
- **Files:** [`apps/extension/content_scripts/amazon_injector.js:3560-3575`](apps/extension/content_scripts/amazon_injector.js), [`apps/extension/background/alarm-handler.js:23-50`](apps/extension/background/alarm-handler.js)
- **Current state (verified):** `amazon_injector.js` reads `geminiApiKey` from `chrome.storage.local` and **calls Gemini directly client-side**; if the key is missing (non-admins can't read `admin_settings`) it prints `"Error: Missing API Key. Check Admin settings."` and aborts. This is not just a stray check — the whole path is a client-side Gemini call.
- **Change:** route title generation through the existing secure `/generate-titles` edge function instead of calling Gemini from the content script:
  1. Replace the direct Gemini call + `if (!apiKey)` gate with a `chrome.runtime.sendMessage({ type: 'GENERATE_TITLES', ... })` to the background `message-router`, which already forwards to `/generate-titles` (uses Deno env `GEMINI_API_KEY`, validates subscription server-side).
  2. Gate on a valid `saasToken` (authenticated session) rather than a local API key.
  3. Keep the admin-only `geminiApiKey` local path as an optional override if present, but never required.
- **Acceptance:** a standard (non-admin) paid user can generate titles in the panel/injector; CAPTCHA/error propagation unchanged; no API key ever shipped to client storage for normal users.

---

## Phase 2 — Billing & Checkout Loop (Critical / High) 🟠

Stops the double-payment loop and the post-purchase lockout.

### 2.1 — Reduce cache TTL when access is `none` (High #5)
- **File:** [`packages/auth/src/hooks/useSubscription.tsx:55,91-96`](packages/auth/src/hooks/useSubscription.tsx)
- **Current state (verified):** flat `CACHE_TTL = 300_000`; a `'none'` result is cached for 5 min, locking a just-paid user out until hard refresh.
- **Change:** use a short TTL when the cached `access` is `'none'`:
  ```ts
  const ACTIVE_TTL = 300_000;
  const PENDING_TTL = 10_000;
  const ttl = _cachedState?.access && _cachedState.access !== 'none' ? ACTIVE_TTL : PENDING_TTL;
  if (!force && _cachedState && now - _lastFetch < ttl) { notifyListeners(); return; }
  ```
  Apply the same `ttl` to the polling `setInterval` (line 179) so unpaid users re-poll every 10s.
- **Acceptance:** after webhook lands, dashboard unlocks within ≤10s with no manual refresh; active subscribers still cached 5 min (no request storm).

### 2.2 — Clear stale plan token after payment / cancel (Critical #1)
- **Files:** [`CheckoutSuccess.tsx`](apps/web/src/pages/billing/CheckoutSuccess.tsx), [`PaymentCancelled.tsx`](apps/web/src/pages/billing/PaymentCancelled.tsx), [`stripe-webhook/index.ts`](supabase/functions/stripe-webhook/index.ts), [`ProtectedRoute.tsx:178`](packages/auth/src/ProtectedRoute.tsx)
- **Current state (verified):** `CheckoutSuccess` already calls `clearPlanIntent()` **on success** ✓ — but only clears `sessionStorage`. The guard at `ProtectedRoute.tsx:178` still falls back to `profile.pending_plan_id`, which the success page never clears. So a reload-before-webhook → guard sees `pending_plan_id` → `/checkout` → `Checkout.tsx` fires `createCheckout` again (the `startedRef` guard only spans one mount) → **second Stripe session / double-charge risk**.
- **Change:**
  1. **Webhook (authoritative):** in `stripe-webhook` on `checkout.session.completed` / subscription activation, `UPDATE profiles SET pending_plan_id = NULL` (service role) alongside the plan upsert. This is the real fix — kills the loop at the source.
  2. **Checkout.tsx guard:** don't auto-start a session if one was started this session. Add a short-lived `sessionStorage` flag (e.g. `checkout_started_<planId>`) checked before `createCheckout`, cleared on `/payment-cancelled` and on success. Prevents re-entry across remounts/navigations while the webhook is in flight.
  3. **PaymentCancelled.tsx:** on mount, clear the started flag (already keeps intent for "Try again" — that's correct). Optionally clear `pending_plan_id` via a small authenticated call only if product wants cancel to fully reset; default: leave intent for retry.
  4. **CheckoutSuccess.tsx:** keep `clearPlanIntent()`; it covers the sessionStorage half.
- **Acceptance:** reloading `/payment-success` or hitting `/dashboard` mid-webhook never starts a second Stripe session; once webhook lands user goes to dashboard; `409 already active` path no longer reachable from normal navigation.

### 2.3 — Atomic upsert for `user_plans` (Medium #7)
- **Files:** [`stripe-webhook/index.ts:163-185,296-319`](supabase/functions/stripe-webhook/index.ts), [`check-subscription-v2/index.ts:251-336`](supabase/functions/check-subscription-v2/index.ts), [`_shared/trial-activation.ts:89-99`](supabase/functions/_shared/trial-activation.ts)
- **Current state:** three concurrent SELECT-then-INSERT paths can collide on `user_plans_user_id_unique` → `23505` → webhook 500.
- **Change:** replace each SELECT-then-INSERT/UPDATE with `.upsert(payload, { onConflict: 'user_id' })`. Confirm the unique constraint is on `user_id` so `onConflict` matches.
- **Acceptance:** concurrent webhook + self-heal no longer throws `23505`; webhook returns 200 under race; exactly one `user_plans` row per user.

---

## Phase 3 — Auth UX & Routing (High / Medium) 🟡

### 3.1 — Fix password reset flow (Medium #8)
- **File:** [`apps/web/src/pages/auth/Auth.tsx`](apps/web/src/pages/auth/Auth.tsx)
- **Change:** extend `AuthMode` to include `'reset'`; parse `mode` from `useSearchParams()` on mount (not `location.state`); render a new-password form when `mode==='reset'` calling `supabase.auth.updateUser({ password })`; on success route to `/auth?mode=login` with a toast.
- **Acceptance:** clicking the reset link in the email lands on a working set-password form and completes the reset.

### 3.2 — Carry plan intent through auth navigation (High #9)
- **Files:** [`Register.tsx:~530`](apps/web/src/pages/auth/Register.tsx), [`Auth.tsx:44-54`](apps/web/src/pages/auth/Auth.tsx)
- **Change:** replace raw `<a href="/auth">` with React Router `<Link to={{ pathname:'/auth', search: location.search }}>`; when switching `/auth`↔`/signup` forward `location.search`. Keeps `?plan=pro`.
- **Acceptance:** selecting a plan then toggling login/signup preserves `?plan=` end-to-end into `/checkout`.

### 3.3 — Consolidate split-brain dashboard routes (Medium #10)
- **File:** [`apps/web/src/App.tsx`](apps/web/src/App.tsx)
- **Current state:** `ProtectedRoute` already redirects `/dashboard` → `/dashboard/ebay` when `!SHOPIFY_ENABLED` ✓. Remaining work is removing/aliasing the duplicate generic `/dashboard/*` page routes so only the eBay-namespaced set is canonical.
- **Change:** make generic `/dashboard/<page>` routes `<Navigate>` to `/dashboard/ebay/<page>` (keep Shopify routes behind `SHOPIFY_ENABLED`). Don't delete components — just alias routes (respects eBay-only scope, Shopify stays future-scope).
- **Acceptance:** every dashboard URL resolves to one canonical eBay layout; no duplicate-layout confusion; deep links still work.

### 3.4 — Remove dead onboarding routing
- **Files:** [`resolveNextStep.ts`](packages/auth/src/lib/resolveNextStep.ts), [`ProtectedRoute.tsx:184`](packages/auth/src/ProtectedRoute.tsx), [`CheckoutSuccess.tsx:45`](apps/web/src/pages/billing/CheckoutSuccess.tsx)
- **Current state:** onboarding flow removed in `1f03cc9`, but `ROUTE_ONBOARDING`, the `onboardingCompleted` input, and `profile.onboarding_completed` plumbing remain. Step 5 of `resolveNextStep` (`active|trial → onboarding done ? dashboard : /onboarding`) can strand users at a dead `/onboarding` route.
- **Change:** drop `onboardingCompleted` from `NextStepInput`, simplify step 5 to return `dashboardPath` directly, remove `ROUTE_ONBOARDING`, and delete the now-unused `onboarding_completed` reads. Update `resolveNextStep` unit tests.
- **Acceptance:** active/trial users route straight to the dashboard; no reference to `/onboarding` remains; tests green.

---

## Phase 4 — UX Polish (Low) 🟢

### 4.1 — Auto-skip goal selection (Low #12)
- **File:** [`Register.tsx:266-359`](apps/web/src/pages/auth/Register.tsx)
- **Change:** when `SHOPIFY_ENABLED === false`, default `selectedGoal='ebay'` and skip Step 1, starting at the Create Account form.
- **Acceptance:** signup opens on the account form; no redundant single-option click.

### 4.2 — Fix "Start free" copy (Low #13)
- **File:** [`apps/web/src/components/Navbar.tsx:113`](apps/web/src/components/Navbar.tsx)
- **Change:** relabel to "Start $1 Trial" (or "Get Started").
- **Acceptance:** navbar copy matches the paid $1 trial model.

---

## Verification & Deployment Gate

After implementation, in order:

1. **Unit tests:** `npm run test` in `packages/auth` (resolveNextStep), `apps/extension` (`node --test`).
2. **Typecheck + lint + build:** `npm run check:local` (the pre-release gate).
3. **Migrations:** apply Phase-1 migrations to a Supabase **branch** first (`create_branch` → `apply_migration` → smoke test RLS with a non-admin JWT) before merging to prod. Run `get_advisors` (security + performance) after — expect the flagged RPC/getter/RLS advisories to clear.
4. **Deploy order (matches memory `auth-billing-flow-redesign`):** deploy **web first**, then edge functions (`stripe-webhook`, `check-subscription-v2`, `create-listing`, `generate-titles`), then the migrations branch merge. `create-checkout` was edited but not yet redeployed — include it.
5. **Manual E2E (Stripe test mode):** signup → plan → checkout → pay → success → dashboard; then the loop case: pay, immediately reload `/payment-success` and hit `/dashboard` before webhook → must NOT re-charge; cancel → "Try again" resumes same plan; password reset email → set new password.
6. **Extension:** load `dist/extension-dev`, sign in as a **non-admin paid** user, generate a title → succeeds via `/generate-titles`.

---

## Score impact

| Dimension | Now | After |
|---|---|---|
| Authentication | 7.0 | 10 (3.1, 3.2, 3.4) |
| Billing & Stripe | 5.5 | 10 (2.1, 2.2, 2.3) |
| Security & Hardening | 4.5 | 10 (1.1–1.5) |
| **Overall** | **5.0** | **10 — Production Ready** |

**Critical path (do or do not ship):** 1.1, 1.2, 1.5, 2.1, 2.2. Everything else is required for 10/10 but the launch is *blocked* specifically on those five.
