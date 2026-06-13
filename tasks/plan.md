# Billing v2 — Dynamic Plan/Pricing/Onboarding System

> Phases A–F extend the existing billing system. Phases 0–6 (original billing foundation) are complete.

---

## Phase A — Schema

### A1 — Migration: new columns + tables
**Files:** `supabase/migrations/20260614000000_billing_v2_schema.sql`

Add to `plans`:
- `slug text UNIQUE`, `short_description`, `long_description`, `best_for`, `badge_text`, `cta_text`
- `is_recommended boolean DEFAULT false`, `is_public boolean DEFAULT true`
- `trial_requires_card boolean DEFAULT true`, `stripe_product_id text`
- `metadata jsonb DEFAULT '{}'`, `archived_at timestamptz`

Add to `profiles`: `onboarding_completed boolean DEFAULT false`

New tables: `plan_features`, `plan_prices`, `checkout_sessions` (see SPEC.md §3.A for full DDL).

RLS: SELECT open on plan_features/plan_prices; checkout_sessions owner+service.

**Acceptance:** Migration applies cleanly; all new columns/tables exist; typecheck green.

---

### A2 — Seed migration: backfill slugs + features + prices
**Files:** `supabase/migrations/20260614000001_billing_v2_seed.sql`

- Backfill `plans.slug` from name (lowercase, spaces→hyphens)
- Backfill `plans.badge_text` from `is_popular`, `is_recommended` from `is_popular`
- Backfill `plans.cta_text` per plan name
- Seed `plan_features` rows (5+ highlighted per plan) for Trial/Starter/Pro
- Seed `plan_prices` rows from existing price_monthly/price_yearly columns

**Depends on:** A1

---

### A3 — TypeScript types regen
**Files:** `packages/types/src/supabase.ts`

```bash
npx supabase@latest gen types typescript --project-id ojxzssooylmydystjvdo > packages/types/src/supabase.ts
npm run typecheck
```

**Depends on:** A1, A2

---

**Checkpoint A: migrations applied, types regenerated, typecheck green.**

---

## Phase B — Pricing page v2

### B1 — usePlans hook: fetch plan_features + new fields
**Files:** `packages/api-client/src/hooks/usePlans.tsx`

- Add `PlanFeature` interface (id, group_name, title, display_value, included, is_highlighted, sort_order, tooltip)
- Extend `Plan` with: `slug`, `short_description`, `best_for`, `badge_text`, `cta_text`, `is_recommended`, `plan_features: PlanFeature[]`
- Query: `.select('*, plan_features(*)')`, filter `is_public = true`, order by `sort_order`

**Acceptance:** `usePlans()` returns `plan_features[]` per plan; all new fields available; typecheck green.
**Depends on:** A3

---

### B2 — PricingSection: hero + upgraded plan cards + skeleton
**Files:** `apps/web/src/components/PricingSection.tsx`

- Add Hero: headline "Choose the plan that fits your selling workflow" + subheadline + "No free account" note
- Plan cards: use `badge_text` (chip), `short_description`, `best_for`, `cta_text` from DB
- Feature list: `plan.plan_features.filter(f => f.is_highlighted).slice(0, 5)` (replaces string `plan.features`)
- Skeleton: 3 card-sized placeholders while `isLoading`
- Keep existing `handlePlanSelect` / checkout flow 100% intact

**Acceptance:** Hero visible; cards show DB badge/cta/features; skeleton shows on load; checkout unchanged.
**Depends on:** B1

---

### B3 — Pricing page: comparison table + FAQ + trust
**Files:**
- `apps/web/src/components/pricing/ComparisonTable.tsx` (NEW)
- `apps/web/src/components/pricing/PricingFAQ.tsx` (NEW)
- `apps/web/src/components/pricing/TrustSection.tsx` (NEW)
- `apps/web/src/components/PricingSection.tsx` (compose them in)

**ComparisonTable:** groups by group_name; columns = plans; cells = display_value or ✓/✗.
**FAQ:** 6 items, accordion. **TrustSection:** Stripe badge, security bullets.

**Acceptance:** Table shows all group sections; FAQ accordion works; trust section visible.
**Depends on:** B1

---

**Checkpoint B: pricing page renders hero, feature cards (DB), comparison table, FAQ, trust.**

---

## Phase C — Onboarding wizard

### C2 — Onboarding page (/onboarding)
**Files:**
- `apps/web/src/pages/onboarding/Onboarding.tsx` (NEW)
- `apps/web/src/App.tsx` — add `/onboarding` route (ProtectedRoute, active/trial required)

5-step wizard: workspace name → use case → marketplace → supplier → done.
Saves to `profiles.onboarding_data jsonb` each step. Final step: `onboarding_completed = true` → navigate `/dashboard`.
Guard: if `onboarding_completed`, redirect to `/dashboard` on mount.

**Acceptance:** Route exists; steps render; completion sets DB flag; already-completed users skip to dashboard.
**Depends on:** A3

---

### C3 — CheckoutSuccess: redirect to /onboarding
**Files:** `apps/web/src/pages/billing/CheckoutSuccess.tsx`

After `isSuccess`, fetch `profiles.onboarding_completed`:
- `false` → `navigate('/onboarding', { replace: true })`
- `true` → `navigate('/dashboard', { replace: true })` (existing)

**Acceptance:** New checkout → /onboarding; returning user → /dashboard.
**Depends on:** C2

---

**Checkpoint C: checkout → /onboarding → /dashboard flow works end-to-end.**

---

## Phase D — Plan-first signup

### D1 — Register.tsx: redirect to /pricing if no plan
**Files:** `apps/web/src/pages/auth/Register.tsx`

Register already reads `plan` from query. Add guard:
```tsx
const hasSelectedPlan = query.get('plan') || location.state?.selectedPlan || localStorage.getItem('selectedPlan');
useEffect(() => {
  if (!hasSelectedPlan) navigate('/pricing', { replace: true });
}, []);
```

**Acceptance:** `GET /register` → redirects to /pricing; `GET /register?plan=starter` → renders normally.
**Depends on:** — (standalone)

---

### D2 — Auth.tsx: forward plan param on signup links
**Files:** `apps/web/src/pages/auth/Auth.tsx`

Audit "Sign up" CTAs on login page — ensure they carry `?plan=` param if one exists in localStorage or URL.

**Acceptance:** "Sign up" link on login page preserves plan selection.
**Depends on:** D1

---

**Checkpoint D: /register without plan param redirects to /pricing.**

---

## Phase E — checkout_sessions tracking

### E1 — create-checkout: INSERT checkout_session
**Files:** `supabase/functions/create-checkout/index.ts`

After `stripe.checkout.sessions.create(...)`, insert:
```ts
await supabase.from('checkout_sessions').insert({
  user_id: userId, email: userEmail,
  selected_plan_id: planId,
  stripe_checkout_session_id: stripeSession.id,
  status: 'pending',
  metadata: { plan_name: plan.name, interval: billingInterval ?? null },
});
```

**Acceptance:** Starting checkout creates a pending checkout_sessions row.
**Depends on:** A3

---

### E2 — stripe-webhook: UPDATE checkout_session to completed
**Files:** `supabase/functions/stripe-webhook/index.ts`

In `checkout.session.completed` handler, after activation:
```ts
await supabase.from('checkout_sessions')
  .update({ status: 'completed', updated_at: new Date().toISOString() })
  .eq('stripe_checkout_session_id', session.id);
```

**Acceptance:** After webhook fires, checkout_sessions row status → 'completed'.
**Depends on:** E1

---

**Checkpoint E: checkout_sessions rows created (pending) and updated (completed).**

---

## Phase F — Admin upgrades

### F1 — AdminPlans: new fields + archive
**Files:** `apps/admin/src/pages/AdminPlans.tsx`

Add to create/edit form: `slug`, `short_description`, `long_description`, `best_for`, `badge_text`, `cta_text`, `is_public`, `trial_requires_card`, `stripe_product_id`. Replace "Delete" with "Archive" (sets `archived_at`).

**Acceptance:** All new fields save correctly; Archive sets archived_at without deleting row.
**Depends on:** A3

---

### F2 — AdminPlanFeatures page
**Files:**
- `apps/admin/src/pages/AdminPlanFeatures.tsx` (NEW)
- `apps/admin/src/App.tsx` — route `/plans/:id/features`
- `apps/admin/src/pages/AdminPlans.tsx` — "Edit Features" link

Inline CRUD: add/edit/delete plan_features rows grouped by group_name. Toggle `included`, `is_highlighted`, edit `sort_order`.

**Acceptance:** Admin can add, edit, delete features per plan; changes appear on pricing page.
**Depends on:** A3

---

### F3 — AdminPlanPrices page
**Files:**
- `apps/admin/src/pages/AdminPlanPrices.tsx` (NEW)
- `apps/admin/src/App.tsx` — route `/plans/:id/prices`

CRUD for plan_prices: interval, amount, currency, stripe_price_id, is_active toggle.

**Acceptance:** Admin can manage plan prices; is_active toggle works.
**Depends on:** A3

---

### F4 — AdminSubscriptions page
**Files:**
- `apps/admin/src/pages/AdminSubscriptions.tsx` (NEW)
- `apps/admin/src/App.tsx` — route `/subscriptions`

Table of user_plans joined with profiles+plans. Filter by status. Search by email.

**Acceptance:** Admin can view all subscriptions with status filter and email search.
**Depends on:** A3

---

### F5 — AdminCheckoutSessions page
**Files:**
- `apps/admin/src/pages/AdminCheckoutSessions.tsx` (NEW)
- `apps/admin/src/App.tsx` — route `/checkout-sessions`

Table of checkout_sessions with status filter (pending/abandoned/completed).

**Acceptance:** Admin can identify abandoned checkouts.
**Depends on:** E1

---

**Checkpoint F: all admin pages render and data flows correctly.**

---

## Final verification

1. `npm run typecheck` green
2. `npm run build` green
3. Pricing page: hero, plan cards with DB features, comparison table, FAQ, trust section
4. `/register` without plan → `/pricing`
5. Checkout → `/onboarding` → complete → `/dashboard`
6. Admin `/plans/:id/features` → add feature → pricing page updates
7. DB: `checkout_sessions` shows pending then completed rows

---

# Dynamic Pricing & Subscription System — SellerSuit (ORIGINAL, COMPLETE)

## Context

SellerSuit needs a production-ready, DB-driven pricing system replacing the current half-wired billing (legacy hardcoded `check-subscription`, no plan seeds, free-plan fallbacks, unrouted admin CRUD). Final approved pricing: **Trial $1 one-time via Stripe Checkout for 7 days** (10 listings / 10 auto-orders / 10 AI credits, bulk lister only), **Starter $15/mo · $144/yr**, **Pro $49/mo · $470.40/yr** (is_popular). No free plan. Monthly/yearly toggle, Stripe Customer Portal, webhook-driven status sync with idempotency, feature gating for product-research features, admin plans CRUD, tests + docs.

Most infrastructure already exists and must be REUSED: `stripe-webhook` (idempotent via `stripe_events`), `create-checkout` (coupons, rate limits, customer reuse), `customer-portal`, `check-subscription-v2` (dynamic plan lookup), DB gating RPCs `create_listing_with_usage` / `create_auto_order_with_usage` (already enforce `trial_end`), DB-driven `PricingSection`, `useSubscription`/`usePlanLimits` hooks, and an **existing 884-line `AdminPlans.tsx`** that is merely unrouted.

Validated findings that shape the plan:
- `plans` RLS has SELECT-only policy → AdminPlans writes fail; need admin write policy via `has_role()`.
- `supabase/functions/create-stripe-price/` is a security hole (any authed user can create Stripe prices + write to plans) → delete, superseded by sync script.
- `coupon_usages` has no CREATE TABLE migration (fresh `db reset` is broken) → backfill.
- `plans.name` not unique; `user_plans.user_id` not unique → harden.
- `handle_new_user()` trigger (name='free', 20 credits) and `ensure-profile` (name='Trial', 20 credits) race and must change together → new users get NO plan.
- Webhook "downgrade to free" blocks and frontend `'free'` fallbacks (useSubscription, usePlanLimits, check-subscription-v2) must become an explicit `'none'` state.
- `PaymentRequired.tsx` exists but route disabled (`App.tsx:150`) → revive as `/choose-plan` gate.
- No pg_cron → trial expiry is reactive (gating RPCs already block; check-subscription-v2 adds lazy `status='expired'` flip).
- `profiles.plan_id` is text holding uuid — keep as-is this pass.
- Stripe API version `2025-08-27.basil` pinned — keep consistent.

## Key design decisions

**D1 — $1 trial:** new column `plans.stripe_price_id_one_time`. `create-checkout`: if `plan.is_trial` → `mode:'payment'` session with that price; eligibility = `profiles.trial_used_at IS NULL` + no historical trial `user_plans` + Stripe `customer.metadata.trial_used !== 'true'`; coupons skipped for trial. Webhook `checkout.session.completed` with `mode==='payment'`: atomic claim `UPDATE profiles SET trial_used_at=now() WHERE id=:uid AND trial_used_at IS NULL RETURNING id` (skip if no row → replay/double-purchase safe), then upsert `user_plans {status:'trialing', trial_end: now()+trial_duration_days(7), period bounds, usage zeroed}`, `profiles {plan_id, credits:10}`, `credit_transactions` plan_grant, set Stripe customer metadata `trial_used=true`.

**D2 — Trial expiry: reactive.** check-subscription-v2 returns `access: 'none'|'trial'|'trial_expired'|'active'|'past_due'` and lazily flips `status='expired'` when `trialing && trial_end < now()`. Frontend gates `none`/`trial_expired` to `/choose-plan`. DB RPCs already enforce server-side.

**D3 — Feature flags:** new `plans.feature_flags jsonb NOT NULL DEFAULT '{}'` with machine keys `{bulk_lister, price_monitoring, top_selling_products, ai_product_research, profitable_products, priority_support, max_ebay_accounts:int}`. `features` jsonb stays as display strings. New `useFeatureAccess()` hook + `<FeatureGate>` component; server-side flag check in `ai-product-research` edge function.

**D4 — Signup:** `handle_new_user()` + `ensure-profile` create profile with `plan_id: null, credits: 0`. Deploy together.

**D5 — Seed (idempotent migration):** dedupe → `UNIQUE(name)` → upsert `trial`/`starter`/`pro` (values table below) → `is_active=false` for all other plans (never delete).

| | trial | starter | pro |
|---|---|---|---|
| price_monthly / yearly | 1.00 / 0 | 15.00 / 144.00 | 49.00 / 470.40 |
| max_listings | 10 | 200 | 5000 |
| max_auto_orders | 10 | 50 | 500 |
| credits_per_month | 10 | 200 | 1500 |
| is_trial / days | true / 7 | — | — |
| is_popular / sort | — / 0 | — / 1 | true / 2 |
| feature_flags | bulk_lister; 1 acct | +price_monitoring, top_selling_products; 1 acct | all true; 5 accts |

**D6 — Stripe sync:** `scripts/stripe-sync-plans.mjs` (node, `STRIPE_SECRET_KEY` + `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, `--dry-run`). Idempotent: products by `metadata.sellersuit_plan`, reuse matching active prices, write ids back to `plans`. Prices are immutable — changes create new price, deactivate old.

**D7 — check-subscription-v2:** additive response: `plan.feature_flags`, `trial {is_trial, trial_end, trial_expired}`, `access`, `billing_interval`, `cancel_at_period_end`; `'free'`→`'none'`; prefer `profiles.stripe_customer_id` over email scan.

**D11 — Webhook:** branch on `session.mode`; add `invoice.payment_failed` → `status='past_due'`; replace both `name='free'` downgrade blocks with explicit no-plan (`plan_id:null, status:'canceled'`, credits 0). Idempotency/signature untouched.

## Tasks

### Phase 0 — Schema foundation
- **T0.0 (XS)** Copy this plan to `tasks/plan.md` + task checklist to `tasks/todo.md` (skill requirement).
- **T0.1 (M)** Migration `billing_foundation.sql`: coupon_usages CREATE TABLE IF NOT EXISTS + RLS; `plans.feature_flags`, `plans.stripe_price_id_one_time`; `profiles.trial_used_at`; dedupe + `UNIQUE(plans.name)`; unique index `user_plans.user_id`; "Admins can manage plans" RLS policy.
- **T0.2 (M)** Migration `seed_plans_v2.sql`: D5 seed + `handle_new_user()` rework (D4).
- **T0.3 (S)** Regenerate `packages/types/src/supabase.ts`; typecheck green.
- **Checkpoint A:** migrations apply clean; pricing page renders 3 plans.

### Phase 1 — Stripe products/prices
- **T1.1 (M)** `scripts/stripe-sync-plans.mjs` + `scripts/stripe-sync-plans.test.mjs` (node:test, fake Stripe client for dry-run planner). Run it: price ids populated, second run no-op.
- **T1.2 (S)** DELETE `supabase/functions/create-stripe-price/` (grep callers first); config.toml explicit entries for billing functions.

### Phase 2 — Backend billing core
- **T2.1 (M)** `supabase/functions/_shared/billing.ts` (resolveAccessState, isTrialEligible, price→plan resolution) + `billing.test.ts` (Deno tests).
- **T2.2 (M)** `create-checkout/index.ts`: trial branch per D1, 403s for ineligible, skip coupons for trial.
- **T2.3 (M)** `stripe-webhook/index.ts`: D11 (payment-mode activation, payment_failed, no-plan downgrade).
- **T2.4 (M)** `check-subscription-v2/index.ts` per D7 + lazy expiry; `ensure-profile/index.ts` per D4 (deploy together).
- **T2.5 (S)** DELETE legacy `supabase/functions/check-subscription/` after grep.
- **Checkpoint B:** Stripe test-mode: $1 trial activates exactly once (replay-safe), starter subscribe works, payment_failed → past_due, cancel → no-plan.

### Phase 3 — Pricing UI & plan gate
- **T3.1 (S)** `usePlans.tsx` (+feature_flags, one_time id), `useSubscription.tsx` (+trial/access/interval/cancel; `'none'` default).
- **T3.2 (M)** `PricingSection.tsx` monthly/yearly toggle + trial card ("$1 for 7 days"); `CheckoutDialog.tsx` interval pass-through, hide coupon for trial; `PaymentRequired.tsx` refresh.
- **T3.3 (M)** `App.tsx` revive `/choose-plan` + gate `none|trial_expired`; `usePlanLimits.tsx` remove free fallback (zero-limit locked state); `CheckoutSuccess.tsx` payment-mode copy + `checkSubscription(true)`.

### Phase 4 — Feature gating
- **T4.1 (S)** `packages/auth/src/hooks/useFeatureAccess.tsx` + `apps/web/src/components/FeatureGate.tsx`.
- **T4.2 (M)** Apply gates: ProductResearch (ai_product_research), ProfitableProducts, BestSellingItems (top_selling_products), Alerts (price_monitoring); server-side check in `ai-product-research` function (403).

### Phase 5 — Billing page & admin
- **T5.1 (M)** `Subscription.tsx` billing overhaul: plan, access/trial badge + countdown, interval, renewal, cancel-at-period-end, portal, upgrade cards.
- **T5.2 (M)** Admin: route `plans` → AdminPlans in `apps/admin/src/App.tsx`; AdminPlans feature_flags editor + one_time field + deactivate-instead-of-delete.

### Phase 6 — Tests, docs, cleanup
- **T6.1 (S)** Playwright pricing spec (3 plans render, toggle switches prices, trial $1, checkout redirect URL).
- **T6.2 (S)** `docs/BILLING.md`: env vars, runbook (migrate→seed→sync→webhook setup), webhook events list (incl. payment_failed), Portal config, test-mode walkthrough, gating guide, known behaviors (interval-switch usage reset, reactive expiry).
- **T6.3 (S)** Sweep `'free'` remnants across apps/packages/functions.

## Verification
- Per task: `npm run typecheck`, `npm run build`; `deno test supabase/functions/_shared/` (T2.1); `node --test scripts/` (T1.1).
- Checkpoint B via Stripe test mode (stripe listen or dashboard test events) + SQL row assertions.
- Final: Playwright spec, manual walkthrough from docs/BILLING.md, RLS negative test (non-admin plans UPDATE rejected).
- Migrations + function deploys via Supabase MCP (`apply_migration`, `deploy_edge_function`) against project `ojxzssooylmydystjvdo`; verify with `get_advisors` + `execute_sql` row checks.

## Risks
1. Legacy-plan production subscribers keep working (webhook resolves by price id); Stripe-side migration is a documented follow-up.
2. `handle_new_user` + `ensure-profile` must deploy together.
3. 5-min `useSubscription` cache → gates and CheckoutSuccess must force-refresh.
4. Admin price edits go live in realtime but require sync-script run for Stripe price — documented.
5. Interval switch resets usage counters (existing isNewPeriod branch) — accepted, documented.
