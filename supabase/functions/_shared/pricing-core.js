// Deno 2 has no window global — module-scoped alias keeps the IIFE below portable.
const window = globalThis;
// pricing-core.js — single source of truth for the supplier-wise price calculation.
//
// RULES:
//   1. Zero runtime dependencies. No imports, no fetch, no chrome APIs.
//   2. All internal math in INTEGER CENTS. Float decimals are parsed at entry
//      (parseToIntCents) and converted back at exit (centsToDisplay) only.
//   3. Rounding never reduces the price (always >= rawFinal).
//   4. realizedProfit reflects post-rounding truth, not pre-rounding target.
//
// This file is the CANONICAL source. sync-pricing-core.js copies it to
// supabase/functions/_shared/pricing-core.js for Deno edge function use.
// Do NOT hand-edit the _shared/ copy.

window.SSPricingCore = (() => {
  'use strict';

  const VALID_ROUNDING_RULES = new Set(['NONE', 'END_99', 'END_95', 'END_49', 'ROUND_UP']);

  /**
   * Convert a decimal price value to integer cents.
   * Throws on NaN, negative, or non-finite input.
   * @param {number|string} value  e.g. 19.99 → 1999
   * @returns {number} integer cents
   */
  function parseToIntCents(value) {
    // [RISK: float boundary] — convert at parse time to avoid accumulation
    const n = typeof value === 'string' ? parseFloat(value) : Number(value);
    if (!isFinite(n)) throw new RangeError(`parseToIntCents: non-finite value "${value}"`);
    if (n < 0) throw new RangeError(`parseToIntCents: negative value "${value}"`);
    return Math.round(n * 100);
  }

  /**
   * Convert integer cents back to a 2-decimal display string.
   * Only call at output boundaries, never during computation.
   * @param {number} cents  integer
   * @returns {string}  e.g. 1999 → "19.99"
   */
  function centsToDisplay(cents) {
    return (cents / 100).toFixed(2);
  }

  /**
   * Apply a rounding rule to an integer-cent value.
   * Guarantee: result is always >= cents (never reduces the price).
   *
   * END_99 / END_95 / END_49:
   *   Find the smallest value >= cents whose last-two digits equal the target.
   * ROUND_UP:
   *   Ceil to the next whole unit (already-whole stays).
   * NONE:
   *   Return unchanged.
   *
   * @param {number} cents  integer >= 0
   * @param {string} rule   one of VALID_ROUNDING_RULES
   * @returns {number} integer >= cents
   */
  function applyRoundingRule(cents, rule) {
    if (!VALID_ROUNDING_RULES.has(rule)) throw new TypeError(`Unknown rounding rule: "${rule}"`);
    if (rule === 'NONE') return cents;
    if (rule === 'ROUND_UP') {
      // ceil to next 100-cent boundary; already at boundary stays put
      return cents % 100 === 0 ? cents : Math.ceil(cents / 100) * 100;
    }
    const targets = { END_99: 99, END_95: 95, END_49: 49 };
    const t = targets[rule];
    const whole = Math.floor(cents / 100) * 100;
    const candidate = whole + t;
    return candidate >= cents ? candidate : candidate + 100;
  }

  /**
   * Calculate the full eBay selling-price breakdown for one product.
   *
   * Two formula versions, selected by rule.formulaVersion (default 1):
   *
   * v1 — LEGACY additive (fees computed on COST). Preserved byte-for-byte for
   *      existing user rules; systematically under-collects sale-based fees.
   *   baseCost      = supplierPrice + shippingCost + shippingBuffer + fixedHandlingFee
   *   marketplaceFee= baseCost * marketplaceFeePercent / 100
   *   currencyBuffer= baseCost * currencyBufferPercent / 100
   *   targetProfit  = max(baseCost * profitMarginPercent / 100, minimumProfit)
   *   rawFinal      = baseCost + marketplaceFee + currencyBuffer + targetProfit
   *   finalPrice    = applyRoundingRule(rawFinal, roundingRule)
   *   realizedProfit= finalPrice - baseCost - marketplaceFee - currencyBuffer
   *
   * v2 — SALE-BASED gross-up (fees modeled the way eBay actually charges:
   *      % of the sale price plus a fixed per-order fee). Guarantees the
   *      configured profit is the profit actually realized after fees.
   *   totalCost   = supplierPrice + shippingCost + shippingBuffer + fixedHandlingFee
   *   pctOfSale   = marketplaceFeePercent + currencyBufferPercent   (of FINAL price)
   *   denominator = 1 - pctOfSale/100        (rejected when <= 0.25 — fees too high)
   *   price       = max( (totalCost*(1+profit%) + perOrderFee) / denominator,   ← profit as markup on cost
   *                      (totalCost + perOrderFee + minimumProfit) / denominator ) ← min REALIZED profit
   *   finalPrice  = applyRoundingRule(price)  — never reduces
   *   realizedProfit = finalPrice - round(finalPrice*mkt%) - round(finalPrice*fx%)
   *                    - perOrderFee - totalCost   (>= target by construction)
   *
   * Note: realizedProfit >= targetProfit in both versions because rounding
   * never goes down (v2 additionally bump-verifies across rounding steps).
   *
   * @param {object} rule              from user_pricing_settings row
   * @param {number|string} supplierPriceDec  decimal USD (e.g. 19.99)
   * @param {number|string} shippingCostDec   decimal USD (e.g. 4.99) — 0 if free shipping
   * @returns {object} full breakdown (all price fields as display strings)
   */
  function calculatePrice(rule, supplierPriceDec, shippingCostDec) {
    if (Number((rule || {}).formulaVersion ?? 1) === 2) {
      return calculatePriceV2(rule, supplierPriceDec, shippingCostDec);
    }
    const sp = parseToIntCents(supplierPriceDec);
    const sc = parseToIntCents(shippingCostDec);
    const sb = parseToIntCents(rule.shippingBuffer ?? 0);
    const fh = parseToIntCents(rule.fixedHandlingFee ?? 0);

    const baseCost = sp + sc + sb + fh;
    if (baseCost <= 0) throw new RangeError('calculatePrice: baseCost must be positive');

    const mktFee  = Math.round(baseCost * (rule.marketplaceFeePercent ?? 0) / 100);
    const fxBuf   = Math.round(baseCost * (rule.currencyBufferPercent ?? 0) / 100);
    const tgtProfit = Math.max(
      Math.round(baseCost * (rule.profitMarginPercent ?? 0) / 100),
      parseToIntCents(rule.minimumProfit ?? 0)
    );

    const rawFinal   = baseCost + mktFee + fxBuf + tgtProfit;
    const finalCents = applyRoundingRule(rawFinal, rule.roundingRule ?? 'NONE');

    const realizedProfit = finalCents - baseCost - mktFee - fxBuf;
    const marginPct = finalCents > 0 ? (realizedProfit / finalCents) * 100 : 0;

    return {
      finalPrice:       centsToDisplay(finalCents),
      supplierPrice:    centsToDisplay(sp),
      shippingCost:     centsToDisplay(sc),
      shippingBuffer:   centsToDisplay(sb),
      fixedHandlingFee: centsToDisplay(fh),
      baseCost:         centsToDisplay(baseCost),
      marketplaceFee:   centsToDisplay(mktFee),
      currencyBuffer:   centsToDisplay(fxBuf),
      profit:           centsToDisplay(realizedProfit),
      marginPercent:    parseFloat(marginPct.toFixed(2)),
      roundingRule:     rule.roundingRule ?? 'NONE',
      formulaVersion:   1,
      supplierKey:      rule.supplierKey ?? null,
      ruleVersion:      rule.ruleVersion ?? null,
      breakdown: {
        spCents: sp, scCents: sc, sbCents: sb, fhCents: fh,
        baseCost, mktFee, fxBuf, tgtProfit, rawFinal, finalCents,
      },
    };
  }

  /**
   * v2 — sale-based fee gross-up. See calculatePrice() docblock for the model.
   * Internal: callers go through calculatePrice(), which dispatches on
   * rule.formulaVersion. Exported for direct testing.
   */
  function calculatePriceV2(rule, supplierPriceDec, shippingCostDec) {
    const sp = parseToIntCents(supplierPriceDec);
    const sc = parseToIntCents(shippingCostDec);
    const sb = parseToIntCents(rule.shippingBuffer ?? 0);
    const fh = parseToIntCents(rule.fixedHandlingFee ?? 0);
    const po = parseToIntCents(rule.perOrderFee ?? 0);

    const totalCost = sp + sc + sb + fh;
    if (totalCost <= 0) throw new RangeError('calculatePrice: baseCost must be positive');

    const mktPct = Number(rule.marketplaceFeePercent ?? 0);
    const fxPct  = Number(rule.currencyBufferPercent ?? 0);
    const pctOfSale = mktPct + fxPct;
    const denominator = 1 - pctOfSale / 100;
    // Guardrail: as the denominator approaches 0 the gross-up price explodes.
    // Refuse loudly instead of listing an absurd price (no silent fallback).
    if (!(denominator > 0.25)) {
      throw new RangeError(
        `calculatePrice: sale-based fees too high (${pctOfSale}% of sale leaves denominator ${denominator.toFixed(2)}); refusing to price`
      );
    }

    const profitPct = Number(rule.profitMarginPercent ?? 0);
    const minProfit = parseToIntCents(rule.minimumProfit ?? 0);
    const tgtProfit = Math.max(Math.round(totalCost * profitPct / 100), minProfit);

    // Ceiling division: integer cents may never undershoot the profit target.
    const candidateMarkup = Math.ceil((totalCost * (1 + profitPct / 100) + po) / denominator);
    const candidateMin    = Math.ceil((totalCost + po + minProfit) / denominator);
    let rawFinal = Math.max(candidateMarkup, candidateMin);

    // Realized profit at a given price, using the same per-component rounding
    // eBay applies (fees rounded to the cent).
    const realizedAt = (cents) =>
      cents - Math.round(cents * mktPct / 100) - Math.round(cents * fxPct / 100) - po - totalCost;

    // Per-component fee rounding can eat up to a cent at boundaries; bump the
    // raw price (and re-apply the rounding rule) until the realized profit
    // meets the target. Converges in a handful of steps; hard cap is a
    // correctness assertion, not a control path.
    let finalCents = applyRoundingRule(rawFinal, rule.roundingRule ?? 'NONE');
    let guard = 0;
    while (realizedAt(finalCents) < tgtProfit) {
      if (++guard > 300) throw new RangeError('calculatePrice: could not satisfy profit target (internal error)');
      rawFinal += 1;
      finalCents = applyRoundingRule(rawFinal, rule.roundingRule ?? 'NONE');
    }

    const mktFee = Math.round(finalCents * mktPct / 100);
    const fxBuf  = Math.round(finalCents * fxPct / 100);
    const realizedProfit = realizedAt(finalCents);
    const marginPct = finalCents > 0 ? (realizedProfit / finalCents) * 100 : 0;

    return {
      finalPrice:       centsToDisplay(finalCents),
      supplierPrice:    centsToDisplay(sp),
      shippingCost:     centsToDisplay(sc),
      shippingBuffer:   centsToDisplay(sb),
      fixedHandlingFee: centsToDisplay(fh),
      baseCost:         centsToDisplay(totalCost),
      marketplaceFee:   centsToDisplay(mktFee),   // % of SALE price
      currencyBuffer:   centsToDisplay(fxBuf),    // % of SALE price
      perOrderFee:      centsToDisplay(po),
      profit:           centsToDisplay(realizedProfit),
      marginPercent:    parseFloat(marginPct.toFixed(2)),
      roundingRule:     rule.roundingRule ?? 'NONE',
      formulaVersion:   2,
      supplierKey:      rule.supplierKey ?? null,
      ruleVersion:      rule.ruleVersion ?? null,
      breakdown: {
        spCents: sp, scCents: sc, sbCents: sb, fhCents: fh, poCents: po,
        baseCost: totalCost, mktFee, fxBuf, tgtProfit, rawFinal, finalCents,
      },
    };
  }

  return { parseToIntCents, centsToDisplay, applyRoundingRule, calculatePrice, calculatePriceV2 };
})();

// ─── ES module exports for Deno edge functions (appended by sync-pricing-core.js) ───
// In Deno Deploy, window === globalThis, so the IIFE above assigned window.SSPricingCore.
// We re-export the members as named ES exports for clean import syntax.
const { parseToIntCents, centsToDisplay, applyRoundingRule, calculatePrice, calculatePriceV2 } = window.SSPricingCore;
export { parseToIntCents, centsToDisplay, applyRoundingRule, calculatePrice, calculatePriceV2 };
export default window.SSPricingCore;
