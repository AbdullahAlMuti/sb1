/**
 * profit-calculator-utils.ts
 *
 * Separated calculation logic for the redesigned Profit Calculator.
 * Handles calculation functions, defaults, and local storage management.
 */

export interface FeeRow {
  id: string;
  name: string;
  enabled: boolean;
  type: "percentage" | "fixed";
  value: number;
  applyOn: "selling_price" | "selling_price_shipping" | "per_order" | "per_item" | "monthly";
}

export interface RegionConfig {
  id: string;
  name: string;
  currency: string;
  symbol: string;
}

export const REGIONS: RegionConfig[] = [
  { id: "US", name: "United States", currency: "USD", symbol: "$" },
  { id: "UK", name: "United Kingdom", currency: "GBP", symbol: "£" },
  { id: "BD", name: "Bangladesh", currency: "BDT", symbol: "৳" },
];

export interface EbayCategory {
  id: number;
  name: string;
  ebayFee: number;
  starterStore?: number;
}

export const EBAY_CATEGORIES: Record<string, EbayCategory[]> = {
  US: [
    { id: 176, name: "Other / Everything Else", ebayFee: 12.9, starterStore: 13.6 },
    { id: 93, name: "Antiques", ebayFee: 9.35, starterStore: 13.6 },
    { id: 94, name: "Art", ebayFee: 9.35, starterStore: 13.6 },
    { id: 96, name: "Baby", ebayFee: 9.35, starterStore: 12.9 },
    { id: 98, name: "Books, Comics & Magazines", ebayFee: 14.6, starterStore: 14.6 },
    { id: 99, name: "Business, Office & Industrial", ebayFee: 9.35, starterStore: 12.9 },
    { id: 100, name: "Cameras & Photography", ebayFee: 9.35, starterStore: 12.9 },
    { id: 101, name: "Cell Phones & Accessories", ebayFee: 9.35, starterStore: 12.9 },
    { id: 107, name: "Clothes, Shoes & Accessories", ebayFee: 9.35, starterStore: 12.9 },
    { id: 111, name: "Coins", ebayFee: 9, starterStore: 12.9 },
    { id: 112, name: "Collectibles", ebayFee: 9.35, starterStore: 12.9 },
    { id: 115, name: "Computers/Tablets & Networking", ebayFee: 9.35, starterStore: 12.9 },
    { id: 102, name: "Consumer Electronics", ebayFee: 9.35, starterStore: 12.9 },
    { id: 124, name: "Crafts", ebayFee: 9.35, starterStore: 12.9 },
    { id: 125, name: "Dolls & Bears", ebayFee: 9.35, starterStore: 12.9 },
    { id: 126, name: "Event Tickets", ebayFee: 12.9, starterStore: 12.9 },
    { id: 127, name: "DVD, Movies & TV", ebayFee: 14.6, starterStore: 14.6 },
    { id: 128, name: "eBay Motors", ebayFee: 9.35, starterStore: 12.9 },
    { id: 132, name: "Health & Beauty", ebayFee: 9.35, starterStore: 12.9 },
    { id: 136, name: "Home & Garden", ebayFee: 9.35, starterStore: 12.9 },
    { id: 150, name: "Jewellery & Watches", ebayFee: 13, starterStore: 12.55 },
    { id: 156, name: "Music", ebayFee: 15.3, starterStore: 14.6 },
    { id: 158, name: "Musical Instruments & DJ Equipment", ebayFee: 9.8, starterStore: 14.6 },
    { id: 159, name: "Pet Supplies", ebayFee: 9.35, starterStore: 12.9 },
    { id: 160, name: "Pottery, Ceramics & Glass", ebayFee: 9.35, starterStore: 12.9 },
    { id: 168, name: "Sporting Goods", ebayFee: 9.35, starterStore: 12.9 },
    { id: 169, name: "Sports Mem, Cards & Fan Shop", ebayFee: 9.35, starterStore: 12.9 },
    { id: 171, name: "Stamps", ebayFee: 9.7, starterStore: 12.9 },
    { id: 172, name: "Toys & Games", ebayFee: 12.35, starterStore: 14.6 },
    { id: 174, name: "Travel", ebayFee: 9.35, starterStore: 12.9 },
    { id: 175, name: "Video Games & Consoles", ebayFee: 9.35, starterStore: 12.9 },
  ],
  UK: [
    { id: 92, name: "Other / Everything Else", ebayFee: 12.9 },
    { id: 1, name: "Antiques", ebayFee: 10.9 },
    { id: 2, name: "Art", ebayFee: 10.9 },
    { id: 4, name: "Baby", ebayFee: 10.9 },
    { id: 6, name: "Books, Comics & Magazines", ebayFee: 9.9 },
    { id: 7, name: "Business, Office & Industrial", ebayFee: 11.9 },
    { id: 8, name: "Cameras & Photography", ebayFee: 9.9 },
    { id: 15, name: "Clothes, Shoes & Accessories", ebayFee: 11.9 },
    { id: 19, name: "Coins", ebayFee: 10.9 },
    { id: 20, name: "Collectibles", ebayFee: 10.9 },
    { id: 23, name: "Computers/Tablets & Networking", ebayFee: 9.9 },
    { id: 32, name: "Crafts", ebayFee: 12.9 },
    { id: 33, name: "Dolls & Bears", ebayFee: 10.9 },
    { id: 34, name: "Event Tickets", ebayFee: 12.9 },
    { id: 35, name: "Films & TV", ebayFee: 9.9 },
    { id: 37, name: "Garden & Patio", ebayFee: 10.9 },
    { id: 40, name: "Health & Beauty", ebayFee: 10.9 },
    { id: 44, name: "Holidays & Travel", ebayFee: 7.9 },
    { id: 45, name: "Home, Furniture & DIY", ebayFee: 11.9 },
    { id: 58, name: "Jewellery & Watches", ebayFee: 12.9 },
    { id: 60, name: "Mobile Phones & Communication", ebayFee: 9.9 },
    { id: 64, name: "Music", ebayFee: 9.9 },
    { id: 66, name: "Musical Instruments & DJ Equipment", ebayFee: 10.9 },
    { id: 67, name: "Pet Supplies", ebayFee: 12.9 },
    { id: 68, name: "Pottery, Ceramics & Glass", ebayFee: 10.9 },
    { id: 69, name: "Sound & Vision", ebayFee: 9.9 },
    { id: 76, name: "Sporting Goods", ebayFee: 10.9 },
    { id: 77, name: "Sports Memorabilia", ebayFee: 10.9 },
    { id: 79, name: "Stamps", ebayFee: 10.9 },
    { id: 80, name: "Toys & Games", ebayFee: 10.9 },
    { id: 83, name: "Vehicle Parts & Accessories", ebayFee: 8.9 },
    { id: 88, name: "Video Games & Consoles", ebayFee: 9.9 },
    { id: 90, name: "Wholesale & Job Lots", ebayFee: 12.9 },
  ],
};

export const SUPPLIERS = [
  { id: "amazon", name: "Amazon", icon: "amazon" },
  { id: "walmart", name: "Walmart", icon: "walmart" },
  { id: "aliexpress", name: "AliExpress", icon: "aliexpress" },
];

// Helper to convert inputs safely to numbers
export function safeNum(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === "") return 0;
  const parsed = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(parsed) || !isFinite(parsed) || parsed < 0 ? 0 : parsed;
}

/**
 * Calculates the individual fee amount based on fee type and application target.
 */
export function calculateSingleFee(fee: FeeRow, sellingPrice: number, shippingCharge: number): number {
  if (!fee.enabled) return 0;
  const value = safeNum(fee.value);

  if (fee.type === "fixed") {
    return value;
  }

  // Percentage calculations based on target
  switch (fee.applyOn) {
    case "selling_price":
    case "per_item":
    case "monthly":
      return (sellingPrice * value) / 100;
    case "selling_price_shipping":
    case "per_order":
      return ((sellingPrice + shippingCharge) * value) / 100;
    default:
      return (sellingPrice * value) / 100;
  }
}

/**
 * Calculates total marketplace fees for enabled fee rows.
 */
export function calculateFees(sellingPrice: number, shippingCharge: number, fees: FeeRow[]): number {
  return fees
    .filter(fee => fee.enabled)
    .reduce((acc, fee) => acc + calculateSingleFee(fee, sellingPrice, shippingCharge), 0);
}

/**
 * Calculates total costs (shipping, other, promotion, tax) excluding the supplier price (item cost).
 */
export interface ProfitSummary {
  grossRevenue: number;
  totalFees: number;
  totalCostsExcludingItemCost: number;
  totalCostsIncludingItemCost: number;
  targetProfitAmount: number;
  maxBuyingPrice: number;
  netProfit: number;
  roi: number;
  margin: number;
  breakEvenPrice: number;
  salesTaxAmount: number;
  promotionAmount: number;
  positive: boolean;
  hasInput: boolean;
}

/**
 * Computes all outcome metrics (Net Profit, ROI, margin, break-even, etc.).
 */
/**
 * Computes all outcome metrics (Net Profit, ROI, margin, break-even, etc.).
 */
export function calculateProfitSummary(inputs: {
  sellingPrice: number | string;
  shippingCharge: number | string;
  itemCost: number | string; // actual item cost entered
  fees: FeeRow[];
  shippingCost: number | string;
  otherCosts: number | string;
  promotion?: number | string;
  promotionType?: "percentage" | "fixed";
  salesTax: number | string;
  salesTaxType: "percentage" | "fixed" | "none";
  targetProfit?: number | string;
  targetProfitType?: "percentage" | "fixed";
  salesTaxIncludesShipping?: boolean;
  regionId?: string;
}): ProfitSummary {
  const sellingPrice = safeNum(inputs.sellingPrice);
  const shippingCharge = safeNum(inputs.shippingCharge);
  const itemCost = safeNum(inputs.itemCost);
  const shippingCost = safeNum(inputs.shippingCost);
  const otherCosts = safeNum(inputs.otherCosts);
  const salesTax = safeNum(inputs.salesTax);

  const hasInput = sellingPrice > 0;
  const grossRevenue = sellingPrice + shippingCharge;
  const regionId = inputs.regionId || "US";

  let totalFees = 0;
  let netProfit = 0;
  let breakEvenPrice = 0;
  let salesTaxAmount = 0;
  let promotionAmount = 0;

  if (regionId === "US" || regionId === "UK") {
    // 1. ZIK Analytics specific formulas
    const f = sellingPrice;
    const y = itemCost;
    const v = shippingCharge;
    const b = shippingCost;
    const A = otherCosts;
    const H = salesTax;
    const F = inputs.salesTaxType === "percentage";
    const D = 1 + H / (F ? 100 : (f > 0 ? f : 1));

    // Extract fee values from rows
    const fvfFeeRow = inputs.fees.find(fee => fee.id === "final_value_fee" || fee.name === "Final Value Fee");
    const fvfRate = fvfFeeRow && fvfFeeRow.enabled ? fvfFeeRow.value : 0;

    const promoFeeRow = inputs.fees.find(fee => fee.id === "promoted_ad_fee" || fee.name === "Promoted Ad Fee" || fee.name === "Promotion Fee");
    const promotedRate = promoFeeRow && promoFeeRow.enabled ? promoFeeRow.value : 0;

    const transFeeRow = inputs.fees.find(fee => fee.id === "fixed_transaction_fee" || fee.name === "Fixed Transaction Fee");
    const fixedFee = transFeeRow && transFeeRow.enabled ? transFeeRow.value : 0;

    const vatFeeRow = inputs.fees.find(fee => fee.id === "vat_fee" || fee.name === "VAT (Business Seller)");
    const vatRate = vatFeeRow && vatFeeRow.enabled ? vatFeeRow.value : 0;

    // Sum other custom fees (if any)
    const otherFeesAmount = inputs.fees
      .filter(fee => fee.enabled && fee.id !== "final_value_fee" && fee.name !== "Final Value Fee" &&
                     fee.id !== "fixed_transaction_fee" && fee.name !== "Fixed Transaction Fee" &&
                     fee.id !== "promoted_ad_fee" && fee.name !== "Promoted Ad Fee" && fee.name !== "Promotion Fee" &&
                     fee.id !== "vat_fee" && fee.name !== "VAT (Business Seller)")
      .reduce((acc, fee) => acc + calculateSingleFee(fee, sellingPrice, shippingCharge), 0);

    // VAT Adjustment factor (I)
    const I = 1 - vatRate / 100 / (1 + vatRate / 100);

    // ZIK profit formula:
    // z = I()*(f-y+v-b) - k - w/100*(f+v) - I()*(Y/100)*(f+v)*D - A
    netProfit = I * (f - y + v - b) - fixedFee - (fvfRate / 100) * (f + v) - I * (promotedRate / 100) * (f + v) * D - A - otherFeesAmount;

    // ZIK total fee: L = (FVF + PromotedFee) * D + k
    totalFees = ((fvfRate / 100) * (f + v) + (promotedRate / 100) * f) * D + fixedFee + otherFeesAmount;

    // ZIK breakEven formula:
    const denominator = 1 - vatRate / 100 / (1 + vatRate / 100) - fvfRate / 100 - promotedRate / 100;
    breakEvenPrice = denominator > 0
      ? (I * (y + b) + fixedFee + A + otherFeesAmount) / denominator * D - v
      : 0;

    // salesTaxAmount
    salesTaxAmount = F
      ? (H / 100) * (f + (inputs.salesTaxIncludesShipping ? v : 0))
      : H;

    promotionAmount = (promotedRate / 100) * f;
  } else {
    // 2. Generic calculator logic (e.g. BD or Custom)
    salesTaxAmount = inputs.salesTaxType === "percentage"
      ? (sellingPrice * salesTax) / 100
      : inputs.salesTaxType === "fixed"
        ? salesTax
        : 0;

    promotionAmount = inputs.promotion
      ? (sellingPrice * safeNum(inputs.promotion)) / 100
      : 0;

    const totalCostsExcludingItemCost = shippingCost + otherCosts + promotionAmount + salesTaxAmount;
    totalFees = calculateFees(sellingPrice, shippingCharge, inputs.fees);

    const actualCost = itemCost;
    netProfit = grossRevenue - actualCost - totalFees - totalCostsExcludingItemCost;
    breakEvenPrice = actualCost + totalFees + totalCostsExcludingItemCost;
  }

  const actualCostForRatios = itemCost > 0 ? itemCost : breakEvenPrice;
  const roi = actualCostForRatios > 0 ? (netProfit / actualCostForRatios) * 100 : 0;
  const margin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
  const totalCostsExcludingItemCost = shippingCost + otherCosts + promotionAmount + salesTaxAmount;
  const totalCostsIncludingItemCost = itemCost + totalCostsExcludingItemCost;

  return {
    grossRevenue,
    totalFees,
    totalCostsExcludingItemCost,
    totalCostsIncludingItemCost,
    targetProfitAmount: 0,
    maxBuyingPrice: breakEvenPrice, // Fallback so we don't break existing properties completely
    netProfit: hasInput ? netProfit : 0,
    roi: hasInput ? roi : 0,
    margin: hasInput ? margin : 0,
    breakEvenPrice: hasInput ? breakEvenPrice : 0,
    salesTaxAmount,
    promotionAmount,
    positive: netProfit >= 0,
    hasInput,
  };
}

export function getDefaultLogicBySupplier(supplier: string): FeeRow[] {
  return [];
}

/**
 * Saves customized fee logic to local storage.
 */
export function saveCalculatorLogic(region: string, supplier: string, fees: FeeRow[]): void {
  const key = `profit_calculator_logic_${region.toUpperCase()}_${supplier.toLowerCase()}`;
  const data = {
    region: region.toUpperCase(),
    supplier: supplier.toLowerCase(),
    fees,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Loads custom fee logic from local storage.
 */
export function loadCalculatorLogic(region: string, supplier: string): FeeRow[] | null {
  const key = `profit_calculator_logic_${region.toUpperCase()}_${supplier.toLowerCase()}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (parsed && Array.isArray(parsed.fees)) {
      return parsed.fees;
    }
  } catch (e) {
    console.error("Failed to parse stored calculator logic:", e);
  }
  return null;
}
