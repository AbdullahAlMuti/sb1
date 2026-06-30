// aliexpress/adapter.js - AliExpress supplier adapter.
// Thin supplier boundary only: URL match, scrape delegation, and pure normalize.

window.SSAliExpressAdapter = (() => {
  'use strict';

  const FALLBACK_DOMAINS = ['aliexpress.com', 'aliexpress.ru', 'aliexpress.us'];

  function domains() {
    const generated = window.SSAliExpressDomains && window.SSAliExpressDomains.domains;
    return Array.isArray(generated) && generated.length ? generated : FALLBACK_DOMAINS;
  }

  function hostMatchesDomain(host, domain) {
    return host === domain || host.endsWith(`.${domain}`);
  }

  function productIdFromUrl(url) {
    try {
      const parsed = new URL(url);
      const pathMatch = parsed.pathname.match(/\/item\/(\d+)(?:\.html)?/i);
      if (pathMatch) return pathMatch[1];
      return parsed.searchParams.get('productId') || parsed.searchParams.get('itemId') || '';
    } catch (_) {
      return '';
    }
  }

  function matchUrl(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (!domains().some((domain) => hostMatchesDomain(host, String(domain).toLowerCase()))) {
        return false;
      }
      return /\/item\/\d+(?:\.html)?/i.test(parsed.pathname) || !!productIdFromUrl(url);
    } catch (_) {
      return false;
    }
  }

  async function scrapeProduct(opts) {
    const scraper = window.SSAliExpressScraper;
    if (!scraper) throw new Error('SSAliExpressScraper not loaded');
    return scraper.scrapeSingleProduct(opts);
  }

  async function scrapeVariants(opts) {
    const scraper = window.SSAliExpressScraper;
    if (!scraper) throw new Error('SSAliExpressScraper not loaded');
    return scraper.scrapeProductWithVariants(opts);
  }

  function normalize(raw) {
    raw = raw || {};
    const url = raw.url || (window.location ? window.location.href : '');
    const sourceId = raw.sourceId || raw.productId || raw.itemId || productIdFromUrl(url);
    const product = {
      ...raw,
      sourceId: sourceId || '',
      productId: raw.productId || sourceId || '',
      supplier: raw.supplier || 'aliexpress',
      url,
      mainImage: raw.mainImage || (Array.isArray(raw.images) ? raw.images[0] : null) || null,
      images: Array.isArray(raw.images) ? raw.images : [],
      variants: Array.isArray(raw.variants) ? raw.variants : [],
      specs: raw.specs || raw.specifications || {},
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
    supplierId: 'aliexpress',
    displayName: 'AliExpress',
    idLabel: 'Product ID',
    matchUrl,
    scrapeProduct,
    scrapeVariants,
    normalize,
    validate: (p) =>
      window.SSSupplierAdapter ? window.SSSupplierAdapter.validate(p) : { valid: true, errors: [] },
    _domains: domains,
    _productIdFromUrl: productIdFromUrl,
  };
})();

if (typeof window.SSSupplierRegistry !== 'undefined') {
  window.SSSupplierRegistry.register(window.SSAliExpressAdapter);
}
