// walmart/adapter.js — wraps the Walmart injector's scrape function as a
// SupplierAdapter, mirroring suppliers/amazon/adapter.js. The injector's scrape
// algorithm is UNCHANGED — this is a thin contract shell: matchUrl + delegate
// scrape + normalize raw output to the universal shape.
//
// The injector exposes window.SSWalmartScraper = { scrapeProduct } at load time
// (see content_scripts/walmart_injector.js). Walmart has no variant scraper at
// this seam yet, so scrapeVariants delegates to scrapeProduct (single product).

window.SSWalmartAdapter = (() => {
  'use strict';

  // Mirrors the walmart host_permissions in manifest.json.
  const HOST_RE = /(^|\.)walmart\.(com|ca)$/i;

  function matchUrl(url) {
    try {
      return HOST_RE.test(new URL(url).hostname);
    } catch (_) {
      return false;
    }
  }

  async function scrapeProduct(opts) {
    const s = window.SSWalmartScraper;
    if (!s) throw new Error('SSWalmartScraper not loaded');
    return s.scrapeProduct(opts);
  }

  // Full variation scrape via SsWalmartVariantScraper (__NEXT_DATA__ data-first),
  // exposed through the injector's SSWalmartScraper.scrapeVariants. Falls back to
  // single-product scrape if the variant path is unavailable.
  async function scrapeVariants(opts) {
    const s = window.SSWalmartScraper;
    if (s && typeof s.scrapeVariants === 'function') return s.scrapeVariants(opts);
    return scrapeProduct(opts);
  }

  /**
   * Raw scraper output → universal NormalizedProduct. Pure. Derives sourceId
   * from the Walmart item id in the URL (…/ip/slug/123456789). Everything else
   * passes through unchanged so no scrape behavior is altered.
   * @param {object} raw injector scrape output ({ title, url, specifications, ... })
   * @returns {object} normalized product
   */
  function normalize(raw) {
    raw = raw || {};
    const url = raw.url || (window.location ? window.location.href : '');
    const idMatch = /\/ip\/(?:[^/]+\/)?(\d+)/.exec(url || '');
    const sourceId = raw.sourceId || raw.itemId || (idMatch ? idMatch[1] : '');
    const product = {
      ...raw, // passthrough: title, description, specifications, ...
      sourceId,
      supplier: raw.supplier || 'walmart',
      url,
      // Contract defaults — SSSupplierAdapter.validate requires arrays
      images: Array.isArray(raw.images) ? raw.images : [],
      variants: Array.isArray(raw.variants) ? raw.variants : [],
      hasVariants:
        typeof raw.hasVariants === 'boolean'
          ? raw.hasVariants
          : Array.isArray(raw.variants) && raw.variants.length > 1,
    };
    return window.SSVariationNormalizer
      ? window.SSVariationNormalizer.normalizeProduct(product, { dedupe: true, dropInvalid: true })
      : product;
  }

  return {
    supplierId: 'walmart',
    displayName: 'Walmart',
    idLabel: 'Item ID',
    matchUrl,
    scrapeProduct,
    scrapeVariants,
    normalize,
    validate: (p) =>
      window.SSSupplierAdapter ? window.SSSupplierAdapter.validate(p) : { valid: true, errors: [] },
  };
})();

// Auto-register when loaded after registry (bundle import order: registry.js → adapter.js)
if (typeof window.SSSupplierRegistry !== 'undefined') {
  window.SSSupplierRegistry.register(window.SSWalmartAdapter);
}
