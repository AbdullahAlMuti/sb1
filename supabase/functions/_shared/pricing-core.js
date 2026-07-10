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
   * Formula (additive, all in cents):
   *   baseCost      = supplierPrice + shippingCost + shippingBuffer + fixedHandlingFee
   *   marketplaceFee= baseCost * marketplaceFeePercent / 100
   *   currencyBuffer= baseCost * currencyBufferPercent / 100
   *   targetProfit  = max(baseCost * profitMarginPercent / 100, minimumProfit)
   *   rawFinal      = baseCost + marketplaceFee + currencyBuffer + targetProfit
   *   finalPrice    = applyRoundingRule(rawFinal, roundingRule)
   *   realizedProfit= finalPrice - baseCost - marketplaceFee - currencyBuffer
   *
   * Note: realizedProfit >= targetProfit because rounding never goes down.
   *
   * @param {object} rule              from user_pricing_settings row
   * @param {number|string} supplierPriceDec  decimal USD (e.g. 19.99)
   * @param {number|string} shippingCostDec   decimal USD (e.g. 4.99) — 0 if free shipping
   * @returns {object} full breakdown (all price fields as display strings)
   */
  function calculatePrice(rule, supplierPriceDec, shippingCostDec) {
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
      supplierKey:      rule.supplierKey ?? null,
      ruleVersion:      rule.ruleVersion ?? null,
      breakdown: {
        spCents: sp, scCents: sc, sbCents: sb, fhCents: fh,
        baseCost, mktFee, fxBuf, tgtProfit, rawFinal, finalCents,
      },
    };
  }

  return { parseToIntCents, centsToDisplay, applyRoundingRule, calculatePrice };
})();

// ─── ES module exports for Deno edge functions (appended by sync-pricing-core.js) ───
// In Deno Deploy, window === globalThis, so the IIFE above assigned window.SSPricingCore.
// We re-export the members as named ES exports for clean import syntax.
const { parseToIntCents, centsToDisplay, applyRoundingRule, calculatePrice } = window.SSPricingCore;
export { parseToIntCents, centsToDisplay, applyRoundingRule, calculatePrice };
export default window.SSPricingCore;
