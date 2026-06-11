// supplier-registry.test.js — locks the supplier plugin seam: base contract,
// registry routing, and Amazon adapter normalize. This is the foundation for
// 50+ suppliers — every future supplier registers through this path.
// Run: node --test apps/extension/tests/supplier-registry.test.js

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadSupplierStack() {
  const win = makeWindow();
  loadInto(win, 'suppliers/core/supplier-adapter.js');
  loadInto(win, 'suppliers/core/registry.js');
  loadInto(win, 'suppliers/amazon/adapter.js');
  return win;
}

describe('SSSupplierAdapter — validate', () => {
  test('passes a complete normalized product', () => {
    const win = loadSupplierStack();
    const { valid, errors } = win.SSSupplierAdapter.validate({
      sourceId: 'B08XYZ',
      supplier: 'amazon',
      title: 'Widget',
      images: [],
      variants: [],
    });
    assert.equal(valid, true, errors.join(','));
  });

  test('flags missing required fields', () => {
    const win = loadSupplierStack();
    const { valid, errors } = win.SSSupplierAdapter.validate({ images: [], variants: [] });
    assert.equal(valid, false);
    assert.ok(errors.includes('missing sourceId'));
    assert.ok(errors.includes('missing supplier'));
    assert.ok(errors.includes('missing title'));
  });

  test('flags non-array images/variants', () => {
    const win = loadSupplierStack();
    const { errors } = win.SSSupplierAdapter.validate({
      sourceId: 'x',
      supplier: 'amazon',
      title: 't',
      images: 'no',
      variants: 'no',
    });
    assert.ok(errors.includes('images must be an array'));
    assert.ok(errors.includes('variants must be an array'));
  });
});

describe('SSSupplierAdapter — assertContract', () => {
  test('accepts a valid adapter', () => {
    const win = loadSupplierStack();
    assert.equal(win.SSSupplierAdapter.assertContract(win.SSAmazonAdapter), true);
  });

  test('rejects adapter missing supplierId', () => {
    const win = loadSupplierStack();
    assert.throws(
      () => win.SSSupplierAdapter.assertContract({ matchUrl: () => true, normalize: () => ({}) }),
      /supplierId/
    );
  });

  test('rejects adapter missing matchUrl', () => {
    const win = loadSupplierStack();
    assert.throws(
      () => win.SSSupplierAdapter.assertContract({ supplierId: 'x', normalize: () => ({}) }),
      /matchUrl/
    );
  });
});

describe('SSSupplierRegistry — routing', () => {
  let win;
  beforeEach(() => {
    win = loadSupplierStack();
    win.SSSupplierRegistry._reset();
  });

  test('register then match by URL', () => {
    win.SSSupplierRegistry.register(win.SSAmazonAdapter);
    const a = win.SSSupplierRegistry.match('https://www.amazon.com/dp/B08XYZ');
    assert.equal(a?.supplierId, 'amazon');
  });

  test('no match for unregistered host', () => {
    win.SSSupplierRegistry.register(win.SSAmazonAdapter);
    assert.equal(win.SSSupplierRegistry.match('https://www.ebay.com/itm/123'), null);
  });

  test('get by supplierId', () => {
    win.SSSupplierRegistry.register(win.SSAmazonAdapter);
    assert.equal(win.SSSupplierRegistry.get('amazon')?.supplierId, 'amazon');
    assert.equal(win.SSSupplierRegistry.get('temu'), null);
  });

  test('re-register same supplierId is idempotent (no dup)', () => {
    win.SSSupplierRegistry.register(win.SSAmazonAdapter);
    win.SSSupplierRegistry.register(win.SSAmazonAdapter);
    assert.deepEqual(win.SSSupplierRegistry.list(), ['amazon']);
  });

  test('register broken adapter throws at registration', () => {
    assert.throws(() => win.SSSupplierRegistry.register({ supplierId: 'bad' }), /matchUrl/);
  });
});

describe('SSSupplierRegistry — getMeta (UI display)', () => {
  let win;
  beforeEach(() => {
    win = loadSupplierStack();
    loadInto(win, 'suppliers/walmart/adapter.js');
  });

  test('amazon → Amazon / ASIN', () => {
    assert.deepEqual(win.SSSupplierRegistry.getMeta('amazon'), {
      displayName: 'Amazon',
      idLabel: 'ASIN',
    });
  });

  test('walmart → Walmart / Item ID', () => {
    assert.deepEqual(win.SSSupplierRegistry.getMeta('walmart'), {
      displayName: 'Walmart',
      idLabel: 'Item ID',
    });
  });

  test('unknown supplier → capitalized name + generic ID label', () => {
    assert.deepEqual(win.SSSupplierRegistry.getMeta('aliexpress'), {
      displayName: 'Aliexpress',
      idLabel: 'ID',
    });
  });

  test('missing supplier → safe fallback, never throws', () => {
    assert.deepEqual(win.SSSupplierRegistry.getMeta(''), {
      displayName: 'Supplier',
      idLabel: 'ID',
    });
    assert.deepEqual(win.SSSupplierRegistry.getMeta(undefined), {
      displayName: 'Supplier',
      idLabel: 'ID',
    });
  });
});

describe('SSAmazonAdapter — matchUrl', () => {
  let win;
  beforeEach(() => {
    win = loadSupplierStack();
  });

  test('matches amazon.com and regional domains', () => {
    const a = win.SSAmazonAdapter;
    assert.equal(a.matchUrl('https://www.amazon.com/dp/B0'), true);
    assert.equal(a.matchUrl('https://amazon.co.uk/dp/B0'), true);
    assert.equal(a.matchUrl('https://www.amazon.de/dp/B0'), true);
    assert.equal(a.matchUrl('https://smile.amazon.ca/dp/B0'), true);
  });

  test('rejects non-amazon and lookalike hosts', () => {
    const a = win.SSAmazonAdapter;
    assert.equal(a.matchUrl('https://www.walmart.com/ip/1'), false);
    assert.equal(a.matchUrl('https://notamazon.com/dp/B0'), false);
    assert.equal(a.matchUrl('https://amazon.com.evil.net/dp/B0'), false);
    assert.equal(a.matchUrl('garbage'), false);
  });
});

describe('SSAmazonAdapter — normalize (pure)', () => {
  let win;
  beforeEach(() => {
    win = loadSupplierStack();
  });

  test('stamps sourceId from parentAsin', () => {
    const n = win.SSAmazonAdapter.normalize({
      asin: 'B08CHILD',
      parentAsin: 'B08PARENT',
      title: 'T',
    });
    assert.equal(n.sourceId, 'B08PARENT');
  });

  test('sourceId falls back to asin when no parent', () => {
    const n = win.SSAmazonAdapter.normalize({ asin: 'B08SOLO', title: 'T' });
    assert.equal(n.sourceId, 'B08SOLO');
  });

  test('supplier derived from marketplace', () => {
    const n = win.SSAmazonAdapter.normalize({ asin: 'X', marketplace: 'amazon' });
    assert.equal(n.supplier, 'amazon');
  });

  test('passes through title/price/images/variants unchanged', () => {
    const raw = {
      asin: 'X',
      title: 'Widget',
      price: 9.99,
      images: ['a.jpg'],
      variants: [{ id: 1 }],
    };
    const n = win.SSAmazonAdapter.normalize(raw);
    assert.equal(n.title, 'Widget');
    assert.equal(n.price, 9.99);
    assert.deepEqual(n.images, ['a.jpg']);
    assert.deepEqual(n.variants, [{ id: 1 }]);
  });

  test('preserves asin/parentAsin for DB sync back-compat', () => {
    const n = win.SSAmazonAdapter.normalize({ asin: 'B08CHILD', parentAsin: 'B08PARENT' });
    assert.equal(n.asin, 'B08CHILD');
    assert.equal(n.parentAsin, 'B08PARENT');
  });

  test('normalized output passes validate when title present', () => {
    const n = win.SSAmazonAdapter.normalize({ asin: 'X', title: 'T', images: [], variants: [] });
    assert.equal(win.SSSupplierAdapter.validate(n).valid, true);
  });
});
