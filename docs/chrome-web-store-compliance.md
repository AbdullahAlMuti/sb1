# SellerSuit Chrome Web Store Compliance Package

Effective date: June 28, 2026

This document is based on the active eBay-only SellerSuit product scope and the current Chrome extension source in `apps/extension`. Shopify exists in the repository but is intentionally disabled and is future scope only.

## Product Facts

- Product name: SellerSuit
- Website/domain: `https://sellersuit.com`
- Extension purpose: SellerSuit helps users collect supported supplier product data and prepare eBay listing assets through a connected dashboard and Chrome extension.
- Main extension features: Amazon/Walmart product capture, eBay listing assistance, SKU generation, pricing calculator, image/listing workflow support, side panel, dashboard sync, optional order sync, and AI-assisted listing content through backend functions.
- Backend/dashboard: SellerSuit web/dashboard with Supabase backend and Edge Functions.
- Payment system: Stripe.
- AI features: Yes. AI title, description, and image-editing workflows are implemented through backend functions using configured AI providers.
- Third-party services involved in current production scope: eBay, Amazon, Walmart, Google Apps Script when configured by the user, Supabase, Stripe, OpenAI and/or Lovable AI gateway, Resend or similar transactional email infrastructure, and optional website analytics providers.
- Support email: `support@sellersuit.com`
- Developer/brand name: SellerSuit. Replace with the legal entity name before publication if different.

## 1. Chrome Web Store Compliance Audit

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Manifest V3 | PASS | `apps/extension/manifest.prod.json` uses `manifest_version: 3` and `background.service_worker`. | MV3 structure is present. |
| Single purpose | PASS | Manifest description focuses on eBay listing workflows. | The extension purpose is narrow enough if the Chrome Web Store listing uses the same eBay listing workflow framing. |
| Permissions | WARNING | `storage`, `scripting`, `tabs`, `alarms`, `sidePanel`, `unlimitedStorage` in `apps/extension/manifest.prod.json`. | Permissions are explainable. `tabs` and `unlimitedStorage` should be justified clearly in the permissions page and store submission. Review whether any `tabs` usage can be narrowed to `activeTab` later. |
| Host permissions | WARNING | Production hosts include Amazon, Walmart, eBay, SellerSuit, Supabase, Google Apps Script, and image CDNs in `apps/extension/manifest.prod.json`. | Hosts map to the current workflow. Keep public copy limited to Amazon/Walmart/eBay unless more supplier hosts are added. |
| Content scripts | PASS | Production manifest injects scripts on supported supplier, eBay, and SellerSuit domains. | Injection is tied to product capture, eBay workflow, order sync, and dashboard bridge behavior. |
| Background/service worker | PASS | `build/background.bundle.js` is the MV3 service worker. | No persistent background page is declared. |
| Storage usage | PASS | Extension code uses `chrome.storage.local`, `chrome.storage.session`, and some browser `localStorage`. | Policies now disclose local extension storage, auth/session state, product workflow state, images, queues, generated content, and diagnostics. |
| Cookies permission | PASS | No `cookies` Chrome permission in production manifest. | Cookie policy still covers website/session technologies and browser storage. |
| Tabs/activeTab/scripting | WARNING | `tabs` and `scripting` are requested. | Disclose why tab coordination and page scripting are required. Consider future narrowing if implementation allows. |
| Remote API calls | PASS | Extension calls SellerSuit Supabase Edge Functions and optional Google Apps Script. | Disclosed in Privacy, Permissions, Cookie, and Third-Party pages. |
| Remote hosted code | PASS | No production manifest entry loads remote JavaScript. | Keep extension code bundled/local. Remote API calls are allowed; remote code execution is not. |
| Dynamic JavaScript execution | PASS with caveat | `new Function` appears in tests only. | Do not introduce runtime `eval` or remote script execution in extension files. |
| AI/API providers | PASS | AI functions use OpenAI/Lovable gateway backend paths. | AI policy now discloses submitted content, review requirement, third-party processing, and retention. |
| Stripe/payment handling | PASS | Stripe is used in backend checkout/webhook functions. | Terms, Privacy, and Refund pages disclose Stripe processing and non-storage of full card numbers. |
| Analytics/tracking | PASS | Website analytics shim forwards to GA/GTM/Plausible only if present; extension analytics are local storage logs/usage stats. | Cookie policy and Privacy Policy disclose optional analytics and local diagnostic logs. |
| Affiliate links/codes/cookies | PASS | No affiliate injection pattern found in extension production scope. | Added No Ads or Affiliate Injection disclosure. |
| User authentication | PASS | Extension stores SellerSuit auth/session tokens in Chrome storage and calls backend auth/session endpoints. | Privacy and Permissions disclose extension auth/session data. |
| Data collection and retention | PASS | Policies disclose account, listing, supplier page, order sync, AI, billing, local storage, logs, and retention. | Legal review still recommended. |
| Product listing claims | MUST FIX BEFORE SUBMISSION - FIXED IN THIS PATCH | Marketing copy previously referenced AliExpress support while production manifest does not request AliExpress host access. | Public marketing copy was narrowed to Amazon/Walmart supplier support. |
| Onboarding/install flow | WARNING | Store URL placeholders remain in `siteConfig.brand.chromeStoreUrl`. | Replace placeholder Chrome Web Store URL with the real listing URL once available. |
| Minimum necessary permissions | WARNING | Broad host patterns and `unlimitedStorage` are currently requested. | Justifiable for the current workflow, but Chrome reviewers may ask for specific explanations. |
| Marketing claims | WARNING | Existing copy includes strong claims such as reseller counts and listing speed. | Ensure claims are supported by evidence before submission. Avoid unsupported performance, earnings, or partnership claims. |

## 2. Required Public Pages Created or Updated

The marketing app now includes these publishable legal/compliance pages:

- Privacy Policy: `apps/marketing/src/pages/legal/PrivacyPolicy.tsx`
- Terms of Service: `apps/marketing/src/pages/legal/TermsOfService.tsx`
- Refund and Cancellation Policy: `apps/marketing/src/pages/legal/RefundPolicy.tsx`
- Chrome Web Store Limited Use Disclosure: `apps/marketing/src/pages/legal/LimitedUseDisclosure.tsx`
- Chrome Extension Permissions: `apps/marketing/src/pages/legal/PermissionsDisclosure.tsx`
- Cookie and Analytics Policy: `apps/marketing/src/pages/legal/CookieAnalyticsPolicy.tsx`
- Data Deletion Policy: `apps/marketing/src/pages/legal/DataDeletionPolicy.tsx`
- Security Policy: `apps/marketing/src/pages/legal/SecurityPolicy.tsx`
- Third-Party Services and Affiliation Disclaimer: `apps/marketing/src/pages/legal/ThirdPartyDisclaimer.tsx`
- AI Features Policy: `apps/marketing/src/pages/legal/AIFeaturesPolicy.tsx`
- No Ads or Affiliate Injection Disclosure: `apps/marketing/src/pages/legal/AffiliateAdsDisclosure.tsx`

Routes are wired in `apps/marketing/src/App.tsx`. Footer legal links are wired in `apps/marketing/src/config/siteConfig.ts`.

## 3. Chrome Web Store Developer Dashboard Privacy Answers

Use these recommended answers after the updated legal pages are deployed.

| Dashboard Question | Recommended Answer | Reasoning |
| --- | --- | --- |
| Does the extension collect personally identifiable information? | Yes. | SellerSuit account data can include email address, user ID, workspace/account IDs, and extension device/session metadata. |
| Does it collect authentication information? | Yes. | Extension stores and uses SellerSuit/Supabase auth tokens or extension session tokens to call backend features. |
| Does it collect financial/payment information? | Yes, limited billing metadata. | Stripe handles full card data. SellerSuit stores billing/subscription status, Stripe IDs, plan, credits, checkout/session references, and invoices/payment state. |
| Does it collect health information? | No. | No health workflow or health data was found in the active extension scope. |
| Does it collect personal communications? | No. | The active extension workflow does not collect emails, messages, chats, or personal communications content. |
| Does it collect location? | No precise location. | IP address or request metadata may appear in backend logs, but the extension does not request geolocation or location permissions. |
| Does it collect web history? | No as a standalone browsing history product; yes to supported-page activity if the dashboard requires this category. | The extension has access to supported host pages and may read URLs/page content on those hosts. It should not be represented as collecting general browsing history. If Chrome asks broadly about "web history" because of `tabs`/host access, answer conservatively and explain it is limited to supported workflow pages. |
| Does it collect user activity? | Yes. | Extension usage events, logs, sync state, listing activity, order sync events, and feature/credit usage may be collected or stored. |
| Does it collect website content? | Yes. | The extension reads supported supplier/eBay page content needed for product capture and listing workflows. |
| Is data sold? | No. | Policies state SellerSuit does not sell user data. |
| Is data used for advertising? | No. | Policies state no personalized, retargeted, or interest-based advertising use of extension data. |
| Is data transferred to third parties? | Yes, limited. | Data is transferred to processors necessary to provide the service, such as Supabase, Stripe, AI providers, Resend, and user-configured Google Apps Script. |
| Is data encrypted in transit? | Yes. | SellerSuit uses HTTPS for website, dashboard, extension-to-backend, and processor communications. |
| Can users request deletion? | Yes. | Data Deletion Policy provides `support@sellersuit.com` deletion process. |

## 4. Compliance Fix Recommendations

1. Deploy the new legal pages before submitting the extension.
   - Files: `apps/marketing/src/pages/legal/*`, `apps/marketing/src/App.tsx`, `apps/marketing/src/config/siteConfig.ts`.
   - Expected result: Chrome Web Store listing can link to live Privacy Policy, Limited Use Disclosure, Permissions, Data Deletion, Cookie Policy, Security, Refund, and Terms pages.

2. Replace placeholder Chrome Web Store URL when the final listing URL exists.
   - File: `apps/marketing/src/config/siteConfig.ts`
   - Current value: `https://chromewebstore.google.com/detail/sellersuit`
   - Expected result: CTAs point to the real published extension listing.

3. Keep Chrome Web Store listing copy narrow.
   - Use: "Create eBay listings from supported Amazon and Walmart product pages."
   - Avoid: unsupported supplier claims, guaranteed profits, guaranteed marketplace results, or official partnership language.

4. Justify `tabs`, `scripting`, and `unlimitedStorage` in the Store submission.
   - File to inspect if narrowing later: `apps/extension/manifest.prod.json`, `apps/extension/background/*`, `apps/extension/sidepanel/*`, `apps/extension/content_scripts/*`.
   - Expected result: Reviewers understand why these permissions are required for supported workflows.

5. Review whether `tabs` can be narrowed in a future hardening pass.
   - If all URL/tab coordination can be achieved with `activeTab` plus declared content scripts, replace `tabs`.
   - Do not change this without regression testing the side panel, queue, upload, and sync flows.

6. Keep extension free of remote hosted code.
   - Do not add remote script tags, runtime `eval`, remote imports, or dynamic JavaScript execution in production extension files.

7. Legal review before publication.
   - The pages are operationally accurate from the code audit, but legal counsel or the company owner should verify company/legal entity details, governing law, refund promises, and region-specific privacy rights.

## 5. Recommended Footer/Legal Navigation

Marketing footer should include:

- Privacy Policy
- Terms of Service
- Refund Policy
- Limited Use Disclosure
- Permissions
- Data Deletion
- Cookie Policy
- Security
- Contact/Support

Optional additional legal links:

- Third-Party Disclaimer
- AI Features Policy
- No Ads or Affiliate Injection Disclosure

## 6. Final Chrome Web Store Checklist

Not ready yet until the following are complete:

- Deploy updated marketing site with all legal pages live.
- Update Chrome Web Store listing privacy URL to the deployed Privacy Policy.
- Include Limited Use disclosure URL or section wherever Chrome requests it.
- Use Chrome Web Store privacy answers from this document.
- Ensure store listing copy does not claim unsupported suppliers, guaranteed results, or official third-party partnerships.
- Replace placeholder Chrome Web Store URL after listing creation.
- Run final production extension verification before upload: `cd apps/extension && npm run prepare:prod && npm run verify:prod`.

Once those deployment/submission tasks are complete, the policy artifact set is ready for Chrome Web Store review subject to final legal/company approval.
