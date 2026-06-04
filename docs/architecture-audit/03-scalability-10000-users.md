# 03 - Scalability Review For 10,000 Users

## 10,000 User Verdict

SellerSuit is **not ready for 10,000 active users** in its current repository state.

The product can likely support small early traffic with Supabase and Vercel, but the codebase has launch-blocking security issues, failed verification checks, missing rate limiting, no verified queue/cache/observability layer, and several request-time database bottlenecks. A 10,000-user target is realistic after hardening, but not as-is.

## Readiness Score

| Dimension | Status | Notes |
| --- | --- | --- |
| Static frontend hosting | Partially ready | Vercel-style SPA configs exist. Security headers and CDN/WAF rules are not verified. |
| Auth scale | Not ready | OTP flow uses user listing scans and has no verified rate limiting. |
| API scale | Partially ready | Edge Functions scale horizontally, but many functions rely on service-role DB calls and ad hoc validation. |
| Database scale | Partially ready | Good indexes exist, but generated types drift, request-time aggregates, and no verified pooler/read replica config. |
| Tenant isolation | Partially ready | User and workspace isolation exist, but tenancy model is mixed. |
| Marketplace sync | Not ready | Sync paths are synchronous and no worker/queue implementation is verified. |
| Order dashboards | Not ready | Some APIs compute aggregates in request path and perform multiple count queries. |
| Billing scale | Partially ready | Stripe integration exists. Idempotency and origin allowlisting need work. |
| Security/abuse controls | Not ready | No verified rate limiting, WAF, strict CORS, or secret hygiene. |
| Observability | Not ready | No central metrics/traces/alerts verified. |
| CI/CD release safety | Not ready | No `.github` workflows found; typecheck/lint/audit fail locally. |

## Main Bottlenecks

### 1. OTP/auth path scans Supabase users

Evidence:

- `auth.admin.listUsers({ page: 1, perPage: 5000 })`: `supabase/functions/auth-otp/index.ts:47`
- Client-side email find: `supabase/functions/auth-otp/index.ts:56`
- Signup path uses admin user listing: `supabase/functions/auth-otp/index.ts:126`

Problem:

Listing users to validate login/signup context does not scale. At 10,000+ users, this adds latency, can miss users beyond pagination, and creates pressure on Auth Admin APIs.

Fix:

- Use Supabase Auth APIs or a normalized indexed profile/auth lookup path.
- Do not use `listUsers` for per-request lookup.
- Add rate limits and backoff to auth flows.

### 2. Order API calculates aggregates during requests

Evidence:

- eBay order revenue batches over rows: `supabase/functions/ebay-orders/index.ts:190`
- Multiple service-role count queries: `supabase/functions/ebay-orders/index.ts:239`

Problem:

Repeated dashboard requests can scan large order sets and issue multiple queries per request. At 10,000 users, marketplace order volume can grow faster than user count.

Fix:

- Precompute summary tables by user/workspace/date/status.
- Update summaries through sync workers or database triggers.
- Add materialized views only where refresh strategy is defined.
- Cache hot dashboard summaries.

### 3. No verified queue or worker implementation

Evidence:

- `services/sync-workers` exists as placeholder only.
- Extension/job tables exist, but no production worker process is verified from repository.

Problem:

Marketplace sync, AI generation, email, order enrichment, and import/export tasks should not run only in user request paths.

Fix:

- Add queue-backed workers for sync, AI, email, order imports, enrichment, and retries.
- Options: Supabase Queues/pgmq, Inngest, Trigger.dev, Cloudflare Queues, AWS SQS/Lambda, or a container worker.
- Store job state, idempotency keys, retry counts, and dead-letter entries.

### 4. No verified cache layer

Evidence:

- No Redis/cache infrastructure config found.
- TanStack Query provides client caching only.

Problem:

Every user can trigger repeated DB/API work for dashboards, admin views, feature flags, settings, and extension config.

Fix:

- Add Redis/Upstash for rate limiting and hot cache.
- Cache feature flags, plans, public settings, dashboard summaries, and idempotency tokens.
- Use short TTLs for user-specific caches and longer TTLs for public config.

### 5. Service-role Edge Functions can create DB pressure and bypass RLS

Evidence:

- Service-role client in auth OTP: `supabase/functions/auth-otp/index.ts:22`
- Service-role client in checkout: `supabase/functions/create-checkout/index.ts:20`
- Service-role client in shared extension middleware: `supabase/functions/_shared/extension-session.ts:69`
- Service-role reads in eBay orders: `supabase/functions/ebay-orders/index.ts:97`

Problem:

Service-role access is sometimes necessary, but it centralizes risk and can bypass tenant isolation if function checks are incomplete.

Fix:

- Prefer RLS-aware anon/user clients where possible.
- Require shared authorization wrappers before service-role operations.
- Add function-level tests for cross-tenant access.

### 6. Missing verification gates

Evidence:

- `npm run typecheck` failed.
- `npm run lint` failed.
- `npm audit --json` failed.
- No `.github` directory found.

Problem:

At 10,000 users, release mistakes become incidents. Failed gates mean the repo is not currently production-reliable.

Fix:

- Add CI with install, typecheck, lint, tests, audit, Supabase type generation check, and build.
- Block deploy on failed gates.

## 10,000 User Architecture Requirements

### Required Infrastructure

| Component | Recommendation |
| --- | --- |
| Frontend hosting | Vercel or equivalent behind CDN, with strict security headers and environment separation. |
| WAF/rate limiting | Cloudflare/Vercel WAF plus Redis-backed app rate limits. |
| Database | Supabase paid tier with connection pooling, PITR backups, query monitoring, and upgrade path to read replicas. |
| Queue/workers | Dedicated queue and worker runtime for sync, email, AI, imports, enrichment, and retries. |
| Cache | Redis/Upstash for rate limits, idempotency, feature flags, summaries, and short-lived user caches. |
| Observability | Sentry for frontend/backend errors, Logflare/Datadog/New Relic for logs/metrics/traces, alerting on auth/API/DB/Stripe failures. |
| Secrets | Supabase secrets plus Vault/KMS for provider credentials. |
| CI/CD | Automated typecheck, lint, tests, audit, build, migration validation, and secret scanning. |
| Backups | Supabase PITR, backup restore drills, and schema migration rollback plan. |
| Extension delivery | Versioned signed extension releases and least-privilege manifest permissions. |

### Required Code Changes

1. Rotate and remove hardcoded secrets and admin defaults.
2. Replace or harden custom OTP.
3. Add rate limiting and abuse protection.
4. Re-enable backend billing and entitlement checks.
5. Tighten CORS and enable JWT verification where possible.
6. Fix typecheck and generated Supabase type drift.
7. Fix dependency audit.
8. Move heavy order/dashboard aggregates out of request path.
9. Introduce queue-backed sync workers.
10. Add production observability and CI gates.

### Required Database Changes

| Area | Action |
| --- | --- |
| Auth lookup | Remove per-request `auth.admin.listUsers` scans. |
| Orders | Add summary tables/materialized views and indexes for common dashboard filters. |
| Tenancy | Standardize user/workspace scoping per domain. |
| Secrets | Move provider credentials to encrypted storage. |
| RLS tests | Add automated tests for owner/admin/workspace isolation. |
| Definer functions | Audit `SECURITY DEFINER` functions for `search_path`, role checks, and input validation. |
| Idempotency | Add idempotency tables for Stripe, marketplace sync, extension jobs, AI generation, and email sends. |

## Projected Scaling Roadmap

### Stage 1: Safe Beta, 100 to 500 users

Minimum requirements:

- Fix P0 security findings.
- Pass typecheck/lint/audit baseline.
- Add auth/API rate limiting.
- Enable strict CORS and security headers.
- Add basic Sentry/logging.
- Add CI gates.

### Stage 2: Launch, 500 to 2,000 users

Minimum requirements:

- Queue-backed marketplace sync and email/AI jobs.
- Dashboard summary tables.
- Stripe idempotency and billing enforcement.
- Supabase connection pooler monitoring.
- RLS and function authorization tests.
- Extension permission reduction.

### Stage 3: Growth, 2,000 to 10,000 users

Minimum requirements:

- Redis cache/rate limits fully deployed.
- Worker scaling and retry/dead-letter queues.
- Materialized summaries for orders/revenue/activity.
- Query performance monitoring with `pg_stat_statements`.
- Alerting on auth failures, provider quota, Stripe webhook lag, DB CPU/IO, and Edge Function errors.
- Backup restore drills and incident runbooks.

### Stage 4: Beyond 10,000 users

Likely additions:

- Read replicas for analytics/admin views.
- Multi-region CDN and edge caching.
- Dedicated search/indexing layer if listing/order search grows.
- Warehouse/BI export for long-running analytics.
- Domain service split for marketplace sync if worker throughput dominates.

## Can The Current Database Support 10,000 Users?

Answer: **Not proven from repository evidence.**

Reasons:

- Supabase/Postgres can support 10,000 users with the right tier, pooling, indexes, query patterns, and workload shape.
- The repository contains useful indexes and RLS, but also request-time aggregate loops and auth user scans.
- Production database size, query plans, Supabase tier, pooling settings, backups, and monitoring are not available in the repository.

Practical verdict:

- It may support early production after P0/P1 fixes.
- It should not be assumed ready for 10,000 active users until load tests and query-plan reviews are completed.

## Load Test Plan

Before launch, run:

1. Auth and OTP abuse test: signup, resend, verify, login-context validation.
2. Dashboard read test: 100, 1,000, 10,000 users with realistic listings/order counts.
3. Marketplace sync test: concurrent extension sessions and batch uploads.
4. Admin dashboard test: support, users, credits, order lookups.
5. Stripe flow test: checkout creation and webhook idempotency.
6. Extension token test: refresh, revoke, concurrent device sessions.
7. DB query-plan test: top 20 slow queries with `EXPLAIN ANALYZE`.

Target SLOs for launch:

- P95 app page API response under 500 ms for common dashboard reads.
- P95 write mutations under 1 second excluding external provider latency.
- P99 auth/OTP validation under 1 second.
- Zero cross-tenant data access in automated tests.
- No critical/high dependency advisories unresolved.

