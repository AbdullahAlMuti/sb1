# Plan — Auth → Plan → Checkout → Dashboard Flow Hardening

> Status: **Awaiting approval** · Branch: `launch-fixes-phase1` · Date: 2026-06-15
> Decisions locked: (1) adopt spec URLs `/signup`, `/checkout`, `/payment-success`, `/payment-cancelled` with redirects from old paths; (2) allow no-plan signup (account first → `/pricing`); (3) consolidate the dashboard guard onto `check-subscription-v2` (server) with profile flags as fast fallback.
> _Prior contents of this file (marketing homepage redesign plan) are preserved in git: `git show HEAD:tasks/plan.md`._

---

## 1. Current architecture (as-built)

### Routes (`apps/web/src/App.tsx`)
- Public: `/`, `/pricing`, `/auth` (login + legacy signup shell), `/register` (real signup), `/verify-email`.
- Billing: `/choose-plan` (plan picker + auto-checkout), `/checkout/success` (verification poller), `/checkout/*` → redirect `/dashboard`, `/payment-required` → `/choose-plan`.
- Protected: `/dashboard` + `/dashboard/ebay/*` (all wrapped in `ProtectedRoute` → `DashboardLayout`/`EbayLayout`). Shopify routes redirect to eBay (eBay-only scope).
- `/onboarding`, `/admin/*` (external redirect).

### Guard (`packages/auth/src/ProtectedRoute.tsx`)
- `canAccessDashboard(user, profile, isAdmin)` = `selected_plan_id && payment_status∈{paid,succeeded} && subscription_status==='active'`.
- Reads **profile flags only**. Order: loading → unauth→`/auth` → goal routing → email-verify gate → billing gate (`/choose-plan` or `/choose-plan?auto=true` if `pending_plan_id`) → admin routing.

### State / hooks
- `useAuth` (`packages/auth/src/hooks/useAuth.tsx`): session + `profile` (from `profiles`). `signIn/signUp/verifyOtp/refreshProfile`.
- `useSubscription` (`packages/auth/src/hooks/useSubscription.tsx`): calls `check-subscription-v2`, returns `access ∈ none|trial|trial_expired|active|past_due`; module-level 5-min cache; `createCheckout()`/`openCustomerPortal()`.
- `usePlans` (`packages/api-client`): live plans, `getPlanByName`/`getPlanById`.

### Backend (Supabase Edge Functions) — already production-grade
- `auth-otp`: OTP email signup/verify/resend, rate-limited; on verify sets `pending_plan_id` from metadata, seeds `payment_status='unpaid'`, `subscription_status='inactive'`.
- `create-checkout`: validates `planId` (UUID), price **from DB**, resolves/creates Stripe customer, one-trial-per-account, coupon validation. Success → `/checkout/success?plan=<id>[&mode=payment]`, cancel → `/#pricing`.
- `stripe-webhook`: **signature-verified, idempotent** (`stripe_events`); handles checkout/subscription/invoice events; sets profile `payment_status/subscription_status/selected_plan_id/current_period_*`.
- `check-subscription-v2`: authoritative live compute (Stripe + `user_plans`), lazy trial-expiry flip.

**Conclusion:** the backend (payment creation, webhook verification, subscription truth) is solid. Breakage is concentrated in **frontend redirect orchestration** plus a few security/UX defects.

---

## 2. What is actually broken

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| B1 | 🔴 Security | Login form pre-filled with hardcoded admin creds. | `pages/auth/Auth.tsx:42-43` |
| B2 | 🔴 UX | Login clears `selectedPlan*` from localStorage every login → **plan intent lost**; login always routes to dashboard then bounces to `/choose-plan` (no direct→checkout). | `Auth.tsx:106-113` |
| B3 | 🟠 UX | Two signup paths: `Auth.tsx` legacy `mode='signup'` shell + dead `processCheckoutForNewUser` vs real `Register.tsx`. Confusing, duplicate plan handling. | `Auth.tsx:74-150,484-759` |
| B4 | 🟠 UX | `Register.tsx` bounces to `/pricing` *before* signup when no plan (contradicts Flow A). Competing redirect effects + verify handler race. | `Register.tsx:64-85,160-169` |
| B5 | 🟠 Spec | Requested URLs missing: no `/signup`, `/checkout?plan=`, `/payment-success`, `/payment-cancelled`. `/checkout/*`→`/dashboard`. | `App.tsx:155-160` |
| B6 | 🟠 Correctness | `CheckoutSuccess` after 6 retries **fakes success → dashboard** even when never activated (then bounces). Failed/delayed payments mishandled. | `CheckoutSuccess.tsx:45-54` |
| B7 | 🟡 Correctness | Plan identity inconsistent: name / id / slug all used; `?plan=` undefined. | PricingSection, Register, Auth |
| B8 | 🟡 Correctness | Two truth sources; guard uses profile flags only → expired trial can linger "active" until webhook/poll. | ProtectedRoute vs useSubscription |
| B9 | 🟡 Robustness | `create-checkout` doesn't short-circuit when user already has an active subscription (duplicate checkout). | `create-checkout/index.ts` |
| B10 | 🟢 Polish | `/choose-plan?auto=true` auto-checkout effect can double-fire. | `PaymentRequired.tsx:42-54` |

---

## 3. Target flows

```
Flow A (no plan):   /signup → create acct → verify → /pricing → pick → /checkout?plan=ID → Stripe → /payment-success → dashboard
Flow B (plan-first):/pricing → pick → /signup?plan=ID → create acct → verify → /checkout?plan=ID → Stripe → /payment-success → dashboard
Flow C (logged-in, unpaid): guard → has intent? /checkout?plan=ID : /pricing
Flow D (logged-in, active): dashboard allowed; /pricing viewable; /signup,/checkout?active → dashboard
Flow E (manual /dashboard): logged-out→/signup ; unpaid→checkout/pricing ; active→allow
Cancel: Stripe cancel_url → /payment-cancelled (retry / back to pricing)
```

- **Canonical plan id:** URLs carry `?plan=<slug|name|id>`; client resolves via `usePlans` and always sends UUID `plan.id` to `create-checkout` (re-validated server-side). Intent fallback chain: **URL `?plan` → `sessionStorage('selectedPlan')` → `profile.pending_plan_id`**. Use `sessionStorage` (not `localStorage`) for plan intent.
- **Single source of truth for access:** `check-subscription-v2.access`; guard grants when `access ∈ {active, trial}`. Profile flags = fast pre-check only, never sole authority. Server (RLS / gating RPCs / webhook) remains the real boundary.

---

## 4. Work slices (vertical, each independently shippable)

### Phase 0 — Security hotfix (ship first)
- **T0.1** Remove hardcoded creds in `Auth.tsx` (default `email`/`password` to `''`).

**◇ CHECKPOINT 0:** typecheck + login form renders empty. ✋

### Phase 1 — Plan-intent module (foundation)
- **T1.1** New `packages/auth/src/lib/planIntent.ts`: `setPlanIntent`, `getPlanIntent`, `clearPlanIntent` (over `sessionStorage`, key `selectedPlan`), + `resolvePlanToken(token, plans)` → `Plan|null` (id → slug → name order).
- **T1.2** Swap ad-hoc `localStorage.selectedPlan*` reads/writes in PricingSection, Register, Auth, CheckoutSuccess, PaymentRequired to the module; one-time migrate+clear legacy localStorage keys.

**◇ CHECKPOINT 1:** unit tests for resolver/intent; typecheck. ✋

### Phase 2 — Routing skeleton (spec URLs + redirects)
- **T2.1** `App.tsx`: `/signup`→`Register` (preserve `?plan`); `/register`→`Navigate /signup` (preserve query/state); `/checkout`→new `Checkout` (P4); `/payment-success`→`CheckoutSuccess`; `/checkout/success`→`Navigate /payment-success` (preserve query); `/payment-cancelled` & `/payment-failed`→new `PaymentCancelled` (P4). Keep `/choose-plan` for trial-expired/no-plan gate; `/pricing` is the canonical picker.
- **T2.2** `create-checkout`: success_url → `/payment-success?...`; cancel_url → `/payment-cancelled`.

**◇ CHECKPOINT 2:** new paths resolve; old paths redirect with query preserved. ✋

### Phase 3 — Auth pages cleanup (Flows A & B)
- **T3.1** `Register.tsx`: read plan via `getPlanIntent()`/`?plan`; **don't** bounce to `/pricing` when absent (Flow A); persist intent on mount if `?plan`. Single post-auth helper `routeAfterAuth(profile)`: active→dashboard; else intent→`/checkout?plan=ID`; else `/pricing`. Remove duplicate effects + `/choose-plan?auto=true` jump.
- **T3.2** `Auth.tsx`: delete legacy signup shell, `processCheckoutForNewUser`, selected-plan badge. Login success → `routeAfterAuth(profile)` (no dashboard bounce, no plan-intent wipe).
- **T3.3** "Sign up" links (web + marketing navbars, pricing) → `/signup` carrying `?plan` where known.

**◇ CHECKPOINT 3:** Flow A & B walked manually in dev. ✋

### Phase 4 — Checkout + result pages (page-based, no modals)
- **T4.1** New `pages/billing/Checkout.tsx` at `/checkout`: require auth (else `/signup?plan=…`); resolve `?plan`; invalid/missing→`/pricing`; if active→`/dashboard`; else `createCheckout(plan.id, interval)` → `window.location=url`; inline loading; error→toast+`/pricing`. No modal.
- **T4.2** New `pages/billing/PaymentCancelled.tsx`: "Try again" (`/checkout?plan=lastIntent`) + "Choose another plan" (`/pricing`).
- **T4.3** `CheckoutSuccess.tsx` (`/payment-success`): on retry-exhaustion **don't fake success** — route to `/checkout?plan=…` or `/choose-plan` with "payment not confirmed yet" message; proceed to dashboard only when `access` is active/trial. Keep webhook-delay retry/loading.

**◇ CHECKPOINT 4:** success / cancel / delayed-webhook paths each verified. ✋

### Phase 5 — Guard consolidation + duplicate-checkout guard (Flows C/D/E + security)
- **T5.1** `ProtectedRoute.tsx`: consume `useSubscription` (`access`, loading). Grant when `isAdmin || access∈{active,trial} || canAccessDashboard(profile)`. While access loading & profile inconclusive → spinner (no premature bounce). Unpaid redirect: intent/`pending_plan_id`→`/checkout?plan=ID` else `/pricing`. Keep email-verify + goal routing.
- **T5.2** `create-checkout`: before session create, detect active/trialing sub (query `user_plans`/profile flags or reuse resolution); if active & not a plan *change* → `{error, redirect:'/dashboard'}` (B9).
- **T5.3** `PaymentRequired.tsx`: ref-guard auto-checkout against double-fire (B10).

**◇ CHECKPOINT 5:** Flows C/D/E verified; duplicate-checkout blocked; no `/dashboard`↔`/checkout` loop. ✋

### Phase 6 — Verification & polish
- **T6.1** Tests: unit (resolver, `routeAfterAuth`, `canAccessDashboard`) + guard/routing matrix for the 12 edge cases.
- **T6.2** Manual matrix + `npm run build` + `typecheck` + `lint`.
- **T6.3** Update memory + plan "results"; note residual risks.

**◇ CHECKPOINT 6:** green build + matrix → ready to merge. ✋

---

## 5. Files to change
- `apps/web/src/App.tsx` — routes/redirects.
- `apps/web/src/pages/auth/Auth.tsx` — strip legacy signup, fix login redirect, remove creds.
- `apps/web/src/pages/auth/Register.tsx` — Flow A/B, single redirect.
- `apps/web/src/pages/billing/Checkout.tsx` — **new**.
- `apps/web/src/pages/billing/PaymentCancelled.tsx` — **new**.
- `apps/web/src/pages/billing/CheckoutSuccess.tsx` — no fake success.
- `apps/web/src/pages/billing/PaymentRequired.tsx` — auto-checkout guard.
- `apps/web/src/components/PricingSection.tsx` (+ web/marketing navbars) — `/signup?plan=`.
- `packages/auth/src/ProtectedRoute.tsx` — guard consolidation.
- `packages/auth/src/lib/planIntent.ts` — **new**.
- `supabase/functions/create-checkout/index.ts` — success/cancel URLs + active-sub guard.
- Tests under `packages/auth` / `apps/web`.

## 6. Backend / DB
- No schema migration expected — `profiles` already has `selected_plan_id, pending_plan_id, payment_status, subscription_status, current_period_*, subscription_id, stripe_customer_id`; `user_plans` carries period/trial; `stripe_events` for idempotency. Verify columns with `list_tables` before Phase 5; add migration only if something is missing.
- Edge redeploys: `create-checkout` only.

## 7. Edge cases → handling
1. Signup no plan → account → `/pricing` (T3.1). 2. Plan-first → intent preserved → `/checkout` (T1,T3). 3. Closes signup → intent in sessionStorage (T1). 4. Login after select → `routeAfterAuth`→`/checkout` (T3.2). 5. Change plan pre-pay → new `?plan` overrides intent + `pending_plan_id` (create-checkout). 6. Checkout w/o plan → `/pricing` (T4.1). 7. Manual `/dashboard` unpaid → checkout/pricing (T5.1). 8. Payment fails → webhook past_due/none; no fake success; guard blocks (T4.3,T5). 9. Cancel → `/payment-cancelled` (T2,T4.2). 10. Webhook delay → retry/loading; proceed only on real active (T4.3). 11. Active user hits signup/pricing/checkout → dashboard (T3,T4,T5.2). 12. Expired/cancelled → access≠active → blocked (T5.1 + lazy flip).

## 8. Security guarantees
- Dashboard authority = server (`check-subscription-v2` + RLS + gating RPCs), never client state (T5.1).
- Price/amount always from DB in `create-checkout`; client `priceId` only cross-checked (existing).
- Webhook signature verified + idempotent (existing).
- No bypass via URL/query/localStorage: guard re-validates server-side; intent only decides *where to send*, never *grants access* (T1,T5).
- Remove leaked admin creds (T0.1). Block duplicate checkout for active subs (T5.2).

## 9. Testing checklist (Phase 6)
Signup w/o plan · signup w/ plan · login no sub · login active · checkout valid · checkout no plan · payment success · payment fail · payment cancel · webhook success · webhook fail/delay · dashboard guard · redirect-loop check · mobile/responsive · `npm run build` + `typecheck` + `lint`.

## 10. Residual risks / TODO
- Stripe **test-mode** keys needed to exercise real success/cancel/webhook locally; otherwise simulate via profile-flag toggles.
- `check-subscription-v2` hits Stripe on cold cache → first-dashboard latency; mitigated by 5-min cache + profile fast-path.
- Plan token collisions if a `name` equals another's `slug`; resolver order (id→slug→name) documented — verify plans have unique slugs.

## 12. Deliverables / results (completed 2026-06-15)

**What was broken → fixed:** B1 hardcoded admin creds (removed) · B2 login wiped plan intent + dashboard-bounce (routeAfterAuth, intent preserved) · B3 dual signup paths (legacy Auth signup shell deleted) · B4 pre-signup /pricing bounce + racing effects (single effect, Flow A) · B5 missing spec URLs (added + redirects) · B6 fake checkout success (pending state) · B7 inconsistent plan id (planIntent + resolvePlanToken) · B8 stale expired-trial access (server-authoritative guard) · B9 duplicate checkout (409 guard) · B10 auto-checkout double-fire (ref guard).

**Files changed (web):** `App.tsx`, `pages/auth/Auth.tsx`, `pages/auth/Register.tsx`, `pages/billing/{Checkout,PaymentCancelled,CheckoutSuccess,PaymentRequired}.tsx`, `components/{PricingSection,Navbar,CTASection,HeroSection}.tsx`, `.claude/launch.json`.
**Files changed (packages/auth):** `ProtectedRoute.tsx`; new `lib/{planIntent,routeAfterAuth,dashboardAccess}.ts` (+ `.test.ts` each).
**Files changed (edge):** `supabase/functions/create-checkout/index.ts` (URLs + active-sub 409) — **not redeployed**.

**Verification:** 20/20 unit tests · typecheck (3 apps) green · lint 0 errors · full build green · live route checks for Flows A/B/E + cancel/retry + unauth guard (Phases 2–5).

**Route flow:** `/signup[?plan] → verify → (plan? /checkout?plan : /pricing) → Stripe → /payment-success → dashboard`; cancel → `/payment-cancelled`; guard: unauth→/auth, unpaid→/checkout|/pricing, active→dashboard, expired-trial/past_due→blocked.

**Remaining risks / TODO:** (1) ~~deploy ordering~~ **RESOLVED** — `create-checkout` return URLs use legacy `/checkout/success` + `/#pricing` (work on both old prod + new web via the redirect aliases), so the function is safe to redeploy in any order; only the additive 409 guard changes behaviour. (2) Authed + Stripe-test-mode paths (real checkout→Stripe, active→dashboard, invalid-plan→pricing, success pending-state, 409 dup-guard) not E2E'd in sandbox — deterministic, exercise with test keys. (3) On a `check-subscription-v2` transient error, an expired-trial user with stale profile flags can briefly pass the guard (data still RLS-protected) — accepted trade-off favoring paying customers. (4) All phase work is uncommitted (branch already had ~104 uncommitted files); only the sentry CI fix `eb25e1f` is committed/pushed.

---

## 11. Human review — confirm before build
- Approve slicing + checkpoints above.
- Confirm OK to add canonical `/signup`, `/checkout`, `/payment-success`, `/payment-cancelled` and redirect legacy paths.
- Confirm OK to redeploy `create-checkout` (changes success/cancel URLs + adds active-sub guard).
- Confirm whether to implement straight through (auto) or pause at each ◇ checkpoint for review.
