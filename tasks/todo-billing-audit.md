# TODO — Billing/plans/credits audit fixes

Plan: `tasks/plan-billing-audit.md` · Verdict: prod works; repo had drift + 2 correctness gaps.

## P0 — Webhook drift (DONE in repo)
- [x] Restore `supabase/functions/stripe-webhook/index.ts` to deployed-correct v68 source
- [x] Add claim-release idempotency (DELETE stripe_events row on processing error → Stripe retries)
- [x] Validate: brace balance, switch reachable (no return-before-switch)
- [x] Confirm webhook was the only drifted billing function (brace-scan of create-checkout/check-sub-v2/customer-portal/_shared)
- [x] Regression guard in `scripts/static-security-checks.mjs` (switch-reachable assertion) — PASSES
- [x] `scripts/check-edge-functions.mjs` (`deno check`) + wired into `check:local` (skips locally w/o deno, fails in CI)
- [x] Fixed pre-existing CRLF false-fail in `security:static` (read() now normalizes CRLF→LF)

## P1 — Plan catalog drift (DONE in repo)
- [x] `docs/BILLING.md` table → canonical DB numbers (Pro 5,000 credits, Starter 250 orders, eBay accts 1/1/2)
- [x] Fix stale literal `apps/web/src/components/UpgradeModal.tsx` (1,500 → 5,000 credits)
- [x] Grep confirmed no other stale `1,500` / `Unlimited auto-orders` / `5 eBay` copy in apps

## P2 — Atomic AI credits (DONE in repo)
- [x] Migration `supabase/migrations/20260620120000_deduct_credits_atomic.sql` (FOR UPDATE lock, REVOKE/GRANT)
- [x] `plan-middleware.deductUsage('credit')` → calls `deduct_credits_atomic` RPC
- [x] AI functions inherit atomicity (they call deductUsage); web typecheck green; static checks green

## Pending — user-authorized deploy/verify (NOT done)
- [ ] Apply migration `20260620120000_deduct_credits_atomic` to DB **before** deploying functions that call it
- [ ] Deploy edge functions (stripe-webhook restore, plan-middleware) — current prod webhook is healthy; deploy is the fix delivery
- [ ] `deno check` in CI (install deno via denoland/setup-deno so the guard bites)
- [ ] Stripe test-mode E2E: trial $1 + paid sub → credits per plan, emails fire, replay → duplicate:true, forced error → claim released + retry succeeds
- [x] Concurrency/logic test for `deduct_credits_atomic` → `scripts/sql/deduct_credits_atomic_test.sql` (run via psql on a branch DB; happy-path + over-spend + invalid-amount + documented 2-session concurrency check)

## P3 — Hardening: ASSESSED, no code change (admin RPCs already secured)
- [x] Verified admin RPCs (`adjust_user_credits_admin`, etc.) are called DIRECTLY from apps/admin with the admin's JWT (e.g. AdminUsers.tsx:440) and self-guard via `has_role(auth.uid(),'admin')`.
      => `authenticated` EXECUTE is REQUIRED; revoking it would break the admin panel. The advisor `authenticated_security_definer_function_executable` warning is an accepted/mitigated risk, NOT actionable.
- [x] `deduct_credits_atomic` IS fully locked down (service_role only) in migration 20260620120000 — safe because it takes user_id as a param and is only called by edge functions via service_role.
- [ ] (Manual, dashboard) Enable leaked-password protection — Auth setting, not a migration.
- [ ] (Optional, ~zero value) RLS-no-policy admin tables are deny-all = already secure; only add policies if intentional read access is ever needed.
