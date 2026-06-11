# SellerSuit Production Readiness Checklist

This document details the critical tasks required to safely deploy SellerSuit to 100,000 users and successfully publish it to the Chrome Web Store.

---

## 1. Chrome Web Store Publish Checklist
- [ ] **Scoping & Tab Isolation:** Ensure the side panel default path is removed from the manifest and handled programmatically in the background worker via `chrome.sidePanel.setOptions` to avoid showing the panel on unrelated sites.
- [ ] **Least Privilege Permissions:** Review and prune permissions in `manifest.json`. Remove wildcard `*` host permissions where possible, and document the business justification for each retained permission (e.g., `scripting` and CDN image domains).
- [ ] **Content Security Policy (CSP):** Ensure `manifest.json` does not include permissive remote scripts. All code must be local to the extension bundle.
- [ ] **Privacy & Disclosure:** Draft a clear privacy policy page detailing how Amazon/Walmart product scraping operates locally in the user's browser without leaking raw supplier sessions.
- [ ] **Actionable Error States:** Verify that all background network failures (like eBay session timeouts or auth expirations) show user-friendly, descriptive messages in the DOM overlay, rather than failing silently.

---

## 2. Security & Compliance Checklist
- [ ] **Enable Subscription Gating:** Re-enable the billing checks in `packages/auth/src/ProtectedRoute.tsx`.
  ```typescript
  if (!subscribed && !isAdmin && !isSuperAdmin) {
    return <Navigate to="/payment-required" replace />;
  }
  ```
- [ ] **Server-Side Credit Deduction:** Implement the Postgres RPC or server-side credit deduction logic in `create-listing` Edge Function. Do not rely on client-side state for credit validation or depletion.
- [ ] **Tighten CORS Policies:** Replace the wildcard CORS headers (`Access-Control-Allow-Origin: *`) in Supabase Edge Functions with a strict whitelist of domains (e.g., `https://sellersuit.com` and `chrome-extension://<id>`).
- [ ] **Secure Session Tokens:** Ensure `ssat_` token generation uses high-entropy random byte arrays, and token hashes are stored in the database using SHA-256 with expiration timestamps.

---

## 3. 100K User Scalability Checklist
- [ ] **O(1) Auth Indexed Lookup:** Replace all paginated listing loops (`auth.admin.listUsers`) in auth functions with database indexed profile queries and direct `getUserById` lookup.
- [ ] **Asynchronous Task Queuing:** Migrate synchronous database sync payloads (`SYNC_LISTING`) to a background task runner using a message queue system (e.g., Supabase pgmq or Inngest). This ensures slow database writes or eBay network timeouts do not cause Supabase server exhaustion.
- [ ] **Aggregate Metric Caching:** Cache order dashboard calculations. Replace on-the-fly revenue and metric aggregates with pre-calculated materialized views or status counter tables that update incrementally via database triggers.
- [ ] **Scalable Image Upload Proxying:** Offload image proxying (`sellersuit.com/api/extension/image`) to a serverless CDN proxy (e.g., Cloudflare Workers) to absorb high network egress loads for concurrent image uploads.
- [ ] **Database Connection Pooling:** Verify that Supabase Supavisor connection pooling is correctly configured to support up to 5,000 concurrent database connections.

---

## 4. eBay API Compliance Checklist
- [ ] **Token Expiration Handling:** Ensure background token refresh is executed automatically before the 2-hour eBay access token expiration window.
- [ ] **VeRO Brand Database Updates:** Maintain a cron job to sync the latest eBay VeRO brand list to the database every 24 hours so that title brand checks stay current.
- [ ] **MSKU Validation Rules:** Pre-validate multi-variation SKU listings before upload. eBay rejects duplicate combinations or variations containing invalid characters. Ensure our client normalizer catches these before sending requests.

---

## 5. Monitoring & Logging Checklist
- [ ] **Sentry Error Tracking:** Verify Sentry client and backend instrumentation is active to log Javascript exceptions in the service worker and content scripts.
- [ ] **Edge Function Logs:** Set up persistent logging and alerts on Supabase Edge Function execution times and HTTP 5xx responses.
- [ ] **Extension Health Metrics:** Log failure rates for scraping and EPS image uploads through a telemetry endpoint to capture breaking changes in Amazon/Walmart DOM structures or eBay APIs early.
- [ ] **Rate Limit Auditing:** Monitor IP rate limit hits for auth and listing creation functions to detect abuse or botting behaviors early.
