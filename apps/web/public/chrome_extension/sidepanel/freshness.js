// freshness.js — stale-product guard for the side panel.
// A scanned product is "fresh" for a tab only when the tab URL still points at
// the same product. Primary key: supplier-neutral sourceId appearing in the URL
// (Amazon ASIN in /dp/<id>, Walmart item id in /ip/.../<id>, …). Fallback:
// exact scannedUrl match when a supplier has no URL-visible id.
// Pure logic, no chrome.* — unit-tested in tests/freshness.test.js.

(function () {
  'use strict';

  function isFresh(product, tabUrl) {
    if (!product || !tabUrl) return false;

    const ids = new Set();

    // 1. Add parent identifiers
    if (product.sourceId) ids.add(String(product.sourceId).trim().toUpperCase());
    if (product.asin) ids.add(String(product.asin).trim().toUpperCase());
    if (product.parentAsin) ids.add(String(product.parentAsin).trim().toUpperCase());
    if (product.itemId) ids.add(String(product.itemId).trim().toUpperCase());

    // 2. Add child variation identifiers
    if (Array.isArray(product.variants)) {
      product.variants.forEach(v => {
        if (v.supplierVariantId) ids.add(String(v.supplierVariantId).trim().toUpperCase());
        if (v.asin) ids.add(String(v.asin).trim().toUpperCase());
        if (v.itemId) ids.add(String(v.itemId).trim().toUpperCase());
      });
    }

    // 3. Match against the tab URL
    const upperTabUrl = tabUrl.toUpperCase();
    for (const id of ids) {
      if (id && upperTabUrl.includes(id)) {
        return true;
      }
    }

    // 4. Fallback to scannedUrl match (ignoring query/hashes)
    if (product.scannedUrl) {
      const strip = (u) => String(u).split(/[?#]/)[0].replace(/\/$/, '');
      return strip(tabUrl) === strip(product.scannedUrl);
    }

    return false;
  }

  if (typeof window !== 'undefined') {
    window.SSFreshness = { isFresh };
  }
})();
