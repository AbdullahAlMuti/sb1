# SellerSuit Bug Fix Plan

This document provides a step-by-step priority fix plan for the SellerSuit Chrome Extension and SaaS platform. It details what file to edit, which logic to refactor, the recommended code changes, and test validations.

---

## Priority 1: Blocker Issues (Direct Upload & Auth Failures)

### 1. Fix eBay Picture Services (EPS) Upload Crash for Base64 (Problem 7 & 8)
* **File:** [ebay-photo-uploader.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/common/ebay-photo-uploader.js#L44-L49)
* **Root Cause:** Strategy 0 parses the response using `/ <PhotoID>([^<]+)<\/PhotoID> /`, but `EpsBasic` returns semicolon-separated plain text `SUCCESS;photo_id` on base64 data URL uploads.
* **Refactoring:** Modify Strategy 0 to use the same split logic as Strategy 1.
* **Code Change:**
  ```javascript
  // Replace:
  const match = text.match(/<PhotoID>([^<]+)<\/PhotoID>/);
  if (!match) throw new Error('EPS rejected data URL upload');
  return match[1];

  // With:
  const parts = text.split(';');
  if (parts.length <= 1 || parts[0] !== 'SUCCESS') {
    throw new Error('EPS rejected data URL upload: ' + text);
  }
  return parts[1];
  ```
* **Test Case:** Edit an image in the sidebar to generate a base64 data URL, click upload, and ensure Strategy 0 uploads successfully to EPS.

### 2. Fix OTP Auth Database Table Scan (Problem 11 & 12)
* **File:** [auth-otp/index.ts](file:///d:/eBay%20Software/2026sellersuit/sb1/supabase/functions/auth-otp/index.ts#L49-L63)
* **Root Cause:** calling `auth.admin.listUsers` in a paginated loop scans users in-memory, completely failing past 20,000 users and causing database locks.
* **Refactoring:** Query `public.profiles` by email (which has an index) using the service role client, retrieve the UUID, and call `auth.admin.getUserById` directly.
* **Code Change:**
  ```typescript
  async function findUserByEmail(supabaseAdmin: SupabaseClient, email: string) {
    // 1. Look up the ID in indexed public.profiles
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (profile?.id) {
      const { data: { user }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (!userErr && user) return user;
    }

    // 2. Fallback: Search directly in auth.users using a database function or direct lookup
    // (Ensure you have a db function or use service-role query on auth.users if permissions allow)
    const { data: rpcUser } = await supabaseAdmin.rpc('get_auth_user_by_email', { p_email: email });
    if (rpcUser?.id) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(rpcUser.id);
      if (user) return user;
    }

    return null;
  }
  ```
  *Note:* Create a database function `get_auth_user_by_email` in migration:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_auth_user_by_email(p_email text)
  RETURNS jsonb SECURITY DEFINER LANGUAGE plpgsql AS $$
  DECLARE
    v_user record;
  BEGIN
    SELECT id, email, email_confirmed_at, banned_until, raw_user_meta_data
    INTO v_user FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;
    IF v_user.id IS NOT NULL THEN
      RETURN row_to_json(v_user);
    END IF;
    RETURN NULL;
  END;
  $$;
  ```
* **Test Case:** Run sign-in with a test email, verify it works in under 200ms without table scans.

### 3. Fix Single-Product SKU Erasure (Problem 6)
* **File:** [ebay-listing-api.js (adaptProduct)](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/common/ebay-listing-api.js#L738-L753)
* **Root Cause:** `adaptProduct` normalizes fields but omits the top-level `ebaySku` field. In `updateListing`, the code reads `product.ebaySku` on the adapted object, falling back to the raw `prod_id` (ASIN).
* **Refactoring:** Map `ebaySku: product.ebaySku || product.sku` in the returned object of `adaptProduct`.
* **Code Change:**
  ```javascript
  return {
    prod_title:      _enforceEbayTitle(product.title || sourceId || 'Product'),
    prod_images:     Array.isArray(product.images) ? product.images.slice(0, 12) : [],
    prod_specs:      product.specs || product.specifications || {},
    prod_desc:       descHtml,
    prod_id:         sourceId,
    prod_qty:        1,
    prod_variations,
    supplier:        product.supplier || product.marketplace || 'amazon',
    ebaySku:         product.ebaySku || product.sku || null, // Map SKU here
    meta:            {
      country:        'US',
      promoteListing: !!product.promoteListing,
      promotePercent: product.promotePercent || null
    }
  };
  ```
* **Test Case:** Load a single product, edit its SKU in the panel, click upload, and verify the listing draft on eBay uses the user-edited SKU as the Custom Label.

---

## Priority 2: Scraper & Data Integrity Fixes

### 4. Amazon Variation Scraper Lag & Hanging (Problem 1 & 4)
* **File:** [amazon-variant-scraper.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/content_scripts/amazon-variant-scraper.js#L350-L401)
* **File:** [amazon-xhrpatch.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/content_scripts/amazon-xhrpatch.js#L166-L177)
* **Root Cause:** Programmatic clicks fire too fast (50ms), causing Twister JS to drop XHR requests. In Phase 2, `getBuybox` loops 150 times (15s) waiting for the XHR cache, causing the script to hang and default to $999.
* **Refactoring:** 
  1. Increase the click sleep interval to `250ms` (minimum) or implement a check to wait for the page loading state/spinner to hide before clicking the next swatch.
  2. Implement an immediate check on `buyboxCache[asin]`. If it is not populated within a shorter timeout (e.g. `2000ms`), skip to avoid blocking the thread, and fallback to scraping from DOM if visible.
* **Test Case:** Scrape an Amazon variation product (e.g., clothing with color & size). Verify it resolves price and variation attributes without freezing the browser tab.

### 5. Strip Duplicate Swatch Labels (Problem 2)
* **File:** [variation-normalizer.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/common/variation-normalizer.js#L11-L17)
* **Root Cause:** Hidden unicode characters (`\u200e`, right-to-left marks) or HTML non-breaking spaces (`\xa0`) survive basic normalization, causing different combination keys (e.g. `color=black` vs `color=black\u200e`), yielding duplicates.
* **Refactoring:** Strengthen the normalization cleanup regex to strip all HTML entities, non-breaking spaces, control characters, and leading/trailing whitespace.
* **Code Change:**
  ```javascript
  const INVISIBLE = /[\u200e\u200f\u202a-\u202e\u00ad\u200b\u200c\u200d]/g;
  
  function _text(value) {
    if (value == null) return '';
    let str = typeof value === 'object' ? (value.productName ?? value.value ?? value.name ?? '') : String(value);
    
    // Replace non-breaking spaces and other weird whitespaces with a regular space
    str = str.replace(/[\s\xa0\u2007\u202f\u205f\u3000]+/g, ' ');
    // Strip invisible control chars
    str = str.replace(INVISIBLE, '');
    return str.trim();
  }
  ```
* **Test Case:** Scrape an Amazon product with swatch names containing right-to-left marks. Verify that combinations are deduped successfully and no duplicate variations are sent in the payload.

### 6. Prevent Manual Price Edits Erasure (Problem 5)
* **File:** [amazon_injector.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/content_scripts/amazon_injector.js#L5336)
* **Root Cause:** Re-running `PREPARE_EBAY_LISTING` triggers `_applyPricingToProduct` which overwrites user manual price edits with calculated margin prices because it operates on a freshly read/scraped product payload.
* **Refactoring:** Ensure `PREPARE_EBAY_LISTING` reads the current price source and manual flag from storage, preserving `finalPrice` if marked as `'manual'`.
* **Code Change in `amazon_injector.js` (line 5336):**
  ```javascript
  const storedProduct = await new Promise(r => chrome.storage.local.get('currentProduct', r));
  const extProduct = storedProduct.currentProduct || {};
  
  // Apply pricing but preserve manual overrides
  if (extProduct.price_source === 'manual') {
      fullData.finalPrice = extProduct.finalPrice;
      fullData.price_source = 'manual';
  } else {
      _applyPricingToProduct(fullData, _extCalcValues3);
  }
  ```
* **Test Case:** Change the price of a product in the extended editor to $49.99, click upload, and verify that the final price remains $49.99 instead of reverting to the margin-calculated price.

---

## Priority 3: Extension Scoping & UX Improvements

### 7. programmatic Side Panel Tab-Scoping (Problem 10)
* **File:** [manifest.json](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/manifest.json#L46-L48)
* **File:** [background/index.js](file:///d:/eBay%20Software/2026sellersuit/sb1/apps/extension/background/index.js#L24)
* **Root Cause:** The manifest declares a global `default_path` under `side_panel`, forcing the side panel to persist across all browser tabs.
* **Refactoring:**
  1. Remove `side_panel.default_path` from `manifest.json`.
  2. Implement tab updated/activated event listeners in `background/index.js` to enable the side panel only on supported domains (Amazon/Walmart) and disable it elsewhere.
* **Code Change in `background/index.js`:**
  ```javascript
  const SUPPORTED_DOMAINS = [
    'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.ca', 'amazon.com.au',
    'walmart.com', 'walmart.ca'
  ];

  function isSupportedUrl(url) {
    if (!url) return false;
    try {
      const hostname = new URL(url).hostname;
      return SUPPORTED_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    } catch (_) {
      return false;
    }
  }

  async function configureSidePanelForTab(tabId, url) {
    if (isSupportedUrl(url)) {
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel/side-panel.html',
        enabled: true
      });
    } else {
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false
      });
    }
  }

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      configureSidePanelForTab(tabId, changeInfo.url).catch(() => {});
    }
  });

  chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
      if (chrome.runtime.lastError || !tab) return;
      configureSidePanelForTab(activeInfo.tabId, tab.url).catch(() => {});
    });
  });
  ```
* **Test Case:** Open an Amazon tab and click the side panel button (it should open). Switch to a YouTube tab (the side panel should close or be disabled).

---

## Priority 4: Backend Entitlement & Database Integrity

### 8. Fix Un-deducted Credits / SaaS Plan Guard (Problem 11 & Entitlements)
* **File:** [create-listing/index.ts](file:///d:/eBay%20Software/2026sellersuit/sb1/supabase/functions/create-listing/index.ts)
* **Root Cause:** The `create-listing` Edge Function validates that user credits are `>= 1`, but never actually deducts the credit from the user's profile upon successful listing creation.
* **Refactoring:** After a successful database insertion (RPC call), subtract `1` credit from the user's profile inside the Edge Function transaction or RPC.
* **Code Change inside `create_listing_with_variations` RPC (in Postgres Migration):**
  ```sql
  -- Inside the insert block of create_listing_with_variations (when v_existing IS NULL):
  UPDATE public.profiles
  SET credits = GREATEST(0, credits - 1)
  WHERE id = p_user_id;
  ```
* **Test Case:** Create a listing for a user with `5` credits. Verify that their credit balance drops to `4` in the database after successful creation.

---

## Rollback & Safety Strategy

### Extension Release Safety
1. **Pre-release Testing:** Verify changes on Chrome's Developer Mode with unpacked extension directories before bundling.
2. **Staging Environment validation:** Set the environment variables in `common/config.js` to point to the staging Supabase project. Validate end-to-end flows.
3. **Phased Rollout:** Release the extension update to Chrome Web Store under a limited tester group (5% users) before rolling out to 100% of the active install base.
4. **Version Control Rollback:** In case of critical failure, keep a pre-compiled ZIP of the previous version (`v1.3.0`) ready to submit to the Chrome Developer Dashboard as a hotfix roll-back.
