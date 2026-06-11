// adapt-product.test.js — locks EbayListingApiHelper.adaptProduct output: the
// universal product → eBay payload mapper. This is where supplier-neutrality is
// proven. Run: node --test apps/extension/tests/adapt-product.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

// adaptProduct needs window.SSSkuEngine. No chrome at call time.
function loadAdapt() {
  const win = makeWindow();
  loadInto(win, 'common/sku-engine.js');
  loadInto(win, 'common/ebay-listing-api.js');
  return win.EbayListingApiHelper.adaptProduct;
}

const AMAZON_SINGLE = {
  isSingleMode: true,
  asin: 'B08XYZ',
  parentAsin: 'B08XYZ',
  title: 'Acme Widget Pro',
  images: ['https://img/a.jpg', 'https://img/b.jpg'],
  price: 19.99,
  finalPrice: 31.86,
  bulletPoints: ['Durable', 'Lightweight'],
  specs: { Brand: 'Acme' },
  hasVariants: false,
  variants: [],
};

const AMAZON_VARIATION = {
  parentAsin: 'B08PARENT',
  title: 'Acme Shirt',
  images: ['https://img/main.jpg'],
  price: 12.0,
  hasVariants: true,
  variants: [
    {
      attrs: { Color: { productName: 'Red' }, Size: { productName: 'L' } },
      price: 12,
      finalPrice: 20,
      img: 'https://img/red.jpg',
      imgProp: 'Color',
      supplierVariantId: 'ASIN-RED',
    },
    {
      attrs: { Color: { productName: 'Blue' }, Size: { productName: 'M' } },
      price: 13,
      finalPrice: 21,
      img: 'https://img/blue.jpg',
      imgProp: 'Color',
      supplierVariantId: 'ASIN-BLUE',
    },
  ],
};

// A non-Amazon product using sourceId/supplier — proves supplier-neutrality.
const ALIEXPRESS_SINGLE = {
  isSingleMode: true,
  sourceId: 'ALI-99887',
  supplier: 'aliexpress',
  title: 'Generic LED Strip',
  images: ['https://img/led.jpg'],
  price: 4.5,
  finalPrice: 11.2,
  hasVariants: false,
  variants: [],
};

describe('adaptProduct — single item', () => {
  test('prod_id uses sourceId (Amazon: parentAsin fallback)', () => {
    const out = loadAdapt()(AMAZON_SINGLE);
    assert.equal(out.prod_id, 'B08XYZ');
  });

  test('supplier defaults to amazon when not set', () => {
    const out = loadAdapt()(AMAZON_SINGLE);
    assert.equal(out.supplier, 'amazon');
  });

  test('title enforced to eBay 80-char limit', () => {
    const out = loadAdapt()(AMAZON_SINGLE);
    assert.ok(out.prod_title.length <= 80);
    assert.equal(out.prod_title, 'Acme Widget Pro');
  });

  test('images sliced to max 12, order preserved', () => {
    const out = loadAdapt()(AMAZON_SINGLE);
    assert.deepEqual(out.prod_images, ['https://img/a.jpg', 'https://img/b.jpg']);
  });

  test('single variation uses finalPrice', () => {
    const out = loadAdapt()(AMAZON_SINGLE);
    assert.equal(out.prod_variations.length, 1);
    assert.equal(out.prod_variations[0].price, 31.86);
  });

  test('qty always 1 (dropshipping, never supplier stock)', () => {
    const out = loadAdapt()(AMAZON_SINGLE);
    assert.equal(out.prod_qty, 1);
  });

  test('SKU generated from sourceId via SSSkuEngine', () => {
    const out = loadAdapt()(AMAZON_SINGLE);
    assert.equal(out.prod_variations[0].sku, 'AZS-B08XYZ');
  });
});

describe('adaptProduct — supplier neutrality (AliExpress)', () => {
  test('prod_id uses sourceId for non-Amazon supplier', () => {
    const out = loadAdapt()(ALIEXPRESS_SINGLE);
    assert.equal(out.prod_id, 'ALI-99887');
  });

  test('supplier field reflects actual supplier', () => {
    const out = loadAdapt()(ALIEXPRESS_SINGLE);
    assert.equal(out.supplier, 'aliexpress');
  });

  test('SKU built from sourceId with dynamic supplier prefix', () => {
    // Prefix derives from product.supplier via SSSkuEngine.prefixFor —
    // 'aliexpress' → 'ALI'. (Pre-W1 behavior hardcoded 'AMZ' for all suppliers.)
    const out = loadAdapt()(ALIEXPRESS_SINGLE);
    assert.equal(out.prod_variations[0].sku, 'ALI-ALI99887');
  });

  test('variant_asin stores sourceId when no asin present', () => {
    const out = loadAdapt()(ALIEXPRESS_SINGLE);
    assert.equal(out.prod_variations[0].variant_asin, 'ALI-99887');
  });
});

describe('adaptProduct — variations', () => {
  test('maps all valid variants', () => {
    const out = loadAdapt()(AMAZON_VARIATION);
    assert.equal(out.prod_variations.length, 2);
  });

  test('variant price uses finalPrice over raw price', () => {
    const out = loadAdapt()(AMAZON_VARIATION);
    assert.equal(out.prod_variations[0].price, 20);
    assert.equal(out.prod_variations[1].price, 21);
  });

  test('raw_supplier_price uses raw price (amazonPrice field removed)', () => {
    const out = loadAdapt()(AMAZON_VARIATION);
    assert.equal(out.prod_variations[0].raw_supplier_price, 12);
  });

  test('variant SKU generated from parentAsin + attrs', () => {
    const out = loadAdapt()(AMAZON_VARIATION);
    // buildReadable('B08PARENT', {Color:Red, Size:L}) → AZS-B08PARENT-COLO-RED-SIZE-L
    assert.equal(out.prod_variations[0].sku, 'AZS-B08PARENT-COLO-RED-SIZE-L');
  });

  test('variant image + imgProp preserved', () => {
    const out = loadAdapt()(AMAZON_VARIATION);
    assert.equal(out.prod_variations[0].img, 'https://img/red.jpg');
    assert.equal(out.prod_variations[0].imgProp, 'Color');
  });

  test('supplierVariantId mapped to variant_asin', () => {
    const out = loadAdapt()(AMAZON_VARIATION);
    assert.equal(out.prod_variations[0].variant_asin, 'ASIN-RED');
    assert.equal(out.prod_variations[1].supplierVariantId, 'ASIN-BLUE');
  });

  test('attrs object preserved on each variant', () => {
    const out = loadAdapt()(AMAZON_VARIATION);
    assert.deepEqual(out.prod_variations[0].attrs, {
      Color: { productName: 'Red' },
      Size: { productName: 'L' },
    });
  });
});

describe('adaptProduct — robust price parsing', () => {
  test('handles price strings with currency symbols and spaces', () => {
    const rawProd = {
      ...AMAZON_SINGLE,
      price: '$ 19.99',
      finalPrice: '$24.50 ',
      raw_supplier_price: ' $19.99',
    };
    const out = loadAdapt()(rawProd);
    assert.equal(out.prod_variations[0].price, 24.50);
    assert.equal(out.prod_variations[0].raw_supplier_price, 19.99);
  });

  test('handles variant prices with currency symbols and spaces', () => {
    const rawProd = {
      ...AMAZON_VARIATION,
      price: ' $12.00',
      variants: [
        {
          attrs: { Color: { productName: 'Red' } },
          price: '$ 12.00 ',
          finalPrice: ' $20.00',
          ebayPrice: ' $22.50',
          img: 'https://img/red.jpg',
          imgProp: 'Color',
          supplierVariantId: 'ASIN-RED',
        },
        {
          attrs: { Color: { productName: 'Blue' } },
          price: '$ 13.00 ',
          finalPrice: ' $21.00',
          ebayPrice: ' $23.50',
          img: 'https://img/blue.jpg',
          imgProp: 'Color',
          supplierVariantId: 'ASIN-BLUE',
        }
      ]
    };
    const out = loadAdapt()(rawProd);
    assert.equal(out.prod_variations[0].price, 22.50); // ebayPrice wins
    assert.equal(out.prod_variations[0].raw_supplier_price, 12.00);
    assert.equal(out.prod_variations[1].price, 23.50);
    assert.equal(out.prod_variations[1].raw_supplier_price, 13.00);
  });
});
