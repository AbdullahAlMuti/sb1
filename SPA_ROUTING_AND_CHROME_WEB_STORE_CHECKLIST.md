# SellerSuit — SPA Routing + Chrome Web Store Readiness Checklist

Target domain: **https://sellersuit.com**

Scope: **hosting config, URLs, manifest metadata, and documentation only** (no business logic changes).

---

## 1) SPA routing / deep-link refresh (fixes 404 on refresh)

### 1.1 Why this happens
Because the site uses React Router **BrowserRouter**, direct navigation to deep links (e.g. `/dashboard/listings`) must be rewritten by the host to `/index.html` (or `/`) so the SPA can render.

### 1.2 Vercel (your selected host)

This repo now includes **`vercel.json`** that:
- Serves real static files normally (`handle: filesystem`)
- Rewrites **all non-`/v1/*` paths** to `/` for SPA routing

✅ Deep links like `/dashboard`, `/privacy-policy`, `/admin/login` will stop 404’ing.

#### Important note about `/v1/*`
This config intentionally **does not** rewrite `/v1/*`.
If you have an API endpoint like `https://sellersuit.com/v1/ai/remove-bg`, it must be handled by:
- Your own server/proxy, or
- A separate Vercel function/proxy configuration.

### 1.3 Netlify / Cloudflare Pages (optional fallback)

This repo also includes **`public/_redirects`** (used by Netlify and commonly by Cloudflare Pages) as:

```text
/*  /index.html  200
```

---

## 2) Verify critical routes (must pass before Web Store submission)

After deploying the rewrite:

1. Open each URL **directly** (paste in address bar)
2. Then **hard refresh**

Test set:
- `/`
- `/auth`
- `/privacy-policy`
- `/terms-of-service`
- `/refund`
- `/dashboard` (should redirect to auth if logged out, but must not be host-404)
- `/dashboard/listings`
- `/admin/login`

Pass criteria: **No hosting 404 page**.

---

## 3) Chrome extension → production domain integration

### 3.1 Required URLs (expected)
| Item | Expected |
|---|---|
| Website | `https://sellersuit.com` |
| Login | `https://sellersuit.com/auth` |
| Dashboard | `https://sellersuit.com/dashboard` |
| Privacy Policy | `https://sellersuit.com/privacy-policy` |
| Terms | `https://sellersuit.com/terms-of-service` |
| Supabase edge functions | `https://ojxzssooylmydystjvdo.supabase.co/functions/v1/*` |

### 3.2 Manifest (already OK in repo)
Verify in `chrome_extension/manifest.json`:
- `manifest_version: 3`
- `name`, `description`, `version`
- `homepage_url: https://sellersuit.com`
- Icons: 16/48/128
- Permissions are minimal and justified

### 3.3 Host permissions (least privilege)
Re-check you truly need each of these:
- eBay sell/order pages
- Amazon domains used by injector
- Walmart domains used by injector
- `https://sellersuit.com/*` + `https://*.sellersuit.com/*`
- `https://ojxzssooylmydystjvdo.supabase.co/*`
- `https://generativelanguage.googleapis.com/*` (only if AI features enabled)
- `https://script.google.com/*` (only if Sheets sync enabled)

If any are unused, remove them before submitting.

---

## 4) Chrome Web Store listing (dashboard-only requirements)

These are **not** in the repo; you must set them in the Chrome Developer Dashboard:

### 4.1 Mandatory links
- Privacy Policy URL: **https://sellersuit.com/privacy-policy**
- (Recommended) Terms URL: **https://sellersuit.com/terms-of-service**

### 4.2 Support
- Support email: e.g. `support@sellersuit.com`
- Support URL: `https://sellersuit.com` (or a dedicated `/support` page)

### 4.3 Screenshots (recommended minimum)
1. Extension popup — Connected
2. Extension popup — Not Connected
3. Amazon product page with injected panel
4. Walmart product page with injected panel
5. eBay listing flow page showing the tool
Optional:
- SellerSuit dashboard “Extension Connect” screen

### 4.4 Privacy practices questionnaire (keep consistent)
Disclose (as applicable):
- Auth token/settings stored in Chrome storage
- Reads page content on supported domains to perform requested features
- Sends data to SellerSuit backend (Supabase) and to Google services if AI/Sheets are enabled
