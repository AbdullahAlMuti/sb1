// sku-engine.js — single source of truth for SKU generation + eBay encoding
// buildReadable  → human-readable DB SKU  e.g. "AMZ-B08XYZ-CLR-RED-SZ-L"
// encodeForEbay  → base64 Custom Label    sent to eBay only, never stored as SKU

window.SSSkuEngine = (() => {
  const MAX_LEN = 50; // eBay Custom Label hard limit

  function _clean(s, maxChars) {
    return String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, maxChars || 8);
  }

  // deterministic short hash for overflow truncation — avoids collisions on long SKUs
  function _hash32(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return (h % 1679616).toString(36).toUpperCase().padStart(4, '0'); // 4-char base36
  }

  /**
   * Build human-readable SKU.
   * Single:    buildReadable('B08XYZ', {})           → 'AMZ-B08XYZ'
   * Variation: buildReadable('B08XYZ', {Color:{productName:'Red'}, Size:{productName:'L'}})
   *                                                  → 'AMZ-B08XYZ-COLO-RED-SIZE-L'
   * @param {string} parentAsin
   * @param {object} attrs  — { "Color": { productName: "Red" }, ... } or flat { "Color": "Red" }
   * @param {string} [supplier] — default 'AMZ'
   */
  function buildReadable(parentAsin, attrs, supplier) {
    supplier = (supplier || 'AMZ').toUpperCase().slice(0, 4);
    const root = supplier + '-' + String(parentAsin || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const parts = Object.keys(attrs || {}).sort().map(k => {
      const rawVal = attrs[k];
      const val = (rawVal && typeof rawVal === 'object') ? (rawVal.productName || '') : String(rawVal || '');
      return _clean(k, 4) + '-' + _clean(val, 6);
    });
    const full = parts.length ? root + '-' + parts.join('-') : root;
    if (full.length <= MAX_LEN) return full;
    // overflow: keep root + hash suffix
    const suffix = '-' + _hash32(full);
    return root.slice(0, MAX_LEN - suffix.length) + suffix;
  }

  /**
   * Encode readable SKU → base64 for eBay Custom Label field.
   * Call ONLY at upload time. Never store base64 in DB as primary SKU.
   */
  function encodeForEbay(readableSku) {
    return btoa(unescape(encodeURIComponent(String(readableSku || ''))));
  }

  return { buildReadable, encodeForEbay, MAX_LEN };
})();
