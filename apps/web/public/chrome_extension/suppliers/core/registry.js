// registry.js — supplier adapter registry. Maps a page URL to the adapter that
// owns it. Adding a new supplier = register one adapter; nothing else in the app
// changes. This is the plugin seam that makes 50+ suppliers tractable.
//
// Usage (in a content script, after adapters loaded):
//   SSSupplierRegistry.register(window.SSAmazonAdapter);
//   const adapter = SSSupplierRegistry.match(location.href);
//   if (adapter) { const raw = await adapter.scrapeProduct(); ... }

window.SSSupplierRegistry = (() => {
  'use strict';

  const _adapters = [];

  /**
   * Register a supplier adapter. Validates the contract — a broken adapter throws
   * here, at registration, not at scrape time.
   * @param {object} adapter
   */
  function register(adapter) {
    if (window.SSSupplierAdapter) window.SSSupplierAdapter.assertContract(adapter);
    // Replace existing adapter with same supplierId (idempotent re-register).
    const i = _adapters.findIndex((a) => a.supplierId === adapter.supplierId);
    if (i >= 0) _adapters[i] = adapter;
    else _adapters.push(adapter);
    return adapter;
  }

  /**
   * Find the adapter that matches a URL. First match wins (registration order).
   * @param {string} url
   * @returns {object|null}
   */
  function match(url) {
    if (!url) return null;
    for (const a of _adapters) {
      try {
        if (a.matchUrl(url)) return a;
      } catch (_) {
        /* adapter matchUrl threw — skip */
      }
    }
    return null;
  }

  /**
   * Get a registered adapter by supplierId.
   * @param {string} supplierId
   * @returns {object|null}
   */
  function get(supplierId) {
    return _adapters.find((a) => a.supplierId === supplierId) || null;
  }

  /** List registered supplierIds (debug / introspection). */
  function list() {
    return _adapters.map((a) => a.supplierId);
  }

  /**
   * Display metadata for a supplier — name + identifier label for UI chrome
   * (panel top bar, side panel). Never throws: unknown/missing suppliers get a
   * capitalized name and a generic "ID" label so the UI renders for suppliers
   * that have no adapter loaded in this context.
   * @param {string} supplierId normalized product.supplier (e.g. 'amazon')
   * @returns {{ displayName: string, idLabel: string }}
   */
  function getMeta(supplierId) {
    const a = get(supplierId);
    const fallbackName = supplierId
      ? String(supplierId).charAt(0).toUpperCase() + String(supplierId).slice(1)
      : 'Supplier';
    return {
      displayName: (a && a.displayName) || fallbackName,
      idLabel: (a && a.idLabel) || 'ID',
    };
  }

  /** Clear all adapters — test isolation only. */
  function _reset() {
    _adapters.length = 0;
  }

  return { register, match, get, getMeta, list, _reset };
})();
