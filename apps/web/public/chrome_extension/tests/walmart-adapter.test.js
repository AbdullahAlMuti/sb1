// walmart-adapter.test.js — locks the Walmart supplier adapter: URL matching,
// normalize purity (sourceId from /ip/ URL), contract compliance, and registry
// coexistence with Amazon. Mirrors supplier-registry.test.js for Amazon.
// Run: node --test apps/extension/tests/walmart-adapter.test.js

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadSupplierStack() {
  const win = makeWindow();
  loadInto(win, 'suppliers/core/supplier-adapter.js');
  loadInto(win, 'suppliers/core/registry.js');
  loadInto(win, 'suppliers/amazon/adapter.js');
  loadInto(win, 'suppliers/walmart/adapter.js');
  return win;
}

describe('SSWalmartAdapter — matchUrl', () => {
  let win;
  beforeEach(() => {
    win = loadSupplierStack();
  });

  test('matches walmart.com and walmart.ca', () => {
    const a = win.SSWalmartAdapter;
    assert.equal(a.matchUrl('https://www.walmart.com/ip/widget/123456'), true);
    assert.equal(a.matchUrl('https://www.walmart.ca/ip/widget/789'), true);
  });

  test('rejects non-walmart and lookalike hosts', () => {
    const a = win.SSWalmartAdapter;
    assert.equal(a.matchUrl('https://www.amazon.com/dp/B0'), false);
    assert.equal(a.matchUrl('https://notwalmart.com/ip/1'), false);
    assert.equal(a.matchUrl('https://walmart.com.evil.net/ip/1'), false);
    assert.equal(a.matchUrl('https://www.walmartimages.com/x.jpg'), false);
    assert.equal(a.matchUrl('garbage'), false);
  });
});

describe('SSWalmartAdapter — normalize (pure)', () => {
  let win;
  beforeEach(() => {
    win = loadSupplierStack();
  });

  test('derives sourceId from /ip/slug/id URL', () => {
    const n = win.SSWalmartAdapter.normalize({
      title: 'T',
      url: 'https://www.walmart.com/ip/cool-widget/123456789',
    });
    assert.equal(n.sourceId, '123456789');
  });

  test('derives sourceId from /ip/id URL without slug', () => {
    const n = win.SSWalmartAdapter.normalize({
      title: 'T',
      url: 'https://www.walmart.com/ip/987654321',
    });
    assert.equal(n.sourceId, '987654321');
  });

  test('explicit itemId wins over URL', () => {
    const n = win.SSWalmartAdapter.normalize({
      title: 'T',
      itemId: 'ITEM42',
      url: 'https://www.walmart.com/ip/x/111',
    });
    assert.equal(n.sourceId, 'ITEM42');
  });

  test('stamps supplier walmart', () => {
    const n = win.SSWalmartAdapter.normalize({ title: 'T', url: 'https://www.walmart.com/ip/1' });
    assert.equal(n.supplier, 'walmart');
  });

  test('passes through title/price/images unchanged', () => {
    const raw = {
      title: 'Widget',
      price: '19.99',
      images: ['a.jpg'],
      url: 'https://www.walmart.com/ip/widget/5',
    };
    const n = win.SSWalmartAdapter.normalize(raw);
    assert.equal(n.title, 'Widget');
    assert.equal(n.price, '19.99');
    assert.deepEqual(n.images, ['a.jpg']);
  });

  test('defaults images/variants to arrays for contract compliance', () => {
    const n = win.SSWalmartAdapter.normalize({
      title: 'T',
      url: 'https://www.walmart.com/ip/x/1',
    });
    assert.deepEqual(n.images, []);
    assert.deepEqual(n.variants, []);
    assert.equal(win.SSSupplierAdapter.validate(n).valid, true);
  });
});

describe('SSSupplierRegistry — Amazon + Walmart coexist', () => {
  let win;
  beforeEach(() => {
    win = loadSupplierStack();
    win.SSSupplierRegistry._reset();
    win.SSSupplierRegistry.register(win.SSAmazonAdapter);
    win.SSSupplierRegistry.register(win.SSWalmartAdapter);
  });

  test('routes each URL to its own adapter', () => {
    assert.equal(
      win.SSSupplierRegistry.match('https://www.amazon.com/dp/B08XYZ')?.supplierId,
      'amazon'
    );
    assert.equal(
      win.SSSupplierRegistry.match('https://www.walmart.com/ip/widget/1')?.supplierId,
      'walmart'
    );
    assert.equal(win.SSSupplierRegistry.match('https://www.temu.com/x.html'), null);
  });

  test('walmart adapter satisfies the base contract', () => {
    assert.equal(win.SSSupplierAdapter.assertContract(win.SSWalmartAdapter), true);
  });

  test('list contains both suppliers', () => {
    assert.deepEqual(win.SSSupplierRegistry.list().sort(), ['amazon', 'walmart']);
  });
});
