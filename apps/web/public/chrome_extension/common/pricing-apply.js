// pricing-apply.js — applies the user's DASHBOARD Supplier Pricing rules to a
// scraped product (parent + variants). This is the ONLY module allowed to
// stamp finalPrice/ebayPrice on scraped products.
//
// Where the numbers come from:
//   * Rules: user_pricing_settings rows, synced from the backend into
//     chrome.storage.local by common/pricing-rule-sync.js (pricingRulesCache).
//     These are the SAME rules the dashboard "Supplier Pricing" page edits and
//     the same rules create-listing recomputes with server-side — one engine,
//     one settings source, per authenticated user.
//   * Math: window.SSPricingCore (suppliers/core/pricing-core.js) — integer
//     cents, deterministic, identical to _shared/pricing-core.js on the server.
//
// Hard rules (these encode the pricing-integrity contract):
//   1. NEVER fabricate a cost. If the raw supplier price is missing or invalid
//      the product is left unpriced and a warning is returned — a wrong price
//      on eBay is worse than no price.
//   2. ALWAYS price from the RAW supplier price (product.price at scrape time /
//      raw_supplier_price), never from a previously calculated finalPrice —
//      re-pricing and re-imports can therefore never compound markup.
//   3. Manual user edits win: price_source === 'manual' (parent) and existing
//      per-variant ebayPrice values are preserved, matching the data-priority
//      rule used across the editor.
//   4. No formula lives here. This module validates, normalizes, delegates to
//      SSPricingCore, and annotates the product with rule metadata so the
//      backend can verify the same calculation.

(function (root) {
  'use strict';

  const CACHE_KEY = 'pricingRulesCache';

  function _cleanFloat(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    const parsed = parseFloat(String(val).replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Read the synced rules cache (chrome.storage.local). Null when unavailable. */
  async function getRulesCache() {
    try {
      const stored = await new Promise((resolve) => chrome.storage.local.get(CACHE_KEY, resolve));
      return stored[CACHE_KEY] || null;
    } catch (_) {
      return null;
    }
  }

  /** Find the cached rule entry for a supplier key. Null when not synced/known. */
  function ruleFromCache(rulesCache, supplierKey) {
    if (!rulesCache || !Array.isArray(rulesCache.suppliers) || !supplierKey) return null;
    return rulesCache.suppliers.find((s) => s.supplierKey === supplierKey) || null;
  }

  /**
   * Resolve which supplier's rule governs a product when the caller doesn't
   * already know. Preference: key stamped at scan time → supplier field →
   * registry URL match → ASIN implies Amazon. Null = cannot price (callers
   * get a clean 'no_supplier_key' outcome — never a guessed formula).
   */
  function resolveSupplierKey(product) {
    if (!product) return null;
    if (product.supplierKey) return product.supplierKey;
    if (product.supplier) return product.supplier;
    const url = product.url || product.amazonUrl || '';
    if (url && root.SSSupplierRegistry && typeof root.SSSupplierRegistry.match === 'function') {
      try {
        const adapter = root.SSSupplierRegistry.match(url);
        if (adapter && adapter.supplierId) return adapter.supplierId;
      } catch (_) { /* registry not ready — fall through */ }
    }
    if (product.asin || product.parentAsin || product.ASIN) return 'amazon';
    return null;
  }

  /**
   * Compute one selling price from a RAW supplier price. Returns a number or
   * null (never throws, never invents input).
   */
  function priceFromRaw(rawPrice, ruleEntry) {
    const raw = _cleanFloat(rawPrice);
    if (!(raw > 0)) return null;
    if (!ruleEntry || !ruleEntry.calculationRule) return null;
    if (ruleEntry.isEnabled === false) return null;
    if (typeof root.SSPricingCore === 'undefined') return null;
    try {
      const result = root.SSPricingCore.calculatePrice(ruleEntry.calculationRule, raw, 0);
      return parseFloat(result.finalPrice);
    } catch (_) {
      return null;
    }
  }

  /**
   * Apply the supplier's dashboard pricing rule to a product IN PLACE.
   * Pure with respect to inputs other than `product` — unit-testable by
   * passing a fixed rulesCache.
   *
   * @param {object} product     normalized scraped product (mutated)
   * @param {object} rulesCache  pricingRulesCache shape ({ suppliers: [...] })
   * @param {string} supplierKey 'amazon' | 'walmart' | 'aliexpress' | ...
   * @returns {{ priced: boolean, reason: string|null, ruleVersion: number|null }}
   */
  function applyWithRules(product, rulesCache, supplierKey) {
    if (!product) return { priced: false, reason: 'no_product', ruleVersion: null };

    const key = supplierKey || resolveSupplierKey(product);

    // Stamp supplier identity so every downstream consumer (panel, uploader,
    // create-listing payload) knows which rule governs this product.
    if (key) {
      product.supplierKey = key;
      if (!product.supplier) product.supplier = key;
    } else {
      // Distinct outcome — never look up (or log) a "null" supplier.
      return { priced: false, reason: 'no_supplier_key', ruleVersion: null };
    }

    const ruleEntry = ruleFromCache(rulesCache, key);
    if (!ruleEntry) {
      return { priced: false, reason: 'no_rule_synced', ruleVersion: null };
    }
    if (ruleEntry.isEnabled === false) {
      return { priced: false, reason: 'rule_disabled', ruleVersion: ruleEntry.ruleVersion ?? null };
    }
    if (typeof root.SSPricingCore === 'undefined') {
      return { priced: false, reason: 'pricing_core_unavailable', ruleVersion: null };
    }

    // RAW price only — price/raw_supplier_price hold the scraped supplier cost.
    // finalPrice/ebayPrice are outputs and must never feed back in (rule 2).
    const baseRaw = _cleanFloat(product.raw_supplier_price) || _cleanFloat(product.price);
    if (baseRaw > 0) product.raw_supplier_price = baseRaw;

    let pricedAnything = false;

    const topIsManual = product.price_source === 'manual' && _cleanFloat(product.finalPrice) > 0;
    if (baseRaw > 0 && !topIsManual) {
      const finalPrice = priceFromRaw(baseRaw, ruleEntry);
      if (finalPrice !== null) {
        product.finalPrice = finalPrice;
        // Refresh ebayPrice when we own it ('calculated') or it's empty;
        // an ebayPrice of unknown provenance is treated as a manual edit.
        if (product.price_source === 'calculated' || !(_cleanFloat(product.ebayPrice) > 0)) {
          product.ebayPrice = finalPrice;
        }
        product.price_source = 'calculated';
        pricedAnything = true;
      }
    }

    if (Array.isArray(product.variants)) {
      product.variants.forEach((v) => {
        if (!v) return;
        const raw = _cleanFloat(v.raw_supplier_price) || _cleanFloat(v.price) || baseRaw;
        if (raw > 0) v.raw_supplier_price = raw;
        // Manual edits win: explicit manual flag, or an ebayPrice this engine
        // did not stamp (old drafts / editor edits without provenance).
        const manualVariant =
          v.price_source === 'manual' ||
          (_cleanFloat(v.ebayPrice) > 0 && v.price_source !== 'calculated');
        if (raw > 0 && !manualVariant) {
          const vFinal = priceFromRaw(raw, ruleEntry);
          if (vFinal !== null) {
            v.finalPrice = vFinal;
            v.ebayPrice = vFinal;
            v.price_source = 'calculated';
            pricedAnything = true;
          }
        }
      });
    }

    product.pricingRuleVersion = ruleEntry.ruleVersion ?? null;

    return {
      priced: pricedAnything,
      reason: pricedAnything ? null : 'no_valid_raw_price',
      ruleVersion: ruleEntry.ruleVersion ?? null,
    };
  }

  /**
   * Async convenience wrapper: loads the synced rules cache from
   * chrome.storage.local and applies it. This is what injectors/panels call.
   *
   * @param {object} product
   * @param {string} supplierKey
   * @returns {Promise<{ priced: boolean, reason: string|null, ruleVersion: number|null }>}
   */
  async function applyToProduct(product, supplierKey) {
    const rulesCache = await getRulesCache();
    const outcome = applyWithRules(product, rulesCache, supplierKey);
    if (!outcome.priced && outcome.reason === 'no_rule_synced') {
      console.warn(
        `[SSPricingApply] No synced pricing rule for "${product && product.supplierKey}". ` +
        'Log in and configure Supplier Pricing in the dashboard — products are NOT priced with defaults.'
      );
    } else if (!outcome.priced && outcome.reason === 'no_supplier_key') {
      console.warn(
        '[SSPricingApply] Could not determine the supplier for this product ' +
        '(no supplierKey/supplier/url/ASIN) — it was left unpriced.'
      );
    }
    return outcome;
  }

  const api = { applyToProduct, applyWithRules, priceFromRaw, resolveSupplierKey, getRulesCache, CACHE_KEY };

  root.SSPricingApply = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
