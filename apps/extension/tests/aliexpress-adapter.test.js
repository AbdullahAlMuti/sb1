import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadSupplierStack() {
  const win = makeWindow();
  loadInto(win, 'suppliers/core/supplier-adapter.js');
  loadInto(win, 'suppliers/core/registry.js');
  loadInto(win, 'suppliers/aliexpress/domains.generated.js');
  loadInto(win, 'suppliers/aliexpress/adapter.js');
  return win;
}

describe('SSAliExpressAdapter - matchUrl', () => {
  let win;
  beforeEach(() => {
    win = loadSupplierStack();
  });

  test('matches generated AliExpress product domains', () => {
    const adapter = win.SSAliExpressAdapter;
    assert.equal(adapter.matchUrl('https://www.aliexpress.com/item/1005001.html'), true);
    assert.equal(adapter.matchUrl('https://www.aliexpress.com/item/1005004'), true);
    assert.equal(adapter.matchUrl('https://m.aliexpress.us/item/1005002.html'), true);
    assert.equal(adapter.matchUrl('https://sale.aliexpress.ru/item/1005003.html'), true);
  });

  test('rejects non-product pages and lookalikes', () => {
    const adapter = win.SSAliExpressAdapter;
    assert.equal(adapter.matchUrl('https://www.aliexpress.com/category/1.html'), false);
    assert.equal(adapter.matchUrl('https://notaliexpress.com/item/1005001.html'), false);
    assert.equal(adapter.matchUrl('https://aliexpress.com.evil.net/item/1005001.html'), false);
    assert.equal(adapter.matchUrl('garbage'), false);
  });
});

describe('SSAliExpressAdapter - normalize', () => {
  let win;
  beforeEach(() => {
    win = loadSupplierStack();
  });

  test('derives sourceId from product URL', () => {
    const n = win.SSAliExpressAdapter.normalize({
      title: 'Widget',
      url: 'https://www.aliexpress.com/item/100500777.html',
    });
    assert.equal(n.sourceId, '100500777');
    assert.equal(n.productId, '100500777');
  });

  test('stamps supplier and defaults arrays', () => {
    const n = win.SSAliExpressAdapter.normalize({
      productId: '100500888',
      title: 'Widget',
    });
    assert.equal(n.supplier, 'aliexpress');
    assert.deepEqual(n.images, []);
    assert.deepEqual(n.variants, []);
    assert.equal(win.SSSupplierAdapter.validate(n).valid, true);
  });

  test('passes through price images variants and metadata', () => {
    const raw = {
      productId: '100500999',
      title: 'Widget',
      price: 9.99,
      currency: 'USD',
      images: ['a.jpg'],
      variants: [{ supplierVariantId: 'v1', optionValues: { Color: 'Red' } }],
      seller: { name: 'Store' },
    };
    const n = win.SSAliExpressAdapter.normalize(raw);
    assert.equal(n.price, 9.99);
    assert.equal(n.currency, 'USD');
    assert.deepEqual(n.images, ['a.jpg']);
    assert.deepEqual(n.variants, raw.variants);
    assert.deepEqual(n.seller, { name: 'Store' });
  });
});

describe('SSSupplierRegistry - AliExpress coexistence', () => {
  test('registers AliExpress without replacing existing suppliers', () => {
    const win = makeWindow();
    loadInto(win, 'suppliers/core/supplier-adapter.js');
    loadInto(win, 'suppliers/core/registry.js');
    loadInto(win, 'suppliers/amazon/adapter.js');
    loadInto(win, 'suppliers/walmart/adapter.js');
    loadInto(win, 'suppliers/aliexpress/domains.generated.js');
    loadInto(win, 'suppliers/aliexpress/adapter.js');
    assert.deepEqual(win.SSSupplierRegistry.list().sort(), ['aliexpress', 'amazon', 'walmart']);
    assert.equal(
      win.SSSupplierRegistry.match('https://www.aliexpress.com/item/1005001.html')?.supplierId,
      'aliexpress'
    );
  });
});
