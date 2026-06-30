export type EbayFeesMarketplace = "us" | "uk";
export type SalesTaxMethod = "percentage" | "fixed";

export interface EbayFeesInput {
  marketplace: EbayFeesMarketplace;
  category: string;
  itemSoldPrice: number;
  itemCost: number;
  ebayFeePercent: number;
  shippingCharge: number;
  shippingCost: number;
  promotionPercent: number;
  otherCosts: number;
  salesTaxMethod: SalesTaxMethod;
  salesTaxAmount: number;
}

export interface EbayFeesResult {
  currencySymbol: "$" | "£";
  currencyCode: "USD" | "GBP";
  grossRevenue: number;
  finalValueFee: number;
  fixedTransactionFee: number;
  promotionFee: number;
  totalEbayFees: number;
  totalEbayFeesPercentage: number;
  totalCosts: number;
  totalCostsPercentage: number;
  breakEvenPrice: number;
  salesTaxDisplay: number;
  profit: number;
  profitMargin: number;
}

export const MARKETPLACE_DEFAULTS: Record<
  EbayFeesMarketplace,
  {
    label: string;
    currencySymbol: "$" | "£";
    currencyCode: "USD" | "GBP";
    defaultFeePercent: number;
    fixedTransactionFee: number;
    context: string;
  }
> = {
  us: {
    label: "United States",
    currencySymbol: "$",
    currencyCode: "USD",
    defaultFeePercent: 13.6,
    fixedTransactionFee: 0.4,
    context: "US marketplace defaults use dollars and a standard editable final value fee estimate.",
  },
  uk: {
    label: "United Kingdom",
    currencySymbol: "£",
    currencyCode: "GBP",
    defaultFeePercent: 12.8,
    fixedTransactionFee: 0.3,
    context: "UK marketplace defaults use pounds and an editable UK seller fee estimate.",
  },
};

export const EBAY_FEE_CATEGORIES: Record<
  EbayFeesMarketplace,
  { value: string; label: string; feePercent: number }[]
> = {
  us: [
    { value: "standard", label: "Most categories", feePercent: 13.6 },
    { value: "media", label: "Books, movies, music", feePercent: 14.95 },
    { value: "electronics", label: "Consumer electronics", feePercent: 9.0 },
    { value: "shoes", label: "Athletic shoes", feePercent: 8.0 },
    { value: "watches", label: "Watches and jewelry", feePercent: 15.0 },
  ],
  uk: [
    { value: "standard", label: "Most categories", feePercent: 12.8 },
    { value: "media", label: "Media and collectibles", feePercent: 12.8 },
    { value: "electronics", label: "Consumer electronics", feePercent: 9.9 },
    { value: "fashion", label: "Fashion", feePercent: 12.8 },
    { value: "parts", label: "Vehicle parts", feePercent: 11.9 },
  ],
};

const safeNumber = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

export function calculateEbayFees(input: EbayFeesInput): EbayFeesResult {
  const marketplace = MARKETPLACE_DEFAULTS[input.marketplace];
  const itemSoldPrice = safeNumber(input.itemSoldPrice);
  const itemCost = safeNumber(input.itemCost);
  const ebayFeePercent = safeNumber(input.ebayFeePercent);
  const shippingCharge = safeNumber(input.shippingCharge);
  const shippingCost = safeNumber(input.shippingCost);
  const promotionPercent = safeNumber(input.promotionPercent);
  const otherCosts = safeNumber(input.otherCosts);
  const salesTaxAmount = safeNumber(input.salesTaxAmount);

  const grossRevenue = itemSoldPrice + shippingCharge;
  const finalValueFee = (grossRevenue * ebayFeePercent) / 100;
  const fixedTransactionFee = grossRevenue > 0 ? marketplace.fixedTransactionFee : 0;
  const promotionFee = (grossRevenue * promotionPercent) / 100;
  const totalEbayFees = finalValueFee + fixedTransactionFee + promotionFee;
  const totalEbayFeesPercentage = grossRevenue > 0 ? (totalEbayFees / grossRevenue) * 100 : 0;
  const totalCosts = itemCost + shippingCost + otherCosts;
  const totalCostsPercentage = grossRevenue > 0 ? (totalCosts / grossRevenue) * 100 : 0;
  const profit = grossRevenue - totalEbayFees - totalCosts;
  const profitMargin = itemSoldPrice > 0 ? (profit / itemSoldPrice) * 100 : 0;
  const combinedRate = (ebayFeePercent + promotionPercent) / 100;
  const breakEvenPrice =
    combinedRate >= 1
      ? 0
      : Math.max(0, (totalCosts + marketplace.fixedTransactionFee) / (1 - combinedRate) - shippingCharge);
  const salesTaxDisplay =
    input.salesTaxMethod === "percentage" ? (grossRevenue * salesTaxAmount) / 100 : salesTaxAmount;

  return {
    currencySymbol: marketplace.currencySymbol,
    currencyCode: marketplace.currencyCode,
    grossRevenue,
    finalValueFee,
    fixedTransactionFee,
    promotionFee,
    totalEbayFees,
    totalEbayFeesPercentage,
    totalCosts,
    totalCostsPercentage,
    breakEvenPrice,
    salesTaxDisplay,
    profit,
    profitMargin,
  };
}
