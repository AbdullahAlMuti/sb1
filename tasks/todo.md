# Security Fix Todo

## Phase 1 — Extension Security
- [x] **T1** `apps/extension/background/message-router.js` — sender origin validation + URL safety + remove AI auth bypass (C1, C4, M2)
- [x] **T2** `apps/extension/content_scripts/amazon_injector.js` — XSS in error message innerHTML (C2a)
- [x] **T3** `apps/extension/content_scripts/walmart_injector.js` — XSS in description innerHTML (C2b)
- [x] **T4** `apps/extension/content_scripts/bridge.js` + `message-router.js` — token sync monotonic sequence (M5)
- [x] **T5** `apps/extension/common/sync-utils.js` + `listing-runner.js` — debug flag + missing await (LOW)

## Phase 2 — Edge Function Security
- [x] **T6** `supabase/functions/stripe-webhook/index.ts` — remove dev bypass (C3)
- [x] **T7** Multiple Edge Functions — CORS wildcard sweep + error disclosure (C5, H3)
- [x] **T8** `generate-description`, `generate-description-v2`, `ai-product-research` — prompt injection (M6)

## Phase 3 — Web App + Auth
- [x] **T9** `apps/web/src/pages/auth/Auth.tsx` — collapse auth error messages (H4)
- [x] **T10** `apps/web/src/components/dashboard/DeveloperSettings.tsx` — gate to dev builds only (H1)
- [x] **T11** `packages/auth/src/ProtectedRoute.tsx` — validate goal field before routing (H7)
- [x] **T12** `packages/auth/src/hooks/useAuth.tsx` — surface ensure-profile failure (H5)

## Phase 4 — Database
- [x] **T13** `supabase/migrations/20260624010000_audit_logs_rls.sql` — enable RLS on audit_logs + admin-only policy (H6)

## Phase 5 — Accessibility
- [x] **T14** `packages/auth/src/components/auth/OtpInput.tsx` — aria-label on digit inputs (LOW)
- [x] **T15** `packages/ui/src/components/ui/button.tsx` — aria-disabled passthrough (LOW)
