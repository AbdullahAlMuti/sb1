// pricing-core.test.js — comprehensive unit tests for SSPricingCore.
// Covers: all rounding rules, formula correctness, edge cases, property tests.
// Run: node --test tests/pricing-core.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadCore() {
  const win = makeWindow();
  loadInto(win, 'suppliers/core/pricing-core.js');
  return win.SSPricingCore;
}

const core = loadCore();
const { parseToIntCents, centsToDisplay, applyRoundingRule, calculatePrice } = core;

// ─── parseToIntCents ───────────────────────────────────────────────────────

describe('parseToIntCents', () => {
  test('integer input', () => assert.equal(parseToIntCents(20), 2000));
  test('decimal input', () => assert.equal(parseToIntCents(19.99), 1999));
  test('string decimal', () => assert.equal(parseToIntCents('4.95'), 495));
  test('string integer', () => assert.equal(parseToIntCents('100'), 10000));
  test('zero', () => assert.equal(parseToIntCents(0), 0));
  test('float rounding edge: 0.1 + 0.2 input', () => {
    // 0.30 should parse to exactly 30 cents, not 29 due to float error
    assert.equal(parseToIntCents(0.30), 30);
  });
  test('throws on NaN', () => assert.throws(() => parseToIntCents(NaN), RangeError));
  test('throws on Infinity', () => assert.throws(() => parseToIntCents(Infinity), RangeError));
  test('throws on negative', () => assert.throws(() => parseToIntCents(-1), RangeError));
  test('throws on negative string', () => assert.throws(() => parseToIntCents('-5.00'), RangeError));
});

// ─── centsToDisplay ────────────────────────────────────────────────────────

describe('centsToDisplay', () => {
  test('1999 → "19.99"', () => assert.equal(centsToDisplay(1999), '19.99'));
  test('100 → "1.00"', () => assert.equal(centsToDisplay(100), '1.00'));
  test('0 → "0.00"', () => assert.equal(centsToDisplay(0), '0.00'));
  test('2499 → "24.99"', () => assert.equal(centsToDisplay(2499), '24.99'));
});

// ─── applyRoundingRule ─────────────────────────────────────────────────────

describe('applyRoundingRule – NONE', () => {
  test('returns unchanged', () => assert.equal(applyRoundingRule(1234, 'NONE'), 1234));
  test('returns unchanged when already ends in 99', () => assert.equal(applyRoundingRule(1599, 'NONE'), 1599));
});

describe('applyRoundingRule – END_99', () => {
  test('already at 99 stays', () => assert.equal(applyRoundingRule(1999, 'END_99'), 1999));
  test('1901 → 1999', () => assert.equal(applyRoundingRule(1901, 'END_99'), 1999));
  test('2000 → 2099', () => assert.equal(applyRoundingRule(2000, 'END_99'), 2099));
  test('2099 stays', () => assert.equal(applyRoundingRule(2099, 'END_99'), 2099));
  test('2100 → 2199', () => assert.equal(applyRoundingRule(2100, 'END_99'), 2199));
  test('never reduces (2099 → 2099)', () => {
    const r = applyRoundingRule(2099, 'END_99');
    assert.ok(r >= 2099);
  });
});

describe('applyRoundingRule – END_95', () => {
  test('already at 95 stays', () => assert.equal(applyRoundingRule(1995, 'END_95'), 1995));
  test('1990 → 1995', () => assert.equal(applyRoundingRule(1990, 'END_95'), 1995));
  test('1996 → 2095', () => assert.equal(applyRoundingRule(1996, 'END_95'), 2095));
  test('2000 → 2095', () => assert.equal(applyRoundingRule(2000, 'END_95'), 2095));
});

describe('applyRoundingRule – END_49', () => {
  test('already at 49 stays', () => assert.equal(applyRoundingRule(1949, 'END_49'), 1949));
  test('1940 → 1949', () => assert.equal(applyRoundingRule(1940, 'END_49'), 1949));
  test('1950 → 2049', () => assert.equal(applyRoundingRule(1950, 'END_49'), 2049));
  test('2000 → 2049', () => assert.equal(applyRoundingRule(2000, 'END_49'), 2049));
});

describe('applyRoundingRule – ROUND_UP', () => {
  test('already whole stays', () => assert.equal(applyRoundingRule(2000, 'ROUND_UP'), 2000));
  test('2001 → 2100', () => assert.equal(applyRoundingRule(2001, 'ROUND_UP'), 2100));
  test('2099 → 2100', () => assert.equal(applyRoundingRule(2099, 'ROUND_UP'), 2100));
  test('100 stays', () => assert.equal(applyRoundingRule(100, 'ROUND_UP'), 100));
});

describe('applyRoundingRule – property: never rounds down', () => {
  const rules = ['NONE', 'END_99', 'END_95', 'END_49', 'ROUND_UP'];
  const inputs = [0, 1, 49, 50, 99, 100, 101, 199, 200, 1000, 1948, 1949, 1950, 1999, 2000, 2001, 9999];
  for (const rule of rules) {
    for (const cents of inputs) {
      test(`${rule} on ${cents} >= input`, () => {
        assert.ok(applyRoundingRule(cents, rule) >= cents,
          `${rule}(${cents}) = ${applyRoundingRule(cents, rule)} < ${cents}`);
      });
    }
  }
});

describe('applyRoundingRule – throws on unknown rule', () => {
  test('throws TypeError', () => assert.throws(() => applyRoundingRule(100, 'INVALID'), TypeError));
});

// ─── calculatePrice ────────────────────────────────────────────────────────

function makeRule(overrides = {}) {
  return {
    supplierKey:            'amazon',
    ruleVersion:            1,
    profitMarginPercent:    25,
    minimumProfit:          5,
    shippingBuffer:         3,
    fixedHandlingFee:       0,
    marketplaceFeePercent:  13,
    currencyBufferPercent:  2,
    roundingRule:           'END_99',
    ...overrides,
  };
}

describe('calculatePrice – basic formula', () => {
  test('returns correct shape', () => {
    const r = calculatePrice(makeRule(), 20.00, 0);
    assert.ok('finalPrice' in r);
    assert.ok('supplierPrice' in r);
    assert.ok('shippingCost' in r);
    assert.ok('baseCost' in r);
    assert.ok('marketplaceFee' in r);
    assert.ok('currencyBuffer' in r);
    assert.ok('profit' in r);
    assert.ok('marginPercent' in r);
    assert.ok('breakdown' in r);
  });

  test('supplierKey and ruleVersion passthrough', () => {
    const r = calculatePrice(makeRule({ supplierKey: 'walmart', ruleVersion: 7 }), 10.00, 0);
    assert.equal(r.supplierKey, 'walmart');
    assert.equal(r.ruleVersion, 7);
  });

  test('baseCost = supplier + shipping + buffer + handling', () => {
    // supplier=$20, shipping=$0, buffer=$3, handling=$0 → baseCost=$23
    const r = calculatePrice(makeRule({ shippingBuffer: 3, fixedHandlingFee: 0 }), 20.00, 0);
    assert.equal(r.baseCost, '23.00');
  });

  test('shippingCost included in baseCost', () => {
    // supplier=$20, shipping=$5, buffer=$3 → baseCost=$28
    const r = calculatePrice(makeRule({ shippingBuffer: 3, fixedHandlingFee: 0 }), 20.00, 5.00);
    assert.equal(r.baseCost, '28.00');
  });

  test('realizedProfit >= targetProfit after rounding', () => {
    const r = calculatePrice(makeRule(), 20.00, 0);
    const { tgtProfit, finalCents, baseCost, mktFee, fxBuf } = r.breakdown;
    const realized = finalCents - baseCost - mktFee - fxBuf;
    assert.ok(realized >= tgtProfit, `realized=${realized} < target=${tgtProfit}`);
  });

  test('finalCents >= rawFinal (rounding never reduces)', () => {
    const r = calculatePrice(makeRule(), 20.00, 0);
    assert.ok(r.breakdown.finalCents >= r.breakdown.rawFinal);
  });
});

describe('calculatePrice – minimumProfit override', () => {
  test('minimum profit fires when margin is too small', () => {
    // supplier=$1.00, buffer=$0, handling=$0, fees=0%, profit=1% → would be 1 cent
    // minimumProfit=$5 → should enforce $5 minimum
    const rule = makeRule({
      profitMarginPercent:   1,
      minimumProfit:         5,
      marketplaceFeePercent: 0,
      currencyBufferPercent: 0,
      shippingBuffer:        0,
      fixedHandlingFee:      0,
      roundingRule:          'NONE',
    });
    const r = calculatePrice(rule, 1.00, 0);
    const profit = parseFloat(r.profit);
    assert.ok(profit >= 5.00, `profit=${profit} should be >= 5.00`);
  });

  test('margin-based profit wins when larger than minimum', () => {
    // supplier=$100, profitMargin=30% = $30 > minimumProfit=$5
    const rule = makeRule({
      profitMarginPercent:   30,
      minimumProfit:         5,
      marketplaceFeePercent: 0,
      currencyBufferPercent: 0,
      shippingBuffer:        0,
      fixedHandlingFee:      0,
      roundingRule:          'NONE',
    });
    const r = calculatePrice(rule, 100.00, 0);
    const profit = parseFloat(r.profit);
    assert.ok(profit >= 30.00, `profit=${profit} should be >= 30.00`);
  });
});

describe('calculatePrice – zero shipping', () => {
  test('shippingCost=0 is valid', () => {
    const r = calculatePrice(makeRule(), 25.00, 0);
    assert.equal(r.shippingCost, '0.00');
  });
});

describe('calculatePrice – NONE rounding preserves raw', () => {
  test('finalPrice equals rawFinal when NONE', () => {
    const rule = makeRule({ roundingRule: 'NONE' });
    const r = calculatePrice(rule, 20.00, 0);
    assert.equal(r.breakdown.finalCents, r.breakdown.rawFinal);
  });
});

describe('calculatePrice – rounding rule END_99 applied', () => {
  test('finalPrice ends in .99', () => {
    const rule = makeRule({ roundingRule: 'END_99' });
    const r = calculatePrice(rule, 20.00, 0);
    const cents = r.breakdown.finalCents;
    assert.equal(cents % 100, 99, `expected last 2 digits = 99, got ${cents % 100}`);
  });
});

describe('calculatePrice – input errors', () => {
  test('throws on negative supplier price', () => {
    assert.throws(() => calculatePrice(makeRule(), -1, 0), RangeError);
  });
  test('throws on NaN supplier price', () => {
    assert.throws(() => calculatePrice(makeRule(), NaN, 0), RangeError);
  });
  test('throws on NaN shipping', () => {
    assert.throws(() => calculatePrice(makeRule(), 20, NaN), RangeError);
  });
});

describe('calculatePrice – marginPercent reflects realized profit', () => {
  test('marginPercent = realizedProfit / finalPrice * 100', () => {
    const r = calculatePrice(makeRule(), 20.00, 0);
    const expected = (parseFloat(r.profit) / parseFloat(r.finalPrice)) * 100;
    assert.ok(Math.abs(r.marginPercent - expected) < 0.01,
      `marginPercent=${r.marginPercent} expected~${expected.toFixed(2)}`);
  });
});

describe('calculatePrice – various supplier prices (smoke)', () => {
  const prices = [0.99, 1.00, 5.49, 9.99, 19.99, 49.99, 99.99, 199.99, 499.99];
  for (const p of prices) {
    test(`supplier price $${p}`, () => {
      const r = calculatePrice(makeRule(), p, 0);
      assert.ok(parseFloat(r.finalPrice) > p, `finalPrice should exceed supplier price`);
      assert.ok(r.breakdown.finalCents >= r.breakdown.rawFinal, 'rounding must not go down');
    });
  }
});

// ─── Formula v2 — sale-based fee gross-up ─────────────────────────────────────
// eBay charges its final value fee as a % of the SALE price plus a fixed
// per-order fee. v2 grosses the price up so the configured profit is the
// profit actually REALIZED after those fees. All expectations below are
// hand-computed in integer cents.

function makeRuleV2(overrides = {}) {
  return {
    formulaVersion: 2,
    profitMarginPercent: 20,
    minimumProfit: 0,
    shippingBuffer: 0,
    fixedHandlingFee: 0,
    marketplaceFeePercent: 13.25,
    currencyBufferPercent: 0,
    perOrderFee: 0.30,
    roundingRule: 'NONE',
    supplierKey: 'amazon',
    ruleVersion: 1,
    ...overrides,
  };
}

describe('calculatePrice v2 – gross-up correctness (hand-computed)', () => {
  test('$10 cost, 20% profit, 13.25% + $0.30 → price 14.18, realized profit exactly $2.00', () => {
    // totalCost=1000c; candidate = ceil((1200 + 30) / 0.8675) = ceil(1417.87) = 1418
    // fee at 1418 = round(187.885) = 188; realized = 1418 − 188 − 30 − 1000 = 200 ✓
    const r = calculatePrice(makeRuleV2(), 10.00, 0);
    assert.equal(r.finalPrice, '14.18');
    assert.equal(r.profit, '2.00');
    assert.equal(r.formulaVersion, 2);
    assert.equal(r.perOrderFee, '0.30');
  });

  test('v1 with same inputs under-collects: realized profit lands below the $2.00 target', () => {
    // The economic bug v2 fixes: v1 charges the 13.25% against COST, so the
    // real eBay fee (charged on the sale) eats into the configured profit.
    const v1 = calculatePrice(makeRuleV2({ formulaVersion: 1 }), 10.00, 0);
    const price = v1.breakdown.finalCents;
    const actualEbayFee = Math.round(price * 13.25 / 100) + 30;
    const realizedAfterRealFees = price - actualEbayFee - 1000;
    assert.ok(realizedAfterRealFees < 200,
      `v1 must demonstrate the shortfall (realized ${realizedAfterRealFees}c < 200c target)`);
  });

  test('minimum REALIZED profit binds when markup profit is smaller', () => {
    // profit 0%, min $5: candidate = ceil((1000 + 30 + 500) / 0.8675) = ceil(1763.98) = 1764
    // fee = round(233.73) = 234; realized = 1764 − 234 − 30 − 1000 = 500 ✓ exactly $5.00
    const r = calculatePrice(makeRuleV2({ profitMarginPercent: 0, minimumProfit: 5 }), 10.00, 0);
    assert.equal(r.finalPrice, '17.64');
    assert.equal(r.profit, '5.00');
  });

  test('shipping + buffers + handling join the cost base before gross-up', () => {
    // totalCost = 1000 + 200 + 300 + 100 = 1600; candidate = ceil((1920+30)/0.8675) = ceil(2247.8) = 2248
    // fee = round(297.86) = 298; realized = 2248 − 298 − 30 − 1600 = 320 = target (20% of 1600) ✓
    const r = calculatePrice(makeRuleV2({ shippingBuffer: 3, fixedHandlingFee: 1 }), 10.00, 2.00);
    assert.equal(r.finalPrice, '22.48');
    assert.equal(r.profit, '3.20');
  });

  test('currency buffer is % of SALE in v2 and stacks with marketplace fee', () => {
    // pct = 13.25 + 2 = 15.25 → denom 0.8475; candidate = ceil((1200+30)/0.8475) = ceil(1451.33) = 1452
    // mkt = round(192.39) = 192; fx = round(29.04) = 29; realized = 1452−192−29−30−1000 = 201 ≥ 200 ✓
    const r = calculatePrice(makeRuleV2({ currencyBufferPercent: 2 }), 10.00, 0);
    assert.equal(r.finalPrice, '14.52');
    assert.ok(parseFloat(r.profit) >= 2.00, `realized ${r.profit} must be >= 2.00 target`);
  });

  test('END_99 rounding never reduces price and realized profit only improves', () => {
    const none = calculatePrice(makeRuleV2(), 10.00, 0);
    const r99  = calculatePrice(makeRuleV2({ roundingRule: 'END_99' }), 10.00, 0);
    assert.equal(r99.finalPrice, '14.99'); // 1418 → END_99 → 1499
    assert.ok(r99.breakdown.finalCents >= none.breakdown.finalCents);
    assert.ok(parseFloat(r99.profit) >= parseFloat(none.profit));
  });

  test('realized profit meets target across a price sweep (property)', () => {
    for (const p of [0.99, 4.20, 9.99, 12.49, 19.99, 37.77, 49.99, 99.99, 149.5, 199.99]) {
      const rule = makeRuleV2({ currencyBufferPercent: 2, roundingRule: 'END_99', minimumProfit: 3 });
      const r = calculatePrice(rule, p, 0);
      const totalCost = Math.round(p * 100);
      const target = Math.max(Math.round(totalCost * 0.20), 300);
      const realized = Math.round(parseFloat(r.profit) * 100);
      assert.ok(realized >= target, `$${p}: realized ${realized}c must be >= target ${target}c`);
    }
  });

  test('guardrail: combined sale-based fees > 75% are rejected, never silently priced', () => {
    assert.throws(
      () => calculatePrice(makeRuleV2({ marketplaceFeePercent: 60, currencyBufferPercent: 20 }), 10, 0),
      /fees too high/,
    );
  });

  test('per-order fee is recovered in full (zero-profit sanity)', () => {
    // profit 0, min 0, fees 0%, perOrder $0.30 → price = cost + 0.30 exactly
    const r = calculatePrice(makeRuleV2({ profitMarginPercent: 0, marketplaceFeePercent: 0, perOrderFee: 0.30 }), 10.00, 0);
    assert.equal(r.finalPrice, '10.30');
    assert.equal(r.profit, '0.00');
  });

  test('missing formulaVersion or explicit 1 both take the untouched v1 path (regression lock)', () => {
    const rule = { profitMarginPercent: 25, minimumProfit: 5, shippingBuffer: 3, fixedHandlingFee: 0,
                   marketplaceFeePercent: 13, currencyBufferPercent: 2, roundingRule: 'END_99' };
    const implicit = calculatePrice(rule, 19.99, 4.99);
    const explicit = calculatePrice({ ...rule, formulaVersion: 1 }, 19.99, 4.99);
    assert.deepEqual(implicit.breakdown, explicit.breakdown);
    assert.equal(implicit.finalPrice, explicit.finalPrice);
    assert.equal(implicit.formulaVersion, 1);
    // v1 ignores perOrderFee entirely — adding it must not change v1 output
    const withPo = calculatePrice({ ...rule, perOrderFee: 0.30 }, 19.99, 4.99);
    assert.equal(withPo.finalPrice, implicit.finalPrice);
  });

  test('v2 rejects invalid input identically to v1 (no fabricated prices)', () => {
    assert.throws(() => calculatePrice(makeRuleV2(), -1, 0), RangeError);
    assert.throws(() => calculatePrice(makeRuleV2(), NaN, 0), RangeError);
    assert.throws(() => calculatePrice(makeRuleV2(), 0, 0), RangeError);
  });
});
