# Production-Readiness — Task Checklist

See [plan-production-readiness.md](plan-production-readiness.md) for the verdict, dependency graph,
acceptance criteria, and verification steps.

**Status: IN PROGRESS.** Date: 2026-06-22.
**Verdict:** not yet production-grade; gap is operational/deployment, not architecture.
**Launch-grade = Phases 0–2 + T3.1/T3.2 + T4.1 green.**

### Progress log (2026-06-22)
- **Test net is now real & enforced.** Wired `npm test` (auth 33 + edge-fn logic 31 + extension 217 =
  **281 tests**) into `check:local` and `.github/workflows/ci.yml`. Previously these suites existed but
  **nothing ran them**.
- **Fixed a live drift bug** the new gate caught: `routeAfterAuth.test.ts` expected the pre-redesign
  `/pricing`; source of truth (`resolveNextStep.ts:74`) returns `/billing` (→ `/checkout?plan=trial`).
  Test updated to match. (33/33 auth now green.)
- **⚠ VERIFIED CRITICAL: migration drift.** Prod catalog has `deduct_usage_atomic` but **NOT
  `deduct_credits_atomic`** (confirmed via `pg_proc` query). `plan-middleware.ts:576` calls it. → Apply
  `supabase/migrations/20260620120000_deduct_credits_atomic.sql` to prod **before** redeploying any function
  that uses the credit path, or AI credit deduction errors. Migration is additive (`CREATE OR REPLACE`,
  `service_role`-only) and safe.

## Phase 0 — Make the regression gate real
- [ ] T0.1 Land CI on GitHub (`workflow` scope + `git add -f .github/`, or recreate via web UI) — *needs your token scope*
- [x] T0.2 Confirm baseline gates green (typecheck ✓, lint 0 errors ✓, build ✓, **test 281/281 ✓**)
- [x] T0.3 Wire test suites into `check:local` + CI (added `test`/`test:auth`/`test:functions`/`test:extension`)
- [ ] ◇ Checkpoint 0 — CI required-status enabled on `main` (blocked on T0.1)

## Phase 1 — Production config, secrets & repo↔prod reconciliation  (critical path)
- [ ] T1.1 Set all prod env/secrets + redeploy (Turnstile key, Sentry DSN, Stripe sk_live, Resend, origins, ENVIRONMENT)
- [ ] T1.2 Apply migration drift to prod (`deduct_credits_atomic`) + deploy `stripe-webhook` / `create-checkout`
- [ ] T1.3 Register Stripe LIVE webhook + `STRIPE_WEBHOOK_SECRET`; live checkout + cancel end-to-end
- [ ] T1.4 Enable leaked-password protection; revoke `anon`/`authenticated` EXECUTE on 28 definer funcs (or document); pin last `search_path`
- [ ] ◇ Checkpoint 1 — production smoke GO/NO-GO (register→verify→pair→scrape→list→pay→cancel)

## Phase 2 — Enforce the security perimeter
- [ ] T2.1 Verify on preview, then flip CSP Report-Only → enforcing in all four `vercel.json`
- [ ] T2.2 Triage 9 `rls_enabled_no_policy` tables (service-role-only intended, or add policy)
- [ ] ◇ Checkpoint 2 — headers enforcing in prod; advisor WARNs resolved or accepted-in-writing

## Phase 3 — Automated safety net for the money paths
- [ ] T3.1 Playwright e2e: signup → plan → checkout (Stripe test) → dashboard gate; cancel → revoke
- [~] T3.2 Edge-function tests — existing `_shared` logic tests (billing/entitlement/trial caps, plan-middleware) now run in CI; still TODO: `stripe-webhook` replay idempotency + `create-listing` integration gate
- [x] T3.3 Wire auth + edge-fn-logic + extension suites into CI (`npm test`)
- [ ] ◇ Checkpoint 3 — CI fails on any money-path test break

## Phase 4 — Observability & operations proven
- [ ] T4.1 Confirm Sentry receiving (frontend + functions); add alerts (webhook errors, auth failures, OTP spikes, 5xx)
- [ ] T4.2 Execute k6 smoke/load against staging; commit baseline report
- [ ] T4.3 Run one PITR backup/restore drill; record RTO/RPO
- [ ] ◇ Checkpoint 4 — alerts live; load + restore evidence committed

## Phase 5 — Scale hardening (post-launch; NOT launch-blocking)
- [ ] T5.1 Broaden rate-limiting to remaining edge functions
- [ ] T5.2 Move Amazon sync / blog AI / Sheets sync to the queue worker
- [ ] T5.3 Add dashboard summary tables (replace request-time aggregation)
- [ ] T5.4 Route-level code-splitting (web + admin bundles)
- [ ] T5.5 Resolve lockfile ambiguity (`package-lock.json` vs `bun.lockb`)
- [ ] T5.6 Run `get_advisors(performance)`; fix top FK-index / permissive-policy findings
- [ ] ◇ Checkpoint 5 — scale review after first real traffic
