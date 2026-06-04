# 02 - Security Audit

## Security Score

Overall security score: **46/100**

This score reflects a codebase with meaningful security foundations, especially RLS and role-aware routing, but also several launch-blocking issues. The largest problems are hardcoded secret/default credential material, weak custom OTP handling, missing rate limiting, broad public Edge Function exposure, disabled billing/entitlement checks, and failed dependency/type/lint verification.

| Category | Score | Rationale |
| --- | ---: | --- |
| Authentication | 6/10 | Supabase Auth exists, but custom OTP flow is weak and brute-force controls are not verified. |
| Authorization/RBAC | 6/10 | RLS and admin route guards exist, but service-role functions and inconsistent role/entitlement checks weaken coverage. |
| Input validation | 4/10 | Some validation exists, but many functions parse raw JSON and validate ad hoc. |
| API security | 4/10 | Many functions have `verify_jwt = false`, wildcard CORS, error leakage, and no verified rate limits. |
| Data protection | 6/10 | RLS and some PII auditing exist, but secret storage and PII workflows need hardening. |
| Secrets management | 2/10 | Hardcoded API key and hardcoded admin login defaults are present. |
| Dependency security | 4/10 | `npm audit` reports 14 vulnerabilities, including 6 high. |
| Infrastructure security | 3/10 | No verified security headers, WAF, CI, rate limiting, or central monitoring config. |
| Logging/monitoring | 5/10 | Audit/activity tables exist, but sensitive auth logs and central observability gaps remain. |
| Tenant isolation | 5/10 | RLS and workspace model exist, but user/workspace scoping is inconsistent across domains. |

## Highest Priority Findings

### 1. Hardcoded email provider API key in source

- Severity: Critical
- CWE/OWASP: CWE-798, OWASP A02 Cryptographic Failures, OWASP A07 Identification and Authentication Failures
- Evidence:
  - `supabase/functions/auth-otp/index.ts:194`
  - `supabase/functions/auth-otp/index.ts:402`
- What was found: The OTP function contains a hardcoded Resend API key in the `Authorization` header. The value is not reproduced here.
- Exploit scenario: Anyone with repository access can use the key to send email through the account, exhaust quota, impersonate service email, or abuse deliverability reputation.
- Business impact: Account compromise, spam/abuse cost, user trust damage, and incident response burden.
- Fix:
  - Revoke and rotate the key immediately.
  - Store it as a Supabase function secret, for example `RESEND_API_KEY`.
  - Reference it with `Deno.env.get("RESEND_API_KEY")`.
  - Add secret scanning to CI and pre-commit hooks.
- Priority: P0, before any public launch.

### 2. Hardcoded admin login default credential values

- Severity: Critical
- CWE/OWASP: CWE-798, OWASP A07 Identification and Authentication Failures
- Evidence:
  - `apps/admin/src/pages/AdminLogin.tsx:18`
  - `apps/admin/src/pages/AdminLogin.tsx:19`
- What was found: The admin login page initializes `email` and `password` state with hardcoded credential-like values. Values are not reproduced here.
- Exploit scenario: If the credentials are valid in any environment, an attacker can access the admin console. Even if they are stale, they create a dangerous reuse and disclosure risk.
- Business impact: Full administrative compromise, user data exposure, credit/subscription abuse, and platform takeover.
- Fix:
  - Remove default values.
  - Rotate the associated account password.
  - Require MFA or WebAuthn for admin users.
  - Audit all admin accounts and recent admin activity.
- Priority: P0, before any public launch.

### 3. Custom OTP flow uses weak randomness, logs OTP values, and can return OTP to clients

- Severity: High
- CWE/OWASP: CWE-330, CWE-532, OWASP A07 Identification and Authentication Failures
- Evidence:
  - OTP generated with `Math.random`: `supabase/functions/auth-otp/index.ts:170`
  - OTP logged on send/resend paths: `supabase/functions/auth-otp/index.ts:189`, `supabase/functions/auth-otp/index.ts:397`
  - Sandbox fallback returns OTP to client: `supabase/functions/auth-otp/index.ts:241`, `supabase/functions/auth-otp/index.ts:449`
  - Verification marks records by `code` only: `supabase/functions/auth-otp/index.ts:316`
- What was found: OTP generation is not cryptographically secure, OTP values can appear in logs, sandbox fallback can expose OTP values to the client, and verification update scope is too broad if code collisions occur.
- Exploit scenario: Attackers brute force or predict OTPs, obtain OTPs from logs or accidental fallback behavior, or exploit code collision behavior.
- Business impact: Account takeover and privacy breach.
- Fix:
  - Use `crypto.getRandomValues` or Supabase native OTP flows.
  - Never log OTP values.
  - Never return OTP values to clients outside isolated local development.
  - Scope update/delete by `user_id`, `code`, and unused status.
  - Add attempt counters, expiry, per-email/IP rate limits, and lockouts.
- Priority: P0.

### 4. No repository-verified rate limiting for auth, AI, email, billing, extension, or sync APIs

- Severity: High
- CWE/OWASP: CWE-307, OWASP A04 Insecure Design
- Evidence:
  - `auth-otp` raw request parse with no limiter: `supabase/functions/auth-otp/index.ts:26`
  - Login-context user search path: `supabase/functions/auth-otp/index.ts:47`
  - Many publicly reachable function configs: `supabase/config.toml:3`
- What was found: No code or infrastructure config verifies per-IP, per-user, per-email, or per-token rate limits for sensitive endpoints.
- Exploit scenario: Attackers brute force OTP/login, burn AI or email provider quota, generate Stripe/customer portal spam, or run large sync loops.
- Business impact: Account takeover attempts, denial of service, provider billing spikes, and fraud.
- Fix:
  - Add Redis/Upstash/Supabase-backed rate limits for auth and high-cost endpoints.
  - Apply strict limits to OTP send/verify, login validation, AI generation, checkout, extension sync, listing creation, and order APIs.
  - Add abuse telemetry and alerting.
- Priority: P0/P1.

### 5. Many Supabase Edge Functions disable platform JWT verification

- Severity: High
- CWE/OWASP: OWASP A01 Broken Access Control
- Evidence:
  - `supabase/config.toml:3`
  - `supabase/config.toml:6`
  - `supabase/config.toml:18`
  - `supabase/config.toml:21`
  - `supabase/config.toml:63`
  - `supabase/config.toml:72`
- What was found: Many functions are configured with `verify_jwt = false`. Some functions do validate tokens internally, but this shifts all authentication responsibility into each function implementation.
- Exploit scenario: A missing, incomplete, or buggy in-function auth check exposes a public function, potentially with service-role database access.
- Business impact: Data exposure, unauthorized mutation, and privilege escalation.
- Fix:
  - Enable `verify_jwt = true` for every function that only serves authenticated users.
  - Keep `verify_jwt = false` only for truly public functions and webhooks that have an alternate strong verifier.
  - Add a shared auth wrapper with tests for every function.
  - Inventory each function as public, user-authenticated, admin-only, webhook-only, or extension-session-only.
- Priority: P0/P1.

### 6. Wildcard CORS on sensitive functions

- Severity: High
- CWE/OWASP: OWASP A05 Security Misconfiguration
- Evidence:
  - `supabase/functions/auth-otp/index.ts:4`
  - `supabase/functions/create-checkout/index.ts:5`
  - `supabase/functions/ebay-orders/index.ts:3`
  - `supabase/functions/orders-dashboard/index.ts:3`
  - `supabase/functions/_shared/extension-session.ts:3`
- What was found: Several functions allow `Access-Control-Allow-Origin: *`. This is not automatically exploitable without tokens, but it broadens abuse paths and makes browser-origin controls ineffective.
- Exploit scenario: A malicious site can call public functions from a victim browser context if it obtains or induces credentials/tokens through other means.
- Business impact: Easier abuse of auth, billing, listing, and order endpoints.
- Fix:
  - Restrict CORS origins to production app/admin/extension origins.
  - Use separate CORS policies for public, admin, extension, and webhook functions.
  - Treat browser extension origins explicitly.
- Priority: P1.

### 7. Billing/subscription and entitlement checks are disabled or bypassable in important paths

- Severity: High
- CWE/OWASP: OWASP A01 Broken Access Control, OWASP A04 Insecure Design
- Evidence:
  - Route subscription/payment check disabled: `packages/auth/src/ProtectedRoute.tsx:150`
  - Listing feature entitlement only blocks missing entitlement when `authMode === "extension_session"`: `supabase/functions/create-listing/index.ts:66`
  - Plan listing/credit validation commented out: `supabase/functions/create-listing/index.ts:180`
- What was found: Users can access protected application areas without active payment checks, and listing creation can bypass entitlement enforcement through legacy JWT mode.
- Exploit scenario: Users access paid features without a paid/trial plan or create listings without required credits/plan features.
- Business impact: Direct revenue leakage and unfair resource consumption.
- Fix:
  - Re-enable subscription gating in backend first, then frontend.
  - Enforce plan/feature/credit checks on every server-side mutation.
  - Remove or strictly constrain legacy JWT bypass paths.
  - Add tests for expired, free, trialing, canceled, and overridden users.
- Priority: P0/P1.

### 8. Stripe checkout redirects trust request `Origin`

- Severity: Medium
- CWE/OWASP: CWE-601, OWASP A05 Security Misconfiguration
- Evidence:
  - `supabase/functions/create-checkout/index.ts:201`
  - `supabase/functions/create-checkout/index.ts:202`
  - `supabase/functions/create-checkout/index.ts:203`
- What was found: Checkout success/cancel URLs derive from `req.headers.get("origin")`.
- Exploit scenario: A forged request origin could generate checkout sessions that redirect users to attacker-controlled pages after payment.
- Business impact: Phishing and user trust damage.
- Fix:
  - Validate origin against an allowlist.
  - Use environment-configured canonical app URLs.
  - Reject unknown origins.
- Priority: P1.

### 9. Secrets and provider credentials appear to be stored in app settings tables/JSON fields without verified encryption

- Severity: Medium/High
- CWE/OWASP: CWE-312, OWASP A02 Cryptographic Failures
- Evidence:
  - Admin AI key setting name and update path: `apps/admin/src/pages/AdminAISettings.tsx:109`, `apps/admin/src/pages/AdminAISettings.tsx:282`
  - User AI key stored in profile settings path: `apps/admin/src/components/dashboard/UserAISettings.tsx:82`, `apps/admin/src/components/dashboard/UserAISettings.tsx:288`
  - Amazon secret/refresh token update payload: `apps/admin/src/components/admin/AmazonAPISettings.tsx:91`, `apps/admin/src/components/admin/AmazonAPISettings.tsx:95`
- What was found: Admin/user provider keys and marketplace secrets appear to be written through application tables/settings objects. Repository evidence does not prove encryption through Supabase Vault, KMS, or envelope encryption.
- Exploit scenario: If an admin account, service-role function, SQL function, or RLS policy is compromised, external provider keys can be exposed.
- Business impact: Customer marketplace account compromise, AI provider billing abuse, and compliance exposure.
- Fix:
  - Store sensitive provider credentials in Vault/KMS-backed encrypted storage.
  - Never expose secrets back to the client after save.
  - Display only masked metadata and last-rotated timestamps.
  - Add credential rotation and audit events.
- Priority: P1.

### 10. Admin settings may be publicly selectable depending on policy order/effective policies

- Severity: Medium
- CWE/OWASP: OWASP A01 Broken Access Control
- Evidence:
  - Admin settings table: `supabase/migrations/20251226021050_remix_migration_from_pg_dump.sql:89`
  - Public-looking settings policy using `true`: `supabase/migrations/20251226021050_remix_migration_from_pg_dump.sql:962`
- What was found: A policy named for viewing settings uses `true` as a condition in the inspected migration. Earlier admin-only policies also exist, so effective behavior must be verified in the applied database.
- Exploit scenario: If sensitive admin settings are visible to all authenticated users, provider configuration and operational data can leak.
- Business impact: Data leakage and secret exposure if settings contain sensitive values.
- Fix:
  - Review effective policies in the live Supabase dashboard.
  - Split public settings from private admin secrets into separate tables.
  - Require admin role checks for private settings.
  - Add RLS tests.
- Priority: P1.

### 11. Dependency audit reports high and moderate vulnerabilities

- Severity: Medium/High
- Evidence:
  - `npm audit --json` failed with 14 vulnerabilities: 6 high, 8 moderate.
  - Notable affected packages: Vite, DOMPurify, React Router, PostCSS, Rollup, lodash, minimatch, picomatch, ws, yaml, ajv, brace-expansion.
- What was found: Dependency vulnerabilities are present in installed dependency graph. DOMPurify advisories are especially relevant because SPA token storage in localStorage increases XSS impact.
- Exploit scenario: A known dependency vulnerability is triggered through crafted input, dev server exposure, or client-side sanitization bypass.
- Business impact: XSS, build compromise, data theft, or reliability issues depending on advisory.
- Fix:
  - Run `npm audit fix` only after reviewing lockfile impact.
  - Upgrade DOMPurify, Vite, React Router, and related transitive dependencies.
  - Re-run tests, typecheck, lint, and browser smoke tests.
- Priority: P1.

### 12. LocalStorage session persistence increases XSS blast radius

- Severity: Medium
- CWE/OWASP: OWASP A03 Injection
- Evidence:
  - Supabase client uses `storage: localStorage`: `packages/api-client/src/supabase/client.ts:21`
  - Session persistence enabled: `packages/api-client/src/supabase/client.ts:24`
- What was found: Auth sessions are persisted in localStorage. This is a common SPA choice, but any XSS can read tokens.
- Exploit scenario: A dependency XSS or unsafe HTML injection steals Supabase JWTs from localStorage.
- Business impact: Account takeover and data exposure until tokens expire or are revoked.
- Fix:
  - Harden CSP and security headers.
  - Keep DOMPurify patched.
  - Avoid unsafe HTML sinks.
  - Consider a server-side session model for admin.
  - Require MFA for admin accounts.
- Priority: P1/P2.

### 13. Extension manifest has broad host permissions and web-accessible resources

- Severity: Medium
- CWE/OWASP: OWASP A05 Security Misconfiguration
- Evidence:
  - Extension permissions: `apps/extension/manifest.json:7`
  - Host permissions: `apps/extension/manifest.json:13`
  - Content scripts: `apps/extension/manifest.json:43`
  - Web-accessible resources: `apps/extension/manifest.json:157`
- What was found: The extension requests broad marketplace/domain permissions and exposes internal resources to external host matches.
- Exploit scenario: A content-script bug, message-validation flaw, or supply-chain issue can expose extension tokens or manipulate marketplace pages.
- Business impact: Customer account abuse, marketplace listing manipulation, and reputational damage.
- Fix:
  - Minimize host permissions to exact paths/domains needed.
  - Validate all `postMessage` and runtime message origins.
  - Keep extension tokens isolated and short-lived.
  - Add extension-specific threat model tests.
- Priority: P1/P2.

### 14. Order APIs perform expensive aggregation and return debug metadata

- Severity: Medium
- CWE/OWASP: OWASP A04 Insecure Design
- Evidence:
  - PII audit logs: `supabase/functions/ebay-orders/index.ts:177`
  - Revenue aggregation batches over order rows: `supabase/functions/ebay-orders/index.ts:190`
  - Debug object returned: `supabase/functions/ebay-orders/index.ts:282`
  - Hard delete path: `supabase/functions/ebay-orders/index.ts:305`
- What was found: The eBay orders API performs request-time aggregation and returns a debug object with internal calculation metadata. Delete is a hard delete.
- Exploit scenario: Repeated requests create DB load; debug data reveals implementation details; hard deletes make audit/recovery difficult.
- Business impact: Performance degradation, operational leakage, and support/compliance gaps.
- Fix:
  - Move aggregates to materialized views or async summary tables.
  - Remove debug metadata from production responses.
  - Use soft delete or auditable deletion for order data.
- Priority: P2.

### 15. Typecheck and lint failures reduce security assurance

- Severity: Medium
- Evidence:
  - `npm run typecheck` failed in `apps/web`.
  - `npm run lint` failed with 503 problems.
  - Conditional hook lint error: `packages/auth/src/components/auth/TurnstileCaptcha.tsx:18`
  - Control regex lint error: `packages/utils/src/whatsapp.ts:11`
- What was found: The repository currently cannot prove type-safe builds and lint hygiene.
- Exploit scenario: Type drift and lint failures hide authorization, validation, and runtime bugs.
- Business impact: Regression risk and lower confidence in production releases.
- Fix:
  - Regenerate Supabase types after migrations.
  - Resolve Shopify type drift and missing mocks.
  - Fix lint categories incrementally, starting with hook rules and shared auth/API packages.
  - Add CI gates.
- Priority: P1/P2.

## Security Strengths

- Supabase Auth is used instead of a fully custom password system.
- RLS is enabled across many tables.
- Many owner-based and admin-based policies exist.
- The extension session design hashes opaque tokens server-side.
- Stripe webhook signature verification exists for non-development mode.
- Some PII access audit logging exists for eBay order access.
- Admin routes are structurally protected with shared route guards.

## Compliance Readiness

| Area | Repository verdict |
| --- | --- |
| GDPR data export/delete | Not verified from repository. Some delete flows exist, but full data-subject request handling is not proven. |
| SOC 2 controls | Not verified from repository. No CI/security monitoring/access-review evidence found. |
| PCI | Stripe is used, which can keep card data out of scope, but complete PCI scope is not verified from repository. |
| Audit logs | Partial. `audit_logs`, admin notes/logs, extension activity/error logs, and PII access audit examples exist. |
| Secrets rotation | Not verified. Hardcoded secret material means rotation is urgent. |
| Backups/PITR | Not verified from repository. |

