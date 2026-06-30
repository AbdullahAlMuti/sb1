/**
 * pricing-calculator.ts — Dashboard TypeScript mirror of pricing-core.js.
 *
 * Single source of truth for the additive eBay pricing formula in the
 * browser. Mirrors the extension's suppliers/core/pricing-core.js exactly
 * so the dashboard preview and extension overlay always agree.
 *
 * All arithmetic is done in integer cents to avoid floating-point drift.
 * Float boundaries: parse at input (parseIntCents), format at display (fmt).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoundingRule = 'NONE' | 'END_99' | 'END_95' | 'END_49' | 'ROUND_UP';

export interface SupplierPricingRule {
  profitMarginPercent: number;
  minimumProfit: number;
  shippingBuffer: number;
  fixedHandlingFee: number;
  marketplaceFeePercent: number;
  currencyBufferPercent: number;
  roundingRule: RoundingRule | string;
  supplierKey?: string;
  ruleVersion?: number;
}

export interface PriceBreakdown {
  // Integer cents — for downstream math
  supplierPriceCents: number;
  shippingCostCents: number;
  shippingBufferCents: number;
  fixedHandlingFeeCents: number;
  baseCostCents: number;
  marketplaceFeeCents: number;
  currencyBufferCents: number;
  targetProfitCents: number;
  rawFinalCents: number;
  finalCents: number;
  realizedProfitCents: number;

  // Display strings (toFixed(2)) — for rendering
  supplierPrice: string;
  shippingCost: string;
  shippingBuffer: string;
  fixedHandlingFee: string;
  baseCost: string;
  marketplaceFee: string;
  currencyBuffer: string;
  targetProfit: string;
  finalPrice: string;
  realizedProfit: string;

  // Derived
  marginPercent: number;
  roundingApplied: boolean;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function parseIntCents(value: number | string): number {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (!isFinite(n) || n < 0) {
    throw new RangeError(`Invalid price value: "${value}". Must be a non-negative number.`);
  }
  return Math.round(n * 100);
}

function fmt(cents: number): string {
  return (cents / 100).toFixed(2);
}

function applyRoundingRule(cents: number, rule: string): number {
  if (rule === 'NONE') return cents;
  if (rule === 'ROUND_UP') return Math.ceil(cents / 100) * 100;

  const targets: Record<string, number> = { END_99: 99, END_95: 95, END_49: 49 };
  const t = targets[rule];
  if (t === undefined) return cents;

  const wholeDollars = Math.floor(cents / 100) * 100;
  const candidate = wholeDollars + t;
  return candidate >= cents ? candidate : candidate + 100;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate the eBay selling price and profit breakdown for a sourced product.
 *
 * @param rule          Supplier pricing rule (from user_pricing_settings)
 * @param supplierPrice Product cost at the source (e.g. Amazon price)
 * @param shippingCost  Shipping cost paid to the supplier (default 0)
 */
export function calculatePrice(
  rule: SupplierPricingRule,
  supplierPrice: number | string,
  shippingCost: number | string = 0,
): PriceBreakdown {
  const sp = parseIntCents(supplierPrice);
  const sc = parseIntCents(shippingCost);
  const sb = parseIntCents(rule.shippingBuffer);
  const fh = parseIntCents(rule.fixedHandlingFee);

  const baseCost = sp + sc + sb + fh;
  const mktFee   = Math.round(baseCost * rule.marketplaceFeePercent / 100);
  const fxBuf    = Math.round(baseCost * rule.currencyBufferPercent / 100);

  const marginProfit = Math.round(baseCost * rule.profitMarginPercent / 100);
  const minProfit    = parseIntCents(rule.minimumProfit);
  const tgtProfit    = Math.max(marginProfit, minProfit);

  const rawFinal   = baseCost + mktFee + fxBuf + tgtProfit;
  const finalCents = applyRoundingRule(rawFinal, rule.roundingRule);
  const realized   = finalCents - baseCost - mktFee - fxBuf;
  const marginPct  = finalCents > 0 ? (realized / finalCents) * 100 : 0;

  return {
    supplierPriceCents: sp,
    shippingCostCents: sc,
    shippingBufferCents: sb,
    fixedHandlingFeeCents: fh,
    baseCostCents: baseCost,
    marketplaceFeeCents: mktFee,
    currencyBufferCents: fxBuf,
    targetProfitCents: tgtProfit,
    rawFinalCents: rawFinal,
    finalCents,
    realizedProfitCents: realized,

    supplierPrice: fmt(sp),
    shippingCost: fmt(sc),
    shippingBuffer: fmt(sb),
    fixedHandlingFee: fmt(fh),
    baseCost: fmt(baseCost),
    marketplaceFee: fmt(mktFee),
    currencyBuffer: fmt(fxBuf),
    targetProfit: fmt(tgtProfit),
    finalPrice: fmt(finalCents),
    realizedProfit: fmt(realized),

    marginPercent: parseFloat(marginPct.toFixed(1)),
    roundingApplied: finalCents !== rawFinal,
  };
}

/**
 * Safe wrapper — returns null instead of throwing on bad inputs.
 * Use in React useMemo / live-preview scenarios where incomplete form
 * values should silently produce no result.
 */
export function tryCalculatePrice(
  rule: SupplierPricingRule,
  supplierPrice: number | string,
  shippingCost: number | string = 0,
): PriceBreakdown | null {
  try {
    const p = typeof supplierPrice === 'string' ? parseFloat(supplierPrice) : supplierPrice;
    if (!isFinite(p) || p <= 0) return null;
    return calculatePrice(rule, supplierPrice, shippingCost);
  } catch {
    return null;
  }
}
