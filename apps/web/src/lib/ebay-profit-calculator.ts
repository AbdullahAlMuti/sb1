/**
 * ebay-profit-calculator.ts — pure, reusable eBay profit/fee math.
 *
 * Drives the dashboard Calculator page (/dashboard/ebay/calculator). No React,
 * no I/O — just marketplace config + a single computeProfit() function so the
 * UI never carries calculation logic in JSX.
 *
 * Marketplace fee structures differ (US vs UK), so all marketplace-specific
 * numbers live in MARKETPLACES and the formula stays marketplace-agnostic.
 */

// ─── Marketplaces ─────────────────────────────────────────────────────────────

export type Marketplace = "us" | "uk";

export interface MarketplaceConfig {
  id: Marketplace;
  name: string;
  short: string;
  flag: string;
  currency: "USD" | "GBP";
  symbol: "$" | "£";
  /** Default eBay final-value-fee % when category = "Other". */
  defaultFeePercent: number;
  /** Per-order fixed fee charged once a sale happens. */
  fixedTransactionFee: number;
  /** Short note shown under the marketplace toggle. */
  note: string;
}

export const MARKETPLACES: Record<Marketplace, MarketplaceConfig> = {
  us: {
    id: "us",
    name: "United States",
    short: "US",
    flag: "🇺🇸",
    currency: "USD",
    symbol: "$",
    defaultFeePercent: 13.6,
    fixedTransactionFee: 0.3,
    note: "eBay.com · USD · 13.6% + $0.30 per order (most categories)",
  },
  uk: {
    id: "uk",
    name: "United Kingdom",
    short: "UK",
    flag: "🇬🇧",
    currency: "GBP",
    symbol: "£",
    defaultFeePercent: 12.8,
    fixedTransactionFee: 0.3,
    note: "eBay.co.uk · GBP · 12.8% + £0.30 per order (most categories)",
  },
};

export const MARKETPLACE_LIST = Object.values(MARKETPLACES);

// ─── Categories ───────────────────────────────────────────────────────────────
//
// Category sets a *default* fee % per marketplace. These are editable in the UI —
// the fee % field can always be overridden manually after picking a category.

export interface CategoryOption {
  value: string;
  label: string;
  feePercent: Record<Marketplace, number>;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: "other",        label: "Other",                    feePercent: { us: 13.6,  uk: 12.8 } },
  { value: "electronics",  label: "Electronics",              feePercent: { us: 12.35, uk: 11.5 } },
  { value: "fashion",      label: "Fashion & Accessories",    feePercent: { us: 13.6,  uk: 12.8 } },
  { value: "home",         label: "Home & Garden",            feePercent: { us: 13.6,  uk: 12.8 } },
  { value: "collectibles", label: "Collectibles & Art",       feePercent: { us: 13.25, uk: 12.8 } },
  { value: "media",        label: "Books, Movies & Music",    feePercent: { us: 14.95, uk: 12.8 } },
  { value: "motors",       label: "Parts & Accessories",      feePercent: { us: 12.35, uk: 11.5 } },
];

export function categoryFeePercent(categoryValue: string, marketplace: Marketplace): number {
  const cat = CATEGORY_OPTIONS.find((c) => c.value === categoryValue);
  return cat ? cat.feePercent[marketplace] : MARKETPLACES[marketplace].defaultFeePercent;
}

// ─── Inputs / output ──────────────────────────────────────────────────────────

export type SalesTaxMethod = "percent" | "fixed";

export interface ProfitInputs {
  marketplace: Marketplace;
  itemSoldPrice: number | string;
  itemCost: number | string;
  ebayFeePercent: number | string;
  shippingCharge: number | string;
  shippingCost: number | string;
  promotionPercent: number | string;
  otherCosts: number | string;
  salesTaxMethod: SalesTaxMethod;
  salesTaxAmount: number | string;
}

export interface ProfitBreakdown {
  /** True once a sold price > 0 has been entered. Drives the empty state. */
  hasInput: boolean;
  currency: "USD" | "GBP";
  symbol: "$" | "£";

  soldPrice: number;

  // eBay transaction fees
  finalValueFee: number;
  finalValueFeePercent: number;
  fixedTransactionFee: number;
  promotionFees: number;
  promotionPercent: number;
  totalEbayFees: number;
  totalEbayFeesPercent: number;

  // Other costs
  itemCost: number;
  shippingCost: number;
  otherCosts: number;
  totalCost: number;
  totalCostPercent: number;

  // Outcome
  shippingCharge: number;
  profit: number;
  profitMargin: number;
  breakEvenPrice: number;
  salesTax: number;
  totalProfit: number;
  positive: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function num(v: number | string): number {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: number, currency: "USD" | "GBP"): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return (
    sign +
    abs.toLocaleString(currency === "GBP" ? "en-GB" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })
  );
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// ─── Core computation ─────────────────────────────────────────────────────────

export function computeProfit(inp: ProfitInputs): ProfitBreakdown {
  const mp = MARKETPLACES[inp.marketplace];

  const soldPrice      = num(inp.itemSoldPrice);
  const feePercent     = num(inp.ebayFeePercent);
  const promotionPct   = num(inp.promotionPercent);
  const itemCost       = num(inp.itemCost);
  const shippingCharge = num(inp.shippingCharge);
  const shippingCost   = num(inp.shippingCost);
  const otherCosts     = num(inp.otherCosts);

  const hasInput = soldPrice > 0;

  // eBay transaction fees
  const finalValueFee       = soldPrice * feePercent / 100;
  const fixedTransactionFee = hasInput ? mp.fixedTransactionFee : 0;
  const promotionFees       = soldPrice * promotionPct / 100;
  const totalEbayFees       = finalValueFee + fixedTransactionFee + promotionFees;
  const totalEbayFeesPercent = soldPrice > 0 ? (totalEbayFees / soldPrice) * 100 : 0;

  // Other costs
  const totalCost        = itemCost + shippingCost + otherCosts;
  const totalCostPercent = soldPrice > 0 ? (totalCost / soldPrice) * 100 : 0;

  // Outcome — buyer-paid shipping is revenue, seller-paid shipping is a cost.
  const profit = soldPrice + shippingCharge - totalEbayFees - totalCost;
  const profitMargin = soldPrice > 0 ? (profit / soldPrice) * 100 : 0;

  // Break-even sold price (profit = 0). Fees scale with price, so solve:
  //   P·(1 − fee% − promo%) + shippingCharge − fixed − totalCost = 0
  const variableFraction = (feePercent + promotionPct) / 100;
  const denom = 1 - variableFraction;
  const breakEvenPrice =
    denom > 0
      ? Math.max(0, (totalCost + mp.fixedTransactionFee - shippingCharge) / denom)
      : totalCost + mp.fixedTransactionFee;

  // Sales tax is collected from the buyer and remitted by eBay — it does NOT
  // reduce the seller's profit. Shown for context only.
  const salesTax =
    inp.salesTaxMethod === "percent"
      ? soldPrice * num(inp.salesTaxAmount) / 100
      : num(inp.salesTaxAmount);

  const totalProfit = profit;

  return {
    hasInput,
    currency: mp.currency,
    symbol: mp.symbol,

    soldPrice,

    finalValueFee,
    finalValueFeePercent: feePercent,
    fixedTransactionFee,
    promotionFees,
    promotionPercent: promotionPct,
    totalEbayFees,
    totalEbayFeesPercent,

    itemCost,
    shippingCost,
    otherCosts,
    totalCost,
    totalCostPercent,

    shippingCharge,
    profit,
    profitMargin,
    breakEvenPrice,
    salesTax,
    totalProfit,
    positive: profit >= 0,
  };
}
