# SellerSuit — Production Deployment + Chrome Web Store Submission

Target production domain: **https://sellersuit.com**

This document is **deployment-only**. It does not change business logic or algorithms.

---

## 1) Production URL Replacement Log

The following development/staging references were updated to production:

| Area | File | Before | After |
|---|---|---|---|
| Extension config | `chrome_extension/common/config.js` | `http://localhost:8080` | `https://sellersuit.com` |
| Extension popup fallback | `chrome_extension/popup.js` | `http://localhost:8080` | `https://sellersuit.com` |
| Extension onboarding fallback | `chrome_extension/background.js` | `https://sellersuit.lovable.app` | `https://sellersuit.com` |
| AI remove-bg endpoint | `chrome_extension/background.js` | `http://localhost:8080/v1/ai/remove-bg` | `URLS.AI_REMOVE_BG` (resolves to `https://sellersuit.com/v1/ai/remove-bg`) |
| Extension manifest | `chrome_extension/manifest.json` | localhost + `*.lovable.app`/`*.lovableproject.com` | removed for production build |
| Stripe portal return origin fallback | `supabase/functions/customer-portal/index.ts` | `http://localhost:8080` | `https://sellersuit.com` |

Notes:
- `supabase/functions/google_sheets_sync/index.ts` contains a `localhost` regex in **SSRF protection** (it blocks internal addresses). This is not a deployment URL and should remain.

---

## 2) Website: Hosting & Verification (Vite SPA)

### 2.1 Requirements
- HTTPS enabled on **https://sellersuit.com**
- SPA routing configured (all routes rewrite to `index.html`)
- Production env vars set:
  - `VITE_SUPABASE_URL=https://ojxzssooylmydystjvdo.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY=<your anon key>`

### 2.2 Legal routes (Chrome Web Store)
These URLs must be live and publicly accessible:
- **Privacy Policy:** https://sellersuit.com/privacy-policy
- **Terms of Service:** https://sellersuit.com/terms-of-service

Aliases also remain available:
- https://sellersuit.com/privacy
- https://sellersuit.com/terms

### 2.3 Website verification checklist
1) Open https://sellersuit.com
2) Confirm login works
3) Confirm dashboard loads: https://sellersuit.com/dashboard
4) Hard refresh on a nested route (e.g., `/dashboard/listings`) and confirm it still loads (SPA rewrite)
5) Confirm legal pages load:
   - `/privacy-policy`
   - `/terms-of-service`

---

## 3) Chrome Extension: Production Build Checklist

### 3.1 Manifest requirements
- `manifest_version: 3`
- `version` bumped for the release
- `homepage_url` set to: https://sellersuit.com

### 3.2 Permissions (what to explain in the store listing)

| Permission | Why it’s needed |
|---|---|
| `storage` | Store extension settings + auth token required for SellerSuit services |
| `scripting` | Inject UI/tools into supported pages |
| `tabs` | Open dashboard/login tabs and coordinate flows |
| `downloads` | Save generated/processed images and exports |

Host permissions are restricted to:
- eBay domains used by Seller Hub flows
- Amazon/Walmart domains where tools run
- SellerSuit domain(s): `https://sellersuit.com/*` and `https://*.sellersuit.com/*`
- Supabase project domain (edge functions)

### 3.3 Packaging (ZIP)
Chrome Web Store requires the ZIP root to contain `manifest.json`.

Correct:
```
manifest.json
background.js
popup.html
popup.js
common/
content_scripts/
ui/
assets/
icons/
...
```

Incorrect:
```
chrome_extension/
  manifest.json
  ...
```

---

## 4) Chrome Web Store Submission (Step-by-step)

1) Create/verify a Chrome Web Store Developer account
2) Create a new item and upload the production ZIP
3) Add store listing content:
   - Short + detailed description
   - Category, language
   - Support email/URL
4) Add mandatory policy URLs:
   - Privacy Policy: https://sellersuit.com/privacy-policy
   - (Recommended) Terms: https://sellersuit.com/terms-of-service
5) Add screenshots (recommended set):
   - Extension popup (Connected)
   - Extension popup (Not Connected)
   - Amazon page with injected panel
   - eBay listing flow integration
   - Any “Sync Orders” or dashboard integration screen
6) Complete the privacy/data usage questionnaire accurately:
   - The extension stores an auth token in Chrome storage and processes page content on supported sites to deliver features.
7) Submit for review

---

## 5) Final End-to-End Test (Before Upload)

1) Load unpacked extension in Chrome
2) Visit https://sellersuit.com and sign in
3) Confirm the extension popup shows **Connected**
4) Confirm clicking “Log In” (if disconnected) opens https://sellersuit.com/auth
5) Confirm the extension no longer requests any `localhost` URLs (DevTools → Network)
