# Auth → Plan → Checkout → Dashboard Flow — Task Checklist

See [plan.md](plan.md) for analysis, target flows, acceptance criteria, and risks.
Status: **AWAITING APPROVAL** — no code changed yet. Prior marketing-redesign checklist: `git show HEAD:tasks/todo.md`.

Decisions locked: spec URLs + redirects · allow no-plan signup · guard on `check-subscription-v2` (profile flags = fast fallback).

## Phase 0 — Security hotfix
- [x] T0.1 Remove hardcoded admin creds in `Auth.tsx:42-43` (defaulted email/password to `''`)
- [x] ◇ Checkpoint 0: typecheck green; login form now renders empty

## Phase 1 — Plan-intent module
- [x] T1.1 New `packages/auth/src/lib/planIntent.ts` — `setPlanIntent`/`getPlanIntent`/`clearPlanIntent` (sessionStorage) + `resolvePlanToken(token, plans)` (id→slug→name). 9 node:test units in `planIntent.test.ts`.
- [x] T1.2 Replaced ad-hoc `localStorage.selectedPlan*` in PricingSection / Register / Auth(login) / CheckoutSuccess with the module (auto-migrates + clears legacy keys). PaymentRequired had none. Remaining raw usages are in Auth's dead `processCheckoutForNewUser` + legacy signup back-button → deleted in P3.
- [x] ◇ Checkpoint 1: 9/9 unit tests pass (`node --experimental-strip-types --test`); web typecheck green

## Phase 2 — Routing skeleton (spec URLs + redirects)
- [x] T2.1 `App.tsx`: added `RedirectPreserve` helper + `/signup`(→Register), `/payment-success`(→CheckoutSuccess); `/register`→`/signup` and `/checkout/success`→`/payment-success` (query/state preserved); `/checkout`→`/choose-plan` and `/payment-cancelled`→`/pricing`, `/payment-failed`→`/payment-cancelled` (the first two are Phase-4 placeholders for the real `<Checkout/>`/`<PaymentCancelled/>` pages)
- [x] T2.2 `create-checkout`: success_url→`/payment-success`, cancel_url→`/payment-cancelled` (NOT redeployed yet — redeploy once after Phase 5; legacy `/checkout/success` alias keeps current Stripe URLs working meanwhile)
- [x] ◇ Checkpoint 2: verified live on dev server — `/register?plan=pro`→`/signup?plan=pro`, `/checkout/success?...`→`/payment-success`→(auth gate), `/payment-cancelled`→`/pricing`, `/signup?plan=pro` renders, `/checkout?plan=pro`→`/choose-plan`→(auth gate); web typecheck green; zero console errors

## Phase 3 — Auth pages cleanup (Flows A & B)
- [x] T3.1 `Register.tsx`: new `routeAfterAuth` helper (`packages/auth/src/lib/routeAfterAuth.ts` + 3 unit tests); plan via `resolvePlanToken(?plan→state→intent→pending)`; removed pre-signup `/pricing` bounce (Flow A) + duplicate effects + `choose-plan?auto=true` jump; single post-auth effect (access→checkout→pricing); OTP-verify redirect delegated to the effect
- [x] T3.2 `Auth.tsx`: deleted `processCheckoutForNewUser`, `isProcessingCheckout` + its loading screen, `SelectedPlan`/`selectedPlanFromState`, plan badge, `useSubscription` usage; login → `routeAfterAuth` (no dashboard bounce, plan intent preserved for unpaid); `/auth?mode=signup` → `/signup`
- [x] T3.3 sign-up links → `/signup`: PricingSection (`/signup?plan=<token>`), Navbar, CTASection, HeroSection, Auth login footer
- [x] ◇ Checkpoint 3: verified live — `/signup` (no plan) renders form (no /pricing bounce, Flow A); `/pricing`→"Start with Starter"→`/signup?plan=starter` + sessionStorage intent set (Flow B); `/auth` renders "Welcome Back", password NOT prefilled, Sign-up link present; 12/12 unit tests; typecheck green; zero console errors

## Phase 4 — Checkout + result pages
- [x] T4.1 New `pages/billing/Checkout.tsx` (`/checkout`): waits for session+profile+plans; guards in order unauth→`/signup?plan`, active→`/dashboard`, no-plan→`/pricing`; else fires server `createCheckout(plan.id, interval)` once (ref-guarded)→Stripe redirect; price never sent from client; no modal
- [x] T4.2 New `pages/billing/PaymentCancelled.tsx`: "Try again" (→`/checkout?plan=<intent>`, only when intent exists) + "Choose a plan" (→`/pricing`); keeps intent
- [x] T4.3 `CheckoutSuccess.tsx`: removed fake-success on retry-exhaustion — now shows a `pending` state ("Still confirming your payment" + Check again / Back to plans); proceeds to dashboard ONLY when `canAccessDashboard`; keeps webhook-delay retry/loading
- [x] App.tsx: `/checkout`→`<Checkout/>`, `/payment-cancelled`→`<PaymentCancelled/>` (Phase-2 placeholders removed)
- [x] ◇ Checkpoint 4: verified live — `/checkout?plan=starter`(unauth)→`/signup?plan=starter`+intent persisted; cancel page shows Try again+Choose a plan (intent) / only Choose a plan (no intent); Try again→`/checkout?plan=starter`→`/signup?plan=starter`; `/checkout`(no plan,unauth)→`/signup`; typecheck green; zero console errors. NOT E2E-able here (need authed unpaid session + Stripe test mode): authed checkout→Stripe, authed active→dashboard, invalid-plan→pricing, success-page pending state — deterministic in code, to exercise in Phase 6/Stripe test mode

## Phase 5 — Guard consolidation + duplicate-checkout guard
- [x] T5.1 `ProtectedRoute.tsx`: consumes `useSubscription`; waits for `check-subscription-v2` (spinner, admins skip); `allowed = isAdmin || access∈{active,trial} || (!serverBlocks && canAccessDashboard)` where `serverBlocks = trial_expired|past_due` (authoritatively blocks expired $1 trials that profile flags can't detect; profile flags remain the error fallback); unpaid → `/checkout?plan=<intent|pending>` else `/pricing`; email-verify + goal routing kept
- [x] T5.2 `create-checkout`: 409 + `{redirect:'/dashboard'}` when `user_plans.status==='active' && stripe_subscription_id` (active PAID sub); trials allowed to convert; defense-in-depth (Checkout page already redirects active users client-side)
- [x] T5.3 `PaymentRequired.tsx`: `autoFiredRef` guard prevents a second auto-checkout Stripe session
- [x] ◇ Checkpoint 5: verified live — `/dashboard` & `/dashboard/ebay/listings` (unauth) → `/auth` (guard covers all pages, no loop, no infinite spinner); 12/12 unit tests; web typecheck green; **production build green**. Authed paths (unpaid→checkout/pricing, active→dashboard, expired-trial→block, dup-checkout 409) need a real session + Stripe test mode — deterministic in code, to exercise in Phase 6.
- [x] ✅ DEPLOY ORDERING RESOLVED: `create-checkout` return URLs reverted to legacy `/checkout/success` + `/#pricing`, which work on BOTH the current production web build (serves them directly) and the new build (aliases `/checkout/success`→`/payment-success`, query preserved). The function is now safe to (re)deploy in ANY order — the only behavioural change vs prod is the additive 409 duplicate-checkout guard. No web↔function deploy coupling. (Optional later: switch URLs to `/payment-success` + `/payment-cancelled` once the new web build is the live prod deploy.)

## Phase 6 — Verification & polish
- [x] T6.1 Unit tests: 20 passing across `planIntent` (resolver/intent/migration), `routeAfterAuth`, `dashboardAccess` (extracted `canAccessDashboard` + `isDashboardAllowed` — incl. expired-trial-block + error-fallback cases). Full React render matrix not added (no vitest/jest in web/packages); gate logic is covered by the pure-function tests + live unauth route checks in Phases 2–5.
- [x] T6.2 `npm run typecheck` (marketing+web+admin) green · scoped `eslint` 0 errors / 14 pre-existing-style warnings · `npm run build` all 3 apps green
- [x] T6.3 Memory updated (`auth-billing-flow-redesign.md` + index); plan deliverables/results appended; residual risks documented
- [x] ◇ Checkpoint 6: green build + tests + lint → code ready. Remaining before merge/launch: commit the phase work, ship web to prod, THEN redeploy `create-checkout`; exercise authed/Stripe-test-mode paths.

## Notes
- No DB migration expected (verify columns with `list_tables` before P5).
- Only `create-checkout` needs redeploy.
- Real success/cancel/webhook paths need Stripe test-mode keys; otherwise simulate via profile-flag toggles.
