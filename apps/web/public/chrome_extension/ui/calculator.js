// calculator.js — Single source of truth for all calculator math

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
  const {
    sourcePrice = 0,
    taxPercent = CALCULATOR_DEFAULTS.taxPercent,
    trackingFee = CALCULATOR_DEFAULTS.trackingFee,
    ebayFeePercent = CALCULATOR_DEFAULTS.ebayFeePercent,
    promoFeePercent = CALCULATOR_DEFAULTS.promoFeePercent,
    desiredProfit = CALCULATOR_DEFAULTS.desiredProfit,
    paymentFixedFee = CALCULATOR_DEFAULTS.paymentFixedFee
  } = params;

  if (sourcePrice <= 0) return null;

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