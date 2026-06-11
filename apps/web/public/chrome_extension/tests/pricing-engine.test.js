// pricing-engine.test.js — locks calculatePrice behavior before any refactor
// Run: node --test apps/extension/tests/pricing-engine.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Engines use window.* global pattern — polyfill then eval
const src = readFileSync(join(__dirname, '../common/pricing-engine.js'), 'utf8');
const globalObj = {};
const fn = new Function('window', src);
fn(globalObj);
const { calculatePrice, DEFAULTS } = globalObj.SSPricingEngine;

function priceWithDefaults(cost, overrides) {
  return calculatePrice(cost, Object.assign({}, DEFAULTS, overrides));
}

describe('calculatePrice — defaults', () => {
  test('returns 0.99 for zero cost', () => {
    assert.equal(calculatePrice(0, {}), 0.99);
  });

  test('returns 0.99 for negative cost', () => {
    assert.equal(calculatePrice(-5, {}), 0.99);
  });

  test('returns 0.99 for NaN cost', () => {
    assert.equal(calculatePrice('abc', {}), 0.99);
  });

  test('never returns below 0.99', () => {
    const price = calculatePrice(0.01, {});
    assert.ok(price >= 0.99, `price ${price} below minimum`);
  });

  test('null settings uses DEFAULTS', () => {
    const p1 = calculatePrice(20, DEFAULTS);
    const p2 = calculatePrice(20, null);
    assert.equal(p1, p2);
  });
});

describe('calculatePrice — formula verification', () => {
  test('$20 with full defaults → 31.86', () => {
    // taxAmount = 20 * 0.09 = 1.80
    // baseCost  = 20 + 1.80 + 0.20 + 0.30 = 22.30
    // totalPct  = (20 + 10 + 0) / 100 = 0.30
    // price     = 22.30 / 0.70 = 31.857... → round2 = 31.86
    assert.equal(calculatePrice(20, DEFAULTS), 31.86);
  });

  test('$10 zero-fee returns 10.00', () => {
    const price = calculatePrice(10, {
      taxPercent: 0,
      trackingFee: 0,
      ebayFeePercent: 0,
      promoFeePercent: 0,
      desiredProfit: 0,
      paymentFixedFee: 0,
    });
    assert.equal(price, 10);
  });

  test('string cost coerced same as number', () => {
    assert.equal(calculatePrice('20', DEFAULTS), calculatePrice(20, DEFAULTS));
  });

  test('desired profit increases price', () => {
    const base = priceWithDefaults(20, { desiredProfit: 0 });
    const more = priceWithDefaults(20, { desiredProfit: 10 });
    assert.ok(more > base, `with profit ${more} should exceed ${base}`);
  });

  test('higher eBay fee → higher price', () => {
    const low = priceWithDefaults(20, { ebayFeePercent: 10 });
    const high = priceWithDefaults(20, { ebayFeePercent: 30 });
    assert.ok(high > low);
  });

  test('tracking fee increases price', () => {
    const no = priceWithDefaults(20, { trackingFee: 0 });
    const with_ = priceWithDefaults(20, { trackingFee: 1 });
    assert.ok(with_ > no);
  });
});

describe('calculatePrice — safety guard (fees ≥ 100%)', () => {
  test('fees = 100% → 1.5x baseCost fallback', () => {
    // baseCost = 20 (no tax/tracking/payment)
    // fallback = 20 * 1.5 = 30
    const price = calculatePrice(20, {
      taxPercent: 0,
      trackingFee: 0,
      paymentFixedFee: 0,
      ebayFeePercent: 50,
      promoFeePercent: 30,
      desiredProfit: 20,
    });
    assert.equal(price, 30);
  });

  test('fees > 100% still finite positive', () => {
    const price = calculatePrice(20, {
      taxPercent: 0,
      trackingFee: 0,
      paymentFixedFee: 0,
      ebayFeePercent: 60,
      promoFeePercent: 60,
      desiredProfit: 0,
    });
    assert.ok(price > 0 && isFinite(price));
  });
});

describe('calculatePrice — rounding & type', () => {
  test('rounds to 2 decimal places', () => {
    const price = calculatePrice(7.99, DEFAULTS);
    const decimals = (price.toString().split('.')[1] || '').length;
    assert.ok(decimals <= 2, `${price} has more than 2 decimals`);
  });

  test('result is number', () => {
    assert.equal(typeof calculatePrice(15, DEFAULTS), 'number');
  });
});
