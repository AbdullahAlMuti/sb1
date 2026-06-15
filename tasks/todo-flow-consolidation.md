# Flow Consolidation — Task Checklist

See [plan-flow-consolidation.md](plan-flow-consolidation.md) for analysis and acceptance criteria.
Builds on the **completed** prior run ([todo.md](todo.md)). Status: **AWAITING APPROVAL** — no code changed.

## Slice A — resolveNextStep resolver
- [x] A1 New `packages/auth/src/lib/resolveNextStep.ts` (pure; 8-branch decision table)
- [x] A2 `resolveNextStep.test.ts` — 12 cases: all branches + onboarding split + past_due + trial_expired
- [x] ◇ CP-1: 12/12 tests green; `npm --workspace @sellersuit/web run typecheck` green

## Slice B — Unify the gate
- [x] B1 `ProtectedRoute.tsx` block-redirect delegates to `resolveNextStep`; `past_due` carve-out so
      billing/subscription routes stay reachable (loop-safe). Keeps `isDashboardAllowed` boolean gate.
- [x] B2 Routing branches (past_due→billing, trial_expired→choose-plan, onboarding split) covered by
      `resolveNextStep.test.ts`; the `isDashboardAllowed` boolean gate is unchanged (existing tests hold).

## Slice C — Migrate auth pages
- [x] C1 `Register.tsx` post-auth effect → `resolveNextStep` using authoritative `access` (waits for sub state)
- [x] C2 `Auth.tsx` post-login effect → `resolveNextStep` using authoritative `access`
- [x] C3 `routeAfterAuth.ts` → thin wrapper over `resolveNextStep` (export kept); 3 existing tests still green
- [x] C4 RC-4: `Auth.tsx` "Change plan selection" → `clearPlanIntent()` (clears canonical sessionStorage key)
- [ ] ◇ CP-2: needs an authed session + Stripe test mode (not available in this env) — deterministic in code

## Slice D — CheckoutSuccess authoritative
- [x] D1 Success test = `isAdmin || access ∈ {active,trial}` (dropped profile-flags-only gate)
- [x] D2 On success → `resolveNextStep` (onboarding vs dashboard); retry/backoff + PENDING screen kept
- [x] D3 Reviewed `Checkout.tsx`/`PaymentRequired.tsx`: kept `canAccessDashboard` as an intentional fast-path
      (instant redirect for active users before `access` resolves); `create-checkout` 409 guard backs it up

## Slice E — Trial reconciliation (backend)
- [x] E1 Shared `_shared/trial-activation.ts` (idempotent); `stripe-webhook` refactored to use it;
      `check-subscription-v2` self-heals a paid-but-unsynced $1 trial on load (Stripe session lookup)
- [x] E2 New `supabase/functions/reconcile-subscriptions` (secret-guarded sweep) + `config.toml`
      (`verify_jwt=false`) + guarded pg_cron migration `20260615010000_schedule_reconcile_subscriptions.sql`
- [ ] E3 Verify with webhook disabled in Stripe test mode → needs Stripe test env (deterministic in code)
- [ ] ◇ CP-3: confirm self-heal + deploy order at deploy time

## Slice F — Deploy ordering (NOT STARTED — your go-live coordination)
- [ ] F1 Deploy web first; then redeploy `create-checkout`, `check-subscription-v2`, `stripe-webhook`,
      `reconcile-subscriptions`
- [ ] F2 Set Vault secrets `edge_base_url` + `cron_secret` and the `CRON_SECRET` env var, then re-run the
      cron migration to register the schedule
- [ ] F3 (Optional) flip `create-checkout` success_url → `/payment-success` once new web build is live prod

## Verification status
- [x] `resolveNextStep` + `routeAfterAuth` + `planIntent` + `dashboardAccess`: 34/34 unit tests pass
- [x] `npm --workspace @sellersuit/web run typecheck` green; eslint 0 errors (style warnings only)
- [ ] Deno typecheck of edge functions (Deno not installed locally — reviewed by hand)
- [ ] Full 16-case matrix in Stripe test mode (needs Stripe test env)
- [x] Memory note added ([[flow-consolidation-phase2]])
