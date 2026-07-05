// calculator.js — Single source of truth for all calculator math
//
// IMPORTANT: the window assignment at the bottom of this file is load-bearing.
// This file is imported for side effects by the Vite IIFE bundles
// (src/content_scripts/*.js). A module with only bare declarations and no side
// effects gets dropped from the bundle entirely — which silently removed
// calculateSellingPrice and disabled all scan-time pricing (the callers'
// `typeof calculateSellingPrice !== 'function'` guards masked the failure).

const CALCULATOR_DEFAULTS = {
  taxPercent: 9,
  trackingFee: 0.20,
  ebayFeePercent: 20,
  promoFeePercent: 10,
  desiredProfit: 0,
  paymentFixedFee: 0.30
};

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function calculateSellingPrice(params) {
  const p = params || {};
  let sourcePrice = parseFloat(p.sourcePrice);
  if (isNaN(sourcePrice) || sourcePrice <= 0) {
    sourcePrice = 50;
  }
  const {
    taxPercent = CALCULATOR_DEFAULTS.taxPercent,
    trackingFee = CALCULATOR_DEFAULTS.trackingFee,
    ebayFeePercent = CALCULATOR_DEFAULTS.ebayFeePercent,
    promoFeePercent = CALCULATOR_DEFAULTS.promoFeePercent,
    desiredProfit = CALCULATOR_DEFAULTS.desiredProfit,
    paymentFixedFee = CALCULATOR_DEFAULTS.paymentFixedFee
  } = p;

  const taxAmount = sourcePrice * (taxPercent / 100);
  const baseCost = sourcePrice + taxAmount + trackingFee + paymentFixedFee;
  const totalPercentage = (ebayFeePercent + promoFeePercent + desiredProfit) / 100;

  if (totalPercentage >= 1) return null; // fees exceed 100%, impossible

  const finalPrice = baseCost / (1 - totalPercentage);

  // Compute breakdown
  const ebayFee = finalPrice * (ebayFeePercent / 100);
  const promoFee = finalPrice * (promoFeePercent / 100);
  const profitAmount = finalPrice * (desiredProfit / 100);
  const netProfit = finalPrice - sourcePrice - taxAmount - trackingFee - paymentFixedFee - ebayFee - promoFee;
  const roi = sourcePrice > 0 ? (netProfit / sourcePrice) * 100 : 0;
  const margin = finalPrice > 0 ? (netProfit / finalPrice) * 100 : 0;

  return {
    finalPrice: round2(finalPrice),
    breakdown: {
      sourcePrice: round2(sourcePrice),
      taxAmount: round2(taxAmount),
      trackingFee: round2(trackingFee),
      paymentFixedFee: round2(paymentFixedFee),
      ebayFee: round2(ebayFee),
      promoFee: round2(promoFee),
      profitAmount: round2(profitAmount),
      totalCost: round2(sourcePrice + taxAmount + trackingFee + paymentFixedFee + ebayFee + promoFee),
    },
    netProfit: round2(netProfit),
    roi: round1(roi),
    margin: round1(margin)
  };
}

// Load-bearing side effect — see header comment. Exposes the calculator to the
// injectors (amazon/walmart quick-calc + _applyPricingToProduct) and panel.html,
// and pins this module into the Vite IIFE bundles so it is never dropped.
if (typeof window !== 'undefined') {
  window.calculateSellingPrice = calculateSellingPrice;
  window.CALCULATOR_DEFAULTS = CALCULATOR_DEFAULTS;
}