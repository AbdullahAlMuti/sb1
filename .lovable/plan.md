
## Objective (production-ready deployment, no behavior changes)
Prepare the **website + Chrome extension** for live deployment using the live domain:

- **Website domain:** https://sellersuit.com  
- **Rules:** Do not change business logic/algorithms/data flow. Only update URLs, hosting references, and add/adjust legal-policy pages/routes + documentation.

You confirmed:
- Remove localhost/127.0.0.1 from the production extension build.
- Add policy-route aliases (e.g., `/privacy-policy` and `/terms-of-service`).
- sellersuit.com is already live (and intended to use the same Supabase project).

---

## What I found (repo analysis summary)

### Website (Vite/React in `src/`)
- **No hardcoded `localhost`** references inside `src/` (good).
- Routing already includes:
  - `/privacy` → `src/pages/PrivacyPolicy.tsx`
  - `/terms` → `src/pages/TermsOfService.tsx`
- `index.html` canonical points to `https://sellersuit.com` (good).
- Current legal pages exist but are **generic** and should be upgraded to explicitly mention extension + data practices required by Chrome Web Store.

### Chrome extension (`chrome_extension/`)
Localhost + staging references exist and must be replaced/removed for the Web Store build:

**Hardcoded / fallback localhost**
- `chrome_extension/common/config.js`  
  - `const WEB_APP_DOMAIN = 'http://localhost:8080';` (must become `https://sellersuit.com`)
- `chrome_extension/popup.js`  
  - Fallback base URL: `"http://localhost:8080"` (must become `https://sellersuit.com`)
- `chrome_extension/background.js`  
  - Onboarding fallback: `'https://sellersuit.lovable.app'` (should become `https://sellersuit.com`)
  - Hardcoded API call: `fetch("http://localhost:8080/v1/ai/remove-bg"...` (must become `https://sellersuit.com/v1/ai/remove-bg` OR use `ExtensionConfig.URLS.AI_REMOVE_BG`)

**Localhost and Lovable host permissions**
- `chrome_extension/manifest.json` includes:
  - `http://localhost:8080/*`, `http://localhost:8081/*`, `http://localhost:5173/*`
  - `http://127.0.0.1:*`
  - `https://*.lovable.app/*` and `https://*.lovableproject.com/*`
These should be removed for production submission.

---

## URL Replacement Table (production target = https://sellersuit.com)

| Location | Current | Replace with |
|---|---|---|
| `chrome_extension/common/config.js` | `http://localhost:8080` | `https://sellersuit.com` |
| `chrome_extension/popup.js` fallback | `http://localhost:8080` | `https://sellersuit.com` |
| `chrome_extension/background.js` onboarding fallback | `https://sellersuit.lovable.app` | `https://sellersuit.com` |
| `chrome_extension/background.js` AI remove-bg fetch | `http://localhost:8080/v1/ai/remove-bg` | `https://sellersuit.com/v1/ai/remove-bg` (or `URLS.AI_REMOVE_BG`) |
| `chrome_extension/manifest.json` | localhost/127.0.0.1/lovable domains | remove from production build |

Notes:
- Keep Supabase URLs as-is (they’re already production: `https://ojxzssooylmydystjvdo.supabase.co`).
- Website `src/` doesn’t require localhost replacements.

---

## Implementation Roadmap (step-by-step, safe + review-friendly)

### Phase 1 — Extension: convert to production domain (no logic changes)
1) **Update centralized extension base domain**
   - File: `chrome_extension/common/config.js`
   - Change only:
     - `WEB_APP_DOMAIN` from `http://localhost:8080` → `https://sellersuit.com`
   - Result: all derived URLs become production:
     - `WEB_APP_AUTH`, `WEB_APP_DASHBOARD`, `AI_REMOVE_BG`, etc.

2) **Remove hardcoded localhost fallback in popup**
   - File: `chrome_extension/popup.js`
   - Change only the fallback string in `getBaseUrl()`:
     - `"http://localhost:8080"` → `"https://sellersuit.com"`
   - Do not change IDs, event handlers, or flow.

3) **Remove hardcoded localhost references in background script**
   - File: `chrome_extension/background.js`
   - Update:
     - Onboarding fallback URL:
       - `URLS.WEB_APP_BASE || 'https://sellersuit.lovable.app'` → `URLS.WEB_APP_BASE || 'https://sellersuit.com'`
     - AI remove-bg fetch:
       - Replace the hardcoded `fetch("http://localhost:8080/v1/ai/remove-bg"...`
       - With `fetch(URLS.AI_REMOVE_BG, ...)` OR direct `https://sellersuit.com/v1/ai/remove-bg`
   - This is a URL-only change; it does not alter data structures, calculations, or control flow.

4) **Update manifest for production submission**
   - File: `chrome_extension/manifest.json`
   - Add:
     - `"homepage_url": "https://sellersuit.com"`
   - Remove (production build):
     - `http://localhost:*/*`, `http://127.0.0.1:*/*`
     - `https://*.lovable.app/*`, `https://*.lovableproject.com/*`
   - Keep:
     - `https://sellersuit.com/*`, `https://*.sellersuit.com/*`
     - Supabase host permission
     - Amazon/eBay/Walmart domains needed by content scripts
   - Bump version:
     - `"version": "1.3"` → `"1.3.1"` (or next release number)

Deliverable after Phase 1:
- A “production-ready” extension build that only targets sellersuit.com for auth + backend endpoints.

---

### Phase 2 — Website: add policy aliases + upgrade policy text (Chrome Web Store ready)
You requested policies hosted at:
- `https://sellersuit.com/privacy-policy`
- `https://sellersuit.com/terms-of-service`

Current site routes are `/privacy` and `/terms`. We will add aliases without changing logic.

1) **Add route aliases**
   - File: `src/App.tsx`
   - Add routes (render the same components):
     - `/privacy-policy` → `<PrivacyPolicy />`
     - `/terms-of-service` → `<TermsOfService />`
   - Keep existing `/privacy` and `/terms` intact.

2) **Update policy content to explicitly cover extension**
   - Files:
     - `src/pages/PrivacyPolicy.tsx`
     - `src/pages/TermsOfService.tsx`
   - Update only the displayed text (UI content), not logic.

#### Ready-to-publish Privacy Policy (Markdown/HTML content to embed)
Below is the policy content to incorporate into `PrivacyPolicy.tsx` (rendered via your existing prose styling). This is written specifically for a web app + Chrome extension.

**Privacy Policy — SellerSuit**  
Last updated: [render date]

1. Introduction  
SellerSuit (“SellerSuit,” “we,” “us”) provides a web application at https://sellersuit.com and a Chrome extension that helps streamline eBay listing workflows. This Privacy Policy explains what we collect, how we use it, and your choices.

2. Information We Collect  
2.1 Account Information (Web App)  
- Email address and account identifiers used for authentication and account management.  
- Subscription status and plan/usage data (e.g., credits usage) where applicable.

2.2 Payment Information  
Payments are processed by Stripe. We do not store full card numbers. Stripe may provide us with billing metadata (e.g., customer ID, subscription status, last 4 digits, payment method type).

2.3 Extension & Usage Data  
The Chrome extension may process content from supported sites (e.g., Amazon, Walmart, eBay) to provide automation features. This may include:  
- Product page information needed to generate listing data (such as title, images, prices, and product identifiers).  
- User actions performed inside the extension UI (e.g., button clicks, feature usage events).  
- Data you choose to export (e.g., to downloads or Google Sheets).

2.4 Local Storage and Extension Storage  
- The website uses browser storage (e.g., localStorage) for session management via Supabase.  
- The extension uses Chrome storage to store settings (e.g., sync interval, lookback period) and may store authentication tokens required to communicate with SellerSuit services.

2.5 Automatically Collected Technical Data  
We may collect technical information such as device/browser type, IP address, and diagnostic logs to maintain reliability and prevent abuse.

3. How We Use Information  
We use information to:  
- Provide and operate SellerSuit and the extension features  
- Authenticate users and maintain sessions  
- Sync data you request (e.g., Google Sheets integrations)  
- Process subscriptions and billing status  
- Improve performance, troubleshoot issues, and prevent fraud/abuse  
- Communicate service updates and support responses

4. Sharing and Disclosure  
We may share information:  
- With service providers (e.g., Stripe for payments, Supabase for authentication/database, email providers for transactional emails)  
- When required by law or to protect our rights  
- In a business transfer (merger/acquisition)

5. Data Retention  
We retain account and usage data as long as necessary to provide the Service and comply with legal obligations. You may request deletion where applicable.

6. Security  
We use reasonable administrative, technical, and physical safeguards to protect information. No method of transmission is 100% secure.

7. Your Choices and Rights  
Depending on your location, you may have rights to access, correct, delete, or export your data, and to object to certain processing. Contact us to request these actions.

8. Children’s Privacy  
SellerSuit is not intended for individuals under 18 and we do not knowingly collect data from children.

9. International Users  
Your data may be processed in countries where we and our providers operate.

10. Contact  
Email: support@sellersuit.com

(We will tailor wording if you want to explicitly list all providers: Supabase, Stripe, Resend, etc.)

#### Ready-to-publish Terms of Service (content to embed)
**Terms of Service — SellerSuit**  
Last updated: [render date]

1. Agreement  
By accessing or using SellerSuit (web app and Chrome extension), you agree to these Terms.

2. Service Description  
SellerSuit provides tools that help users streamline eBay listing workflows, including automation features and integrations.

3. Accounts  
You are responsible for maintaining account security and all activity under your account.

4. Subscriptions & Billing  
Paid plans are billed in advance. Subscription terms, renewals, cancellation, and refunds are governed by the checkout flow and Refund Policy where applicable.

5. Acceptable Use  
You agree not to:  
- Use the Service unlawfully  
- Attempt unauthorized access  
- Interfere with Service operation  
- Reverse engineer or abuse the Service  
- Use the Service in a way that violates third-party platform rules (eBay/Amazon/Walmart). You are responsible for complying with those platforms’ terms.

6. Third-Party Sites and Content  
The extension operates on third-party websites. SellerSuit is not affiliated with or endorsed by those platforms.

7. Intellectual Property  
SellerSuit and its software, UI, branding, and documentation are protected by IP laws.

8. Disclaimer  
Service is provided “as is” and “as available” without warranties.

9. Limitation of Liability  
To the maximum extent permitted by law, SellerSuit is not liable for indirect or consequential damages.

10. Termination  
We may suspend/terminate accounts for violations, abuse, or security risks.

11. Contact  
support@sellersuit.com

---

### Phase 3 — Documentation: hosting + Web Store submission (checklists)
We will add/update documentation files (no code behavior changes) covering:

1) **Website deployment (already live, but document it)**
   - Confirm hosting supports SPA routing
   - Confirm HTTPS
   - Confirm correct Supabase env vars on the host
   - Confirm routes `/privacy-policy` and `/terms-of-service` resolve
   - Confirm extension-auth sync flow works on the live domain

2) **Extension packaging**
   - Zip structure (manifest at root of zip)
   - Required icons (16/48/128)
   - Confirm no localhost references remain
   - Bump version for each submission

3) **Chrome Web Store submission checklist**
   - Required listing fields
   - Privacy Policy URL (use `https://sellersuit.com/privacy-policy`)
   - Permissions justification text (why storage/tabs/scripting/downloads + host permissions are needed)
   - Screenshots list (popup connected/disconnected, injected panel on Amazon, listing automation on eBay, etc.)
   - Common rejection pitfalls (overbroad permissions, missing privacy disclosures)

---

## Verification plan (must do before Web Store upload)
1) Load unpacked extension (production build)
2) Go to https://sellersuit.com and log in
3) Confirm the extension popup shows **Connected** (token sync works)
4) Confirm injected panel login button opens https://sellersuit.com/auth
5) Confirm background script no longer calls localhost
6) Confirm policy pages load:
   - https://sellersuit.com/privacy-policy
   - https://sellersuit.com/terms-of-service
7) End-to-end test on Amazon/eBay/Walmart pages to ensure host permissions are sufficient

---

## Minimal UI-only suggestions (popup, safe)
No logic changes, but optional CSS polish to better match store expectations:
- Replace the large “🔴” in Not Connected view with a smaller, cleaner badge (pure CSS)
- Ensure `Not Connected` uses the same typography tokens as the header
- Add a subtle divider between content and footer to enhance hierarchy (CSS only)

---

## Deliverables after implementation
- Production extension with all localhost/lovable references removed and domain set to sellersuit.com
- Website includes `/privacy-policy` + `/terms-of-service` alias routes
- Updated privacy policy and terms text suitable for Chrome Web Store
- A deploy + submission checklist doc with a URL replacement log and “common rejection” tips
