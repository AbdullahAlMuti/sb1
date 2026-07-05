// pricing-engine.test.js — locks calculatePrice behavior before any refactor
// Run: node --test apps/extension/tests/pricing-engine.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { makeWindow, loadInto } from './helpers/load-global.js';

function loadEngine() {
  const win = makeWindow();
  loadInto(win, 'common/pricing-engine.js');
  return win.SSPricingEngine;
}

const { calculatePrice, DEFAULTS, applyPricingToProduct } = loadEngine();

function priceWithDefaults(cost, overrides) {
  return calculatePrice(cost, Object.assign({}, DEFAULTS, overrides));
}

describe('calculatePrice — defaults', () => {
  test('returns 78.57 (cost 50 default) for zero cost', () => {
    assert.equal(calculatePrice(0, {}), 78.57);
  });

  test('returns 78.57 (cost 50 default) for negative cost', () => {
    assert.equal(calculatePrice(-5, {}), 78.57);
  });

  test('returns 78.57 (cost 50 default) for NaN cost', () => {
    assert.equal(calculatePrice('abc', {}), 78.57);
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

describe('applyPricingToProduct', () => {
  test('recalculates product and variant prices using calculator values', () => {
    const product = {
      price: 20,
      variants: [
        { price: 15 },
        { price: 25 }
      ]
    };
    const settings = {
      'tax-percent': 0,
      'tracking-fee': 0,
      'ebay-fee-percent': 0,
      'promo-fee-percent': 0,
      'desired-profit': 0,
      'payment-fixed-fee': 0
    };
    
    const updated = applyPricingToProduct(product, settings);
    assert.equal(updated.finalPrice, 20);
    assert.equal(updated.ebayPrice, 20);
    assert.equal(updated.variants[0].finalPrice, 15);
    assert.equal(updated.variants[0].ebayPrice, 15);
    assert.equal(updated.variants[1].finalPrice, 25);
    assert.equal(updated.variants[1].ebayPrice, 25);
  });

  test('respects manual overrides on product and variants', () => {
    const product = {
      price: 20,
      finalPrice: 99.99,
      price_source: 'manual',
      variants: [
        { price: 15, finalPrice: 12.34, ebayPrice: 45.99 }
      ]
    };
    const settings = {
      'tax-percent': 0,
      'tracking-fee': 0,
      'ebay-fee-percent': 0,
      'promo-fee-percent': 0,
      'desired-profit': 0,
      'payment-fixed-fee': 0
    };
    
    const updated = applyPricingToProduct(product, settings);
    assert.equal(updated.finalPrice, 99.99);
    assert.equal(updated.variants[0].ebayPrice, 45.99);
    // v.finalPrice is preserved because ebayPrice is set
    assert.equal(updated.variants[0].finalPrice, 12.34);
  });
});

