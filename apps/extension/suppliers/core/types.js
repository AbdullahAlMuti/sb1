// types.js — JSDoc type definitions for the supplier plugin system.
// No runtime code: this file only declares types consumed by editors and
// `npx tsc --noEmit` (see jsconfig.json). Import types in JSDoc via:
//   /** @type {import('../core/types.js').SupplierAdapter} */

/**
 * The universal product shape — the ONLY shape downstream universal code
 * (listing-draft, pricing, SKU, eBay upload, panels) is allowed to read.
 * Supplier-specific fields (asin, itemId, …) may pass through for legacy
 * DB sync but universal code must not branch on them.
 *
 * @typedef {Object} NormalizedProduct
 * @property {string} sourceId       Supplier-neutral product id (ASIN, Walmart item id, …)
 * @property {string} supplier       Supplier key: 'amazon' | 'walmart' | future ids
 * @property {string} title
 * @property {string} [url]          Supplier product page URL
 * @property {string|number} [price] Raw supplier price
 * @property {string} [currency]
 * @property {string[]} [images]     Image URL strings (high-res)
 * @property {string} [mainImage]
 * @property {Array<Object>} [variants]
 * @property {boolean} [hasVariants]
 * @property {Object<string, string>} [specifications]
 * @property {string} [description]
 */

/**
 * Contract every supplier adapter must satisfy (enforced at registration by
 * SSSupplierAdapter.assertContract). Suppliers are data providers ONLY.
 *
 * @typedef {Object} SupplierAdapter
 * @property {string} supplierId                                   Unique key ('amazon', 'walmart', …)
 * @property {(url: string) => boolean} matchUrl                   Does this adapter own the page?
 * @property {(opts?: Object) => Promise<Object>} scrapeProduct    Single-item DOM scrape (raw shape)
 * @property {(opts?: Object) => Promise<Object>} scrapeVariants   Variation DOM scrape (raw shape)
 * @property {(raw: Object) => NormalizedProduct} normalize        Raw → universal shape (pure)
 * @property {(p: NormalizedProduct) => {valid: boolean, errors: string[]}} validate
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors
 */

/**
 * Injector message contract — every supplier content script (injector) must
 * answer these chrome.runtime messages so the universal panels (side panel
 * compact view + panel.html extended workspace) work without supplier-specific
 * panel code. New suppliers: implement these handlers + register an adapter;
 * no panel changes required.
 *
 * | action                  | sent by            | response                                  |
 * |-------------------------|--------------------|-------------------------------------------|
 * | SCRAPE_SINGLE           | side panel scan    | { success, product: NormalizedProduct }   |
 * | SCRAPE_VARIANTS         | side panel scan    | { success, product: NormalizedProduct }   |
 * | SCRAPE_COMPLETE_PRODUCT | panel.js / runner  | { success, data, fieldsCount, specsCount }|
 * | GENERATE_AI_TITLES      | panel.js           | { success }                               |
 * | EXTEND_PANEL            | side panel Extend  | { success } — inject panel.html inline,   |
 * |                         |                    | NO re-scraping (fromSidebar path), then   |
 * |                         |                    | showSidebarExtended() from currentProduct |
 * | PREPARE_EBAY_LISTING    | panel.js upload    | { success, fullData, productDetails } —   |
 * |                         |                    | optional; absence falls back to storage   |
 *
 * @typedef {Object} InjectorMessageContract
 */

// Make this file a module so typedefs are importable.
export {};
