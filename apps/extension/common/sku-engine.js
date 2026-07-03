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
    return (h % 2176782336).toString(36).toUpperCase().padStart(6, '0'); // 6-char base36
  }

  /**
   * Build human-readable SKU.
   * Single:    buildReadable('B08XYZ', {})           → 'AMZ-B08XYZ'
   * Variation: buildReadable('B08XYZ', {Color:{productName:'Red'}, Size:{productName:'L'}})
   *                                                  → 'AMZ-B08XYZ-COLO-RED-SIZE-L'
   * @param {string} parentAsin
   * @param {object} attrs  — { "Color": { productName: "Red" }, ... } or flat { "Color": "Red" }
   * @param {string} [supplier] — default 'AZS'
   */
  function buildReadable(parentAsin, attrs, supplier) {
    supplier = (supplier || 'AZS').toUpperCase().slice(0, 4);
    const root = supplier + '-' + String(parentAsin || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const parts = Object.keys(attrs || {}).sort().map(k => {
      const rawVal = attrs[k];
      const val = (rawVal && typeof rawVal === 'object') ? (rawVal.productName || '') : String(rawVal || '');
      return _clean(k, 4) + '-' + _clean(val, 16);
    });
    const readable = parts.length ? root + '-' + parts.join('-') : root;
    if (readable.length <= MAX_LEN) return readable;

    // Construct un-truncated string for hashing to guarantee uniqueness
    const hashParts = Object.keys(attrs || {}).sort().map(k => {
      const rawVal = attrs[k];
      const val = (rawVal && typeof rawVal === 'object') ? (rawVal.productName || '') : String(rawVal || '');
      return k + ':' + val;
    });
    const hashInput = root + '|' + hashParts.join('|');

    // overflow: keep root + hash suffix
    const suffix = '-' + _hash32(hashInput);
    return root.slice(0, MAX_LEN - suffix.length) + suffix;
  }

  /**
   * Supplier key → SKU prefix. Pure lookup, no algorithm change:
   * 'amazon' (and unknown/missing — back-compat) → 'AZS', 'walmart' → 'WMS',
   * future suppliers → first 3 alphanumeric chars uppercased.
   * @param {string} [supplier] — normalized product.supplier
   */
  function prefixFor(supplier) {
    const s = String(supplier || '').toLowerCase();
    if (!s || s === 'amazon') return 'AZS';
    if (s === 'walmart') return 'WMS';
    const cleaned = s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    return cleaned || 'AZS';
  }

  /**
   * Return the readable SKU directly for eBay Custom Label.
   * Do not base64 encode as it makes Custom Labels unreadable.
   */
  function encodeForEbay(readableSku) {
    return String(readableSku || '').trim();
  }

  /**
   * Fallback SKU root for products with no supplier ID: deterministic hash of
   * the cleaned title ("T" + 6-char base36). Without this, every ID-less
   * product produced the same "<PREFIX>-" root, colliding in the DB upsert
   * (ON CONFLICT (user_id, sku)). Deterministic on purpose — re-scanning the
   * same product yields the same SKU, so duplicate detection still works.
   * @param {string} title
   * @returns {string} e.g. 'T1A2B3C', or '' when the title is empty too
   */
  function fallbackRootFromTitle(title) {
    const cleaned = String(title || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
    if (!cleaned) return '';
    return 'T' + _hash32(cleaned);
  }

  return { buildReadable, encodeForEbay, prefixFor, fallbackRootFromTitle, MAX_LEN };
})();
