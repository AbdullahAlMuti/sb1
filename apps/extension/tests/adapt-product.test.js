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

describe('adaptProduct — Amazon quick-import (injector Upload button) payload', () => {
  // Mirrors the object amazon_injector.js builds for the quick-import path after
  // the contract fix: finalPrice = calculated eBay price, supplierPrice = raw.
  // Regression guard for the bug where only `price` was set (finalPrice
  // undefined), which made validateProductPricing throw and dropped ALL fields.
  const QUICK_IMPORT = {
    title: 'Acme Widget Pro Wireless Bluetooth Headphones Over Ear Noise Cancelling Premium',
    title_source: 'ai',
    price: '19.99',          // raw supplier cost
    finalPrice: '31.86',     // calculated eBay price
    supplierPrice: '19.99',  // raw supplier cost
    price_source: 'calculated',
    asin: 'B08XYZ',
    description: 'Great everyday product.',
    ebaySku: 'AZS-B08XYZ',
    supplier: 'amazon',
    hasVariants: false,
    variants: [],
  };

  test('title carried, sanitized and enforced to <= 80 chars', () => {
    const out = loadAdapt()(QUICK_IMPORT);
    assert.ok(out.prod_title.length > 0, 'title must not be empty');
    assert.ok(out.prod_title.length <= 80, 'title must be <= 80 chars');
  });

  test('description carried (non-empty, not the placeholder)', () => {
    const out = loadAdapt()(QUICK_IMPORT);
    assert.ok(out.prod_desc && out.prod_desc.includes('Great everyday product.'));
  });

  test('eBay price is the calculated finalPrice, never the raw cost', () => {
    const out = loadAdapt()(QUICK_IMPORT);
    assert.equal(out.prod_variations[0].price, 31.86);
    assert.notEqual(out.prod_variations[0].price, 19.99);
    assert.equal(out.prod_variations[0].raw_supplier_price, 19.99);
  });

  test('SKU carried (user ebaySku wins) and base64-encodes to <= 50 chars', () => {
    const out = loadAdapt()(QUICK_IMPORT);
    const sku = out.prod_variations[0].sku;
    assert.equal(sku, 'AZS-B08XYZ');
    const win = makeWindow();
    loadInto(win, 'common/sku-engine.js');
    const encoded = win.SSSkuEngine.encodeForEbay(sku);
    assert.ok(encoded.length > 0 && encoded.length <= 50, `encoded SKU must be 1..50 chars, got ${encoded.length}`);
  });
});

describe('adaptProduct — missing/invalid price safety', () => {
  test('missing price and finalPrice falls back to 0.99, never throws', () => {
    const rawProd = { ...AMAZON_SINGLE, price: undefined, finalPrice: undefined, ebayFinalPrice: undefined };
    const out = loadAdapt()(rawProd);
    assert.equal(out.prod_variations[0].price, 0.99);
  });

  test('negative price falls back to 0.99', () => {
    const rawProd = { ...AMAZON_SINGLE, price: -5, finalPrice: -5, ebayFinalPrice: undefined };
    const out = loadAdapt()(rawProd);
    assert.equal(out.prod_variations[0].price, 0.99);
  });

  test('non-numeric price string ("N/A") falls back to 0.99', () => {
    const rawProd = { ...AMAZON_SINGLE, price: 'N/A', finalPrice: 'N/A', ebayFinalPrice: undefined };
    const out = loadAdapt()(rawProd);
    assert.equal(out.prod_variations[0].price, 0.99);
  });

  test('missing price on a variant falls back to parent price, never NaN', () => {
    const rawProd = {
      ...AMAZON_VARIATION,
      variants: [
        { attrs: { Color: { productName: 'Red' } }, price: undefined, finalPrice: undefined, img: null, imgProp: 'Color', supplierVariantId: 'ASIN-RED' },
      ],
    };
    const out = loadAdapt()(rawProd);
    assert.ok(!Number.isNaN(out.prod_variations[0].price));
    assert.equal(out.prod_variations[0].price, 12); // AMAZON_VARIATION.price fallback (basePrice)
  });
});

describe('adaptProduct — missing product/source ID safety', () => {
  test('no asin/parentAsin/sourceId → prod_id empty string, never throws', () => {
    const rawProd = { ...AMAZON_SINGLE, asin: undefined, parentAsin: undefined, sourceId: undefined };
    const out = loadAdapt()(rawProd);
    assert.equal(out.prod_id, '');
  });

  test('missing ID falls back to deterministic title-hash SKU (never bare prefix)', () => {
    const rawProd = { ...AMAZON_SINGLE, asin: undefined, parentAsin: undefined, sourceId: undefined, ebaySku: undefined };
    const out = loadAdapt()(rawProd);
    const sku = out.prod_variations[0].sku;
    // 'AZS-' + 'T' + 6-char base36 title hash — unique per title, stable per re-run
    assert.match(sku, /^AZS-T[A-Z0-9]{6}$/, `unexpected fallback SKU: ${sku}`);
    assert.equal(loadAdapt()(rawProd).prod_variations[0].sku, sku, 'fallback SKU must be deterministic');
  });

  test('two different ID-less products get different fallback SKUs', () => {
    const a = loadAdapt()({ ...AMAZON_SINGLE, asin: undefined, parentAsin: undefined, title: 'Blue Ceramic Mug 12oz' });
    const b = loadAdapt()({ ...AMAZON_SINGLE, asin: undefined, parentAsin: undefined, title: 'Red Steel Bottle 24oz' });
    assert.notEqual(a.prod_variations[0].sku, b.prod_variations[0].sku,
      'ID-less products must not collide on the same SKU (DB upsert is ON CONFLICT (user_id, sku))');
  });

  test('title falls back to sourceId or "Product" when title is missing entirely', () => {
    const rawProd = { ...AMAZON_SINGLE, title: undefined, asin: 'B08XYZ', parentAsin: 'B08XYZ' };
    const out = loadAdapt()(rawProd);
    assert.equal(out.prod_title, 'B08XYZ');
  });

  test('missing title and missing ID falls back to literal "Product"', () => {
    const rawProd = { ...AMAZON_SINGLE, title: undefined, asin: undefined, parentAsin: undefined, sourceId: undefined };
    const out = loadAdapt()(rawProd);
    assert.equal(out.prod_title, 'Product');
  });
});

describe('adaptProduct — supplierPrice and ebayFinalPrice separation', () => {
  test('single variation maps ebayFinalPrice and supplierPrice correctly', () => {
    const rawProd = {
      ...AMAZON_SINGLE,
      price: 19.99,
      finalPrice: 31.86,
      supplierPrice: 19.99,
      ebayFinalPrice: 35.99
    };
    const out = loadAdapt()(rawProd);
    assert.equal(out.prod_variations[0].price, 35.99); // ebayFinalPrice wins
    assert.equal(out.prod_variations[0].raw_supplier_price, 19.99); // supplierPrice wins
  });

  test('variants map ebayFinalPrice and supplierPrice correctly', () => {
    const rawProd = {
      ...AMAZON_VARIATION,
      variants: [
        {
          attrs: { Color: { productName: 'Red' } },
          price: 12,
          finalPrice: 20,
          supplierPrice: 12,
          ebayFinalPrice: 24.99,
          img: 'https://img/red.jpg',
          imgProp: 'Color',
          supplierVariantId: 'ASIN-RED'
        },
        {
          attrs: { Color: { productName: 'Blue' } },
          price: 13,
          finalPrice: 21,
          supplierPrice: 13,
          ebayFinalPrice: 25.99,
          img: 'https://img/blue.jpg',
          imgProp: 'Color',
          supplierVariantId: 'ASIN-BLUE'
        }
      ]
    };
    const out = loadAdapt()(rawProd);
    assert.equal(out.prod_variations[0].price, 24.99); // ebayFinalPrice wins
    assert.equal(out.prod_variations[0].raw_supplier_price, 12); // supplierPrice wins
    assert.equal(out.prod_variations[1].price, 25.99); // ebayFinalPrice wins
    assert.equal(out.prod_variations[1].raw_supplier_price, 13); // supplierPrice wins
  });
});
