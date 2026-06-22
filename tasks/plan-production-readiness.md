# Plan — Production-Readiness ("Is this app production grade?")

> Status: **Awaiting approval** · Date: 2026-06-22 · Branch suggestion: `chore/prod-readiness`
> Question asked: *"Is this application not production grade?"*
> Method: read-only audit of current code + **live** Supabase state (advisors + applied migrations),
> reconciled against the dated docs in `docs/` (several of which are now stale).

---

## TL;DR verdict

**Not yet production-grade — but close, and the remaining gap is operational/deployment, not architecture.**

The old "Security 46/100 — do not launch" report (`docs/architecture-audit/04-final-executive-report.md`)
is **stale**: it predates the `7af2d47 feat(launch): … security, auth/billing hardening` commit. Current
reality, verified this audit:

**What is already at production standard (verified now):**
- `npm run typecheck` — **green** (web + admin + marketing).
- `npm run lint` — **0 errors**, 504 warnings (the `no-explicit-any` rule was relaxed to `warn`; lint gate passes).
- Security headers + CSP present on **all three** apps (`vercel.json` root/web, marketing, admin).
- `verify_jwt = true` set per-function in `supabase/config.toml`; CORS allowlists; PII logs removed.
- Server-side entitlement enforcement (`ProtectedRoute` is authoritative via `check-subscription-v2`;
  `create-listing` plan/feature/credit gating).
- Stripe idempotency table (`stripe_events`) + atomic credit/usage RPCs.
- Extension publish-ready (217 tests, `verify:prod` "Safe to publish"); `apps/backup_temp` no longer tracked.
- **Live Supabase security advisors: 0 ERROR.** No missing-RLS errors, no exposed tables.

**Why it is NOT yet production-grade (the real gap):**
1. **Deployment/config not executed** — the "half-day operator list" (`docs/OPERATOR_ACTIONS.md`) is open, plus
   **repo↔prod drift**: migration `deduct_credits_atomic` is in the repo but **not in the live applied list**;
   `stripe-webhook` / `create-checkout` likely not redeployed.
2. **CI is not actually enforced** — `.github/workflows/ci.yml` exists on disk but `.github/` is **gitignored**
   (`git check-ignore` confirms). The regression gate never runs on GitHub.
3. **CSP is `Content-Security-Policy-Report-Only` everywhere** — it reports, it does not block.
4. **Turnstile is a no-op unless `VITE_TURNSTILE_SITE_KEY` is set** — falls back to Cloudflare's always-pass test key.
5. **Thin automated tests for the SaaS** — 4 unit tests in `packages/auth`, Playwright **configured but 0 e2e specs**,
   no `test` script in `apps/web`/`apps/admin`. Only the extension is well-tested.
6. **60 live Supabase security WARNs** to triage: leaked-password protection **off**, **28 anon-executable
   `SECURITY DEFINER` functions**, 9 `rls_enabled_no_policy` tables, 1 mutable `search_path`.
7. **Unproven operations** — k6 smoke exists (`load-tests/k6/sellersuit-smoke.js`) but not executed; backup/restore
   drill documented, not run; no central alerting beyond Sentry wiring.
8. **Scale items** (queues, dashboard summary tables, broad rate-limit rollout, bundle code-split) — **not
   launch-blocking** but required for 1k–10k users.

**Bottom line:** the code is launch-grade; the *system* is not until Phases 0–2 (+ a money-path test net and
observability proof) are done. None of it is a rewrite.

---

## Dependency graph

```
Phase 0 (CI truthful) ───────────────┐
                                      ├──> Phase 3 (test net)  ──┐
Phase 1 (config + deploy + drift) ────┼──> Phase 2 (CSP enforce) ┼──> LAUNCH (production-grade)
                                      └──> Phase 4 (observability)┘
Phase 5 (scale) — independent, post-launch
```

- **Phase 1 is the critical path** to a paid launch; Phase 2 (CSP flip) and Phase 4 (smoke/alerts) require Phase 1's deploy.
- **Phase 0** can run fully parallel; it makes every later "green" claim verifiable.
- **Phase 3** (e2e against preview) needs Phase 1's deploy; unit/function tests can start immediately.
- **Phase 5** is post-launch stabilization; do not block launch on it.

"Production-grade launch" = **Phases 0–2 + T3.1/T3.2 + T4.1** complete and green. Phases 4-rest/5 are stabilization.

---

## Phase 0 — Make the regression gate real
*Goal: every later "it's green" is enforced, not asserted.*

- **T0.1 Land CI on GitHub.** Grant the push token `workflow` scope and `git add -f .github/workflows/`, or
  recreate `ci.yml` via the GitHub web UI. (`docs/OPERATOR_ACTIONS.md` §5.)
  - *Accept:* CI runs on PR and main; jobs `security:static`, `typecheck`, `lint`, `build` all pass.
  - *Verify:* a test PR shows the CI check; merge blocked on red.
- **T0.2 Baseline gates locally** (`npm run typecheck && npm run lint && npm run build`).
  - *Accept:* typecheck green, lint 0 errors, build green. *(Already true — lock it as the CI baseline.)*
- ◇ **Checkpoint 0:** CI required-status enabled on `main`.

## Phase 1 — Production config, secrets & repo↔prod reconciliation  *(critical path)*
*Goal: a real user can register (real CAPTCHA), pay (live Stripe), and get correct entitlements.*

- **T1.1 Set production env/secrets and redeploy** (`docs/OPERATOR_ACTIONS.md` §1). Vercel web/marketing/admin
  `VITE_*` (incl. `VITE_TURNSTILE_SITE_KEY`, `VITE_SENTRY_DSN`); Supabase function secrets (`STRIPE_SECRET_KEY`
  sk_live, `RESEND_API_KEY`, AI key, `ALLOWED_ORIGINS`, `EXTENSION_ALLOWED_ORIGINS`, `INTERNAL_FUNCTION_SECRET`,
  `ENVIRONMENT=production`).
  - *Accept:* CAPTCHA challenges on the live register page.
  - *Verify:* `curl -s https://app.sellersuit.com/assets/index-*.js | grep -c 1x00000000000000000000AA` → `0`.
- **T1.2 Reconcile migration drift + deploy functions.** Apply pending migrations to prod (notably
  `deduct_credits_atomic`, confirm `deduct_usage_atomic` already live); deploy `stripe-webhook` (restored v68
  catalog) and `create-checkout`.
  - *Accept:* live `list_migrations` includes `deduct_credits_atomic`; `get_edge_function` shows expected versions.
  - *Verify:* deduct path runs through the atomic RPC end-to-end (no double-spend on retry).
- **T1.3 Register Stripe LIVE webhook** at `…/functions/v1/stripe-webhook` for the 7 handled events; set
  `STRIPE_WEBHOOK_SECRET` (`docs/OPERATOR_ACTIONS.md` §2).
  - *Accept:* a live test checkout writes a `stripe_events` row and lifts limits; cancellation revokes them.
  - *Verify:* replay the same event → no duplicate effect (idempotency holds).
- **T1.4 Close the highest live security WARNs.** Enable Supabase **leaked-password protection**; pin the 1
  remaining mutable `search_path`; and handle the SECURITY DEFINER EXECUTE grants with this nuance (do **not**
  blanket-revoke — that breaks the admin SPA):
  - **Revoke `EXECUTE` from `anon`** on all 28 flagged functions — none should be callable unauthenticated. Safe.
  - **Keep `EXECUTE` for `authenticated`** on the `*_admin` RPCs (e.g. `update_user_plan_admin`,
    `search_ebay_users_admin`, `adjust_user_credits_admin`, `extend_user_subscription_admin`, …): the admin SPA
    calls them as an authenticated admin and they **self-guard with `is_admin()`** internally. Revoking
    `authenticated` here would break admin.
  - **Revoke from both `anon` and `authenticated`** on internal/trigger helpers never called directly by a client:
    `handle_new_user`, `guard_profile_billing_columns`, `prevent_audit_modification`, `is_admin`, `has_role`,
    `sync_profile_credits_from_ledger`, `log_admin_action`. Verify each is only invoked by triggers/other functions first.
  - Author this as a **reviewed migration** (not auto-applied); confirm the admin app still works on a preview.
  - *Accept:* `get_advisors(security)` drops `auth_leaked_password_protection`, `anon_security_definer_function_executable`,
    and the trigger-helper `authenticated_*` WARNs; remaining `authenticated_*` (self-guarding admin RPCs) documented as accepted.
  - *Verify:* re-run `get_advisors(security)`; smoke the admin app (a `*_admin` RPC still succeeds for an admin).
- ◇ **Checkpoint 1 (production smoke = GO/NO-GO):** register → verify email → pair extension (`auth-status` 200)
  → scrape → create a plan-gated listing → paid checkout lifts limits → cancel revokes → `curl -I` shows headers.

## Phase 2 — Enforce the security perimeter
*Goal: CSP actually blocks; advisor noise triaged.*

- **T2.1 Flip CSP from Report-Only to enforcing.** On a preview deploy, click through dashboard/billing/blog with
  DevTools open; if no violations, rename `Content-Security-Policy-Report-Only` → `Content-Security-Policy` in all
  four `vercel.json` (`docs/OPERATOR_ACTIONS.md` §4).
  - *Accept:* `curl -I` on all three apps shows `Content-Security-Policy` (not `-Report-Only`).
  - *Verify:* authenticated dashboard + live Stripe flows show **zero** console CSP violations.
- **T2.2 Triage the 9 `rls_enabled_no_policy` tables** (`stripe_events`, `support_notes`, `feature_*`,
  `extension_session_*`): confirm each is service-role-only (deny-all to clients is intended) or add a policy.
  - *Accept:* each table is documented as intentional or has a policy; advisor list annotated.
- ◇ **Checkpoint 2:** headers enforcing in prod; advisor WARNs are all either resolved or explicitly accepted in a checked-in note.

## Phase 3 — Automated safety net for the money paths
*Goal: the signup→pay→entitlement path can't silently regress. (Biggest remaining **code** gap.)*

- **T3.1 Playwright e2e for the critical flow:** signup (dev CAPTCHA bypass) → plan select → checkout (Stripe test
  mode) → dashboard gate; and cancel → revoke. Add `testDir` + a `test:e2e` script.
  - *Accept:* e2e suite green locally and in CI against a preview URL.
- **T3.2 Edge-function tests for enforcement + idempotency:** `create-listing` entitlement gate (plan/feature/credit
  + inactive-subscription rejection) and `stripe-webhook` replay idempotency.
  - *Accept:* tests green; a replayed webhook event produces no duplicate credit/plan change.
- **T3.3 Wire tests into CI** (extend `ci.yml`: extension `node --test`, `packages/auth` unit, new e2e + function tests).
  - *Accept:* CI runs all test suites; red on failure.
- ◇ **Checkpoint 3:** CI fails if any money-path test breaks.

## Phase 4 — Observability & operations proven
*Goal: when prod breaks at 2am, you find out and can recover.*

- **T4.1 Confirm Sentry is receiving** (frontend + edge functions); add alerts for Stripe webhook errors, auth
  failures, OTP spikes, and 5xx.
  - *Accept:* a deliberately-thrown test error appears in Sentry; one alert fires to the chosen channel.
- **T4.2 Execute the k6 smoke/load** (`load-tests/k6/sellersuit-smoke.js`) against staging; commit a baseline report.
  - *Accept:* report committed under `load-tests/` with p95 latency + error-rate numbers.
- **T4.3 Run one backup/restore (PITR) drill** per `docs/operations/production-runbooks.md`; record RTO/RPO.
  - *Accept:* dated drill log committed.
- ◇ **Checkpoint 4:** alerts live; load + restore evidence committed.

## Phase 5 — Scale hardening (post-launch; 1k→10k users — NOT launch-blocking)

- **T5.1** Broaden rate-limiting to remaining edge functions (foundation exists; checklist F29/F30).
- **T5.2** Move request-time heavy work to the queue worker: Amazon SP-API sync, blog AI generation, Sheets sync
  (F26/F27/F28 — queue foundation already added).
- **T5.3** Add dashboard summary tables to replace request-time order aggregation (`ebay-orders` F24/F34).
- **T5.4** Route-level `React.lazy`/`manualChunks` — web `index.js` ≈1.88 MB, admin ≈1.77 MB.
- **T5.5** Resolve package-manager ambiguity (`package-lock.json` + `bun.lockb` both present — pick one).
- **T5.6** Run `get_advisors(performance)` and fix top unindexed-FK / multiple-permissive-policy findings.
- ◇ **Checkpoint 5:** scale review after first real traffic; re-run k6 at target concurrency.

---

## Risks & notes
- **Docs are dated** — trust live state + this plan over `docs/architecture-audit/*` (≈June 4) and even the
  June-14 checklist where they disagree.
- **`deduct_credits_atomic` drift** is the one item that can cause real billing bugs in prod; do T1.2 carefully.
- Don't expand scope into a rewrite: the architecture (monorepo + Supabase RLS + Edge Functions + extension) is
  sound for this stage. Harden, don't re-platform.
- Keep eBay-only scope; Shopify stays flag-gated (`SHOPIFY_ENABLED`), not deleted.
