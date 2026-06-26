// pricing-engine.js — single source of truth for dropshipping markup prices
// Exposes window.SSPricingEngine globally

window.SSPricingEngine = (() => {
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
    const cost = parseFloat(supplierCost);
    if (isNaN(cost) || cost <= 0) return 0.99;

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
   * Same as calculatePrice but also returns the full fee breakdown for audit/storage.
   * @returns {{ price: number, breakdown: object }}
   */
  function calculatePriceWithBreakdown(supplierCost, settings) {
    const cost = parseFloat(supplierCost);
    if (isNaN(cost) || cost <= 0) {
      return { price: 0.99, breakdown: { supplierCost: 0, finalPrice: 0.99, currency: 'USD' } };
    }

    const s = settings || {};
    const taxPercent       = parseFloat(s.taxPercent !== undefined ? s.taxPercent : DEFAULTS.taxPercent);
    const trackingFee      = parseFloat(s.trackingFee !== undefined ? s.trackingFee : DEFAULTS.trackingFee);
    const ebayFeePercent   = parseFloat(s.ebayFeePercent !== undefined ? s.ebayFeePercent : DEFAULTS.ebayFeePercent);
    const promoFeePercent  = parseFloat(s.promoFeePercent !== undefined ? s.promoFeePercent : DEFAULTS.promoFeePercent);
    const desiredProfit    = parseFloat(s.desiredProfit !== undefined ? s.desiredProfit : DEFAULTS.desiredProfit);
    const paymentFixedFee  = parseFloat(s.paymentFixedFee !== undefined ? s.paymentFixedFee : DEFAULTS.paymentFixedFee);

    const taxAmount = round2(cost * (taxPercent / 100));
    const baseCost  = cost + taxAmount + trackingFee + paymentFixedFee;
    const totalPct  = (ebayFeePercent + promoFeePercent + desiredProfit) / 100;

    let finalPrice;
    let markupAmount;
    if (totalPct >= 1) {
      finalPrice   = round2(baseCost * 1.5);
      markupAmount = round2(finalPrice - cost);
    } else {
      finalPrice   = Math.max(0.99, round2(baseCost / (1 - totalPct)));
      markupAmount = round2(finalPrice - cost);
    }

    const breakdown = {
      supplierCost,
      taxPercent,
      taxAmount,
      trackingFee,
      paymentFixedFee,
      ebayFeePercent,
      promoFeePercent,
      desiredProfit,
      markupAmount,
      finalPrice,
      currency:       s.currency || 'USD',
    };

    return { price: finalPrice, breakdown };
  }

  return { calculatePrice, calculatePriceWithBreakdown, DEFAULTS };
})();
