const SSPricingEngine = (() => {
  'use strict';

  const DEFAULTS = {
    taxPercent: 9,
    trackingFee: 0.20,
    ebayFeePercent: 20,
    promoFeePercent: 10,
    desiredProfit: 0,
    paymentFixedFee: 0.30
  };

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  /**
   * Calculates the final eBay listing price based on supplier cost and settings.
   * @param {number|string} supplierCost - Raw cost of the item.
   * @param {object} settings - Profit, tax, and fee parameters.
   * @returns {number} Marked-up eBay price.
   */
  function calculatePrice(supplierCost, settings) {
    let cost = parseFloat(supplierCost);
    if (isNaN(cost) || cost <= 0) {
      cost = 50;
    }

    const s = settings || {};
    const taxPercent       = parseFloat(s.taxPercent !== undefined ? s.taxPercent : DEFAULTS.taxPercent);
    const trackingFee      = parseFloat(s.trackingFee !== undefined ? s.trackingFee : DEFAULTS.trackingFee);
    const ebayFeePercent   = parseFloat(s.ebayFeePercent !== undefined ? s.ebayFeePercent : DEFAULTS.ebayFeePercent);
    const promoFeePercent  = parseFloat(s.promoFeePercent !== undefined ? s.promoFeePercent : DEFAULTS.promoFeePercent);
    const desiredProfit    = parseFloat(s.desiredProfit !== undefined ? s.desiredProfit : DEFAULTS.desiredProfit);
    const paymentFixedFee  = parseFloat(s.paymentFixedFee !== undefined ? s.paymentFixedFee : DEFAULTS.paymentFixedFee);

    const taxAmount = cost * (taxPercent / 100);
    const baseCost  = cost + taxAmount + trackingFee + paymentFixedFee;
    const totalPercentage = (ebayFeePercent + promoFeePercent + desiredProfit) / 100;

    // Safety guard against percentage exceeding 100%
    if (totalPercentage >= 1) {
      console.warn('[PricingEngine] Fees exceed 100%. Applying 50% fallback markup.');
      return round2(baseCost * 1.5);
    }

    const calculatedPrice = baseCost / (1 - totalPercentage);
    return Math.max(0.99, round2(calculatedPrice));
  }

  /**
   * Applies the calculation logic to a product and its variations,
   * populating finalPrice and ebayPrice while preserving manual overrides.
   *
   * @param {object} product - Scraped and normalized product object.
   * @param {object} calculatorValues - User settings (tax-percent, tracking-fee, etc.)
   * @returns {object} Updated product object.
   */
  function applyPricingToProduct(product, calculatorValues) {
    if (!product) return product;

    const saved = calculatorValues || {};
    const parseVal = (key, fallback) => {
      if (saved[key] === null || saved[key] === undefined || saved[key] === '') return fallback;
      const cleaned = String(saved[key]).replace(/[^\d.-]/g, '');
      const n = parseFloat(cleaned);
      return isNaN(n) ? fallback : n;
    };

    const cfg = {
      taxPercent:      parseVal('tax-percent',        9),
      trackingFee:     parseVal('tracking-fee',       0.20),
      ebayFeePercent:  parseVal('ebay-fee-percent',   20),
      promoFeePercent: parseVal('promo-fee-percent',  10),
      desiredProfit:   parseVal('desired-profit',     0),
      paymentFixedFee: parseVal('payment-fixed-fee',  0.30)
    };

    const cleanFloat = (val) => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
      const parsed = parseFloat(String(val).replace(/[^\d.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const baseRaw = cleanFloat(product.price || product.raw_supplier_price);
    product.raw_supplier_price = baseRaw;

    const topIsManual = product.price_source === 'manual' && cleanFloat(product.finalPrice) > 0;
    if (baseRaw > 0 && !topIsManual) {
      product.finalPrice = calculatePrice(baseRaw, cfg);
      if (!cleanFloat(product.ebayPrice)) {
        product.ebayPrice = product.finalPrice;
      }
    }

    if (Array.isArray(product.variants)) {
      product.variants.forEach(v => {
        const raw = cleanFloat(v.price || v.raw_supplier_price) || baseRaw;
        v.raw_supplier_price = raw;
        if (raw > 0 && !(cleanFloat(v.ebayPrice) > 0)) {
          v.finalPrice = calculatePrice(raw, cfg);
          if (!cleanFloat(v.ebayPrice)) {
            v.ebayPrice = v.finalPrice;
          }
        }
      });
    }

    return product;
  }

  return { calculatePrice, DEFAULTS, applyPricingToProduct };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SSPricingEngine;
}
if (typeof window !== 'undefined') {
  window.SSPricingEngine = SSPricingEngine;
}

