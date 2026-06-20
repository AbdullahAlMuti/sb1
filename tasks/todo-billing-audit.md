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
- [ ] Concurrency test for `deduct_credits_atomic` (N concurrent deducts, balance < N → exactly balance succeed)

## P3 — Optional hardening (deferred, not started)
- [ ] REVOKE EXECUTE on admin_* RPCs from anon/authenticated; enable leaked-password protection; RLS policies on flagged admin tables
