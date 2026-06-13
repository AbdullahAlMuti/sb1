# Billing v2 — Task Checklist

See [plan.md](plan.md) for full design decisions and acceptance criteria.

## Phase A — Schema
- [ ] A1 Migration `20260614000000_billing_v2_schema.sql` — new plan columns, plan_features, plan_prices, checkout_sessions, profiles.onboarding_completed
- [ ] A2 Seed migration `20260614000001_billing_v2_seed.sql` — backfill slugs/badge/cta, seed plan_features + plan_prices
- [ ] A3 Regenerate types + typecheck green
- [ ] Checkpoint A: migrations applied, all tables exist, typecheck green

## Phase B — Pricing page v2
- [ ] B1 usePlans hook — fetch plan_features, add slug/badge_text/cta_text/best_for/is_recommended to Plan type
- [ ] B2 PricingSection — hero, upgraded cards (badge/cta/best_for from DB), highlighted features, skeleton loading
- [ ] B3 ComparisonTable + PricingFAQ + TrustSection components
- [ ] Checkpoint B: pricing page renders hero, DB-driven cards, comparison table, FAQ, trust section

## Phase C — Onboarding wizard
- [ ] C2 Onboarding.tsx — 5-step wizard, saves to profiles, sets onboarding_completed, route /onboarding
- [ ] C3 CheckoutSuccess — redirect to /onboarding if !onboarding_completed, else /dashboard
- [ ] Checkpoint C: checkout → /onboarding → /dashboard flow

## Phase D — Plan-first signup
- [ ] D1 Register.tsx — redirect to /pricing if no plan param in URL/state/storage
- [ ] D2 Auth.tsx — forward plan param on signup CTAs
- [ ] Checkpoint D: /register without plan → /pricing

## Phase E — checkout_sessions tracking
- [ ] E1 create-checkout — INSERT checkout_session (pending) on session create
- [ ] E2 stripe-webhook — UPDATE checkout_session to completed on checkout.session.completed
- [ ] Checkpoint E: pending/completed rows in checkout_sessions

## Phase F — Admin upgrades
- [ ] F1 AdminPlans — add new fields (slug/short_desc/badge/cta/is_public etc), Archive button
- [ ] F2 AdminPlanFeatures — new page /plans/:id/features with inline CRUD
- [ ] F3 AdminPlanPrices — new page /plans/:id/prices with interval/amount/stripe_price_id
- [ ] F4 AdminSubscriptions — new page /subscriptions with filter+search
- [ ] F5 AdminCheckoutSessions — new page /checkout-sessions with status filter
- [ ] Checkpoint F: all admin pages render, plan_features manageable

## Final verification
- [ ] npm run typecheck green
- [ ] npm run build green
- [ ] Pricing page: hero + DB features + comparison table + FAQ
- [ ] /register without plan → /pricing
- [ ] Checkout → /onboarding → complete → /dashboard
- [ ] Admin: add feature → pricing page updates
- [ ] DB: checkout_sessions shows pending then completed

---
# Original Billing v1 — Complete

## Phase 0 — Schema foundation
- [ ] T0.1 Migration `billing_foundation.sql`: coupon_usages table, plans.feature_flags + stripe_price_id_one_time, profiles.trial_used_at, UNIQUE(plans.name), unique user_plans.user_id, admin RLS on plans
- [ ] T0.2 Migration `seed_plans_v2.sql`: seed trial/starter/pro, deactivate legacy, rework handle_new_user (no plan, 0 credits)
- [ ] T0.3 Regenerate Supabase types; typecheck green
- [ ] Checkpoint A: migrations apply clean; pricing page renders 3 plans

## Phase 1 — Stripe products/prices
- [ ] T1.1 scripts/stripe-sync-plans.mjs + node:test; run sync (idempotent)
- [ ] T1.2 Delete supabase/functions/create-stripe-price; config.toml entries

## Phase 2 — Backend billing core
- [ ] T2.1 _shared/billing.ts + Deno tests
- [ ] T2.2 create-checkout: trial mode=payment + eligibility 403s
- [ ] T2.3 stripe-webhook: payment-mode trial activation, invoice.payment_failed, no-plan downgrade
- [ ] T2.4 check-subscription-v2 access states + lazy expiry; ensure-profile no-plan (deploy together)
- [ ] T2.5 Delete legacy check-subscription
- [ ] Checkpoint B: Stripe test-mode pass (trial once, subscribe, payment_failed, cancel)

## Phase 3 — Pricing UI & plan gate
- [ ] T3.1 usePlans + useSubscription contracts ('none' default)
- [ ] T3.2 PricingSection yearly toggle + trial card; CheckoutDialog interval; PaymentRequired refresh
- [ ] T3.3 /choose-plan gate; usePlanLimits locked state; CheckoutSuccess force-refresh

## Phase 4 — Feature gating
- [ ] T4.1 useFeatureAccess hook + FeatureGate component
- [ ] T4.2 Gate ProductResearch/ProfitableProducts/BestSellingItems/Alerts + ai-product-research server 403

## Phase 5 — Billing page & admin
- [ ] T5.1 Subscription.tsx billing overhaul
- [ ] T5.2 Admin plans route + feature_flags editor + deactivate-not-delete

## Phase 6 — Tests, docs, cleanup
- [ ] T6.1 Playwright pricing spec
- [ ] T6.2 docs/BILLING.md
- [ ] T6.3 Sweep 'free' remnants
- [ ] Final verification: typecheck/build/tests, deploys, RLS negative test
