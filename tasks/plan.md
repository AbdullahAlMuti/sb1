# Security Fix Plan — SellerSuit Codebase
Generated from 4-agent codebase review.

## Dependency Graph

```
Extension layer:
  message-router.js ← C1, C4, M2 (same file, one task)
  amazon_injector.js ← C2a
  walmart_injector.js ← C2b
  bridge.js ← M5
  sync-utils.js ← LOW(debug)
  listing-runner.js ← LOW(await)

Edge Function layer:
  stripe-webhook/index.ts ← C3 (standalone)
  _shared/cors.ts ← C5 (read-only; already has resolveCorsHeaders)
  _shared/plan-middleware.ts ← C5b (wildcard in enforceActiveSubscription)
  Multiple function index.ts files ← C5 (wildcard CORS sweep)
  admin-update-user-details/index.ts ← H3a (error disclosure)
  admin-delete-user/index.ts ← H3b
  auth-status/index.ts ← H3c
  generate-description/index.ts ← M6a (prompt injection)
  generate-description-v2/index.ts ← M6b (CORS + prompt injection)
  ai-product-research/index.ts ← M6c (prompt injection)

Web App layer:
  apps/web/src/pages/auth/Auth.tsx ← H4 (error enumeration)
  apps/web/src/components/dashboard/DeveloperSettings.tsx ← H1 (rendered in Settings.tsx)
  packages/auth/src/ProtectedRoute.tsx ← H7 (unvalidated goal)
  packages/auth/src/hooks/useAuth.tsx ← H5 (profile race)

DB layer:
  supabase/migrations/ ← H6 (new migration: audit_logs RLS)

Accessibility layer:
  packages/auth/src/components/auth/OtpInput.tsx ← LOW(aria)
  packages/ui/src/components/ui/button.tsx ← LOW(aria-disabled)
```

## False Positives (will NOT fix — confirmed not real issues)

- **M3 (tab listener memory leak)**: `openNewTabForDescription` and `openNewTabForProductDetails` already call `chrome.tabs.onUpdated.removeListener(listener)` inside the listener at lines 653 and 665. Pattern is correct.
- **retryCount missing from useEffect deps**: Already present in the dep array at `CheckoutSuccess.tsx:101`. Already fixed.
- **H8 (email column migration)**: Out of scope — live DB must be verified before adding migration; not safe to add blindly.

---

## Phase 1 — Extension Security (highest blast radius, pre-auth attack surfaces)

### Task 1: Extension message origin validation + URL safety + AI auth bypass
**Files:** `apps/extension/background/message-router.js`
**Issues:** C1, C4, M2
**Acceptance criteria:**
- `chrome.runtime.onMessage` listener rejects messages from unknown senders before any action dispatch
- `request.order.url` and `request.targetURL` are validated to `https://` or `http://` only before `chrome.tabs.create`
- AI action handlers (GENERATE_TITLE, GENERATE_DESCRIPTION, AI_REMOVE_BG) are NOT excluded from the unlock check
- Extension tests still pass: `cd apps/extension && npm test`

**Implementation:**
1. Add sender allowlist check at top of listener (line 74): allow only `chrome.runtime.id` (self) and known content scripts from `*.sellersuit.com` / `*.ebay.com` / `*.amazon.com` / `*.walmart.com`
2. Wrap `request.order.url` usage in `isSafeUrl()` helper (mirrors FETCH_IMAGE_AS_BASE64 check at line 777)
3. Wrap `request.targetURL` in `isSafeUrl()` for `openNewTabForDescription` and `openNewTabForProductDetails`
4. Remove the AI action exclusion from the `!isUnlocked` branch (lines 405-406)

### Task 2: XSS in amazon_injector.js
**File:** `apps/extension/content_scripts/amazon_injector.js`
**Issues:** C2a
**Acceptance criteria:**
- `descriptionPreviewEl.innerHTML = displayHtml` where displayHtml contains `${errorMessage}` is replaced so error text cannot inject HTML
- Description preview rendering (success path) retains HTML support (descriptions are intentionally HTML-formatted eBay content)

**Implementation:**
- In the catch block (around line 2895): escape `errorMessage` before template interpolation, or set via `textContent` on the error span element

### Task 3: XSS in walmart_injector.js
**File:** `apps/extension/content_scripts/walmart_injector.js`
**Issues:** C2b
**Acceptance criteria:**
- Line 2090: `descriptionPreviewEl.innerHTML = bgResp.description` is wrapped with HTML entity escaping or moved to textContent for plain-text responses

**Note:** If `bgResp.description` is intentionally HTML (eBay listing body), it stays as innerHTML but the error path should use textContent.

### Task 4: Token sync monotonic sequence
**File:** `apps/extension/content_scripts/bridge.js`
**Issues:** M5
**Acceptance criteria:**
- Rapid login→logout→login does not leave extension with a stale token
- Each SYNC_TOKEN message carries a monotonic sequence number
- message-router.js SYNC_TOKEN handler only writes if incoming seq >= last written seq

### Task 5: Extension debug noise
**Files:** `apps/extension/common/sync-utils.js`, `apps/extension/background/listing-runner.js`
**Issues:** LOW
**Acceptance criteria:**
- `DEBUG_SYNC = true` changed to `false` (or reads from `ExtensionConfig.FEATURES.DEBUG_MODE`)
- `finishBulkJob()` call at listing-runner.js:350 has `await`

---

## Phase 2 — Edge Function Security

### Task 6: Stripe webhook dev bypass removal
**File:** `supabase/functions/stripe-webhook/index.ts`
**Issues:** C3
**Acceptance criteria:**
- Lines 34-43: the `isDevelopment` bypass is removed entirely
- If `STRIPE_WEBHOOK_SECRET` is missing, function returns 500 regardless of environment
- `deno check` passes on the file

**Implementation:**
- Remove `isDevelopment` variable and the `else if (isDevelopment)` branch
- Use test webhook secret for local dev (environment concern, not code)

### Task 7: CORS wildcard sweep + error disclosure
**Files:** Multiple `supabase/functions/*/index.ts`, `supabase/functions/_shared/plan-middleware.ts`
**Issues:** C5, H3
**Acceptance criteria:**
- All web-app-facing functions replace `{ 'Access-Control-Allow-Origin': '*' }` const with `resolveCorsHeaders(req)` pattern already used in stripe-webhook
- `enforceActiveSubscription()` in plan-middleware.ts removes its hardcoded wildcard
- Raw `error.message` from DB errors is never returned to clients; replaced with generic `"Operation failed"`
- Functions affected: `ensure-profile`, `ai-product-research`, `delete-demo-ebay-orders`, `dashboard-overview`, `test-ai-generation`, `generate-blog-post`
- Extension-facing functions (`generate-description-v2`, `extension-config`, `generate-description`) get `resolveCorsHeaders(req, { extension: true })` — safe because extension service worker fetch is not subject to CORS, and extension page fetch will work once `EXTENSION_ALLOWED_ORIGINS` is set
- Error disclosures fixed in: `admin-update-user-details`, `admin-delete-user`, `auth-status`, `admin-adjust-credits`

### Task 8: Prompt injection sanitization in AI functions
**Files:** `supabase/functions/generate-description/index.ts`, `supabase/functions/generate-description-v2/index.ts`, `supabase/functions/ai-product-research/index.ts`
**Issues:** M6
**Acceptance criteria:**
- User-supplied string fields (title, brand, description, category, etc.) have newline characters normalized to spaces before template interpolation
- No other functionality changes

---

## Phase 3 — Web App + Auth Security

### Task 9: Auth error enumeration collapse
**File:** `apps/web/src/pages/auth/Auth.tsx`
**Issues:** H4
**Acceptance criteria:**
- Signup error `'User already registered'` no longer tells user the email exists; uses generic message
- Login error `'Invalid login credentials'` message is generic and same for wrong-email vs wrong-password
- Auth flow still works end-to-end (signup, login, error cases)

### Task 10: DeveloperSettings dev-only gate
**File:** `apps/web/src/components/dashboard/DeveloperSettings.tsx` (rendered in `pages/dashboard/Settings.tsx`)
**Issues:** H1
**Acceptance criteria:**
- In production builds (`import.meta.env.PROD`), the DeveloperSettings component returns `null`
- In dev builds, it works exactly as before
- `npm run build` succeeds (component tree-shakes cleanly)

### Task 11: ProtectedRoute goal validation
**File:** `packages/auth/src/ProtectedRoute.tsx`
**Issues:** H7
**Acceptance criteria:**
- The `userGoal` value (line 49) is validated against `['ebay', 'shopify', 'both']` before being used in routing logic
- Any unrecognized goal value falls through to the existing `else` branch (default to eBay)
- No behavior change for valid goal values

### Task 12: Profile race condition guard
**File:** `packages/auth/src/hooks/useAuth.tsx`
**Issues:** H5
**Acceptance criteria:**
- If `ensure-profile` errors, the auth state is set to a known "profile-error" state and the user is shown a recoverable error rather than silently having `profile = null`
- The existing loader at `ProtectedRoute.tsx:32` (`user && !profile` shows loader) already handles the transient null case correctly — this task focuses on the silent-failure path where ensure-profile throws

---

## Phase 4 — Database Migration

### Task 13: RLS on audit_logs
**File:** New migration `supabase/migrations/<timestamp>_audit_logs_rls.sql`
**Issues:** H6
**Acceptance criteria:**
- `audit_logs` table has RLS enabled
- Policy allows SELECT only for admin/super_admin roles
- Migration is safe to apply on a live DB (no data changes, no column drops)
- Verify with: `supabase db diff` or manual check on live DB

---

## Phase 5 — Accessibility

### Task 14: OTP input accessibility
**File:** `packages/auth/src/components/auth/OtpInput.tsx`
**Issues:** LOW
**Acceptance criteria:**
- Each of the 6 `<Input>` elements has `aria-label="Digit N of 6"` (N = 1..6)
- `role` is not needed (input elements have implicit role)

### Task 15: Button aria-disabled
**File:** `packages/ui/src/components/ui/button.tsx`
**Issues:** LOW
**Acceptance criteria:**
- Button component forwards `disabled` prop as both the HTML `disabled` attribute AND `aria-disabled`
- Existing `disabled:pointer-events-none` class behavior unchanged

---

## Checkpoints

- **After Phase 1:** Run `cd apps/extension && npm test` — all tests must pass
- **After Phase 2:** Run `deno check` on each modified Edge Function (or `supabase functions serve` locally)
- **After Phase 3:** Run `npm run typecheck` at repo root — no new type errors
- **After Phase 4:** Verify migration is idempotent (safe to run twice)
- **After Phase 5:** Run `npm run build` — bundle size should be unchanged

---

## Out of Scope (this pass)

- M1: God component splits (Listings.tsx 1928 lines, EbayOrders.tsx 1463 lines)
- M4: Subscription hook cache (React Context refactor)
- M7: Server-side search/pagination for listings
- H2: Auth tokens in localStorage (Supabase default; requires server session layer)
- H8: Email column in profiles migration (verify live DB first)
