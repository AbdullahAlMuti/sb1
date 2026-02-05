
## Findings (as requested format)

### 1) Broken Layer: **Backend Save Input (Chrome Extension → create-listing payload)**
**Exact File & Function Name**
- `chrome_extension/content_scripts/ebay_lister.js` → the “Sync listing to dashboard database” block where `listingData` is constructed (around the code you shared: lines ~940–955).
- `chrome_extension/common/sync_utils.js` → `syncListing(listingData)` (lines ~211–268), where it builds `amazon_data` only if `listingData.amazon_data` is missing.

**Why the image is not showing (simple explanation)**
- The extension currently sends this payload to the backend `create-listing` function:
  - `title, sku, ebay_price, amazon_price, amazon_url, amazon_asin, status`
  - **But it does not include any Amazon image URL fields** (like `mainImage` / `allImages`) in `amazon_data`.
- `sync_utils.js` tries to “enrich” the payload, but its default `amazon_data` object only contains `amazonUrl, asin, title, price, source`. **No image keys are added there either**.
- Result: The backend (`supabase/functions/create-listing/index.ts`) saves `amazon_data` exactly as received (or as the minimal default), so **the DB ends up with `amazon_data` that has no image URL**.

**Minimal Fix (without changing business logic)**
- Keep all business logic the same; only pass through existing scraped image data.
- Update the extension so that when it constructs `listingData`, it includes `amazon_data` containing at least:
  - `mainImage` (string URL)
  - optionally `allImages` (array of URLs)
- This is the “minimal” fix because your dashboard already tries to read images from `amazon_data` (`normalizeListingRow()`), but the data never arrives.

---

### 2) Broken Layer: **Database (data stored, not schema)**
**Exact File & Function Name**
- DB schema reference: `src/integrations/supabase/types.ts` → `public.Tables.listings`
  - `listings.Row` includes: `amazon_data` (Json), `amazon_asin`, `amazon_url`, etc.
  - There is **no `image_url` column** in `listings` (so it will always be `null` at the table level).

**Why the image is not showing (simple explanation)**
- New rows will have:
  - `amazon_asin` set (often)
  - `amazon_data` present but **missing `mainImage` / `imageUrl` / `images[0]`**
- Because the image URL is missing in stored JSON, the dashboard has nothing reliable to render.

**Minimal Fix**
- No schema changes required.
- Ensure `amazon_data` is populated with `mainImage` (and/or other known keys your frontend already checks).

---

### 3) Broken Layer: **Frontend Rendering (not the root cause; just confirms the symptom)**
**Exact File & Function Name**
- `src/pages/dashboard/Listings.tsx` → `normalizeListingRow(row)` (lines ~194–263 in the snippet you shared)
  - It tries: `amazonData.image`, `amazonData.imageUrl`, `amazonData.mainImage`, `amazonData.productImage`, `amazonData.images?.[0]`, etc.
- `src/components/listings/ListingImage.tsx`
  - Fallback tries to generate an Amazon image URL from ASIN.

**Why the image is not showing (simple explanation)**
- Since `amazon_data` contains no image keys, `normalizeListingRow()` produces `image_url = null`.
- Then `ListingImage` falls back to ASIN-based URLs, which can fail for some products (format not present / blocked / not found), so you end up seeing the package icon.

**Minimal Fix**
- Do not change UI/business behavior; just restore the missing input data (image URL) so the UI renders again reliably.

---

### 4) Amazon API Response (what field contains the image)
**Exact File & Function Name**
- `chrome_extension/content_scripts/amazon_injector.js` → `scrapeCompleteProductData()` (around lines ~106–182 in your snippet)
  - Main image field name: **`mainImage`**
    - `mainImage: getElAttr('#landingImage', 'src') || getElAttr('#imgBlkFront', 'src')`
  - Additional images field name: **`allImages`**
    - `allImages: Array.from(document.querySelectorAll(...)).map(...)`

**Why this matters**
- Your scraper already has correct image fields (`mainImage`, `allImages`).
- The issue is not “Amazon stopped returning images”; it’s that **the listing sync flow is not including those fields when creating the listing**.

---

## Minimal Fix Implementation Plan (no business-logic changes)

### A) Confirm and use the existing scraped image object
1) Identify where the extension stores the output of `scrapeCompleteProductData()` (or equivalent) into `chrome.storage.local`.
2) In `chrome_extension/content_scripts/ebay_lister.js`, when building `listingData`, also pull that stored product data and attach it into `listingData.amazon_data`.

**Target change location**
- `chrome_extension/content_scripts/ebay_lister.js` → the `chrome.storage.local.get([...])` call at lines ~942–945 and the `listingData` object at ~947–955.

**Minimal adjustment**
- Add the key that contains the scraped object (commonly something like `completeProductData` or similar) to the `chrome.storage.local.get([...])` list.
- Set:
  - `listingData.amazon_data = { ...(scrapedObject), source: 'extension' }`
  - Ensure at least one of the keys your dashboard recognizes exists:
    - `mainImage` (preferred, matches scraper)
    - optionally also set `imageUrl` = `mainImage` for compatibility

This does not change plan limits, credits, listing creation rules, etc. It only restores missing data in the payload.

---

### B) (Optional but still minimal) Hardening in `sync_utils.js`
If you want an extra safety net without changing business logic:
- In `chrome_extension/common/sync_utils.js` inside `syncListing()`, if `listingData.amazon_data` exists but has `allImages` and not `mainImage`, set `mainImage = allImages[0]`.
- This is still “minimal” because it only normalizes/forwards data you already scraped; it does not alter pricing/limits/auth.

---

## What to verify after the fix (quick checklist)
1) Create a new listing from Amazon as usual.
2) In Supabase `listings.amazon_data`, confirm it now contains:
   - `mainImage: "https://..."` (non-empty)
3) Reload Dashboard → Listings:
   - The image should appear without needing ASIN fallback.
4) If images still fail, then the remaining likely cause is **external image hotlink blocking** (403) on specific Amazon CDN URLs; but right now the primary break is earlier: **image URL never saved**.

---

## Final diagnosis (the exact technical reason it used to work, but not now)
- Previously, the sync payload likely included `amazon_data.mainImage` (or equivalent), so dashboard rendering succeeded.
- Now, `ebay_lister.js` constructs a reduced `listingData` payload that does not include image fields, and `sync_utils.js` default enrichment also does not add image fields.
- Therefore: **the image data is being dropped before it ever reaches the backend and database**.
