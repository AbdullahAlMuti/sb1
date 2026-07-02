// supplier-detector.js — single source of truth for URL→supplier mapping.
// Wraps SSSupplierRegistry.match() so nothing else needs to guess suppliers.
//
// Loaded as part of the suppliers bundle (build/suppliers.bundle.js).
// Available in: side panel, content scripts that load the suppliers bundle.
//
// Usage:
//   const hit = SSSupplierDetector.detectSupplierFromUrl(location.href);
//   if (hit) { /* hit.supplierId, hit.displayName */ }

window.SSSupplierDetector = (() => {
  'use strict';

  /**
   * Detect the supplier for a given URL.
   * Delegates to SSSupplierRegistry adapters (subdomain-safe, case-insensitive).
   *
   * @param {string} url  full URL (e.g. location.href)
   * @returns {{ supplierId: string, displayName: string } | null}
   */
  function detectSupplierFromUrl(url) {
    if (!url) return null;
    try {
      // SSSupplierRegistry.match() accepts the full URL; each adapter
      // internally extracts the hostname and tests its own regex.
      const adapter = window.SSSupplierRegistry && window.SSSupplierRegistry.match(url);
      if (!adapter) return null;
      return { supplierId: adapter.supplierId, displayName: adapter.displayName };
    } catch (_) {
      return null;
    }
  }

  /**
   * Convenience: detect from the current page URL.
   * Only valid in a content script or page context (not service worker).
   * @returns {{ supplierId: string, displayName: string } | null}
   */
  function detectCurrentPage() {
    try {
      return detectSupplierFromUrl(window.location.href);
    } catch (_) {
      return null;
    }
  }

  return { detectSupplierFromUrl, detectCurrentPage };
})();
