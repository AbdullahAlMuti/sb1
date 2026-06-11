// walmart-variant-scraper.test.js — locks the Walmart data-first variation
// parser (__NEXT_DATA__ → universal variant shape) and proves the output flows
// through the universal pipeline (adapter normalize → validate → adaptProduct)
// with ZERO Walmart logic in universal files.
// Run: node --test apps/extension/tests/walmart-variant-scraper.test.js

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadStack() {
  const win = makeWindow();
  loadInto(win, 'common/sku-engine.js');
  loadInto(win, 'common/ebay-listing-api.js');
  loadInto(win, 'suppliers/core/supplier-adapter.js');
  loadInto(win, 'suppliers/core/registry.js');
  loadInto(win, 'suppliers/walmart/adapter.js');
  loadInto(win, 'content_scripts/walmart-variant-scraper.js');
  return win;
}

// Fixture mirroring walmart.com __NEXT_DATA__ product JSON for a 2-dim
// variation product (sneaker: color × size), e.g. /ip/...-Sneaker/14952553464
const WALMART_PRODUCT_JSON = {
  usItemId: '14952553464',
  name: "No Boundaries Women's Retro Lace-Up Sneaker",
  brand: 'No Boundaries',
  shortDescription: 'Retro style sneaker.',
  availabilityStatus: 'IN_STOCK',
  priceInfo: { currentPrice: { price: 19.98, currencyUnit: 'USD' } },
  imageInfo: {
    thumbnailUrl: 'https://i5.walmartimages.com/main-thumb.jpeg',
    allImages: [
      { url: 'https://i5.walmartimages.com/main.jpeg' },
      { url: 'https://i5.walmartimages.com/side.jpeg' },
    ],
  },
  variantCriteria: [
    {
      id: 'actual_color',
      name: 'actual_color',
      variantList: [
        {
          id: 'actual_color-White',
          name: 'White',
          images: ['https://i5.walmartimages.com/white.jpeg'],
        },
        {
          id: 'actual_color-Black',
          name: 'Black',
          images: ['https://i5.walmartimages.com/black.jpeg'],
        },
      ],
    },
    {
      id: 'shoe_size',
      name: 'shoe_size',
      variantList: [
        { id: 'shoe_size-7', name: '7' },
        { id: 'shoe_size-8', name: '8' },
      ],
    },
  ],
  variantsMap: {
    v1: {
      usItemId: '14952553464',
      variants: ['actual_color-White', 'shoe_size-7'],
      availabilityStatus: 'IN_STOCK',
      priceInfo: { currentPrice: { price: 19.98, currencyUnit: 'USD' } },
      productImageUrl: 'https://i5.walmartimages.com/white-7.jpeg',
    },
    v2: {
      usItemId: '222222222',
      variants: ['actual_color-Black', 'shoe_size-7'],
      availabilityStatus: 'IN_STOCK',
      priceInfo: { currentPrice: { price: 21.5, currencyUnit: 'USD' } },
    },
    v3: {
      usItemId: '333333333',
      variants: ['actual_color-Black', 'shoe_size-8'],
      availabilityStatus: 'OUT_OF_STOCK',
    },
  },
};

describe('SsWalmartVariantScraper — pure parsing', () => {
  let I;
  beforeEach(() => {
    I = loadStack().SsWalmartVariantScraper._internals;
  });

  test('humanizeDimLabel strips prefixes and title-cases', () => {
    assert.equal(I.humanizeDimLabel('actual_color'), 'Color');
    assert.equal(I.humanizeDimLabel('shoe_size'), 'Shoe Size');
    assert.equal(I.humanizeDimLabel('clothing_size'), 'Size');
    assert.equal(I.humanizeDimLabel(''), 'Option');
  });

  test('parseProduct extracts parent fields', () => {
    const p = I.parseProduct(WALMART_PRODUCT_JSON);
    assert.equal(p.sourceId, '14952553464');
    assert.equal(p.title, "No Boundaries Women's Retro Lace-Up Sneaker");
    assert.equal(p.price, '19.98');
    assert.deepEqual(p.images, [
      'https://i5.walmartimages.com/main.jpeg',
      'https://i5.walmartimages.com/side.jpeg',
    ]);
    assert.equal(p.quantity, 1);
  });

  test('parseVariants builds universal attrs shape (Amazon-identical)', () => {
    const variants = I.parseVariants(WALMART_PRODUCT_JSON);
    assert.equal(variants.length, 3);
    const v1 = variants.find((v) => v.supplierVariantId === '14952553464');
    assert.deepEqual(v1.attrs, {
      Color: { productName: 'White' },
      'Shoe Size': { productName: '7' },
    });
    assert.equal(v1.price, '19.98');
    assert.equal(v1.img, 'https://i5.walmartimages.com/white-7.jpeg');
    assert.equal(v1.imgProp, 'Color');
  });

  test('variant without own price falls back to parent price', () => {
    const v3 = I.parseVariants(WALMART_PRODUCT_JSON).find(
      (v) => v.supplierVariantId === '333333333'
    );
    assert.equal(v3.price, '19.98');
  });

  test('OUT_OF_STOCK variant gets quantity 0', () => {
    const variants = I.parseVariants(WALMART_PRODUCT_JSON);
    assert.equal(variants.find((v) => v.supplierVariantId === '333333333').quantity, 0);
    assert.equal(variants.find((v) => v.supplierVariantId === '222222222').quantity, 1);
  });

  test('variant image falls back to criteria color image', () => {
    const v2 = I.parseVariants(WALMART_PRODUCT_JSON).find(
      (v) => v.supplierVariantId === '222222222'
    );
    assert.equal(v2.img, 'https://i5.walmartimages.com/black.jpeg');
  });

  test('buildProduct stamps supplier + hasVariants', () => {
    const p = I.buildProduct(WALMART_PRODUCT_JSON, 'https://www.walmart.com/ip/x/14952553464');
    assert.equal(p.supplier, 'walmart');
    assert.equal(p.hasVariants, true);
    assert.equal(p.variants.length, 3);
  });

  test('product without variant data yields empty variants, hasVariants false', () => {
    const bare = { usItemId: '1', name: 'Solo', priceInfo: { currentPrice: { price: 5 } } };
    const p = I.buildProduct(bare, 'https://www.walmart.com/ip/solo/1');
    assert.deepEqual(p.variants, []);
    assert.equal(p.hasVariants, false);
  });
});

describe('Walmart variation → universal pipeline (end-to-end, no DOM)', () => {
  let win;
  let product;
  beforeEach(() => {
    win = loadStack();
    const raw = win.SsWalmartVariantScraper._internals.buildProduct(
      WALMART_PRODUCT_JSON,
      'https://www.walmart.com/ip/No-Boundaries-Sneaker/14952553464'
    );
    product = win.SSWalmartAdapter.normalize(raw);
  });

  test('normalized product passes supplier contract validate', () => {
    const { valid, errors } = win.SSSupplierAdapter.validate(product);
    assert.equal(valid, true, errors.join(','));
    assert.equal(product.sourceId, '14952553464');
    assert.equal(product.supplier, 'walmart');
  });

  test('adaptProduct maps Walmart variations with zero Walmart logic', () => {
    const out = win.EbayListingApiHelper.adaptProduct(product);
    assert.equal(out.prod_id, '14952553464');
    assert.equal(out.supplier, 'walmart');
    assert.equal(out.prod_variations.length, 3);
    const v = out.prod_variations.find((x) => x.supplierVariantId === '222222222');
    assert.deepEqual(v.attrs, {
      Color: { productName: 'Black' },
      'Shoe Size': { productName: '7' },
    });
    assert.equal(v.raw_supplier_price, 21.5);
  });

  test('SKUs use WMS prefix via dynamic supplier prefix', () => {
    const out = win.EbayListingApiHelper.adaptProduct(product);
    for (const v of out.prod_variations) {
      assert.ok(v.sku.startsWith('WMS-14952553464'), v.sku);
    }
  });

  test('Amazon SKU prefix unchanged (back-compat)', () => {
    assert.equal(win.SSSkuEngine.prefixFor('amazon'), 'AZS');
    assert.equal(win.SSSkuEngine.prefixFor(undefined), 'AZS');
    assert.equal(win.SSSkuEngine.prefixFor('walmart'), 'WMS');
    assert.equal(win.SSSkuEngine.prefixFor('aliexpress'), 'ALI');
  });
});
