
## What I reviewed (read-only audit)
### Website (Vite + React Router)
- `src/App.tsx`: Uses `BrowserRouter` (history API routing) with many deep-link routes (dashboard, admin, legal pages, etc.).
- `index.html`: Standard SPA entry point.
- No server/hosting rewrite config files detected (e.g., `vercel.json`, `netlify.toml`, `public/_redirects`, etc.) in the provided listing.

### Chrome Extension
- `chrome_extension/manifest.json`: MV3, icons 16/48/128, homepage_url set, permissions + host_permissions present.
- `chrome_extension/popup.js`: Base URL fallback is `https://sellersuit.com` (good).
- `chrome_extension/common/config.js`: `WEB_APP_DOMAIN = https://sellersuit.com` (good).
- Codebase scan: no active localhost/lovable URLs found in runtime config; remaining “localhost” mentions are comments / tests / SSRF protection (acceptable).

### Screenshot evidence
- Uploaded screenshot shows `404: NOT_FOUND` with an ID format that commonly appears on platform-hosted sites when the server doesn’t rewrite unknown paths to `index.html` (typical SPA deep-link refresh failure).

---

## 1) Compliance & Deployment Checklist (✅ / ⚠️ / ❌)

### 1.1 Website routing / SPA refresh safety
| Requirement | Status | Notes |
|---|---:|---|
| All frontend routes defined | ✅ | Defined in `src/App.tsx` |
| Deep-link refresh works (e.g., `/dashboard/listings`) | ❌ | 404 screenshot indicates missing SPA rewrite on the host |
| Legal pages public on HTTPS | ✅/⚠️ | Routes exist: `/privacy-policy`, `/terms-of-service`. Must confirm they load without auth on live host. |

### 1.2 Website routes detected (important for testing)
Key routes (non-exhaustive but high value for deep-link testing):
- Public: `/`, `/auth`, `/register`, `/course`, `/verify-email`
- Legal: `/privacy`, `/privacy-policy`, `/terms`, `/terms-of-service`, `/refund`
- Dashboard (protected): `/dashboard`, `/dashboard/listings`, `/dashboard/listings/new`, `/dashboard/orders`, `/dashboard/ebay-orders`, `/dashboard/alerts`, `/dashboard/subscription`, `/dashboard/billing`, `/dashboard/extension`, `/dashboard/calculator`, `/dashboard/best-selling`, `/dashboard/must-sell`, `/dashboard/profitable-products`, `/dashboard/product-research`, `/dashboard/settings`
- Admin (protected): `/admin` + nested routes like `/admin/users`, `/admin/plans`, `/admin/payments`, etc.

### 1.3 Extension: manifest + domain integration
| Requirement | Status | Notes |
|---|---:|---|
| `manifest_version: 3` | ✅ | Present |
| `name`, `version`, `description` | ✅ | Present; branding aligned to SellerSuit |
| `homepage_url` | ✅ | `https://sellersuit.com` |
| Icons 16/48/128 | ✅ | Declared in manifest; files exist in repo |
| Permissions justified (least privilege) | ✅/⚠️ | Core permissions look reasonable; host_permissions are mostly scoped. Still recommend verifying you truly need every domain listed. |
| No localhost / staging domains in runtime | ✅ | Scan shows no active localhost/lovable endpoints (only comments/tests) |
| Popup links to live site | ✅ | `/auth` and `/dashboard` use `https://sellersuit.com` base |

### 1.4 Chrome Web Store policy requirements (listing-side)
| Requirement | Status | Notes |
|---|---:|---|
| Privacy Policy URL provided in Web Store listing | ⚠️ | Must be set in Chrome Developer Dashboard (not in manifest). Use: `https://sellersuit.com/privacy-policy` |
| Terms URL (recommended) | ⚠️ | Provide: `https://sellersuit.com/terms-of-service` |
| Support email + support URL | ⚠️ | Must be set in listing. Recommend also having a visible support contact on-site (footer or `/support`). |
| Screenshots uploaded | ❌ | Required in dashboard; not in repo by default |
| Promotional images / tiles (optional but recommended) | ⚠️ | If you want better conversion: small tile, marquee, etc. |

---

## 2) Issues Found (and why they matter)

### Issue A — SPA deep links are 404’ing on the live domain (High priority)
**Symptom:** Refreshing or directly opening a nested route returns a server 404 page (your screenshot).
**Cause:** Hosting is likely not rewriting unknown paths to `/index.html` for a Vite SPA using `BrowserRouter`.
**Impact:** Users cannot open bookmarked dashboard links; extension flows that open deep links may also fail.

### Issue B — Web Store listing compliance items are “outside the repo” (High priority)
Even with correct code/manifest, Chrome Web Store review requires listing configuration:
- Privacy Policy URL
- Support email
- Accurate “data use” questionnaire
- Screenshots

### Issue C — Confirm legal pages are accessible without login (Medium priority)
Chrome Web Store reviewers check policy URLs. If they redirect to login or return 404 due to SPA rewrite missing, review can fail.

---

## 3) Fix Plan (step-by-step, no business logic changes)

### Phase 1 (Highest priority): Make sellersuit.com SPA 404-safe on refresh/deep links
1) Identify where sellersuit.com is hosted (choose one below):
   - Vercel
   - Netlify
   - Cloudflare Pages
   - AWS S3 + CloudFront
   - Nginx/Apache on VPS
2) Add SPA rewrite rules so **all non-file paths** serve `/index.html`.

#### Ready-to-apply rewrite rules (pick your host)

**A) Vercel (recommended if the screenshot is from Vercel-style 404)**
- Add `vercel.json` at repo root:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```
Notes:
- This makes all routes serve the SPA entry, and React Router handles routing client-side.
- If you have real server endpoints under `/v1/*` on the same domain, add a more specific rewrite/exclusion rule so `/v1/*` continues to reach your backend. (We will not change backend logic; just routing rules.)

**B) Netlify**
- Add `public/_redirects`:
```text
/*  /index.html  200
```

**C) Cloudflare Pages**
- Add `public/_redirects` (Cloudflare Pages supports the same pattern in many setups):
```text
/* /index.html 200
```
- Or configure “SPA mode / single-page app fallback” in Pages settings.

**D) Nginx**
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**E) Apache (.htaccess)**
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

3) Verification (must-do):
- Open each URL directly and then hard refresh:
  - `/`
  - `/auth`
  - `/privacy-policy`
  - `/terms-of-service`
  - `/dashboard`
  - `/dashboard/listings`
  - `/admin/login`
- Confirm none of them show the host’s 404 page.

---

### Phase 2: Chrome Extension → final Web Store compliance pass (metadata + review readiness)
1) Manifest verification checklist (already mostly OK):
- Confirm:
  - `manifest_version: 3`
  - `name: SellerSuit`
  - `version` bumped for submission
  - icons 16/48/128 exist and are crisp
  - permissions limited to what is required
2) Host permissions sanity check:
- Confirm you need each host permission currently listed:
  - eBay sell/order pages
  - Amazon domains used by your injector
  - Walmart domains used by your injector
  - `https://sellersuit.com/*` and `https://*.sellersuit.com/*`
  - Supabase project domain
  - `https://script.google.com/*` (Google Sheets)
  - `https://generativelanguage.googleapis.com/*` (Gemini calls)
- If any are not used, remove them (least privilege reduces rejection risk).

3) Confirm extension → website linking:
- Popup buttons:
  - Login opens `https://sellersuit.com/auth`
  - Dashboard opens `https://sellersuit.com/dashboard`
- Ensure these pages do not 404 on refresh after Phase 1.

---

### Phase 3: Chrome Web Store listing setup (dashboard steps)
1) In Chrome Developer Dashboard → Store Listing:
- Add **Privacy Policy URL**:
  - `https://sellersuit.com/privacy-policy`
- Add **Terms URL** (recommended):
  - `https://sellersuit.com/terms-of-service`
- Add Support:
  - Support email (e.g., `support@sellersuit.com`)
  - Support site URL (recommend `https://sellersuit.com` or a dedicated `/support` page)

2) Screenshots (minimum set recommended):
- Popup: Connected
- Popup: Not Connected
- Amazon product page showing injected panel
- Walmart product page showing injected panel
- eBay listing flow page showing extension features
Optional:
- sellersuit.com dashboard “Extension Connect” screen

3) Privacy practices questionnaire (be consistent with your policy page):
- Disclose that the extension:
  - stores auth token/settings in Chrome storage
  - reads/uses page content on supported domains to provide requested features
  - sends data to SellerSuit backend (Supabase) and to Google services if Gemini/Sheets are enabled

---

## 4) URL / Integration Table (current expected targets)
| Area | Expected URL |
|---|---|
| Website base | `https://sellersuit.com` |
| Login | `https://sellersuit.com/auth` |
| Dashboard | `https://sellersuit.com/dashboard` |
| Privacy Policy | `https://sellersuit.com/privacy-policy` |
| Terms | `https://sellersuit.com/terms-of-service` |
| Supabase functions | `https://ojxzssooylmydystjvdo.supabase.co/functions/v1/*` |

---

## 5) “Compliance Fix Log” (memory of required fixes for next steps)
1) Fix SPA deep-link refresh 404 by adding correct hosting rewrite rules (most likely Vercel rewrites).
2) Verify legal policy routes are publicly accessible on live domain after rewrite fix.
3) Complete Chrome Web Store listing fields: privacy policy URL, terms URL, support email/URL.
4) Produce and upload required screenshots for the store listing.
5) Re-check least-privilege host_permissions just before submission.

---

## 6) Implementation boundaries (to avoid business logic changes)
Allowed:
- Hosting config files (rewrites/redirects)
- Manifest metadata/permissions tuning (no feature logic changes)
- Documentation updates (publishing guide)
- Static policy/support pages content and routing (already present)

Not allowed:
- Changing scraping logic, AI generation logic, auth algorithms, API payloads, or app workflows.

---

## Deliverables after you approve implementation
- SPA-safe hosting config for your actual hosting provider (so deep links stop 404’ing).
- Updated documentation with exact “how to publish” steps tailored to your host (Vercel/Netlify/etc.).
- Final Web Store checklist text (copy/paste ready) for permissions justification and privacy questionnaire consistency.
