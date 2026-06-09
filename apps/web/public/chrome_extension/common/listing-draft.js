/**
 * listing-draft.js — Shared listing draft state for SellerSuit
 *
 * Uses chrome.storage.session (MV3, shared across all extension contexts
 * within a browser session). Falls back to chrome.storage.local if session
 * is unavailable (older Chrome builds).
 *
 * Also mirrors to chrome.storage.local `currentProduct` for backward
 * compatibility with panel-store.js, panel.js, and ebay_prelist.js.
 *
 * Draft schema:
 *   supplier         string   — 'amazon' | 'walmart' | ...
 *   mode             string   — 'single' | 'all'
 *   asin             string
 *   parentAsin       string | null
 *   title            string
 *   description      string
 *   title_source     string   — 'scraped' | 'ai' | 'manual'
 *   description_source string — 'scraped' | 'ai' | 'manual'
 *   mainImage        string   — primary image URL
 *   images           string[] — all product images
 *   selectedVariant  object | null — for single mode
 *   variants         object[] — all variation rows
 *   variationCount   number
 *   pricing          { rawPrice, finalPrice, currency }
 *   sku              string
 *   price_source     string   — 'calculated' | 'manual'
 *   sku_source       string   — 'generated' | 'manual'
 *   userOverrides    object   — freeform map of manual field edits
 *   lastScannedAt    number   — Date.now() timestamp
 */

(function () {
  'use strict';

  const DRAFT_KEY = 'listingDraft';

  // chrome.storage.session is only available in content scripts from Chrome 111+.
  // Use chrome.storage.local everywhere for broad compatibility. The draft key
  // 'listingDraft' is distinct from 'currentProduct' (legacy mirror), so no conflict.
  function _store() {
    return chrome.storage.local;
  }

  /**
   * Save a full draft object. Also mirrors to currentProduct in local storage
   * for backward compatibility.
   * @param {object} draft
   * @returns {Promise<void>}
   */
  function saveDraft(draft) {
    return new Promise((resolve, reject) => {
      const ts = draft.lastScannedAt || Date.now();
      const d = { ...draft, lastScannedAt: ts };

      // Mirror the draft as `currentProduct` for legacy readers (panel-store,
      // ebay_prelist, etc.) — they key off `currentProduct`.
      const legacyProduct = _draftToLegacyProduct(d);

      _store().set({ [DRAFT_KEY]: d }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        // Mirror to local storage for backward compat
        chrome.storage.local.set({ currentProduct: legacyProduct }, () => {
          if (chrome.runtime.lastError) console.warn('[SS Draft] local mirror failed:', chrome.runtime.lastError);
          resolve();
        });
      });
    });
  }

  /**
   * Read the current draft.
   * @returns {Promise<object|null>}
   */
  function getDraft() {
    return new Promise((resolve) => {
      _store().get(DRAFT_KEY, (result) => {
        if (chrome.runtime.lastError) {
          console.warn('[SS Draft] getDraft error:', chrome.runtime.lastError);
          resolve(null);
          return;
        }
        resolve(result[DRAFT_KEY] || null);
      });
    });
  }

  /**
   * Merge a partial update into the existing draft. Creates draft if missing.
   * @param {object} patch
   * @returns {Promise<object>} merged draft
   */
  async function patchDraft(patch) {
    const existing = (await getDraft()) || {};
    const merged = { ...existing, ...patch, lastScannedAt: Date.now() };
    await saveDraft(merged);
    return merged;
  }

  /**
   * Clear the current draft (and remove legacy currentProduct mirror).
   * @returns {Promise<void>}
   */
  function clearDraft() {
    return new Promise((resolve) => {
      _store().remove(DRAFT_KEY, () => {
        chrome.storage.local.remove('currentProduct', () => resolve());
      });
    });
  }

  /**
   * Build a legacy `currentProduct` object from a draft so that code
   * that reads `currentProduct` from chrome.storage.local still works.
   * @param {object} d draft
   * @returns {object}
   */
  function _draftToLegacyProduct(d) {
    return {
      // Core identity
      asin:         d.asin         || null,
      parentAsin:   d.parentAsin   || null,
      marketplace:  d.supplier     || 'amazon',
      isSingleMode: d.mode === 'single',

      // Content
      title:        d.title        || '',
      description:  d.description  || '',
      images:       d.images       || [],
      mainImage:    d.mainImage    || (d.images && d.images[0]) || null,

      // Pricing
      price:        d.pricing && d.pricing.rawPrice   != null ? d.pricing.rawPrice  : null,
      finalPrice:   d.pricing && d.pricing.finalPrice != null ? d.pricing.finalPrice : null,
      raw_supplier_price: d.pricing && d.pricing.rawPrice != null ? d.pricing.rawPrice : null,
      currency:     (d.pricing && d.pricing.currency) || 'USD',

      // SKU
      ebaySku:      d.sku          || null,

      // Variations
      variants:     d.variants     || [],
      hasVariants:  Array.isArray(d.variants) && d.variants.length > 1,
      variationCount: d.variationCount || (Array.isArray(d.variants) ? d.variants.length : 0),

      // Single selected variant
      selectedVariant: d.selectedVariant || null,

      // Source flags (bonus data for advanced editor)
      title_source:       d.title_source       || 'scraped',
      description_source: d.description_source || 'scraped',
      price_source:       d.price_source       || 'calculated',
      sku_source:         d.sku_source         || 'generated',

      // Meta
      specs:              d.specs              || {},
      lastScannedAt: d.lastScannedAt || Date.now(),
    };
  }

  /**
   * Build a draft from a scraped product object (normalized input from
   * amazon-variant-scraper.js / panel-main.js SCRAPE_SINGLE / SCRAPE_VARIANTS).
   * @param {object} product  scraped product
   * @param {string} [mode]   'single' | 'all'
   * @returns {object} draft
   */
  function productToDraft(product, mode) {
    const m = mode || (product.isSingleMode ? 'single' : 'all');
    const rawPrice = parseFloat(product.price) || 0;
    const finalPrice = (product.finalPrice != null)
      ? parseFloat(product.finalPrice)
      : null; // filled later by _applyPricingToProduct

    return {
      supplier:    product.marketplace || 'amazon',
      mode:        m,
      asin:        product.asin        || null,
      parentAsin:  product.parentAsin  || null,

      title:       product.title       || '',
      description: product.description || '',
      title_source:       'scraped',
      description_source: 'scraped',

      mainImage:  (product.images && product.images[0]) || null,
      images:     product.images || [],

      selectedVariant: m === 'single' ? (product.variants && product.variants[0]) || null : null,
      variants:    product.variants    || [],
      variationCount: Array.isArray(product.variants) ? product.variants.length : 0,

      pricing: {
        rawPrice,
        finalPrice,
        currency: product.currency || 'USD',
      },
      sku:         product.ebaySku     || null,
      specs:       product.specs       || product.specifications || {},
      price_source: 'calculated',
      sku_source:   'generated',
      userOverrides: {},
      lastScannedAt: product.scrapedAt || Date.now(),
    };
  }

  // Expose globally (works in content script, side panel, and extension pages)
  window.SSListingDraft = {
    saveDraft,
    getDraft,
    patchDraft,
    clearDraft,
    productToDraft,
  };

})();
