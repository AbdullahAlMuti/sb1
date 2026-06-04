# 05 - Improvement Roadmap

## Priority Model

- P0: Must fix before public launch.
- P1: Must fix before paid beta or meaningful traffic.
- P2: Should fix during stabilization.
- P3: Longer-term scale and maturity work.

## Immediate: 0 To 7 Days

### 1. Remove hardcoded secret/default credential material

- Priority: P0
- Problem: Hardcoded email API key and admin login defaults exist in source.
- Evidence:
  - `supabase/functions/auth-otp/index.ts:194`
  - `supabase/functions/auth-otp/index.ts:402`
  - `apps/admin/src/pages/AdminLogin.tsx:18`
  - `apps/admin/src/pages/AdminLogin.tsx:19`
- Solution:
  - Rotate the Resend key and any affected admin account credentials.
  - Move provider keys to Supabase function secrets.
  - Remove login default values.
  - Add secret scanning to CI and local hooks.
- Effort: 0.5 to 1 day.

### 2. Stop OTP leakage and weak OTP generation

- Priority: P0
- Problem: OTP uses weak randomness, logs OTPs, and can return OTP to clients through fallback paths.
- Evidence:
  - `supabase/functions/auth-otp/index.ts:170`
  - `supabase/functions/auth-otp/index.ts:189`
  - `supabase/functions/auth-otp/index.ts:241`
  - `supabase/functions/auth-otp/index.ts:316`
- Solution:
  - Use cryptographically secure random generation.
  - Remove OTP values from logs/responses.
  - Scope OTP updates by user and code.
  - Add attempts, expiry, and lockouts.
  - Prefer Supabase native auth OTP if product requirements allow.
- Effort: 1 to 3 days.

### 3. Add basic rate limiting

- Priority: P0
- Problem: No repository-verified rate limiting on auth, AI, checkout, listing, sync, or order APIs.
- Solution:
  - Add Redis/Upstash or a Supabase-backed limiter.
  - Start with OTP send/verify, login-context validation, AI generation, checkout, create listing, sync listing, and order reads.
  - Rate-limit by IP, user ID, email, and extension token where appropriate.
- Effort: 2 to 4 days.

### 4. Re-enable backend billing and entitlement enforcement

- Priority: P0
- Problem: Route payment checks are disabled and listing entitlement checks are incomplete.
- Evidence:
  - `packages/auth/src/ProtectedRoute.tsx:150`
  - `supabase/functions/create-listing/index.ts:66`
  - `supabase/functions/create-listing/index.ts:180`
- Solution:
  - Enforce plans/features/credits server-side for all paid mutations.
  - Remove legacy JWT bypass behavior or apply the same entitlement checks.
  - Keep frontend route gating as UX only, not the source of truth.
- Effort: 2 to 5 days.

### 5. Fix local verification gates

- Priority: P1
- Problem: `npm audit`, `npm run typecheck`, and `npm run lint` fail.
- Solution:
  - Regenerate Supabase types after migrations.
  - Fix Shopify generated type and mock export drift.
  - Upgrade vulnerable dependencies.
  - Fix hook-rule lint errors and shared auth/API lint errors first.
- Effort: 3 to 7 days depending on dependency upgrade fallout.

## Short Term: 1 To 4 Weeks

### 6. Normalize Edge Function auth

- Priority: P1
- Problem: Many functions use `verify_jwt = false` and rely on custom logic.
- Solution:
  - Classify functions as public, authenticated, admin-only, webhook-only, or extension-only.
  - Turn on `verify_jwt = true` for normal authenticated functions.
  - Keep webhook/public functions disabled only when alternate verification exists.
  - Add shared wrappers and tests.
- Effort: 1 to 2 weeks.

### 7. Tighten CORS and add security headers

- Priority: P1
- Problem: Wildcard CORS and missing Vercel security headers.
- Solution:
  - Use environment-specific origin allowlists.
  - Add CSP, frame-ancestors, object-src, base-uri, form-action, upgrade-insecure-requests, HSTS, referrer-policy, and permissions-policy headers.
  - Use stricter admin CSP than marketing/public pages.
- Effort: 2 to 5 days.

### 8. Secure provider credential storage

- Priority: P1
- Problem: Admin/user marketplace and AI keys appear to be stored through app settings/tables without verified encryption.
- Evidence:
  - `apps/admin/src/pages/AdminAISettings.tsx:109`
  - `apps/admin/src/components/dashboard/UserAISettings.tsx:82`
  - `apps/admin/src/components/admin/AmazonAPISettings.tsx:91`
- Solution:
  - Move credentials to Vault/KMS-backed storage.
  - Store only encrypted blobs or references in app tables.
  - Never return raw credentials to the browser after save.
  - Add credential rotation and audit logging.
- Effort: 1 to 2 weeks.

### 9. Add CI/CD release gates

- Priority: P1
- Problem: No repository-verified CI workflow exists.
- Solution:
  - Add CI for install, typecheck, lint, unit tests, build, audit, secret scanning, and Supabase type generation check.
  - Add deployment environment separation.
  - Block production deploys on failed gates.
- Effort: 2 to 5 days.

### 10. Add observability

- Priority: P1
- Problem: Audit/activity tables exist, but no central monitoring, alerting, or tracing is verified.
- Solution:
  - Add Sentry to frontend and Edge Functions where feasible.
  - Centralize Supabase logs with Logflare or equivalent.
  - Alert on OTP spikes, auth failures, Stripe webhook errors, DB slow queries, extension token failures, and provider quota failures.
- Effort: 1 week.

## Medium Term: 1 To 3 Months

### 11. Move marketplace sync and AI/email work to queues

- Priority: P2
- Problem: No verified production worker/queue implementation.
- Solution:
  - Add queue-backed jobs for marketplace sync, AI generation, email, imports, retries, order enrichment, and extension background jobs.
  - Add idempotency keys and dead-letter queues.
  - Keep user requests fast and async.
- Effort: 2 to 4 weeks.

### 12. Add dashboard summary tables

- Priority: P2
- Problem: eBay order APIs aggregate rows during requests.
- Evidence:
  - `supabase/functions/ebay-orders/index.ts:190`
- Solution:
  - Create summary tables keyed by user/workspace/date/status/marketplace.
  - Update summaries from sync workers or database triggers.
  - Cache common dashboard responses.
- Effort: 1 to 3 weeks.

### 13. Standardize tenant model

- Priority: P2
- Problem: User-scoped and workspace-scoped models coexist without a fully unified boundary.
- Solution:
  - Define canonical tenancy per domain.
  - Require all server mutations to include and authorize the tenant scope.
  - Add RLS tests for user and workspace isolation.
  - Update generated types and APIs.
- Effort: 2 to 6 weeks.

### 14. Audit `SECURITY DEFINER` functions

- Priority: P2
- Problem: Many definer functions exist and require targeted security review.
- Solution:
  - Confirm each function sets a safe `search_path`.
  - Confirm parameters are validated.
  - Confirm admin/user/workspace role checks are explicit.
  - Replace definer functions with invoker functions where possible.
- Effort: 1 to 2 weeks.

### 15. Harden browser extension

- Priority: P2
- Problem: Broad host permissions, web-accessible resources, and content-script coverage increase risk.
- Solution:
  - Reduce host permissions and content-script matches.
  - Validate all message origins and payloads.
  - Keep token lifetimes short and refresh behavior auditable.
  - Add extension security test cases.
- Effort: 2 to 4 weeks.

## Long Term: 3 To 12 Months

### 16. Build a dedicated sync/marketplace service layer if throughput demands it

- Priority: P3
- Problem: Edge Functions may not remain ideal for high-volume marketplace sync.
- Solution:
  - Keep Edge Functions for API ingress.
  - Move long-running sync to scalable worker services.
  - Use queue partitions by marketplace and tenant.
  - Add provider-specific backoff and quota management.
- Effort: 1 to 3 months.

### 17. Add analytics/warehouse path

- Priority: P3
- Problem: Admin analytics and seller dashboards can pressure OLTP Postgres as data grows.
- Solution:
  - Export long-term order/listing/activity events to a warehouse.
  - Keep OLTP tables optimized for current application state.
  - Use read replicas or warehouse queries for heavy admin analytics.
- Effort: 1 to 3 months.

### 18. Formalize compliance and incident response

- Priority: P3
- Problem: GDPR/SOC2/incident processes are not verified from repository.
- Solution:
  - Define data retention, export, deletion, breach response, access review, vendor review, and audit log policies.
  - Run backup restore drills.
  - Document RTO/RPO.
- Effort: Ongoing.

## Recommended First Sprint

Week 1 should focus only on launch blockers:

1. Rotate/remove hardcoded secrets and admin defaults.
2. Fix OTP security.
3. Add rate limits to auth and high-cost APIs.
4. Re-enable backend entitlement checks.
5. Add security headers and strict CORS.
6. Fix dependency audit blockers.
7. Add CI gates for typecheck/lint/build/audit/secret scan.

Do not spend this sprint on new features. The current risk is operational and security readiness, not lack of product surface area.

