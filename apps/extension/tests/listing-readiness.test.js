// listing-readiness.test.js — pre-upload checklist shown in the side panel.
// Run: node --test apps/extension/tests/listing-readiness.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function check(product) {
  const win = makeWindow();
  loadInto(win, 'common/listing-readiness.js');
  return win.SSListingReadiness.check(product);
}
const item = (r, key) => r.items.find(i => i.key === key);
const IMGS = ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg'];
const SINGLE = { title: 'Steel Water Bottle 24oz', images: IMGS, price: 20, finalPrice: 31.99, currency: 'USD', shippingCost: 0 };

describe('SSListingReadiness.check', () => {
  test('a complete single product is ready', () => {
    const r = check(SINGLE);
    assert.equal(r.ready, true);
    assert.equal(item(r, 'price').level, 'ok');
  });

  test('no product / no title / no images block', () => {
    assert.equal(check(null).ready, false);
    assert.equal(item(check({ ...SINGLE, title: ' ' }), 'title').level, 'block');
    assert.equal(item(check({ ...SINGLE, images: [] }), 'images').level, 'block');
    assert.equal(item(check({ ...SINGLE, images: ['data:image/png;base64,xx'] }), 'images').level, 'block');
  });

  test('a long title warns (it is shortened) but does not block', () => {
    const r = check({ ...SINGLE, title: 'x'.repeat(120) });
    assert.equal(item(r, 'title').level, 'warn');
    assert.equal(r.ready, true);
  });

  test('missing supplier price, missing eBay price, or no markup block', () => {
    assert.match(item(check({ ...SINGLE, price: 0 }), 'price').message, /Supplier price/);
    assert.match(item(check({ ...SINGLE, finalPrice: 0 }), 'price').message, /Supplier Pricing/);
    assert.equal(item(check({ ...SINGLE, finalPrice: 20 }), 'price').level, 'block');
    assert.equal(check({ ...SINGLE, finalPrice: 20, price_source: 'manual' }).ready, true);
  });

  test('non-USD blocks', () => {
    const r = check({ ...SINGLE, currency: 'CAD' });
    assert.equal(item(r, 'currency').level, 'block');
    assert.equal(r.ready, false);
  });

  test('unverified variations are reported with exact counts and left out, not blocking', () => {
    const v = (name, extra) => ({ attrs: { Color: { productName: name } }, price: 20, finalPrice: 30, priceVerified: true, ...extra });
    const r = check({
      ...SINGLE, hasVariants: true,
      variants: [v('Red'), v('Blue'), v('Green', { price: null, finalPrice: undefined, priceVerified: false })],
    });
    assert.equal(r.ready, true);
    assert.equal(item(r, 'variants').level, 'warn');
    assert.match(item(r, 'variants').message, /2 of 3 variations will be listed — 1 had no readable price/);
  });

  test('no sellable variation blocks; an unpriced sellable variation blocks', () => {
    const v = (name, extra) => ({ attrs: { Color: { productName: name } }, price: 20, finalPrice: 30, priceVerified: true, ...extra });
    const none = check({ ...SINGLE, hasVariants: true, variants: [v('Red', { inStock: false }), v('Blue', { priceVerified: false })] });
    assert.equal(item(none, 'variants').level, 'block');
    const unpriced = check({ ...SINGLE, hasVariants: true, variants: [v('Red'), v('Blue', { finalPrice: 0 })] });
    assert.equal(item(unpriced, 'price').level, 'block');
  });

  test('unknown shipping cost is surfaced as a warning', () => {
    const r = check({ ...SINGLE, shippingCost: null });
    assert.equal(item(r, 'shipping').level, 'warn');
    assert.equal(r.ready, true);
    assert.match(item(check({ ...SINGLE, shippingCost: 6.99 }), 'shipping').message, /6\.99/);
  });
});
