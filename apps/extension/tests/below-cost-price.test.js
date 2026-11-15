// below-cost-price.test.js — the uploader must refuse a selling price that is
// below what the supplier charges. Equal-to-cost was already refused; a price
// lower than cost is a guaranteed loss and was getting through.
// Run: node --test apps/extension/tests/below-cost-price.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function load() {
  const win = makeWindow();
  loadInto(win, 'common/sku-engine.js');
  loadInto(win, 'common/ebay-listing-api.js');
  return win.SellerSuitUploader._validateProductPricing;
}

const variant = (name, extra) => ({
  attrs: { Color: { productName: name } }, price: 20, finalPrice: 30, priceVerified: true, ...extra,
});

describe('validateProductPricing — below-cost prices', () => {
  test('single product priced below supplier cost is refused', () => {
    const validate = load();
    assert.throws(() => validate({ price: 20, finalPrice: 15 }), /below the supplier price/i);
  });

  test('single product priced above supplier cost passes', () => {
    const validate = load();
    validate({ price: 20, finalPrice: 30 });
  });

  test('a manual price below cost is allowed (the seller chose it)', () => {
    const validate = load();
    validate({ price: 20, finalPrice: 15, price_source: 'manual' });
  });

  test('a variation priced below its supplier cost is refused and named', () => {
    const validate = load();
    assert.throws(() => validate({
      hasVariants: true, price: 20,
      variants: [variant('Red'), variant('Blue', { finalPrice: 12 })],
    }), /below the supplier price for variation 2/i);
  });

  test('variations priced above cost pass', () => {
    const validate = load();
    validate({ hasVariants: true, price: 20, variants: [variant('Red'), variant('Blue')] });
  });
});
