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
  /** 1 = legacy additive (fees % of cost). 2 = sale-based gross-up (fees % of
   * final price + fixed per-order fee) — the economically correct model. */
  formulaVersion?: 1 | 2;
  /** Fixed per-order marketplace fee (eBay's $0.30). Used by v2 only. */
  perOrderFee?: number;
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
  perOrderFeeCents: number;
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
  perOrderFee: string;
  targetProfit: string;
  finalPrice: string;
  realizedProfit: string;

  // Derived
  marginPercent: number;
  roundingApplied: boolean;
  formulaVersion: 1 | 2;
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
 * Dispatches on rule.formulaVersion (default 1):
 *  - v1: legacy additive — fees computed on COST (preserved for existing rules)
 *  - v2: sale-based gross-up — fees modeled as % of the FINAL price plus a
 *        fixed per-order fee, so the configured profit is actually realized
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
  if (Number(rule.formulaVersion ?? 1) === 2) {
    return calculatePriceV2(rule, supplierPrice, shippingCost);
  }
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
    perOrderFeeCents: 0,
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
    perOrderFee: fmt(0),
    targetProfit: fmt(tgtProfit),
    finalPrice: fmt(finalCents),
    realizedProfit: fmt(realized),

    marginPercent: parseFloat(marginPct.toFixed(1)),
    roundingApplied: finalCents !== rawFinal,
    formulaVersion: 1,
  };
}

/**
 * v2 — sale-based fee gross-up. Mirrors suppliers/core/pricing-core.js
 * calculatePriceV2 exactly (same ceiling division + bump-verify loop) so the
 * dashboard preview always matches the extension and the backend.
 */
function calculatePriceV2(
  rule: SupplierPricingRule,
  supplierPrice: number | string,
  shippingCost: number | string = 0,
): PriceBreakdown {
  const sp = parseIntCents(supplierPrice);
  const sc = parseIntCents(shippingCost);
  const sb = parseIntCents(rule.shippingBuffer);
  const fh = parseIntCents(rule.fixedHandlingFee);
  const po = parseIntCents(rule.perOrderFee ?? 0);

  const totalCost = sp + sc + sb + fh;
  if (totalCost <= 0) throw new RangeError('calculatePrice: baseCost must be positive');

  const mktPct = Number(rule.marketplaceFeePercent ?? 0);
  const fxPct  = Number(rule.currencyBufferPercent ?? 0);
  const pctOfSale = mktPct + fxPct;
  const denominator = 1 - pctOfSale / 100;
  if (!(denominator > 0.25)) {
    throw new RangeError(
      `calculatePrice: sale-based fees too high (${pctOfSale}% of sale leaves denominator ${denominator.toFixed(2)}); refusing to price`,
    );
  }

  const profitPct = Number(rule.profitMarginPercent ?? 0);
  const minProfit = parseIntCents(rule.minimumProfit);
  const tgtProfit = Math.max(Math.round(totalCost * profitPct / 100), minProfit);

  const candidateMarkup = Math.ceil((totalCost * (1 + profitPct / 100) + po) / denominator);
  const candidateMin    = Math.ceil((totalCost + po + minProfit) / denominator);
  let rawFinal = Math.max(candidateMarkup, candidateMin);

  const realizedAt = (cents: number) =>
    cents - Math.round(cents * mktPct / 100) - Math.round(cents * fxPct / 100) - po - totalCost;

  let finalCents = applyRoundingRule(rawFinal, rule.roundingRule);
  let guard = 0;
  while (realizedAt(finalCents) < tgtProfit) {
    if (++guard > 300) throw new RangeError('calculatePrice: could not satisfy profit target (internal error)');
    rawFinal += 1;
    finalCents = applyRoundingRule(rawFinal, rule.roundingRule);
  }

  const mktFee   = Math.round(finalCents * mktPct / 100);
  const fxBuf    = Math.round(finalCents * fxPct / 100);
  const realized = realizedAt(finalCents);
  const marginPct = finalCents > 0 ? (realized / finalCents) * 100 : 0;

  return {
    supplierPriceCents: sp,
    shippingCostCents: sc,
    shippingBufferCents: sb,
    fixedHandlingFeeCents: fh,
    baseCostCents: totalCost,
    marketplaceFeeCents: mktFee,
    currencyBufferCents: fxBuf,
    perOrderFeeCents: po,
    targetProfitCents: tgtProfit,
    rawFinalCents: rawFinal,
    finalCents,
    realizedProfitCents: realized,

    supplierPrice: fmt(sp),
    shippingCost: fmt(sc),
    shippingBuffer: fmt(sb),
    fixedHandlingFee: fmt(fh),
    baseCost: fmt(totalCost),
    marketplaceFee: fmt(mktFee),
    currencyBuffer: fmt(fxBuf),
    perOrderFee: fmt(po),
    targetProfit: fmt(tgtProfit),
    finalPrice: fmt(finalCents),
    realizedProfit: fmt(realized),

    marginPercent: parseFloat(marginPct.toFixed(1)),
    roundingApplied: finalCents !== rawFinal,
    formulaVersion: 2,
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
