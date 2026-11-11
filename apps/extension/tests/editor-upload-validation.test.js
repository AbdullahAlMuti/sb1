// editor-upload-validation.test.js — the full editor must stop an upload that
// has no eBay price (and say which field/rows) instead of opening eBay and
// failing there with "eBay Final Price is missing".
// Run: node --test apps/extension/tests/editor-upload-validation.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function validator() {
  const win = makeWindow();
  win.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  loadInto(win, 'common/panel-extended.js');
  return win.ssxValidateUpload;
}

const OK_SINGLE = { title: 'Steel Bottle', sku: 'AMZ-1', isSingle: true, finalPrice: 31.99, supplierPrice: 20, priceSource: 'calculated' };

describe('ssxValidateUpload', () => {
  test('a complete single listing passes', () => {
    assert.deepEqual(validator()(OK_SINGLE), { ok: true, errors: [] });
  });

  test('missing eBay price is reported on the price field, with the reason when known', () => {
    const v = validator();
    const r = v({ ...OK_SINGLE, finalPrice: 0, pricingMessage: 'No eBay price — pricing rules could not be loaded (HTTP 500)' });
    assert.equal(r.ok, false);
    assert.equal(r.errors[0].field, 'price');
    assert.match(r.errors[0].message, /HTTP 500/);
    assert.match(v({ ...OK_SINGLE, finalPrice: 0 }).errors[0].message, /Enter an eBay price/i);
  });

  test('a price at or below supplier cost is refused unless typed by the seller', () => {
    const v = validator();
    assert.equal(v({ ...OK_SINGLE, finalPrice: 20 }).errors[0].field, 'price');
    assert.equal(v({ ...OK_SINGLE, finalPrice: 15 }).errors[0].field, 'price');
    assert.equal(v({ ...OK_SINGLE, finalPrice: 20, priceSource: 'manual' }).ok, true);
  });

  test('missing title and SKU are reported together', () => {
    const r = validator()({ ...OK_SINGLE, title: ' ', sku: '' });
    assert.deepEqual(r.errors.map(e => e.field), ['title', 'sku']);
  });

  test('variations: every sellable row without a price is listed by index', () => {
    const variants = [
      { ebayPrice: 30, price: 20 },
      { price: 20 },                                  // no price → index 1
      { ebayPrice: 0, finalPrice: 0, price: 20 },     // no price → index 2
      { price: 20, inStock: false },                  // not sold → ignored
      { price: null, priceVerified: false },          // left out → ignored
      { price: 20, isDeleted: true },                 // ignored
    ];
    const r = validator()({ title: 'T', sku: 'S', isSingle: false, variants });
    assert.equal(r.ok, false);
    assert.equal(r.errors[0].field, 'variants');
    assert.deepEqual(r.errors[0].rows, [1, 2]);
    assert.match(r.errors[0].message, /2 variations/);
  });

  test('variations: nothing sellable is its own error', () => {
    const r = validator()({ title: 'T', sku: 'S', isSingle: false, variants: [{ price: 20, inStock: false }] });
    assert.match(r.errors[0].message, /no variation/i);
  });
});
