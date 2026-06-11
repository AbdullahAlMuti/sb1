// variation-normalizer.test.js — locks variation normalizer, deduplication, deleted filtering, and adaptProduct validation.
// Run: node --test apps/extension/tests/variation-normalizer.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadNormalizerStack() {
  const win = makeWindow();
  loadInto(win, 'common/sku-engine.js');
  loadInto(win, 'common/variation-normalizer.js');
  loadInto(win, 'common/ebay-listing-api.js');
  return win;
}

describe('SSVariationNormalizer — deduplication', () => {
  test('deduplicates variants with identical combinationKey, keeping highest scored', () => {
    const win = loadNormalizerStack();
    const product = {
      sourceId: 'B08PARENT',
      supplier: 'amazon',
      variants: [
        {
          attrs: { Color: 'Red', Size: 'M' },
          price: 10,
          quantity: 1,
          asin: 'ASIN1',
        },
        {
          attrs: { Color: 'Red', Size: 'M' },
          price: 12,
          quantity: 0,
          asin: 'ASIN2',
        }
      ]
    };
    const normalized = win.SSVariationNormalizer.normalizeProduct(product);
    // Should deduplicate to 1 variant
    assert.equal(normalized.variants.length, 1);
    // Should keep the one with higher score (ASIN1 has quantity 1 > 0)
    assert.equal(normalized.variants[0].asinOrSupplierId, 'ASIN1');
  });
});

describe('SSVariationNormalizer — deleted variation', () => {
  test('filters out variants marked isDeleted or deleted', () => {
    const win = loadNormalizerStack();
    const product = {
      sourceId: 'B08PARENT',
      supplier: 'amazon',
      variants: [
        {
          attrs: { Color: 'Red' },
          price: 10,
          isDeleted: true,
        },
        {
          attrs: { Color: 'Blue' },
          price: 12,
          deleted: true,
        },
        {
          attrs: { Color: 'Green' },
          price: 15,
        }
      ]
    };
    const normalized = win.SSVariationNormalizer.normalizeProduct(product);
    assert.equal(normalized.variants.length, 1);
    assert.equal(normalized.variants[0].optionValues.Color, 'Green');
  });
});

describe('SSVariationNormalizer — missing dimensions', () => {
  test('filters out invalid variants without options/attributes', () => {
    const win = loadNormalizerStack();
    const product = {
      sourceId: 'B08PARENT',
      supplier: 'amazon',
      variants: [
        {
          attrs: {},
          price: 10,
        },
        {
          attrs: { Color: 'Red' },
          price: 12,
        }
      ]
    };
    const normalized = win.SSVariationNormalizer.normalizeProduct(product, { dropInvalid: true });
    assert.equal(normalized.variants.length, 1);
    assert.equal(normalized.variants[0].optionValues.Color, 'Red');
  });
});

describe('SSVariationNormalizer — edited SKU and price', () => {
  test('respects edited finalPrice and finalSku', () => {
    const win = loadNormalizerStack();
    const product = {
      sourceId: 'B08PARENT',
      supplier: 'amazon',
      variants: [
        {
          attrs: { Color: 'Red' },
          price: 10,
          finalPrice: 19.99,
          finalSku: 'CUSTOM-SKU-1',
        }
      ]
    };
    const normalized = win.SSVariationNormalizer.normalizeProduct(product);
    assert.equal(normalized.variants[0].finalPrice, 19.99);
    assert.equal(normalized.variants[0].finalSku, 'CUSTOM-SKU-1');
  });
});

describe('EbayListingApiHelper.adaptProduct — duplicate combo validation', () => {
  test('fails fast (throws error) on duplicate combinationKeys', () => {
    const win = loadNormalizerStack();
    const product = {
      sourceId: 'B08PARENT',
      supplier: 'amazon',
      hasVariants: true,
      variants: [
        {
          attrs: { Color: { productName: 'Red' } },
          price: 10,
        },
        {
          attrs: { Color: { productName: 'Red' } },
          price: 12,
        }
      ]
    };
    assert.throws(() => {
      win.EbayListingApiHelper.adaptProduct(product);
    }, /Duplicate variation combination detected/);
  });

  test('filters out isDeleted variants and maps remaining', () => {
    const win = loadNormalizerStack();
    const product = {
      sourceId: 'B08PARENT',
      supplier: 'amazon',
      hasVariants: true,
      variants: [
        {
          attrs: { Color: { productName: 'Red' } },
          price: 10,
          isDeleted: true,
        },
        {
          attrs: { Color: { productName: 'Blue' } },
          price: 12,
        }
      ]
    };
    const adapted = win.EbayListingApiHelper.adaptProduct(product);
    assert.equal(adapted.prod_variations.length, 1);
    assert.equal(adapted.prod_variations[0].price, 12);
  });
});

describe('SSVariationNormalizer — imgProp normalization', () => {
  test('normalizes imgProp to canonical aspect name', () => {
    const win = loadNormalizerStack();
    const product = {
      sourceId: 'B08PARENT',
      supplier: 'amazon',
      variants: [
        {
          attrs: { color_name: 'Red' },
          price: 10,
          imgProp: 'color_name',
          img: 'https://images.com/red.jpg'
        },
        {
          attrs: { color_name: 'Blue' },
          price: 12,
          imgProp: 'color_name',
          img: 'https://images.com/blue.jpg'
        }
      ]
    };
    const normalized = win.SSVariationNormalizer.normalizeProduct(product);
    assert.equal(normalized.variants[0].imgProp, 'Color');
    assert.equal(normalized.variants[1].imgProp, 'Color');
    
    // Test that adaptProduct also has normalized imgProp
    const adapted = win.EbayListingApiHelper.adaptProduct(normalized);
    assert.equal(adapted.prod_variations[0].imgProp, 'Color');
    assert.equal(adapted.prod_variations[1].imgProp, 'Color');
  });
});
