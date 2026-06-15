# Flow Consolidation — Phase 2 (post-launch-fixes)

**Branch:** `launch-fixes-phase1`
**Approach (decided):** Targeted consolidation — keep the working architecture.
**Scope (decided):** Backend (edge functions + reconciliation) + frontend gating.
**Status:** PLAN — awaiting approval before implementation.

> **Context:** The prior `/plan` run ([plan.md](plan.md) / [todo.md](todo.md), 2026-06-15) already fixed the
> originally-reported symptoms (B1–B10): removed hardcoded creds, fixed lost plan intent, removed fake
> checkout success, added the canonical `/signup` `/checkout` `/payment-success` `/payment-cancelled` URLs,
> blocked duplicate checkout, and consolidated `ProtectedRoute` onto `check-subscription-v2`. That work is
> **done** (uncommitted on this branch). This plan addresses the **3 gaps that run did not close** — two of
> which it explicitly logged as residual risks.

---

## Step 1 — Audit (delta only; full file map is in [plan.md](plan.md) §1)

Files still carrying divergent / incomplete logic after the prior run:

| File | Remaining issue |
|---|---|
| `apps/web/src/pages/billing/CheckoutSuccess.tsx` | Success test uses `canAccessDashboard` (profile-flags-only), not the authoritative `access`. |
| `packages/auth/src/lib/routeAfterAuth.ts` | Only access→checkout→pricing; no onboarding / past_due / trial_expired routing. |
| `packages/auth/src/ProtectedRoute.tsx` | Uses `isDashboardAllowed` (good) but block-redirect logic is hand-rolled, not shared. |
| `supabase/functions/check-subscription-v2/index.ts` | Cannot detect a paid **$1 trial** without the webhook (one-time payment = no Stripe subscription). |
| `supabase/functions/` | No reconciliation cron for dropped/delayed webhooks (diagram Phase 6 missing). |

---

## Step 2 — Root causes

### RC-1 — Divergent access checks (real, unaddressed)
`ProtectedRoute` → `isDashboardAllowed(access + profileAllows)`.
`CheckoutSuccess` → `canAccessDashboard` **only** (profile flags, webhook-driven).
`Checkout`/`ChoosePlan` → other mixes.
Profile flags flip only after the **webhook**; `access` reflects **live Stripe**. During the post-payment
window they disagree → success page says "not done" while the dashboard would admit (or vice-versa) →
inconsistent dashboard access / post-payment confusion.

### RC-2 — $1 trial is 100% webhook-dependent (logged as residual risk, still open)
A one-time payment creates no Stripe subscription, so `check-subscription-v2.findActiveSubscription()`
returns null. Trial access exists only once the webhook writes `user_plans.status='trialing'`. Delayed/
dropped webhook → `access='none'` → success page stuck on PENDING; navigating to `/dashboard` bounces to
`/checkout` (new Stripe session risk). **No reconciliation** to self-heal.

### RC-3 — No single "next step" resolver
`routeAfterAuth` ignores onboarding-incomplete → `/onboarding`, `past_due` → billing recovery,
`trial_expired` → choose-plan. Each page re-derives partial routing → drift between entry points.

---

## Step 3 — Target architecture (single sources of truth)

| Concern | Source of truth |
|---|---|
| Auth | `useAuth` (Supabase session) |
| Email verified | `user.email_confirmed_at` |
| Selected plan | `planIntent` (URL → sessionStorage → `profile.pending_plan_id`) |
| Subscription/payment | **`check-subscription-v2.access`** (live Stripe + reconciled trial) |
| Onboarding | `profile.onboarding_completed` |
| **Next destination** | **NEW `resolveNextStep()`** — one pure fn used everywhere |

### `resolveNextStep(state) -> Destination`
`packages/auth/src/lib/resolveNextStep.ts` (+ `.test.ts`). Pure. Inputs:
`{ hasUser, isEmailVerified, isAdmin, access, onboardingCompleted, planToken, dashboardPath }`.

Order (first match wins):
1. `!hasUser` → `/auth`
2. `!isEmailVerified` → `VERIFY` (in-page state, not a route)
3. `isAdmin` → `/admin`
4. `access === 'past_due'` → `/dashboard/billing`
5. `access === 'active' || access === 'trial'` → `onboardingCompleted ? dashboardPath : '/onboarding'`
6. `access === 'trial_expired'` → `/choose-plan`
7. `planToken` → `/checkout?plan=<token>`
8. else → `/pricing`

`PENDING` (post-Stripe polling) stays owned by `CheckoutSuccess`.

---

## Step 4 — Remove / replace
- Replace `CheckoutSuccess` profile-flags success gate with authoritative `access`.
- Re-point `Register`/`Auth`/`Checkout`/`ChoosePlan` routing at `resolveNextStep`.
- Make `routeAfterAuth` a thin wrapper over `resolveNextStep` (keep export to avoid breaking imports).
- No new frontend-only grants; no hardcoded redirects.

---

## Step 5/6 — Slices (vertical, dependency-ordered)

### Slice A — `resolveNextStep` resolver
Create resolver + unit tests covering all 8 branches + onboarding split.
**Verify:** auth-pkg tests, `npm run typecheck`. **◇ CP-1.**

### Slice B — Unify the gate
`ProtectedRoute` block-redirect delegates to `resolveNextStep` (keep `isDashboardAllowed` boolean gate).
**AC:** unpaid→checkout/pricing; past_due→billing; trial_expired→choose-plan; active+onboarding-incomplete→onboarding.

### Slice C — Migrate auth pages + RC-4 cleanup
`Register`/`Auth` effects use `resolveNextStep`; `routeAfterAuth` becomes wrapper. Fix `Auth.tsx`
"Change plan selection" to call `clearPlanIntent()` (clears canonical sessionStorage key).
**◇ CP-2** (full frontend review, Stripe test mode).

### Slice D — CheckoutSuccess authoritative + onboarding-aware
Success = `access ∈ {active,trial}`; on success → `resolveNextStep`; keep retry/backoff + PENDING.
**AC:** on-time→onboarding/dashboard; delayed→PENDING (never silent unlock, never pricing loop).

### Slice E — Trial reconciliation (backend, closes RC-2)
- **Eager:** `check-subscription-v2` self-heals a paid-but-unsynced trial (completed `checkout_sessions`
  row or Stripe one-time payment, no `user_plans` trial → activate idempotently via `trial_used_at` claim).
- **Cron:** new `reconcile-subscriptions` (Supabase cron) sweeps stale `pending`/`completed` sessions →
  `syncStripeData(customer)` → idempotent upsert.
**AC:** webhook disabled, completed $1 trial still grants access within one check or one cron tick. **◇ CP-3.**

### Slice F — Deploy ordering
Web first (legacy `/checkout/success` alias in place), then redeploy `create-checkout`,
`check-subscription-v2`, `reconcile-subscriptions`. Flip `create-checkout` `success_url` to
`/payment-success` only after the new web build is live (see `create-checkout/index.ts:351`).

---

## Step 7 — Edge-case matrix
(Same 16 cases as [plan.md](plan.md) §9 / §7; the new coverage is #7 $1-trial-with-lagging-webhook,
#8 delayed-webhook, #10/#11 onboarding split, #12 past_due→billing — all now driven by `resolveNextStep`
+ reconciliation.)

## Step 8 — Final report (fill after implementation)
Broken → RC-1..RC-3 · files changed · logic removed (flags-only success gate, ad-hoc routing) · new flow
(`resolveNextStep` + authoritative access + trial reconciliation) · success confirmed by server access
never the return URL · dashboard protected by `isDashboardAllowed` · manual test steps (matrix, Stripe test).

## Checkpoints
- **CP-1:** resolver + gate (Slices A,B) before touching pages.
- **CP-2:** auth pages + success (Slices C,D) — frontend review, Stripe test mode.
- **CP-3:** reconciliation (Slice E) + confirm deploy order before Slice F.
