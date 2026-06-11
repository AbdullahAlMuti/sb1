// amazon/adapter.js — wraps the existing window.SsAmazonVariantScraper as a
// SupplierAdapter. The scraper's algorithm is UNCHANGED — this is a thin contract
// shell: matchUrl + delegate scrape + normalize raw output to the universal shape.
//
// normalize() is the one new piece of logic: it stamps sourceId + supplier onto
// the scraper output so downstream universal code (productToDraft, adaptProduct)
// never reads Amazon-specific fields. asin/parentAsin are preserved for backward
// compatibility with the DB sync layer.

window.SSAmazonAdapter = (() => {
  'use strict';

  // Mirrors the amazon host_permissions in manifest.json.
  const HOST_RE = /(^|\.)amazon\.(com|co\.uk|de|ca|com\.au)$/i;

  function matchUrl(url) {
    try {
      return HOST_RE.test(new URL(url).hostname);
    } catch (_) {
      return false;
    }
  }

  // v2 (data-first) runs first; v1 (SuperDS-ported click scraper) is the
  // fallback. A v2 result is accepted only when it carries the essentials, so
  // any v2 regression degrades to today's behavior instead of losing listings.
  function _usableResult(r, needVariants) {
    if (!r || !r.title) return false;
    if (needVariants && (!Array.isArray(r.variants) || r.variants.length === 0)) return false;
    return true;
  }

  async function scrapeProduct(opts) {
    const v2 = window.SsAmazonScraperV2;
    if (v2) {
      try {
        const r = await v2.scrapeSingleProduct(opts);
        if (_usableResult(r, false)) return r;
        console.warn('[SSAmazonAdapter] v2 single result unusable — falling back to v1');
      } catch (e) {
        // CAPTCHA must surface to the user, not silently retry v1 (same wall)
        if (/CAPTCHA/i.test(e?.message || '')) throw e;
        console.warn('[SSAmazonAdapter] v2 scrapeSingleProduct failed, using v1:', e?.message || e);
      }
    }
    const s = window.SsAmazonVariantScraper;
    if (!s) throw new Error('SsAmazonVariantScraper not loaded');
    return s.scrapeSingleProduct(opts);
  }

  async function scrapeVariants(opts) {
    const v2 = window.SsAmazonScraperV2;
    if (v2) {
      try {
        const r = await v2.scrapeProductWithVariants(opts);
        if (_usableResult(r, true)) return r;
        console.warn('[SSAmazonAdapter] v2 variants result unusable — falling back to v1');
      } catch (e) {
        // User-facing guards propagate (CAPTCHA wall, low-quantity policy) —
        // v1 would hit the same condition and the panel needs the message.
        if (/CAPTCHA|low on quantity/i.test(e?.message || '')) throw e;
        console.warn(
          '[SSAmazonAdapter] v2 scrapeProductWithVariants failed, using v1:',
          e?.message || e
        );
      }
    }
    const s = window.SsAmazonVariantScraper;
    if (!s) throw new Error('SsAmazonVariantScraper not loaded');
    return s.scrapeProductWithVariants(opts);
  }

  /**
   * Raw scraper output → universal NormalizedProduct. Pure. The only transform:
   * derive sourceId (parentAsin → asin) and set supplier. Everything else passes
   * through unchanged so no scrape behavior is altered.
   * @param {object} raw scraper output ({ asin, parentAsin, marketplace:'amazon', ... })
   * @returns {object} normalized product
   */
  function normalize(raw) {
    raw = raw || {};
    const sourceId = raw.sourceId || raw.parentAsin || raw.asin || '';
    const product = {
      ...raw, // passthrough: title, price, images, variants, specs, ...
      sourceId,
      supplier: raw.marketplace || raw.supplier || 'amazon',
      images: Array.isArray(raw.images) ? raw.images : [],
      variants: Array.isArray(raw.variants) ? raw.variants : [],
      // backward-compat: keep asin/parentAsin for DB sync layer
      asin: raw.asin || null,
      parentAsin: raw.parentAsin || raw.asin || null,
    };
    return window.SSVariationNormalizer
      ? window.SSVariationNormalizer.normalizeProduct(product, { dedupe: true, dropInvalid: true })
      : product;
  }

  return {
    supplierId: 'amazon',
    displayName: 'Amazon',
    idLabel: 'ASIN',
    matchUrl,
    scrapeProduct,
    scrapeVariants,
    normalize,
    validate: (p) =>
      window.SSSupplierAdapter ? window.SSSupplierAdapter.validate(p) : { valid: true, errors: [] },
  };
})();

// Auto-register when loaded after registry (manifest order: registry.js → adapter.js)
if (typeof window.SSSupplierRegistry !== 'undefined') {
  window.SSSupplierRegistry.register(window.SSAmazonAdapter);
}
