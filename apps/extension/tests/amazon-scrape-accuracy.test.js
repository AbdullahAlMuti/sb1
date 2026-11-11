// amazon-scrape-accuracy.test.js — locks the "never guess" scrape contract:
// no placeholder/parent prices on variants, payable-price selector priority,
// every variant attempted (no 24 cap), exact variant-image match, host-based
// currency, parsed shipping cost, A+ description fallback.
// Run: node --test apps/extension/tests/amazon-scrape-accuracy.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function load(doc, location) {
  const win = makeWindow();
  win.document = doc;
  win.location = location || { origin: 'https://www.amazon.com', hostname: 'www.amazon.com', href: 'https://www.amazon.com/dp/B0AAA11111', pathname: '/dp/B0AAA11111' };
  loadInto(win, 'content_scripts/amazon-scraper-v2.js');
  return win.SsAmazonScraperV2;
}

// ── tiny fake DOM element ────────────────────────────────────────────────────
function priceEl({ cls = 'a-price', text, strike = false, inside = [] }) {
  return {
    className: cls,
    textContent: text,
    getAttribute: (a) => (a === 'data-a-strike' && strike ? 'true' : null),
    querySelector: (sel) => (sel === '.a-offscreen' ? { textContent: text } : null),
    closest: (sel) => (inside.some(id => sel.includes(id)) ? {} : null),
  };
}

function docWithPrices(map) {
  return {
    body: { innerText: '' },
    querySelector: () => null,
    querySelectorAll: (sel) => map[sel] || [],
  };
}

describe('_getBuyboxFromDom — payable price only', () => {
  test('priceToPay wins even when a struck-through list price comes first in the DOM', () => {
    const list = priceEl({ cls: 'a-price a-text-price', text: '$49.99', strike: true, inside: ['#corePrice_feature_div'] });
    const pay = priceEl({ cls: 'a-price priceToPay', text: '$29.99', inside: ['#corePrice_feature_div'] });
    const doc = docWithPrices({
      '.priceToPay': [pay],
      '#corePrice_feature_div .a-price': [list, pay],
      '.a-price': [list, pay],
    });
    assert.equal(load(doc)._internals._getBuyboxFromDom().priceAmount, 29.99);
  });

  test('struck-through price is skipped when it is the first generic match', () => {
    const list = priceEl({ cls: 'a-price a-text-price', text: '$49.99', strike: true, inside: ['#corePrice_feature_div'] });
    const pay = priceEl({ cls: 'a-price', text: '$31.50', inside: ['#corePrice_feature_div'] });
    const doc = docWithPrices({ '#corePrice_feature_div .a-price': [list, pay] });
    assert.equal(load(doc)._internals._getBuyboxFromDom().priceAmount, 31.5);
  });

  test('per-unit price is ignored', () => {
    const unit = priceEl({ cls: 'a-price a-text-price', text: '$0.50', inside: ['.pricePerUnit', '#corePrice_feature_div'] });
    const pay = priceEl({ cls: 'a-price', text: '$12.00', inside: ['#corePrice_feature_div'] });
    const doc = docWithPrices({ '#corePrice_feature_div .a-price': [unit, pay] });
    assert.equal(load(doc)._internals._getBuyboxFromDom().priceAmount, 12);
  });

  test('a generic .a-price outside the buybox (sponsored widget) is never used', () => {
    const sponsored = priceEl({ cls: 'a-price', text: '$7.77', inside: [] });
    const doc = docWithPrices({ '.a-price': [sponsored] });
    assert.equal(load(doc)._internals._getBuyboxFromDom(), null);
  });

  test('legacy apexPriceToPay carrying a-text-price is still payable', () => {
    const pay = priceEl({ cls: 'a-price a-text-price apexPriceToPay', text: '$18.25', inside: ['#corePrice_desktop'] });
    const doc = docWithPrices({ '.apexPriceToPay': [pay] });
    assert.equal(load(doc)._internals._getBuyboxFromDom().priceAmount, 18.25);
  });
});

describe('currency + shipping', () => {
  test('bare $ resolves by storefront host', () => {
    const doc = docWithPrices({});
    const ca = load(doc, { hostname: 'www.amazon.ca', origin: 'https://www.amazon.ca', href: '', pathname: '' });
    assert.equal(ca._internals._resolveCurrency('$'), 'CAD');
    const au = load(doc, { hostname: 'www.amazon.com.au', origin: '', href: '', pathname: '' });
    assert.equal(au._internals._resolveCurrency('$'), 'AUD');
    const us = load(doc);
    assert.equal(us._internals._resolveCurrency('$'), 'USD');
    assert.equal(us._internals._resolveCurrency('£'), 'GBP');
  });

  test('shipping cost parsed from the delivery message', () => {
    const { _parseShippingCost } = load(docWithPrices({}))._internals;
    assert.equal(_parseShippingCost('$6.99 delivery Thursday, November 19'), 6.99);
    assert.equal(_parseShippingCost('FREE delivery Friday, November 20 on orders shipped by Amazon over $35'), 0);
    assert.equal(_parseShippingCost('Delivery Friday'), null);
    assert.equal(_parseShippingCost(''), null);
  });
});

describe('_imageForVariant — exact match only', () => {
  const tw = {
    dimensions: ['color_name'],
    visualDimensions: ['color_name'],
    variationDisplayLabels: { color_name: 'Color' },
  };
  const map = {
    'Light Green': [{ hiRes: 'https://m.media-amazon.com/images/I/green1.jpg' }, { hiRes: 'https://m.media-amazon.com/images/I/green2.jpg' }],
    'Navy': [{ hiRes: 'https://m.media-amazon.com/images/I/navy1.jpg' }],
  };

  test('"Light Blue" does not borrow the "Light Green" photos', () => {
    const { _imageForVariant } = load(docWithPrices({}))._internals;
    const r = _imageForVariant(tw, { Color: { productName: 'Light Blue' } }, map);
    assert.equal(r.img, undefined);
    assert.deepEqual(r.images, []);
  });

  test('exact (case-insensitive) match returns every image of that color', () => {
    const { _imageForVariant } = load(docWithPrices({}))._internals;
    const r = _imageForVariant(tw, { Color: { productName: 'light green' } }, map);
    assert.equal(r.img, 'https://m.media-amazon.com/images/I/green1.jpg');
    assert.equal(r.images.length, 2);
  });
});

// ── full scan with a twister, stubbed document ───────────────────────────────
function twisterScript(n) {
  const display = {};
  const dimMap = {};
  for (let i = 0; i < n; i++) {
    const asin = 'B0VAR' + String(i).padStart(5, '0');
    display[asin] = ['Color ' + i];
    dimMap[String(i)] = asin;
  }
  return `var dataToReturn = {
    "dimensionToAsinMap" : ${JSON.stringify(dimMap)},
    "parentAsin" : "B0PARENT000",
    "dimensionValuesDisplayData" : ${JSON.stringify(display)},
    "dimensionsDisplay" : ["Color"],
    "dimensions" : ["color_name"],
    "variationDisplayLabels" : {"color_name":"Color"},
    "visualDimensions" : ["color_name"]
  }; twister-js-init-dpx-data`;
}

function scanDoc({ n, pageBuybox, iframePrice }) {
  let frames = 0;
  const variantDoc = (asin) => ({
    body: {},
    querySelector(sel) {
      if (sel.includes('input#ASIN')) return { value: asin };
      if (sel === '.twister-plus-buying-options-price-data') {
        const price = iframePrice(asin);
        return price == null ? null
          : { textContent: JSON.stringify({ desktop_buybox_group_1: [{ asin, priceAmount: price, currencySymbol: '$' }] }) };
      }
      return null;
    },
    querySelectorAll: () => [],
  });
  const doc = {
    body: { innerText: '', appendChild() {} },
    createElement() {
      frames++;
      const fr = { style: {}, src: '', setAttribute() {}, remove() {} };
      Object.defineProperty(fr, 'contentDocument', {
        get() {
          const m = fr.src.match(/\/dp\/([A-Z0-9]+)/);
          return m ? variantDoc(m[1]) : null;
        },
      });
      return fr;
    },
    querySelector(sel) {
      if (sel.includes('input#ASIN')) return { value: 'B0PARENT000' };
      if (sel === '.twister-plus-buying-options-price-data') {
        return pageBuybox == null ? null
          : { textContent: JSON.stringify({ desktop_buybox_group_1: [{ asin: 'B0PARENT000', priceAmount: pageBuybox, currencySymbol: '$' }] }) };
      }
      if (sel === '#productTitle') return { textContent: 'Test Product' };
      return null;
    },
    querySelectorAll(sel) {
      if (sel === 'script') return [{ textContent: twisterScript(n) }];
      return [];
    },
  };
  return { doc, frameCount: () => frames };
}

describe('scrapeProductWithVariants — no fabricated variant prices', () => {
  test('all 40 variants are attempted and get their OWN price (no 24 cap)', async () => {
    const { doc, frameCount } = scanDoc({
      n: 40, pageBuybox: 10,
      iframePrice: (asin) => 20 + Number(asin.slice(-2)),
    });
    const p = await load(doc).scrapeProductWithVariants({ allowLowQty: true });
    assert.equal(p.variants.length, 40);
    assert.equal(frameCount(), 40);
    assert.ok(p.variants.every(v => v.priceVerified === true));
    assert.equal(p.variants[39].price, 59);
    assert.equal(p.unverifiedVariantCount, 0);
  });

  test('a variant whose page shows no offer stays price:null — never parent price, never 999', async () => {
    const { doc } = scanDoc({
      n: 3, pageBuybox: 10,
      iframePrice: (asin) => (asin.endsWith('1') ? null : 25),
    });
    const p = await load(doc).scrapeProductWithVariants({ allowLowQty: true, variantTimeoutMs: 500 });
    const bad = p.variants.find(v => v.supplierVariantId.endsWith('1'));
    assert.equal(bad.price, null);
    assert.equal(bad.priceVerified, false);
    assert.equal(p.unverifiedVariantCount, 1);
    assert.ok(p.variants.every(v => v.price !== 999 && v.price !== 10));
  });

  test('when no variant price can be read the scan fails loudly', async () => {
    const { doc } = scanDoc({ n: 2, pageBuybox: null, iframePrice: () => null });
    await assert.rejects(
      () => load(doc).scrapeProductWithVariants({ allowLowQty: true, variantTimeoutMs: 450 }),
      /Could not read a price for any variation/
    );
  });

  test('total time budget stops the tier; the rest are unverified, scan still returns', async () => {
    const { doc } = scanDoc({
      n: 6, pageBuybox: 10,
      // first two resolve instantly, the rest never hydrate
      iframePrice: (asin) => (Number(asin.slice(-1)) < 2 ? 30 : null),
    });
    const p = await load(doc).scrapeProductWithVariants({ allowLowQty: true, variantBudgetMs: 900, variantTimeoutMs: 450 });
    assert.equal(p.variants.filter(v => v.priceVerified).length, 2);
    assert.equal(p.unverifiedVariantCount, 4);
  });
});

describe('_baseFields — description fallbacks', () => {
  test('A+ content is used when #productDescription is empty', () => {
    const doc = {
      body: { innerText: '' },
      querySelector: (sel) => (sel === '#productTitle' ? { textContent: 'T' } : null),
      querySelectorAll: (sel) => (sel.startsWith('#aplus')
        ? [{ textContent: 'Built from recycled aluminium.' }, { textContent: 'Built from recycled aluminium.' }, { textContent: 'Fits most 15 inch laptops.' }]
        : []),
    };
    const base = load(doc)._internals._baseFields();
    assert.equal(base.description, 'Built from recycled aluminium. Fits most 15 inch laptops.');
  });
});
