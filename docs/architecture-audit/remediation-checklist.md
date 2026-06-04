# SellerSuit Audit Remediation Checklist

Generated: 2026-06-04
Source of truth: `D:\tmp\saas_audit_report.md`

## Critical

- [x] F01 Checkout trusts client-supplied Stripe priceId
- [x] F02 Extension pairing accepts caller-supplied workspaceId without membership verification

## High

- [x] F03 Auto-order quota enforcement is non-transactional
- [x] F04 Listing credit deduction is non-transactional
- [x] F05 Checkout success URL is built from untrusted request Origin
- [x] F06 Full typecheck fails in admin workspace
- [x] F07 No repository CI workflows are present
- [x] F08 Multiple UPDATE RLS policies lack WITH CHECK ownership enforcement
- [x] F09 npm audit reports unresolved high/moderate vulnerabilities
- [x] F10 Auto-order function logs full order payloads
- [x] F11 Inventory notification logs request data and recipient email
- [x] F12 Platform JWT verification disabled for many Supabase Edge Functions
- [x] F13 validate-coupon uses service role without rate limiting
- [x] F14 Customer portal resolves Stripe customer by email only
- [x] F15 test-api-key has no local auth, rate limit, or entitlement check in code

## Medium

- [ ] F16 ESLint reports hundreds of violations - remaining baseline: 464 errors, 31 warnings
- [x] F17 SECURITY DEFINER functions are in public schema without execute revoke evidence
- [x] F18 Generated Supabase Database type file does not include newer store_design tables
- [ ] F19 Several production dependencies are outdated - security-audited packages upgraded; broader non-security upgrades remain
- [ ] F20 Frontend paid-subscription route gate is disabled
- [x] F21 eBay item filler writes formatted description directly to innerHTML
- [ ] F22 Extension UI uses innerHTML for dynamic rendering - highest-risk scraped title/description paths fixed; broad extension audit remains
- [ ] F23 Backup and restore drills are documented as needed, not proven functional - runbook added; live drill remains external
- [x] F24 Order revenue total scans pages of rows during request handling
- [ ] F25 No executable 10k-user load-test suite is present - k6 suite added; live execution remains external
- [ ] F26 Amazon inventory sync runs external SP-API work in an Edge Function request - queue foundation added; conversion remains
- [ ] F27 Blog post generation loops AI work in the request path - queue foundation added; conversion remains
- [ ] F28 Google Sheets sync runs upstream retries in the HTTP request path - queue foundation added; conversion remains
- [ ] F29 Several Edge Functions still lack shared rate limiting - highest-risk coupon/portal/test/notification functions fixed; broad rollout remains
- [ ] F30 orders-dashboard verifies claims but has no shared rate-limit helper
- [ ] F31 Supabase functions use wildcard CORS - high-risk billing/coupon/test/notification functions fixed; public/extension review remains
- [x] F32 OTP flow still logs target email addresses
- [ ] F33 Admin exports exist but self-service data export/delete workflow is not proven - runbook added; product workflow remains
- [ ] F34 Dashboard performs multiple direct aggregate queries from the browser
- [ ] F35 Extension sync logging records user emails
- [ ] F36 Development localStorage can override Supabase URL/key

## Low

- [ ] F37 Chart style component uses dangerouslySetInnerHTML

## External Access Required

- [ ] Stripe dashboard verification
- [ ] Supabase advisors and live policy verification
- [ ] DNS, hosting, WAF, and production security headers
- [ ] Runtime monitoring dashboard wiring and alert routing
- [ ] Production load-test execution
- [ ] Dated backup restore drill execution
