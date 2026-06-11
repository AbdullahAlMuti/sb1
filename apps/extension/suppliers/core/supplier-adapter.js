// supplier-adapter.js — base contract every supplier (Amazon, Walmart, AliExpress,
// Temu, ...) must satisfy. Suppliers are DATA PROVIDERS only: they scrape + normalize
// into the universal product shape consumed by listing-draft / pricing / sku / eBay
// upload. No marketplace or UI logic belongs here.
//
// A supplier adapter is a plain object implementing:
//   supplierId: string                      — 'amazon', 'walmart', 'aliexpress', ...
//   matchUrl(url): boolean                  — does this adapter own the page?
//   scrapeProduct(opts): Promise<raw>       — single-item scrape (DOM)
//   scrapeVariants(opts): Promise<raw>      — variation scrape (DOM)
//   normalize(raw): NormalizedProduct       — raw scraper output → universal shape
//   validate(product): { valid, errors[] }  — completeness check
//
// NormalizedProduct (universal — the ONLY shape downstream code sees):
//   { sourceId, supplier, title, price, currency, images[], variants[],
//     hasVariants, specs, description, url, ...passthrough }

window.SSSupplierAdapter = (() => {
  'use strict';

  // Required keys a normalized product must carry for the universal pipeline.
  const REQUIRED_FIELDS = ['sourceId', 'supplier', 'title'];

  /**
   * Validate a normalized product has the minimum fields the universal pipeline
   * (productToDraft → adaptProduct) needs. Does NOT validate marketplace rules —
   * that is the MarketplaceAdapter's job.
   * @param {object} product normalized product
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validate(product) {
    const errors = [];
    if (!product || typeof product !== 'object') {
      return { valid: false, errors: ['product is not an object'] };
    }
    for (const key of REQUIRED_FIELDS) {
      const v = product[key];
      if (v === undefined || v === null || v === '') errors.push(`missing ${key}`);
    }
    if (!Array.isArray(product.images)) errors.push('images must be an array');
    if (!Array.isArray(product.variants)) errors.push('variants must be an array');
    return { valid: errors.length === 0, errors };
  }

  /**
   * Assert an object looks like a supplier adapter. Throws on contract violation —
   * called by the registry at register() time so a broken adapter fails loud.
   * @param {object} adapter
   */
  function assertContract(adapter) {
    if (!adapter || typeof adapter !== 'object') throw new Error('adapter must be an object');
    if (!adapter.supplierId || typeof adapter.supplierId !== 'string') {
      throw new Error('adapter.supplierId must be a non-empty string');
    }
    for (const fn of ['matchUrl', 'normalize']) {
      if (typeof adapter[fn] !== 'function') throw new Error(`adapter.${fn} must be a function`);
    }
    return true;
  }

  return { REQUIRED_FIELDS, validate, assertContract };
})();
