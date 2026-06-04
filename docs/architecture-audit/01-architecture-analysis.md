# 01 - Architecture Analysis

## Overall Architecture Verdict

SellerSuit is a moderately mature serverless SaaS monorepo, not an enterprise-grade distributed system yet.

Current architecture level: **Level 3 - Production MVP / early SaaS platform**.

It is more advanced than a basic CRUD app because it includes:

- Multiple independently deployable frontends.
- Shared auth and API packages.
- Supabase Postgres with RLS, policies, indexes, triggers, and functions.
- Supabase Edge Functions for backend workflows.
- Stripe payment integration.
- Browser extension session and workspace model.
- Admin console and audit-style tables.

It is not advanced/enterprise yet because:

- Security-critical secrets and credentials are hardcoded in source.
- Local verification fails on typecheck, lint, and dependency audit.
- Several protected workflows rely on `verify_jwt = false` functions with custom in-function auth.
- Rate limiting, queueing, caching, centralized observability, WAF controls, production headers, and CI evidence are missing from repository evidence.
- Some billing and entitlement controls are disabled or bypassable in code.

## System Style

The architecture is a **serverless modular monolith**:

- The frontend is modularized by apps and shared packages.
- The backend is modularized by Supabase Edge Functions, but still shares one Supabase Auth, one Postgres database, and one RLS/data-policy layer.
- Domain boundaries are emerging but not fully enforced. Marketplace, billing, extension, admin, auth, and order domains are recognizable, but service boundaries are still code/path based rather than independently owned deployable services.

This is a pragmatic shape for an early SaaS product, but it needs stronger operational controls before public launch at scale.

## Logical Layers

| Layer | Current implementation | Quality assessment |
| --- | --- | --- |
| Presentation | `apps/marketing`, `apps/web`, `apps/admin`, `apps/extension` | Good separation of surfaces. Admin and web share auth logic. Extension permissions are broad and need tightening. |
| Client state/data | React Router, TanStack Query, shared Supabase client | Reasonable. Generated Supabase type drift currently breaks typecheck. |
| Auth/session | Supabase Auth, custom OTP, custom extension sessions | Functional but high-risk. OTP and secrets handling need urgent repair. |
| Authorization | Frontend route guards, Supabase RLS, role tables, Edge Function checks | Multiple layers exist, but consistency gaps remain across frontend admin roles, shared function middleware, and disabled subscription checks. |
| Backend API | Supabase Edge Functions | Useful serverless backend, but many functions disable platform JWT verification and must enforce auth manually. |
| Business logic | Edge Functions, Postgres functions, app components | Distributed across client, Edge Functions, and SQL. Needs clearer domain boundaries. |
| Data access | Supabase JS, PostgREST, RPC, service-role admin clients | RLS exists, but service-role functions create bypass risk if validation/auth is incomplete. |
| Data model | Postgres migrations | Rich schema with RLS, indexes, workspace model, marketplace tables, and admin tables. Needs generated type refresh and security review of `SECURITY DEFINER` functions. |
| Payments | Stripe checkout, customer portal, webhook | Basic Stripe architecture exists. Idempotency, origin allowlisting, and coupon accounting need hardening. |
| Observability | Console logs, audit tables, activity/error tables | Partial. No centralized logging, metrics, traces, alerts, or SLOs verified. |
| Deployment | Vercel SPA configs, Supabase config | Basic. Security headers, CI/CD, environment separation, and infrastructure-as-code are not verified. |

## Frontend Architecture

### Web App

Evidence:

- Main app routes: `apps/web/src/App.tsx:140`
- Protected marketplace/dashboard route groups: `apps/web/src/App.tsx:77`, `apps/web/src/App.tsx:104`
- Admin redirect from web app: `apps/web/src/App.tsx:70`

The customer web app wraps protected dashboards in shared `ProtectedRoute` and separates eBay/Shopify dashboard routing. This is a workable routing model. The main weakness is that important billing logic is disabled in the route guard.

Evidence:

- Payment/subscription check disabled: `packages/auth/src/ProtectedRoute.tsx:150`

### Admin App

Evidence:

- Admin route wrapper: `apps/admin/src/App.tsx:59`
- Admin protected routes: `apps/admin/src/App.tsx:65`
- Login routes: `apps/admin/src/App.tsx:131`

The admin app uses the shared auth provider and requires admin privileges. That is good structurally. However, admin login has hardcoded default credential values in component state, and role handling differs between client auth and extension middleware.

Evidence:

- Hardcoded admin login initial values: `apps/admin/src/pages/AdminLogin.tsx:18`
- Frontend role list includes moderator: `packages/auth/src/hooks/useAuth.tsx:16`
- Extension shared admin check accepts only admin/super_admin: `supabase/functions/_shared/extension-session.ts:135`

### Marketing App

Marketing is isolated as its own Vite app. This is useful because public traffic and authenticated app traffic can be deployed/cached separately.

### Browser Extension

Evidence:

- Permissions and host permissions: `apps/extension/manifest.json:7`
- Content scripts and marketplace matches: `apps/extension/manifest.json:43`
- `all_frames: true` auth/dashboard bridge: `apps/extension/manifest.json:154`

The extension is functionally significant and should be treated as a privileged application surface. It uses custom extension sessions and broad content-script coverage across marketplaces. This raises the product's security bar: token storage, message passing, web accessible resources, and host permissions need careful review before launch.

## Backend/API Architecture

Supabase Edge Functions act as the backend API layer. The pattern is mostly:

1. Browser app or extension calls an Edge Function.
2. Function applies CORS, parses JSON, authenticates the user or extension session, validates input ad hoc.
3. Function uses Supabase anon client for JWT validation or service-role client for database operations.
4. Function reads/writes Postgres, sometimes relying on RLS and sometimes bypassing it with service-role access.

Evidence:

- Supabase client setup in frontend: `packages/api-client/src/supabase/client.ts:21`
- Functions with `verify_jwt = false`: `supabase/config.toml:3`
- Service-role auth OTP client: `supabase/functions/auth-otp/index.ts:22`
- Service-role checkout client: `supabase/functions/create-checkout/index.ts:20`
- Shared extension session service client: `supabase/functions/_shared/extension-session.ts:69`

This architecture can work, but it requires strict function-level controls. When `verify_jwt = false` is used, every function becomes responsible for:

- Origin/CORS control
- Auth token extraction
- JWT or extension session validation
- Role and workspace authorization
- Rate limiting
- Input schema validation
- Abuse prevention
- Error redaction

The repository does not consistently prove all of these controls.

## Authentication And Session Architecture

### Web/Admin Auth

Evidence:

- Roles include user/admin/super_admin/moderator: `packages/auth/src/hooks/useAuth.tsx:16`
- Admin/superadmin derived from profile role: `packages/auth/src/hooks/useAuth.tsx:47`
- `user_roles` loaded separately: `packages/auth/src/hooks/useAuth.tsx:114`
- Login uses `auth-otp` to validate login context before Supabase password sign-in: `packages/auth/src/hooks/useAuth.tsx:217`
- Supabase password sign-in: `packages/auth/src/hooks/useAuth.tsx:239`
- Session persistence uses localStorage: `packages/api-client/src/supabase/client.ts:21`

The app relies on Supabase Auth sessions persisted in localStorage. That is common in SPAs, but it increases XSS impact because tokens are readable by JavaScript. This makes CSP, dependency hygiene, DOMPurify patching, and extension-message validation more important.

### OTP Signup/Verification

Evidence:

- OTP generated with `Math.random`: `supabase/functions/auth-otp/index.ts:170`
- OTP logged: `supabase/functions/auth-otp/index.ts:189`
- Sandbox fallback returns OTP to client: `supabase/functions/auth-otp/index.ts:241`
- OTP verification marks rows by code only: `supabase/functions/auth-otp/index.ts:316`

The custom OTP flow is a high-risk component and should be replaced or hardened before launch.

### Extension Sessions

Evidence:

- Access and refresh token TTLs: `supabase/functions/_shared/extension-session.ts:9`
- Opaque token generation/hashing: `supabase/functions/_shared/extension-session.ts:338`
- Access-token validation checks status, expiry, device, profile, membership, and last-seen update: `supabase/functions/_shared/extension-session.ts:412`
- Resolver supports `ssat_` extension access tokens and legacy Supabase JWTs: `supabase/functions/_shared/extension-session.ts:530`

The extension session design is one of the more advanced parts of the architecture. It creates opaque extension tokens and hashes them server-side, which is a sound pattern. The main gaps are broad manifest permissions, legacy token compatibility, entitlement inconsistency, and the absence of rate limiting.

## Authorization And RBAC

Authorization exists in three places:

1. Client route guards and UI checks.
2. RLS policies and Postgres functions.
3. Edge Function role/workspace checks.

Evidence:

- Protected route checks: `packages/auth/src/ProtectedRoute.tsx:36`
- Admin route checks: `packages/auth/src/ProtectedRoute.tsx:133`
- Admin app requires admin route wrapper: `apps/admin/src/App.tsx:59`
- RLS policies in base migration: `supabase/migrations/20251226021050_remix_migration_from_pg_dump.sql:696`
- RLS enablement in base migration: `supabase/migrations/20251226021050_remix_migration_from_pg_dump.sql:969`

This layered model is directionally correct. The weaknesses are:

- Admin role definitions are not perfectly consistent.
- Many service-role functions can bypass RLS if a bug exists.
- Some subscription/plan enforcement is disabled or conditional.
- Several functions accept unauthenticated requests at the platform level and rely on custom logic.

## Multi-Tenant Architecture

The repository contains two tenant concepts:

- User-centric tenancy through `profiles.user_id`, `listings.user_id`, `ebay_orders.user_id`, `user_plans.user_id`, etc.
- Workspace-centric tenancy for the extension platform through `workspaces`, `workspace_members`, devices, sessions, subscriptions, feature entitlements, and overrides.

Evidence:

- Core user tables and policies: `supabase/migrations/20251226021050_remix_migration_from_pg_dump.sql:323`, `supabase/migrations/20251226021050_remix_migration_from_pg_dump.sql:829`
- Extension workspace tables: `supabase/migrations/20260522123000_extension_foundation.sql:25`
- Workspace/member RLS policies: `supabase/migrations/20260522123000_extension_foundation.sql:475`
- Default workspace creation in shared session middleware: `supabase/functions/_shared/extension-session.ts:146`

Assessment:

- The original customer web app looks mostly user-scoped.
- The extension platform is moving toward workspace tenancy.
- Cross-domain consistency is incomplete. Some APIs still operate in user context, while newer extension paths operate in workspace context.

Before scaling to teams/agencies, choose one canonical tenant model per domain and require all reads/writes to include either `user_id` or `workspace_id` with matching RLS and indexes.

## Database Architecture

Strengths:

- RLS is enabled on many tables.
- Many access-path indexes exist.
- Extension/workspace schema is thoughtful and includes sessions, devices, subscriptions, entitlements, activity logs, errors, and jobs.
- Some PII audit logging is present for eBay order access.
- Postgres extensions include `pg_stat_statements`, which can support performance analysis if enabled in the project.

Weaknesses:

- Generated TypeScript Supabase types are out of sync with migrations; typecheck fails on missing `store_designs`, `shopify_page_settings`, and `get_user_plan_name`.
- About 31 `SECURITY DEFINER` functions exist and need a targeted review for `search_path`, privilege boundaries, and parameter validation.
- Some secret-bearing settings appear to be stored in application tables/settings fields without repository evidence of encryption through Vault or a KMS.
- Some order metrics are computed by scanning batches at request time.

Evidence:

- Supabase type drift errors from `npm run typecheck`.
- Store design tables: `supabase/migrations/20260521001_create_store_designs.sql:10`
- Storage policies: `supabase/migrations/20260521001_create_store_designs.sql:356`
- `SECURITY DEFINER` functions in base migration: `supabase/migrations/20251226021050_remix_migration_from_pg_dump.sql:51`
- eBay order revenue batching: `supabase/functions/ebay-orders/index.ts:190`

## Payment Architecture

Stripe checkout and webhook functions exist. The webhook verifies signatures unless development mode is enabled.

Evidence:

- Checkout auth and Stripe session creation: `supabase/functions/create-checkout/index.ts:42`, `supabase/functions/create-checkout/index.ts:94`
- Untrusted origin used for redirect URLs: `supabase/functions/create-checkout/index.ts:201`
- Stripe webhook secret enforcement: `supabase/functions/stripe-webhook/index.ts:25`
- Webhook signature verification: `supabase/functions/stripe-webhook/index.ts:102`

Needed improvements:

- Add redirect origin allowlist.
- Add idempotency tables/checks for checkout/webhook state transitions.
- Move coupon accounting to confirmed webhook events or transactional database updates.
- Confirm PCI scope and never store card data. Not verified from repository.

## Data Flow Summary

Typical authenticated web request:

1. User loads Vite SPA from Vercel.
2. SPA initializes Supabase client with public URL and publishable key.
3. Supabase Auth session is restored from localStorage.
4. `AuthProvider` loads profile and roles.
5. `ProtectedRoute` gates route access.
6. Client calls Supabase directly or calls Edge Function.
7. Edge Function validates token/session and uses Supabase client.
8. Postgres RLS or service-role code path controls data access.
9. Response returns to SPA and is cached at client level by TanStack Query where used.

## Architecture Risks

| Risk | Severity | Why it matters |
| --- | --- | --- |
| Hardcoded secrets/default credentials | Critical | Immediate compromise risk if repo is accessible. |
| OTP flow weaknesses | High | Account takeover, brute force, log leakage, and weak randomness risks. |
| Disabled billing/entitlement checks | High | Revenue leakage and unauthorized feature access. |
| Many unauthenticated-at-platform functions | High | Function body auth bugs become direct public API vulnerabilities. |
| No rate limiting | High | Auth, AI, email, Stripe, sync, and order endpoints can be abused. |
| Typecheck/lint failures | Medium | Release reliability and refactor safety are impaired. |
| No verified CI/CD | Medium | Security and build regressions can ship. |
| No verified observability | Medium | Incidents will be slow to detect and debug. |

## Architecture Maturity Score

| Dimension | Score | Notes |
| --- | ---: | --- |
| Frontend modularity | 7/10 | Clear app separation and shared packages. |
| Backend modularity | 6/10 | Edge Functions are modular, but domain boundaries are inconsistent. |
| Database design | 7/10 | Rich schema, RLS, indexes, workspace model. Type drift and definer-function review remain. |
| Security architecture | 4/10 | RLS exists, but secrets, OTP, CORS, JWT config, rate limiting, and dependencies are problematic. |
| Operational maturity | 3/10 | No verified CI, monitoring, WAF, rate limits, or infrastructure-as-code. |
| Scalability design | 4/10 | Supabase/Vercel can scale basics; application-level bottlenecks remain. |

Overall architecture maturity: **Level 3 - Production MVP / early SaaS**, with security launch blockers.

