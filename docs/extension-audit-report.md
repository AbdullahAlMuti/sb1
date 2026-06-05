# SellerSuit Extension Scraping Audit

Reviewed on 2026-06-05.

## Summary

SellerSuit's canonical Chrome extension code in `apps/extension` currently implements Amazon, Walmart, eBay, and SellerSuit dashboard workflows. I did not find Shopify host permissions, Shopify content scripts, or Shopify scraping logic in the canonical extension or the web-served extension copy. The current "Amazon and Shopify" claim should therefore be treated as "Amazon and Walmart today; Shopify is missing."

The extension has a functional injected-panel architecture: product-page content scripts scrape source data, image extractors process product images, generated title and description workflows call background/edge functions, and results are cached in `chrome.storage.local` for copy/paste and eBay listing flows. The strongest area is image extraction, especially Amazon, where the code uses multiple sources such as gallery DOM, high-resolution data attributes, embedded script data, dedupe, and URL normalization.

The main weaknesses are maintainability, selector brittleness, policy exposure, and security-sensitive rendering. Amazon scraping relies heavily on hard-coded Amazon IDs/classes such as `#productTitle`, `#feature-bullets`, `#landingImage`, `#acrPopover`, `#productDetails_techSpec_section_1`, and `#altImages`. Walmart uses broader fallback selectors but still depends on presentational/test IDs. Amazon scraping logic is duplicated across several functions and multiple `chrome.runtime.onMessage` listeners handle `SCRAPE_PRODUCT_DATA`, creating risk of inconsistent results or response races. Generated descriptions are assigned directly to `innerHTML`, so any model/API-supplied HTML should be sanitized before display or paste.

Policy alignment needs explicit attention. Amazon Associates policy restricts use of reviews/star ratings unless obtained through approved Amazon APIs and also restricts repurposing Product Advertising Content for seller tools without approval. Shopify's Terms of Service prohibit unauthorized automated access, while Shopify separately documents Web Bot Auth for authorized bot access to public stores. Chrome Web Store policy requires narrow permissions and transparent handling of scraped or automatically collected browsing data.

## Strengths

- Vanilla extension architecture is appropriate for the current panel: `panel.html`, `panel.css`, `panel.js`, shared `common/*` helpers, page-specific content scripts, and a Manifest V3 background service worker.
- Manifest host permissions are scoped to known target platforms for the current implementation: Amazon, Walmart, eBay, SellerSuit, Supabase, Gemini, and Google Sheets. There is no broad `<all_urls>` permission in the reviewed manifests.
- Amazon product scraping covers many core listing fields in `apps/extension/content_scripts/amazon_injector.js`, including ASIN, title, brand, price, images, bullet points, description, category, rating, review count, availability, shipping, specifications, variants, and A+ content.
- Walmart scraping in `apps/extension/content_scripts/walmart_injector.js` uses multiple fallback selectors for title, brand, specs, highlights, description, category, and bullets rather than a single selector per field.
- Dynamic content handling exists. Amazon has a `waitForElement` helper with `MutationObserver`, and both Amazon and Walmart have URL-change observers that restart extension setup on SPA-like navigation.
- Amazon image extraction is layered and stronger than field extraction. `apps/extension/common/amazon_image_extractor.js` checks modal/image-block/gallery sources, `data-old-hires`, `data-a-dynamic-image`, script data, dedupes by base image ID, filters video/review/UI images, and forces high-resolution URLs.
- The background layer centralizes authenticated AI generation messages for `GENERATE_AI_TITLES` and `GENERATE_DESCRIPTION`, keeping most edge-function calls out of the page DOM flow.
- Storage usage is practical for extension workflows. Product data, selected titles, generated descriptions, watermarked images, and listing state are cached with `chrome.storage.local` for cross-step workflows.
- The UI code uses safer text assignment in several places, for example setting initial title text with `innerText`/`textContent` rather than replacing larger containers.

## Weaknesses

- Shopify scraping is absent. No `shopify`, `myshopify`, `admin.shopify`, `/products/*.js`, Storefront API, Shopify JSON-LD, or Shopify content script entries were found in `apps/extension` or `apps/web/public/chrome_extension`.
- Amazon selector robustness is uneven. Several key fields depend on fragile page-specific selectors:
  - Title: `#productTitle`
  - Brand: `#bylineInfo`
  - Price: `.a-price .a-offscreen`
  - Bullets: `#feature-bullets li span.a-list-item`
  - Reviews: `#acrPopover`, `#acrCustomerReviewText`
  - Technical details: `#productDetails_techSpec_section_1`, `#detailBullets_feature_div`
  - Images: `#landingImage`, `#altImages`, `#imageBlock`
- Amazon has duplicated scrape paths. `scrapeCompleteProductData`, `scrapeFullProductData`, `scrapeProductDetails`, inline panel handlers, and later message listeners each scrape overlapping fields. These can drift and produce different product payloads from the same page.
- Amazon has multiple `chrome.runtime.onMessage.addListener` handlers for `SCRAPE_PRODUCT_DATA` in the same file. That increases response-race risk and makes it harder to reason about which scraper is authoritative.
- Required-field validation is too shallow. Amazon validates only `asin` and `title`, while a listing workflow also depends on price, images, bullets, condition, brand, category, and description quality.
- Review and star-rating scraping is a policy risk. The current Amazon scraper reads rating/review count from Amazon DOM. Amazon policy says customer reviews and star ratings should not be displayed or used unless obtained through approved Amazon APIs and requirements are met.
- Generated description rendering is unsafe by default. `apps/extension/common/description-generator.js` assigns `currentDescription` directly into `description-preview.innerHTML`. If the edge function, model output, or stored description contains unsafe markup, the panel can render it. Error messages are also interpolated into HTML.
- Deprecated title popup rendering interpolates title text into `innerHTML` without escaping, even though the newer inline renderer escapes title text. If that rollback path is reused, generated titles can become an injection vector.
- Error handling is mostly local `try/catch`, console logging, and toasts. There is no normalized scrape result with field-level errors, source provenance, confidence, retry status, or user-facing "missing fields" summary.
- Retry/backoff exists in shared network utilities, but DOM scraping mostly uses fixed waits, timeouts, and observers. There is no platform-level readiness model such as "product JSON loaded", "variant selected", "image gallery hydrated", or "price block stable."
- Logging is too verbose for production. Several content scripts log scraped product data, URLs, image details, and configuration fragments. Debug logging should be consistently gated and avoid credential or user/product data leakage.
- Large files reduce maintainability. `amazon_injector.js` is about 4,700 lines, `walmart_injector.js` about 3,300 lines, and `panel.js` about 1,300 lines. Scraping, UI injection, image handling, AI calls, calculator logic, SKU generation, and export flows are mixed.
- There are distribution-copy drift risks. The source extension and `apps/web/public/chrome_extension` copy need a deterministic sync/build step and audit checks to prevent panel or script mismatches.
- The code does not expose a clear platform-selection contract. The workflow is effectively platform-specific content-script injection and detection, not the requested "select platform -> scraping logic runs" model.

## Missing Features

- Shopify product scraping:
  - Host permissions and content-script matches for `*.myshopify.com`, custom Shopify storefront domains, and only the exact Shopify surfaces that are approved.
  - Storefront product detection for `/products/{handle}`, collection product cards, and product JSON endpoints where authorized.
  - JSON-LD extraction from `script[type="application/ld+json"]`.
  - Shopify product data sources such as product JSON, `window.ShopifyAnalytics.meta`, variant arrays, option names, price/currency, availability, vendor, product type, tags where available, and selected variant state.
  - Merchant-authorized API flow for private/admin data such as inventory, templates, and store configuration.
- Store templates are not implemented as a structured scraper feature. The current "template" matches are editor/UI text, not Shopify store theme/template extraction.
- Ads and winning-product analysis are not implemented. These should come from authorized analytics/ad-library APIs or user-provided sources, not ad hoc scraping from storefront pages.
- Inventory is not implemented for Amazon or Shopify. Amazon inventory is generally not reliably available from public product pages. Shopify inventory should require merchant authorization or approved public availability data.
- Product review support is not policy-safe as currently shaped. Amazon review/rating scraping should be removed or replaced with approved API sources. Shopify reviews vary by review app and should require explicit app/API support and consent.
- Normalized listing schema is missing. Current data objects mix aliases such as `title`, `productTitle`, `description`, `productDescription`, `features`, `bulletPoints`, `price`, `productPrice`, `ASIN`, and `asin`.
- Field provenance and confidence are missing. The extension should track where each field came from, for example DOM selector, JSON-LD, embedded JSON, API response, user override, or cache.
- Data freshness is inconsistent. Description generation treats product data older than one minute as stale, but other panel flows use different cache keys and timestamps.
- Selector tests and HTML fixtures are missing. There are no saved-page fixture tests for Amazon/Walmart/Shopify layout variants or regression checks for required fields.

## Recommendations

1. Introduce a platform adapter layer.

   Define a small interface:

   ```ts
   interface ProductScraperAdapter {
     platform: 'amazon' | 'walmart' | 'shopify';
     detect(): boolean;
     waitForReady(): Promise<void>;
     scrape(): Promise<ScrapeResult>;
     normalize(raw: unknown): NormalizedProduct;
     validate(product: NormalizedProduct): FieldIssue[];
   }
   ```

   Make each platform own selectors, readiness checks, data-source priority, and field provenance. The panel should call one stable `SCRAPE_PRODUCT_DATA` endpoint that delegates to the active adapter.

2. Prefer structured data before CSS selectors.

   Use this priority order for product fields:

   - Authorized API response where available.
   - JSON-LD product data.
   - Embedded product JSON or platform data objects.
   - Stable semantic attributes such as `itemprop`, `aria-label`, and known data attributes.
   - CSS selectors as fallback only.

3. Add a normalized product schema.

   Use one canonical shape:

   ```json
   {
     "platform": "amazon",
     "sourceUrl": "",
     "sourceId": "",
     "title": "",
     "brand": "",
     "price": { "amount": null, "currency": "" },
     "images": [],
     "bulletPoints": [],
     "description": "",
     "specifications": {},
     "availability": "",
     "variants": [],
     "provenance": {},
     "confidence": {}
   }
   ```

   Keep aliases only at UI boundaries for backward compatibility.

4. Remove duplicate scrape handlers.

   Keep one message listener per content script for `SCRAPE_PRODUCT_DATA`, one comprehensive scrape path per platform, and a compatibility wrapper for older action names such as `SCRAPE_COMPLETE_PRODUCT`.

5. Harden rendering.

   Render generated titles with `textContent` or escaped HTML only. Sanitize generated description HTML with a strict allowlist before assigning `innerHTML`, or render description text/sections as DOM nodes. Apply the same rule to error messages.

6. Make error handling field-aware.

   Return scrape results like:

   ```json
   {
     "success": true,
     "product": {},
     "missingFields": ["price", "bulletPoints"],
     "warnings": ["Amazon rating skipped due policy"],
     "fieldSources": { "title": "#productTitle", "images": "data-a-dynamic-image" }
   }
   ```

   Show this summary in the panel so users know whether the generated listing is based on complete data.

7. Build dynamic-content readiness per platform.

   For Amazon and Walmart, wait for stable product root, title, selected variant, price block, and image gallery. For Shopify, wait for product JSON/JSON-LD and selected variant changes. Use bounded observers and avoid unbounded polling.

8. Add Shopify only through an authorized design.

   For public storefront inspection, support JSON-LD and public product endpoints where legally allowed. For inventory, templates, admin data, ads, and winning-product intelligence, require merchant OAuth/API authorization or a user-provided export/API source.

9. Align policy and permissions.

   - Amazon: avoid scraping or using reviews/star ratings unless sourced through approved Amazon APIs and requirements are met.
   - Shopify: avoid unauthorized automated monitoring; support authorized bot/API access and merchant consent.
   - Chrome Web Store: keep permissions narrow, disclose scraped/browsing data handling, and collect only what the feature needs.

   References:

   - [Amazon Associates Program Policies](https://affiliate-program.amazon.com/help/operating/policies?ac-ms-src=ac-nav)
   - [Shopify Terms of Service](https://www.shopify.com/legal/terms)
   - [Shopify crawling your store and Web Bot Auth](https://help.shopify.com/en/manual/promoting-marketing/seo/crawling-your-store)
   - [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies?authuser=0000)

10. Add regression coverage.

    Add fixture-based tests for:

    - Amazon standard product, variant product, unavailable product, A+ content, and product with image gallery changes.
    - Walmart standard product, marketplace seller product, hidden/variant price product.
    - Shopify product page with JSON-LD, product JSON, variants, sold-out variant, and custom theme markup.

11. Reduce production logging.

    Gate debug logs centrally, strip product payloads from production logs, and avoid logging API keys, token fragments, or full scraped data.

12. Keep generated artifacts synchronized.

    Treat `apps/extension` as source of truth and generate `apps/web/public/chrome_extension` from the same build step. Add a verification script that checks copied panel assets and script order.

## Workflow Diagram

The workflow diagram is generated as a PNG at:

`docs/extension-workflow.png`

