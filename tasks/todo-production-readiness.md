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
- **⚠ NEW security finding: `deduct_usage_atomic` IDOR.** It's a SECURITY DEFINER counter-mutator with **no
  role guard**, currently EXECUTE-able by any `authenticated` user with an arbitrary `p_user_id` (its lockdown
  was missed). Folded into the new lockdown migration below (restrict to `service_role`).
- **Authored reviewed migration `20260622000000_lockdown_definer_execute_grants.sql`** (Phase 1 T1.4) —
  NOT applied. Revokes `anon` from 22 admin/user RPCs (keeps `authenticated`+`service_role`, they self-guard),
  revokes all client roles from 4 trigger fns, locks `deduct_usage_atomic` to `service_role`, pins
  `is_valid_ebay_feature` search_path. **Leaves `is_admin`/`has_role` alone — 41 RLS policies depend on them**
  (verified). Apply on a preview branch + smoke admin before promoting.

## Phase 0 — Make the regression gate real
- [ ] T0.1 Land CI on GitHub (`workflow` scope + `git add -f .github/`, or recreate via web UI) — *needs your token scope*
- [x] T0.2 Confirm baseline gates green (typecheck ✓, lint 0 errors ✓, build ✓, **test 281/281 ✓**)
- [x] T0.3 Wire test suites into `check:local` + CI (added `test`/`test:auth`/`test:functions`/`test:extension`)
- [ ] ◇ Checkpoint 0 — CI required-status enabled on `main` (blocked on T0.1)

## Phase 1 — Production config, secrets & repo↔prod reconciliation  (critical path)
- [ ] T1.1 Set all prod env/secrets + redeploy (Turnstile key, Sentry DSN, Stripe sk_live, Resend, origins, ENVIRONMENT) — *your dashboard step*
- [x] T1.2a **APPLIED to prod (2026-06-22):** `deduct_credits_atomic` migration — drift fixed; verified anon=F/auth=F/service=T. ⟶ still TODO: redeploy `stripe-webhook` / `create-checkout` (your step)
- [ ] T1.3 Register Stripe LIVE webhook + `STRIPE_WEBHOOK_SECRET`; live checkout + cancel end-to-end — *your dashboard step*
- [x] T1.4a **APPLIED to prod (2026-06-22):** `lockdown_definer_execute_grants` migration — anon definer WARNs 28→2, search_path 1→0, `deduct_usage_atomic` IDOR closed. Verified grant state matches intent; `is_admin`/`has_role` left (41 RLS policies). Remaining 24 `authenticated` WARNs are self-guarding admin RPCs = accepted.
- [ ] T1.4b Enable **leaked-password protection** — Supabase Auth dashboard toggle (not DDL); *your step*. Advisor still WARNs.
- [ ] ◇ Checkpoint 1 — production smoke GO/NO-GO (register→verify→pair→scrape→list→pay→cancel)

## Phase 2 — Enforce the security perimeter
- [x] T2.1 **DONE (in repo, commit 527e068):** flipped CSP Report-Only → enforcing in all four `vercel.json`. ⟶ Takes effect on next Vercel deploy; **verify the preview shows no console CSP violations on authed dashboard + live Stripe before promoting** (your step).
- [x] T2.2 **DONE (verified):** all 9 `rls_enabled_no_policy` tables are referenced only by `supabase/functions/**`
  (service-role) — zero `apps/` client access. Deny-all RLS is correct by design, not a latent bug. Accepted.
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
- [x] T5.4 **DONE:** route-level code-splitting (web) via `React.lazy` + `Suspense` — main entry 1.8MB→516KB
  (156KB gzip, ~70% less initial JS); verified build chunks + runtime `/auth` render, 0 console errors. (admin: TODO)
- [x] T5.5 **DONE:** removed stale `bun.lockb`; npm canonical (CI `npm ci`)
- [~] T5.6 Ran `get_advisors(performance)` (199 WARN / 120 INFO). **DONE:** applied `fk_covering_indexes`
  migration to prod (12 unindexed-FK indexes, commit 95298a4, verified 12/12). **Deferred (higher-risk policy
  rewrites):** 166 `multiple_permissive_policies`, 30 `auth_rls_initplan` (wrap `auth.uid()` in `(select …)`),
  108 `unused_index` (INFO — candidate drops).
- [ ] ◇ Checkpoint 5 — scale review after first real traffic
