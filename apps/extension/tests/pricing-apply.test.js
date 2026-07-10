// pricing-apply.test.js — locks the pricing-integrity contract of
// common/pricing-apply.js (SSPricingApply): products are priced ONLY from the
// user's synced dashboard Supplier Pricing rules via SSPricingCore, always
// from the RAW supplier price, never from fabricated or previously-calculated
// values, and manual edits always win.
// Run: node --test apps/extension/tests/pricing-apply.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadApply() {
  const win = makeWindow();
  loadInto(win, 'suppliers/core/pricing-core.js');
  loadInto(win, 'common/pricing-apply.js');
  return win;
}

// Rule caches in the exact shape pricing-rules-sync returns and
// pricing-rule-sync.js stores in chrome.storage.local (pricingRulesCache).
function cacheWith(rules) {
  return { suppliers: rules, updatedAt: '2026-07-10T00:00:00Z', etag: '"t"' };
}

const AMAZON_RULE_USER_A = {
  supplierKey: 'amazon',
  supplierName: 'Amazon',
  isEnabled: true,
  ruleVersion: 3,
  calculationRule: {
    profitMarginPercent: 20,
    minimumProfit: 0,
    shippingBuffer: 0,
    fixedHandlingFee: 1, // "100 BDT fixed cost" analogue in USD units
    marketplaceFeePercent: 0,
    currencyBufferPercent: 0,
    roundingRule: 'ROUND_UP',
  },
};

const AMAZON_RULE_USER_B = {
  supplierKey: 'amazon',
  supplierName: 'Amazon',
  isEnabled: true,
  ruleVersion: 7,
  calculationRule: {
    profitMarginPercent: 50,
    minimumProfit: 10,
    shippingBuffer: 2,
    fixedHandlingFee: 0,
    marketplaceFeePercent: 13,
    currencyBufferPercent: 2,
    roundingRule: 'END_99',
  },
};

const WALMART_RULE = {
  supplierKey: 'walmart',
  supplierName: 'Walmart',
  isEnabled: true,
  ruleVersion: 1,
  calculationRule: {
    profitMarginPercent: 25,
    minimumProfit: 5,
    shippingBuffer: 3,
    fixedHandlingFee: 0,
    marketplaceFeePercent: 8,
    currencyBufferPercent: 2,
    roundingRule: 'END_99',
  },
};

function product(overrides = {}) {
  return {
    title: 'Test Product',
    price: 10.0, // raw supplier price
    variants: [],
    ...overrides,
  };
}

describe('rule application basics', () => {
  test('prices the parent from the raw supplier price with the supplier rule', () => {
    const win = loadApply();
    const p = product();
    const out = win.SSPricingApply.applyWithRules(p, cacheWith([AMAZON_RULE_USER_A]), 'amazon');
    assert.equal(out.priced, true);
    // 10 + 1 handling = 11 baseCost; profit 20% = 2.20 → 13.20 → ROUND_UP → 14.00
    assert.equal(p.finalPrice, 14.0);
    assert.equal(p.ebayPrice, 14.0);
    assert.equal(p.raw_supplier_price, 10.0);
    assert.equal(p.price_source, 'calculated');
    assert.equal(p.pricingRuleVersion, 3);
    assert.equal(p.supplierKey, 'amazon');
  });

  test('parity: applyWithRules output equals SSPricingCore.calculatePrice directly', () => {
    const win = loadApply();
    const p = product({ price: 19.99 });
    win.SSPricingApply.applyWithRules(p, cacheWith([AMAZON_RULE_USER_B]), 'amazon');
    const direct = win.SSPricingCore.calculatePrice(AMAZON_RULE_USER_B.calculationRule, 19.99, 0);
    assert.equal(p.finalPrice, parseFloat(direct.finalPrice));
  });

  test('different users (different rule caches) produce different prices for the same product', () => {
    const win = loadApply();
    const pA = product({ price: 12.5 });
    const pB = product({ price: 12.5 });
    win.SSPricingApply.applyWithRules(pA, cacheWith([AMAZON_RULE_USER_A]), 'amazon');
    win.SSPricingApply.applyWithRules(pB, cacheWith([AMAZON_RULE_USER_B]), 'amazon');
    assert.ok(pA.finalPrice > 12.5 && pB.finalPrice > 12.5, 'both must be marked up');
    assert.notEqual(pA.finalPrice, pB.finalPrice, "user A's settings must not leak into user B's price");
  });

  test('updated rule version (settings change) re-prices on next application', () => {
    const win = loadApply();
    const p = product({ price: 12.5 });
    win.SSPricingApply.applyWithRules(p, cacheWith([AMAZON_RULE_USER_A]), 'amazon');
    const before = p.finalPrice;
    // User saves new dashboard settings → synced cache now carries v4 with higher profit
    const updated = { ...AMAZON_RULE_USER_A, ruleVersion: 4, calculationRule: { ...AMAZON_RULE_USER_A.calculationRule, profitMarginPercent: 40 } };
    win.SSPricingApply.applyWithRules(p, cacheWith([updated]), 'amazon');
    assert.ok(p.finalPrice > before, 'new settings must apply immediately to the next pricing pass');
    assert.equal(p.pricingRuleVersion, 4);
  });

  test('different suppliers use their own rule from the same central engine', () => {
    const win = loadApply();
    const amazonP = product({ price: 10 });
    const walmartP = product({ price: 10 });
    const cache = cacheWith([AMAZON_RULE_USER_A, WALMART_RULE]);
    win.SSPricingApply.applyWithRules(amazonP, cache, 'amazon');
    win.SSPricingApply.applyWithRules(walmartP, cache, 'walmart');
    assert.ok(amazonP.finalPrice > 0 && walmartP.finalPrice > 0);
    assert.notEqual(amazonP.finalPrice, walmartP.finalPrice);
    assert.equal(walmartP.supplierKey, 'walmart');
  });
});

describe('no fabricated prices — ever', () => {
  test('missing raw price → product left unpriced (no $50-style default)', () => {
    const win = loadApply();
    const p = product({ price: undefined });
    const out = win.SSPricingApply.applyWithRules(p, cacheWith([AMAZON_RULE_USER_A]), 'amazon');
    assert.equal(out.priced, false);
    assert.equal(out.reason, 'no_valid_raw_price');
    assert.equal(p.finalPrice, undefined);
  });

  test('zero / negative / garbage raw price → unpriced', () => {
    const win = loadApply();
    for (const bad of [0, -5, 'not-a-price', '', null]) {
      const p = product({ price: bad });
      const out = win.SSPricingApply.applyWithRules(p, cacheWith([AMAZON_RULE_USER_A]), 'amazon');
      assert.equal(out.priced, false, `price "${bad}" must not price`);
      assert.equal(p.finalPrice, undefined, `price "${bad}" must not stamp finalPrice`);
    }
  });

  test('no rule synced for the supplier → unpriced with actionable reason', () => {
    const win = loadApply();
    const p = product();
    const out = win.SSPricingApply.applyWithRules(p, cacheWith([WALMART_RULE]), 'amazon');
    assert.equal(out.priced, false);
    assert.equal(out.reason, 'no_rule_synced');
    assert.equal(p.finalPrice, undefined);
  });

  test('empty/absent cache (logged out) → unpriced', () => {
    const win = loadApply();
    const p = product();
    const out = win.SSPricingApply.applyWithRules(p, null, 'amazon');
    assert.equal(out.priced, false);
    assert.equal(p.finalPrice, undefined);
  });

  test('rule disabled in dashboard → unpriced (user turned this supplier off)', () => {
    const win = loadApply();
    const p = product();
    const disabled = { ...AMAZON_RULE_USER_A, isEnabled: false };
    const out = win.SSPricingApply.applyWithRules(p, cacheWith([disabled]), 'amazon');
    assert.equal(out.priced, false);
    assert.equal(out.reason, 'rule_disabled');
  });
});

describe('re-pricing safety — markup can never compound', () => {
  test('applying twice yields the identical price (idempotent)', () => {
    const win = loadApply();
    const p = product({ price: 12.49 });
    const cache = cacheWith([AMAZON_RULE_USER_A]);
    win.SSPricingApply.applyWithRules(p, cache, 'amazon');
    const first = p.finalPrice;
    win.SSPricingApply.applyWithRules(p, cache, 'amazon');
    assert.equal(p.finalPrice, first, 're-import must not re-mark-up the already calculated price');
  });

  test('a poisoned finalPrice is recomputed from raw, not compounded', () => {
    const win = loadApply();
    const p = product({ price: 10 });
    const cache = cacheWith([AMAZON_RULE_USER_A]);
    win.SSPricingApply.applyWithRules(p, cache, 'amazon');
    const honest = p.finalPrice;
    // Simulate a buggy caller that wrote the selling price into finalPrice and
    // re-imports: the engine must ignore finalPrice and start from raw again.
    p.finalPrice = 999.99;
    p.price_source = 'calculated';
    win.SSPricingApply.applyWithRules(p, cache, 'amazon');
    assert.equal(p.finalPrice, honest, 'must recompute from raw_supplier_price, never from a prior output');
  });

  test('variant re-pricing starts from variant raw price each time', () => {
    const win = loadApply();
    const p = product({
      price: 10,
      variants: [
        { price: 8, attrs: { Color: 'Red' } },
        { price: 12, attrs: { Color: 'Blue' } },
      ],
    });
    const cache = cacheWith([AMAZON_RULE_USER_A]);
    win.SSPricingApply.applyWithRules(p, cache, 'amazon');
    const [v1a, v2a] = p.variants.map(v => v.finalPrice);
    // A re-scan reuses the same variant objects (ebayPrice already set) —
    // fill-only semantics must keep them stable, not stack markup.
    win.SSPricingApply.applyWithRules(p, cache, 'amazon');
    assert.equal(p.variants[0].finalPrice, v1a);
    assert.equal(p.variants[1].finalPrice, v2a);
    assert.equal(p.variants[0].raw_supplier_price, 8);
    assert.equal(p.variants[1].raw_supplier_price, 12);
  });
});

describe('manual overrides always win', () => {
  test('manual parent price survives re-pricing', () => {
    const win = loadApply();
    const p = product({ price: 10, finalPrice: 42.0, price_source: 'manual' });
    win.SSPricingApply.applyWithRules(p, cacheWith([AMAZON_RULE_USER_A]), 'amazon');
    assert.equal(p.finalPrice, 42.0);
    assert.equal(p.price_source, 'manual');
  });

  test('manual per-variant ebayPrice is never clobbered (fill-only)', () => {
    const win = loadApply();
    const p = product({
      price: 10,
      variants: [
        { price: 8, ebayPrice: 33.33, attrs: { Size: 'L' } }, // user-edited
        { price: 8, attrs: { Size: 'M' } },                    // untouched
      ],
    });
    win.SSPricingApply.applyWithRules(p, cacheWith([AMAZON_RULE_USER_A]), 'amazon');
    assert.equal(p.variants[0].ebayPrice, 33.33, 'manual variant price must survive');
    assert.ok(p.variants[1].finalPrice > 8, 'untouched variant must be calculator-priced');
    assert.equal(p.variants[1].price_source, 'calculated');
  });
});

describe('variants inherit the parent raw price when they have none', () => {
  test('variant without its own price uses parent raw price', () => {
    const win = loadApply();
    const p = product({
      price: 10,
      variants: [{ attrs: { Color: 'Green' } }],
    });
    win.SSPricingApply.applyWithRules(p, cacheWith([AMAZON_RULE_USER_A]), 'amazon');
    assert.equal(p.variants[0].raw_supplier_price, 10);
    assert.equal(p.variants[0].finalPrice, p.finalPrice);
  });
});

describe('explicit end-to-end expected values (user story from the spec)', () => {
  // User A: 20% profit, $1 fixed cost, ROUND_UP.
  // User B: 50% profit + $10 minimum, $2 shipping buffer, 13% marketplace fee,
  //         2% currency buffer, END_99.
  // Product raw price: $12.50 — expectations computed by hand in cents.
  test('user A: 12.50 → (12.50+1)*1.20 = 16.20 → ROUND_UP → 17.00', () => {
    const win = loadApply();
    const p = product({ price: 12.5 });
    win.SSPricingApply.applyWithRules(p, cacheWith([AMAZON_RULE_USER_A]), 'amazon');
    assert.equal(p.finalPrice, 17.0);
  });

  test('user B: 12.50 → base 14.50 + fee 1.89 + fx 0.29 + profit max(7.25,10)=10 → 26.68 → END_99 → 26.99', () => {
    const win = loadApply();
    const p = product({ price: 12.5 });
    win.SSPricingApply.applyWithRules(p, cacheWith([AMAZON_RULE_USER_B]), 'amazon');
    assert.equal(p.finalPrice, 26.99);
  });
});

describe('formula v2 rules flow through SSPricingApply unchanged', () => {
  const AMAZON_RULE_V2 = {
    supplierKey: 'amazon',
    supplierName: 'Amazon',
    isEnabled: true,
    ruleVersion: 9,
    calculationRule: {
      formulaVersion: 2,
      perOrderFee: 0.30,
      profitMarginPercent: 20,
      minimumProfit: 0,
      shippingBuffer: 0,
      fixedHandlingFee: 0,
      marketplaceFeePercent: 13.25,
      currencyBufferPercent: 0,
      roundingRule: 'NONE',
    },
  };

  test('v2 rule prices via the gross-up: $10 raw → $14.18, realized profit exactly $2.00', () => {
    const win = loadApply();
    const p = product({ price: 10.0 });
    const out = win.SSPricingApply.applyWithRules(p, cacheWith([AMAZON_RULE_V2]), 'amazon');
    assert.equal(out.priced, true);
    assert.equal(p.finalPrice, 14.18);
    assert.equal(p.price_source, 'calculated');
    // Engine parity with a direct SSPricingCore call
    const direct = win.SSPricingCore.calculatePrice(AMAZON_RULE_V2.calculationRule, 10.0, 0);
    assert.equal(p.finalPrice, parseFloat(direct.finalPrice));
    assert.equal(direct.profit, '2.00');
  });

  test('v2 fees-too-high rule → product left unpriced (guardrail propagates as no price)', () => {
    const win = loadApply();
    const p = product({ price: 10.0 });
    const badRule = {
      ...AMAZON_RULE_V2,
      calculationRule: { ...AMAZON_RULE_V2.calculationRule, marketplaceFeePercent: 60, currencyBufferPercent: 20 },
    };
    const out = win.SSPricingApply.applyWithRules(p, cacheWith([badRule]), 'amazon');
    assert.equal(out.priced, false, 'guardrail must refuse rather than price absurdly');
    assert.equal(p.finalPrice, undefined);
  });

  test('mixed cache: v1 supplier and v2 supplier price independently', () => {
    const win = loadApply();
    const cache = cacheWith([AMAZON_RULE_USER_A, { ...AMAZON_RULE_V2, supplierKey: 'walmart', supplierName: 'Walmart' }]);
    const pV1 = product({ price: 10 });
    const pV2 = product({ price: 10 });
    win.SSPricingApply.applyWithRules(pV1, cache, 'amazon');   // v1 rule
    win.SSPricingApply.applyWithRules(pV2, cache, 'walmart');  // v2 rule
    assert.equal(pV1.finalPrice, 14.0);   // legacy additive + ROUND_UP
    assert.equal(pV2.finalPrice, 14.18);  // sale-based gross-up
  });
});
