# SellerSuit QA Test Plan

This document outlines the E2E and functional test suites designed to verify scraping accuracy, editing states, eBay listing draft generation, and dashboard synchronization.

---

## 1. Scraping & Data Extraction Test Cases

### TC-SCR-01: Amazon Single Product Scrape
* **Objective:** Verify correct title, image URL, and price extraction on standard single ASIN pages.
* **Pre-conditions:** Browser is on a supported Amazon single product page (e.g. book or tool).
* **Steps:**
  1. Click the SellerSuit action icon to open the side panel.
  2. Verify the title matches the page title and the single price is extracted.
  3. Verify a generated SKU is visible in the panel.
* **Expected Result:** Single variant with correct price, title, generated SKU, and CDN image list is displayed.

### TC-SCR-02: Amazon Multi-Variation Scrape
* **Objective:** Verify that the 2-phase swatch-clicking mechanism extracts all variants without timeout.
* **Pre-conditions:** Browser is on an Amazon clothing or shoe page with multiple colors and sizes.
* **Steps:**
  1. Open the side panel, click "Load Variations".
  2. Observe Phase 1 swatch clicking.
  3. Verify all available options are populated.
* **Expected Result:** Scraper extracts all combinations (e.g., Color + Size). All active variants are listed with their unique ASINs and images. No variants fall back to the default $999 price.

### TC-SCR-03: Amazon Duplicate Variation Prevention
* **Objective:** Verify that swatch names with hidden unicode symbols (like `\u200e`) do not create duplicate variants.
* **Pre-conditions:** Active product has swatch values with hidden characters.
* **Steps:**
  1. Trigger variation scrape.
  2. Inspect the returned JSON payload `currentProduct.variants`.
* **Expected Result:** Variations are properly normalized and deduplicated. Re-run with `dedupe: true` option in the normalizer to ensure `seenCombos` only counts unique cleaned entries.

### TC-SCR-04: Walmart Single & Variation Scrape
* **Objective:** Verify Walmart direct `__NEXT_DATA__` parsing works without UI dependency.
* **Pre-conditions:** Browser is on a Walmart item page with/without variations.
* **Steps:**
  1. Open side panel.
  2. Click "Load Product".
* **Expected Result:** Payload is populated instantly (under 100ms) with correct title, variations, prices, and CDN images.

---

## 2. Editor & Manual Override Test Cases

### TC-ED-01: User-Edited SKU Verification
* **Objective:** Verify that user-edited SKUs in `panel.html` overwrite generated ones during upload.
* **Pre-conditions:** A product is loaded in the extended editor.
* **Steps:**
  1. Modify the SKU field to `TEST-SKU-123`.
  2. Click "Upload to eBay".
  3. Inspect the adapted payload in `ebay_prelist.js`.
* **Expected Result:** The Custom Label / SKU parameter in the eBay payload is set to `TEST-SKU-123`.

### TC-ED-02: User-Edited Price Verification
* **Objective:** Verify manual price overrides survive `PREPARE_EBAY_LISTING` re-runs.
* **Pre-conditions:** A product is loaded in the editor.
* **Steps:**
  1. Edit price to $29.99 (marking price source as `'manual'`).
  2. Trigger "Upload to eBay" which re-runs `PREPARE_EBAY_LISTING`.
* **Expected Result:** The final upload price is $29.99, not the margin-calculated price.

### TC-ED-03: Watermarked & Edited Image Upload
* **Objective:** Verify edited base64 canvas images upload to EPS successfully.
* **Pre-conditions:** Product contains edited images (`data:image/jpeg;base64...`).
* **Steps:**
  1. Click "Upload to eBay".
  2. Observe `ebay-photo-uploader.js` routing through Strategy 0.
* **Expected Result:** Semicolon response parsing succeeds and EPS returns a valid photo ID. No exception is thrown.

### TC-ED-04: Deleted Variations Exclusion
* **Objective:** Verify variations deleted in the editor table are omitted from upload.
* **Pre-conditions:** Multi-variation product is loaded in the editor.
* **Steps:**
  1. Click "Delete" on two variants in the table.
  2. Click "Upload to eBay".
  3. Verify the final MSKU payload sent to `/msku-update`.
* **Expected Result:** The deleted variation rows are excluded from the upload payload.

---

## 3. Integration & Sync Test Cases

### TC-INT-01: eBay Success and Database Sync
* **Objective:** Verify dashboard syncs successfully after a successful eBay upload.
* **Pre-conditions:** User is logged into eBay and authenticated in the extension.
* **Steps:**
  1. Click "Upload to eBay".
  2. After the eBay listing is created, verify the `SYNC_LISTING` message dispatch.
* **Expected Result:** The `create-listing` Edge Function returns HTTP 201/200, and the new listing appears on the SaaS dashboard.

### TC-INT-02: Sync Recovery on Database Write Failure
* **Objective:** Verify that if the database write fails after a successful eBay draft save, it displays a clear error warning.
* **Pre-conditions:** Force database write failure (e.g. disable network connection right before sync message).
* **Steps:**
  1. Run upload flow.
  2. Simulate Edge Function returning an error.
* **Expected Result:** A red overlay error toast is shown: *"Listed on eBay, but saving to your dashboard failed"*, preventing silent data loss.

### TC-INT-03: Side Panel Tab Switching Scope
* **Objective:** Verify that the side panel matches only the active supported tab.
* **Pre-conditions:** The extension is installed.
* **Steps:**
  1. Navigate to `amazon.com` (side panel is enabled).
  2. Open a new tab and navigate to `youtube.com`.
* **Expected Result:** The side panel is automatically disabled/hidden on the YouTube tab.

### TC-INT-04: Chrome Storage Restore
* **Objective:** Verify that session storage is preserved when transitioning to the eBay prelist page.
* **Pre-conditions:** Product is uploaded from the sidebar.
* **Steps:**
  1. Inspect `chrome.storage.local` under the generated `uploadSessionId`.
* **Expected Result:** The complete product payload is stored and successfully retrieved by the `ebay_prelist.js` script.
