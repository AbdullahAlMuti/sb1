// freshness.test.js — locks the stale-product upload guard.
// A product is fresh for a tab only when the tab URL still shows it.
// Run: node --test apps/extension/tests/freshness.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadFreshness() {
  const win = makeWindow();
  loadInto(win, 'sidepanel/freshness.js');
  return win.SSFreshness;
}

describe('SSFreshness.isFresh', () => {
  test('Amazon: ASIN in /dp/ URL is fresh', () => {
    const f = loadFreshness();
    assert.equal(
      f.isFresh({ sourceId: 'B0ABC12345' }, 'https://www.amazon.com/Widget/dp/B0ABC12345?ref=x'),
      true
    );
  });

  test('Amazon: different ASIN is stale', () => {
    const f = loadFreshness();
    assert.equal(
      f.isFresh({ sourceId: 'B0ABC12345' }, 'https://www.amazon.com/Other/dp/B0ZZZ99999'),
      false
    );
  });

  test('Walmart: item id in /ip/ URL is fresh', () => {
    const f = loadFreshness();
    assert.equal(
      f.isFresh({ sourceId: '5074859442' }, 'https://www.walmart.com/ip/Some-Product/5074859442'),
      true
    );
  });

  test('case-insensitive sourceId match', () => {
    const f = loadFreshness();
    assert.equal(
      f.isFresh({ sourceId: 'b0abc12345' }, 'https://www.amazon.com/dp/B0ABC12345'),
      true
    );
  });

  test('legacy asin field used when sourceId missing', () => {
    const f = loadFreshness();
    assert.equal(f.isFresh({ asin: 'B0ABC12345' }, 'https://www.amazon.com/dp/B0ABC12345'), true);
  });

  test('no sourceId: falls back to scannedUrl exact match (ignoring query/hash)', () => {
    const f = loadFreshness();
    const p = { scannedUrl: 'https://shop.example.com/product/widget?utm=1' };
    assert.equal(f.isFresh(p, 'https://shop.example.com/product/widget#reviews'), true);
    assert.equal(f.isFresh(p, 'https://shop.example.com/product/other'), false);
  });

  test('no identity at all is stale', () => {
    const f = loadFreshness();
    assert.equal(f.isFresh({ title: 'Widget' }, 'https://www.amazon.com/dp/B0ABC12345'), false);
  });

  test('null product / null url are stale', () => {
    const f = loadFreshness();
    assert.equal(f.isFresh(null, 'https://x.com'), false);
    assert.equal(f.isFresh({ sourceId: 'A' }, ''), false);
  });

  test('Amazon Variation: child ASIN in URL matches variants list', () => {
    const f = loadFreshness();
    const product = {
      sourceId: 'B0PARENT12',
      asin: 'B0PARENT12',
      variants: [{ supplierVariantId: 'B0CHILD001' }, { supplierVariantId: 'B0CHILD002' }],
    };
    // Tab URL shows child variant ASIN
    assert.equal(f.isFresh(product, 'https://www.amazon.com/dp/B0CHILD002'), true);
  });

  test('Walmart Variation: child item ID in URL matches variants list', () => {
    const f = loadFreshness();
    const product = {
      sourceId: '1000000000',
      variants: [{ supplierVariantId: '5074859442' }, { supplierVariantId: '5074859443' }],
    };
    // Tab URL shows child variant item ID
    assert.equal(f.isFresh(product, 'https://www.walmart.com/ip/Product/5074859442'), true);
  });
});
