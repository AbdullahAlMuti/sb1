# SellerSuit Audit Report

This report presents a senior-level architectural, security, and scalability audit of the SellerSuit browser extension and SaaS platform.

## Executive Summary

SellerSuit has built a solid product foundation for importing products from Amazon and Walmart into eBay. However, a deep review of the codebase reveals several critical blockers in scraping reliability, image uploads, and session scalability that make the extension **NOT ready to publish** on the Chrome Web Store, and **incapable of safely handling 100K users**. 

---

## Overall Readiness Scores

| Metric | Score | Status | Key Bottlenecks |
| :--- | :---: | :---: | :--- |
| **Overall Readiness** | **42 / 100** | **Blocked** | Critical blockers in auth, image uploads, and SKU propagation. |
| **Chrome Web Store Readiness** | **55 / 100** | **Not Ready** | Excessively broad host permissions and default global side panel activation. |
| **100K User Scalability** | **30 / 100** | **Not Ready** | Database OTP list scans, lack of queue/workers, and backend image proxying. |
| **Security Score** | **45 / 100** | **Vulnerable** | Disabled subscription guards, wildcard CORS, and local package vulnerabilities. |
| **Scraping Reliability** | **65 / 100** | **Unstable** | Brittle DOM swatch-clicking logic on Amazon; Walmart NEXT_DATA is solid. |
| **eBay Upload Reliability** | **50 / 100** | **Broken** | EPS image upload fails for all edited images due to XML parsing mismatch. |

---

## Critical Blockers

1. **eBay Picture Services (EPS) Upload Crash for Base64 (Problem 7 & 8):**
   * **Root Cause:** In `apps/extension/common/ebay-photo-uploader.js` (Strategy 0, lines 44–48), the uploader parses the response from `EpsBasic` using a regex for an XML tag: `text.match(/<PhotoID>([^<]+)<\/PhotoID>/)`. However, the eBay `EpsBasic` endpoint actually returns a semicolon-separated plain text string: `SUCCESS;photo_id`. This mismatch causes the regex match to be `null`, which throws an `EPS rejected data URL upload` exception for every edited, watermarked, or canvas-based image.
   * **Risk:** **CRITICAL**. Users cannot upload watermarked or edited images.
   * **Recommended Fix:** Modify Strategy 0 to use the same semicolon-split logic used in Strategy 1: `const parts = text.split(';'); return parts[1];`.

2. **Single-Product SKU Erasure (Problem 6):**
   * **Root Cause:** When updating a listing, the orchestrator (`SellerSuitUploader.run` in `apps/extension/common/ebay-listing-api.js`) calls `adaptProduct` to prepare the payload. However, `adaptProduct` (lines 608–753) normalizes the fields and returns an object that *omits* the parent-level `ebaySku` field. In `updateListing` (line 330), the code reads `product.ebaySku`. Since `product` is the normalized `adapted` object (which doesn't contain `ebaySku`), it always falls back to `product.prod_id` (the raw supplier ASIN/Item ID), erasing the user-edited SKU.
   * **Risk:** **HIGH**. User-edited SKUs are silently ignored during single-product uploads.
   * **Recommended Fix:** Update `adaptProduct` to return the `ebaySku` (e.g. `ebaySku: product.ebaySku`).

3. **Amazon Variation Scraper Timeout/Hang (Problem 1 & 4):**
   * **Root Cause:** In `apps/extension/content_scripts/amazon-variant-scraper.js` (lines 350–401), the scraper clicks swatches in Phase 1 using `await sleep(50);`. These clicks are fired too fast for Amazon's dynamic Twister JS to process, causing XHR requests to fail or clobber each other. In Phase 2, `amazon-xhrpatch.js` (line 166) runs a blocking loop waiting for the XHR intercept cache: `while (!buyboxCache[asin] && tries++ < 150) { await sleep(100); }`. If a click fails to trigger an XHR, the scraper hangs for 15 seconds per missing ASIN before falling back to a dummy price of $999.
   * **Risk:** **HIGH**. Scraping variation products is slow, prone to freezing, and generates incorrect listing prices ($999).
   * **Recommended Fix:** Rewrite Amazon scraper to extract the Twister config from `windowData` (similar to Walmart's Next.js model) rather than clicking swatches, or increase the click interval and avoid blocking wait loops in the main script thread.

4. **Global Side Panel Scope (Problem 10):**
   * **Root Cause:** In `apps/extension/manifest.json` (line 46), `side_panel.default_path` is set globally. This causes Chrome to persist the side panel on all tabs once opened, even on unrelated sites (e.g., YouTube).
   * **Risk:** **MEDIUM**. Poor user experience and violation of least-privilege Chrome extension guidelines.
   * **Recommended Fix:** Remove `default_path` from the manifest. In the background script, listen to `chrome.tabs.onUpdated` and `chrome.tabs.onActivated`. Use `chrome.sidePanel.setOptions({ tabId, path: 'sidepanel/side-panel.html', enabled: true })` only for tabs matching Amazon and Walmart, and set `enabled: false` for all other tabs.

5. **OTP Auth Scalability Blocker (Problem 11):**
   * **Root Cause:** In the custom OTP login service (`supabase/functions/auth-otp/index.ts` line 47), the backend calls `auth.admin.listUsers({ page: 1, perPage: 5000 })` to find the user by email. This creates a table scan on every login or signup attempt.
   * **Risk:** **CRITICAL**. At 100K users, list pagination limits will cause logins to fail, latency will skyrocket, and Supabase database CPU usage will spike.
   * **Recommended Fix:** Query profiles or user identities directly by email using database-level indexes, rather than listing all users in memory.

---

## Detailed Root Cause Analysis of Known Problems

### 1. Amazon Variation Scraper Failures & Structure (Problems 1 & 4)
* **File:** [amazon-variant-scraper.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/content_scripts/amazon-variant-scraper.js#L350-L401)
* **File:** [amazon-xhrpatch.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/content_scripts/amazon-xhrpatch.js#L166-L177)
* **Mechanics:** Phase 1 uses programmatic clicks to trigger network requests for variation pricing. Because of the fast, un-gated click interval (`50ms`), clicks fail to register. Phase 2 then stalls for 15s waiting for the XHR patcher cache.
* **Impact:** Variation pricing is missing, resulting in invalid payloads or $999 placeholders.

### 2. Duplicate Variations on eBay (Problem 2)
* **File:** [variation-normalizer.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/common/variation-normalizer.js#L66-L72)
* **Mechanics:** Swatch labels on Amazon contain hidden HTML entities, non-breaking spaces, or right-to-left marks (`\u200e`). If normalization fails to clean these characters before generating the combination key, keys like `color=black` and `color=black\u200e` are treated as unique, creating duplicate rows in the payload.
* **Impact:** eBay rejects the listing due to duplicate variation specific values.

### 3. Why Walmart Variation Scraping Works Better (Problem 3)
* **File:** [walmart-variant-scraper.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/content_scripts/walmart-variant-scraper.js#L27-L43)
* **Mechanics:** Walmart does not use DOM clicks. It extracts the raw JSON state from `<script id="__NEXT_DATA__">` immediately, matching all variations, prices, and stock statuses.
* **Impact:** 100% reliable, zero network wait, zero UI dependency.

### 4. Amazon Price Not Uploading (Problem 5)
* **File:** [amazon_injector.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/content_scripts/amazon_injector.js#L5330-L5336)
* **Mechanics:** During the `PREPARE_EBAY_LISTING` phase (line 5330), `_applyPricingToProduct` is called on the scraped product. This function recalculates the eBay price based on the raw supplier price and profit margins, overwriting any manual edits the user made in the extension panel.
* **Impact:** Manual pricing changes are lost during upload.

### 5. Edited Images Not Uploading (Problem 7 & 8)
* **File:** [ebay_prelist.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/content_scripts/ebay_prelist.js#L241-L251)
* **Mechanics:** If the user auto-edits an image, `ebay_prelist.js` runs a check: `if (autoEditOn && typeof firstImg === 'string' && firstImg.startsWith('http'))`. However, if the image has already been edited in the sidebar, it is stored as a base64 string (`data:image`). The `startsWith('http')` check fails, skipping the upload of the edited image and falling back to the original.
* **Impact:** Edited images are replaced by the original scraped images on eBay.

### 6. Listings Not Showing in Dashboard (Problem 9)
* **File:** [message-router.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/background/message-router.js#L550-L570)
* **File:** [listing-runner.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/background/listing-runner.js#L402-L426)
* **Mechanics:** When the extension calls `SYNC_LISTING`, it makes a fetch request to the `create-listing` Edge Function. If the database save fails (e.g. database locks, unique key violations on generated SKUs, or transient network timeouts), the listing is successfully created on eBay but the error is swallowed or only logged in the console, leaving the dashboard out of sync.
* **Impact:** Dashboard shows no record of successful listings.

---

## Security Audit

* **CORS Wildcard Vulnerability:** Several critical functions (`auth-otp`, `create-checkout`) have wildcard CORS access (`Access-Control-Allow-Origin: *`).
* **Disabled Subscription Guard:** In `packages/auth/src/ProtectedRoute.tsx` (line 150), payment checks are commented out, allowing any user to bypass billing checks on the frontend.
* **Entitlement Bypass:** In `supabase/functions/create-listing/index.ts` (line 66), credit balances are checked on the client side, allowing users to inject listings without credits by bypassing the UI.

---

## Performance and 100K User Scalability Audit

At 100K users, the current architecture will experience immediate bottlenecks:
1. **Network Egress / Proxy Costs:** The image uploader routes fallback images through `https://sellersuit.com/api/extension/image`. Egress costs for 100K users concurrently importing listings will overload the main application server.
2. **Synchronous Sync Pipeline:** Order and listing sync operations are performed synchronously over HTTP. Without an asynchronous queue and worker queue (such as pgmq or SQS), slow responses from eBay will cause connection pool exhaustion in Supabase.
3. **Database Contention:** Order dashboards calculate metrics on the fly (e.g., aggregating monthly revenue by scanning order histories). This must be replaced with pre-calculated aggregates (materialized views or status counter tables).

---

## Chrome Web Store Publish Readiness

The extension is **NOT ready to publish** because:
* It requests broad permissions (`scripting`, `unlimitedStorage`, `tabs`) without adequate justification.
* It requests excessive wildcard host permissions (`*://*.amazon.com/*`, etc.).
* Global side panel behavior violates the tab-scoping requirement of Chrome's Single Purpose policy.
