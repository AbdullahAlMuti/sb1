// amazon-scraper-v2.test.js — locks the pure extraction helpers of the
// data-first Amazon scraper (content_scripts/amazon-scraper-v2.js).
// These run without DOM: brace-balanced field extraction, fragment parsing,
// size-modifier stripping, colorImages extraction, spec cleaning.
// Run: node --test apps/extension/tests/amazon-scraper-v2.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadInternals() {
  const win = makeWindow();
  loadInto(win, 'content_scripts/amazon-scraper-v2.js');
  return win.SsAmazonScraperV2._internals;
}

// Realistic twister dataToReturn fragment (2-dim Color × Size, mixed noise)
const TWISTER_FIXTURE = `
var dataToReturn = {
  "updateDivLists" : {"fullDivList":["x"]},
  "dimensionToAsinMap" : {"0_0":"B0AAA11111","0_1":"B0BBB22222","1_0":"B0CCC33333","1_1":"B0DDD44444"},
  "parentAsin" : "B09Q3MYDQH",
  "variationValues" : {"color_name":["Black","Pink's Glow"],"size_name":["7-8.5","9-10.5"]},
  "dimensionValuesData" : [["Black","Pink's Glow"],["7-8.5","9-10.5"]],
  "dimensionValuesDisplayData" : {"B0AAA11111":["Black","7-8.5"],"B0BBB22222":["Black","9-10.5"],"B0CCC33333":["Pink's Glow","7-8.5"],"B0DDD44444":["Pink's Glow","9-10.5"]},
  "dimensionsDisplay" : ["Color","Size"],
  "dimensions" : ["color_name","size_name"],
  "variationDisplayLabels" : {"color_name":"Color","size_name":"Size"},
  "visualDimensions" : ["color_name"],
  "ajaxUrlParams" : badGarbage(Date.now()),
  "currentAsin" : "B0AAA11111"
};
twister-js-init-dpx-data`;

const IMAGEBLOCK_FIXTURE = `
P.when('A').register("ImageBlockATF", function(A){
var data = {
  'colorImages': { 'initial': [
    {"hiRes":"https://m.media-amazon.com/images/I/71abc._AC_SL1500_.jpg","thumb":"https://m.media-amazon.com/images/I/71abc._AC_US40_.jpg","large":"https://m.media-amazon.com/images/I/71abc._AC_SX522_.jpg"},
    {"hiRes":"https://m.media-amazon.com/images/I/81def._AC_SL1500_.jpg","large":"https://m.media-amazon.com/images/I/81def._AC_SX522_.jpg"}
  ]},
  'colorToAsin': {'initial': {'B0AAA11111': {}}},
};
});`;

const JQUERY_COLORIMAGES_FIXTURE = `
jQuery.parseJSON('{"title":"Water Shoes","colorImages":{"Black":[{"hiRes":"https://m.media-amazon.com/images/I/71black._AC_SL1500_.jpg","large":"https://m.media-amazon.com/images/I/71black._AC_SX522_.jpg"}],"Pink\\'s Glow":[{"hiRes":"https://m.media-amazon.com/images/I/71pink._AC_SL1500_.jpg"}]},"visualDimensions":["color_name"]}')`;

describe('_extractBalanced', () => {
  test('extracts nested object respecting strings with braces', () => {
    const { _extractBalanced } = loadInternals();
    const text = 'x = {"a":{"b":"}"},"c":[1,2]} ; rest';
    const out = _extractBalanced(text, text.indexOf('{'));
    assert.equal(out, '{"a":{"b":"}"},"c":[1,2]}');
  });

  test('handles single-quoted strings containing close braces', () => {
    const { _extractBalanced } = loadInternals();
    const text = "{ 'k': '}}}', 'n': 1 }";
    assert.equal(_extractBalanced(text, 0), text);
  });

  test('returns null on unbalanced input', () => {
    const { _extractBalanced } = loadInternals();
    assert.equal(_extractBalanced('{"a": {', 0), null);
  });
});

describe('_extractKeyedValue', () => {
  test('extracts object value for quoted key', () => {
    const { _extractKeyedValue } = loadInternals();
    const raw = _extractKeyedValue(TWISTER_FIXTURE, 'dimensionToAsinMap');
    assert.ok(raw.startsWith('{') && raw.includes('B0DDD44444'));
  });

  test('extracts array value', () => {
    const { _extractKeyedValue } = loadInternals();
    assert.equal(_extractKeyedValue(TWISTER_FIXTURE, 'dimensionsDisplay'), '["Color","Size"]');
  });

  test('extracts string value', () => {
    const { _extractKeyedValue } = loadInternals();
    assert.equal(_extractKeyedValue(TWISTER_FIXTURE, 'parentAsin'), '"B09Q3MYDQH"');
  });

  test('does not match key as suffix of longer identifier', () => {
    const { _extractKeyedValue } = loadInternals();
    const text = '{"superDimensions": [1], "dimensions": ["color_name"]}';
    assert.equal(_extractKeyedValue(text, 'dimensions'), '["color_name"]');
  });

  test('returns null for absent key', () => {
    const { _extractKeyedValue } = loadInternals();
    assert.equal(_extractKeyedValue(TWISTER_FIXTURE, 'noSuchKey'), null);
  });
});

describe('_parseFragment', () => {
  test('parses valid JSON', () => {
    const { _parseFragment } = loadInternals();
    assert.deepEqual(_parseFragment('{"a":1}'), { a: 1 });
  });

  test('repairs single-quoted JSON', () => {
    const { _parseFragment } = loadInternals();
    assert.deepEqual(_parseFragment("{'a':'b'}"), { a: 'b' });
  });

  test('preserves escaped apostrophes inside single-quoted strings', () => {
    const { _parseFragment } = loadInternals();
    assert.deepEqual(_parseFragment("{'name':'Pink\\'s Glow'}"), { name: "Pink's Glow" });
  });

  test('returns null on hopeless input instead of throwing', () => {
    const { _parseFragment } = loadInternals();
    assert.equal(_parseFragment('badGarbage(Date.now())'), null);
    assert.equal(_parseFragment(null), null);
  });
});

describe('_stripSizeModifier', () => {
  test('strips _AC_SX522_ style modifiers', () => {
    const { _stripSizeModifier } = loadInternals();
    assert.equal(
      _stripSizeModifier('https://m.media-amazon.com/images/I/71abc._AC_SX522_.jpg'),
      'https://m.media-amazon.com/images/I/71abc.jpg'
    );
  });

  test('strips _SL1500_ style modifiers', () => {
    const { _stripSizeModifier } = loadInternals();
    assert.equal(
      _stripSizeModifier('https://m.media-amazon.com/images/I/81def._SL1500_.jpg'),
      'https://m.media-amazon.com/images/I/81def.jpg'
    );
  });

  test('leaves modifier-free URLs untouched', () => {
    const { _stripSizeModifier } = loadInternals();
    const u = 'https://m.media-amazon.com/images/I/71abc.jpg';
    assert.equal(_stripSizeModifier(u), u);
  });

  test('tolerates non-string input', () => {
    const { _stripSizeModifier } = loadInternals();
    assert.equal(_stripSizeModifier(null), null);
  });
});

describe('_extractColorImages', () => {
  test('extracts initial set from ImageBlockATF-style data', () => {
    const { _extractColorImages } = loadInternals();
    const out = _extractColorImages(IMAGEBLOCK_FIXTURE);
    assert.ok(Array.isArray(out.initial));
    assert.equal(out.initial.length, 2);
    assert.equal(out.initial[0].hiRes, 'https://m.media-amazon.com/images/I/71abc._AC_SL1500_.jpg');
    assert.equal(out.initial[1].large, 'https://m.media-amazon.com/images/I/81def._AC_SX522_.jpg');
  });

  test('extracts per-color map with apostrophes in color names', () => {
    const { _extractColorImages } = loadInternals();
    const out = _extractColorImages(JQUERY_COLORIMAGES_FIXTURE.replace(/\\'/g, "'"));
    assert.ok(out['Black'], 'Black key missing: ' + Object.keys(out).join(','));
    assert.equal(
      out['Black'][0].hiRes,
      'https://m.media-amazon.com/images/I/71black._AC_SL1500_.jpg'
    );
    assert.ok(out["Pink's Glow"], 'apostrophe key missing: ' + Object.keys(out).join(','));
  });

  test('returns empty object when colorImages absent', () => {
    const { _extractColorImages } = loadInternals();
    assert.deepEqual(_extractColorImages('var x = {"foo": 1};'), {});
  });

  test('unescapes backslashes in image URLs', () => {
    const { _extractColorImages } = loadInternals();
    const fixture = `var data = {
      'colorImages': { 'initial': [
        {"hiRes":"https:\\/\\/m.media-amazon.com\\/images\\/I\\/71abc._AC_SL1500_.jpg"}
      ]}
    };`;
    const out = _extractColorImages(fixture);
    assert.equal(
      out.initial[0].hiRes,
      'https://m.media-amazon.com/images/I/71abc._AC_SL1500_.jpg'
    );
  });
});

describe('_parseTwisterFields', () => {
  test('extracts every needed field from realistic twister blob with noise', () => {
    const { _parseTwisterFields } = loadInternals();
    const tw = _parseTwisterFields(TWISTER_FIXTURE);
    assert.equal(tw.parentAsin, 'B09Q3MYDQH');
    assert.deepEqual(tw.dimensions, ['color_name', 'size_name']);
    assert.deepEqual(tw.dimensionsDisplay, ['Color', 'Size']);
    assert.deepEqual(tw.visualDimensions, ['color_name']);
    assert.equal(Object.keys(tw.dimensionValuesDisplayData).length, 4);
    assert.deepEqual(tw.dimensionValuesDisplayData['B0CCC33333'], ["Pink's Glow", '7-8.5']);
    assert.equal(tw.variationDisplayLabels.color_name, 'Color');
  });

  test('inverts dimensionToAsinMap into asinToDimensionIndexMap', () => {
    const { _parseTwisterFields } = loadInternals();
    const tw = _parseTwisterFields(TWISTER_FIXTURE);
    assert.deepEqual(tw.asinToDimensionIndexMap['B0AAA11111'], [0, 0]);
    assert.deepEqual(tw.asinToDimensionIndexMap['B0DDD44444'], [1, 1]);
  });

  test('one malformed field does not take down the others', () => {
    const { _parseTwisterFields } = loadInternals();
    const broken = TWISTER_FIXTURE.replace(
      '"variationValues" : {"color_name"',
      '"variationValues" : {{{"color_name"'
    );
    const tw = _parseTwisterFields(broken);
    assert.equal(tw.parentAsin, 'B09Q3MYDQH');
    assert.equal(Object.keys(tw.dimensionValuesDisplayData).length, 4);
  });

  test('missing twister data yields nulls, never throws', () => {
    const { _parseTwisterFields } = loadInternals();
    const tw = _parseTwisterFields('var nothing = 1;');
    assert.equal(tw.dimensionToAsinMap, null);
    assert.equal(tw.asinToDimensionIndexMap, null);
  });
});

describe('_cleanSpecPair', () => {
  test('trims whitespace, rtl marks, and trailing colon from keys', () => {
    const { _cleanSpecPair } = loadInternals();
    assert.deepEqual(
      _cleanSpecPair('‎ Package Dimensions ‏: ', ' 9.4 x 7 x 1.5 inches; 7.05 oz '),
      ['Package Dimensions', '9.4 x 7 x 1.5 inches; 7.05 oz']
    );
  });

  test('filters junk rows', () => {
    const { _cleanSpecPair } = loadInternals();
    assert.equal(_cleanSpecPair('Customer Reviews', '4.5 stars'), null);
    assert.equal(_cleanSpecPair('Best Sellers Rank', '#1 in Shoes'), null);
    assert.equal(_cleanSpecPair('ASIN', 'B09Q3MYDQH'), null);
  });

  test('filters empty keys and values', () => {
    const { _cleanSpecPair } = loadInternals();
    assert.equal(_cleanSpecPair('', 'x'), null);
    assert.equal(_cleanSpecPair('Brand', '  '), null);
  });

  test('keeps normal specifics', () => {
    const { _cleanSpecPair } = loadInternals();
    assert.deepEqual(_cleanSpecPair('Brand', 'ATHMILE'), ['Brand', 'ATHMILE']);
    assert.deepEqual(_cleanSpecPair('Sole Material', 'Rubber'), ['Sole Material', 'Rubber']);
  });
});

describe('_cleanPriceText', () => {
  test('parses prefixed standard currency values', () => {
    const { _cleanPriceText } = loadInternals();
    assert.deepEqual(_cleanPriceText('$19.99'), { price: 19.99, symbol: '$' });
    assert.deepEqual(_cleanPriceText('£25.50'), { price: 25.50, symbol: '£' });
    assert.deepEqual(_cleanPriceText('€999.00'), { price: 999.00, symbol: '€' });
  });

  test('preserves regional dollar symbols before generic dollar fallback', () => {
    const { _cleanPriceText } = loadInternals();
    assert.deepEqual(_cleanPriceText('A$39.95'), { price: 39.95, symbol: 'A$' });
    assert.deepEqual(_cleanPriceText('C$42.50'), { price: 42.50, symbol: 'C$' });
    assert.deepEqual(_cleanPriceText('R$ 89,90'), { price: 89.90, symbol: 'R$' });
  });

  test('parses suffixed currency values', () => {
    const { _cleanPriceText } = loadInternals();
    assert.deepEqual(_cleanPriceText('19.99 $'), { price: 19.99, symbol: '$' });
    assert.deepEqual(_cleanPriceText('25,50 €'), { price: 25.50, symbol: '€' });
  });

  test('handles commas and extra spaces', () => {
    const { _cleanPriceText } = loadInternals();
    assert.deepEqual(_cleanPriceText(' $ 1,249.99 '), { price: 1249.99, symbol: '$' });
    assert.deepEqual(_cleanPriceText('  1.500,00  € '), { price: 1500.00, symbol: '€' });
  });

  test('decodes unicode escapes', () => {
    const { _cleanPriceText } = loadInternals();
    assert.deepEqual(_cleanPriceText('\\u00a312.99'), { price: 12.99, symbol: '£' });
    assert.deepEqual(_cleanPriceText('25.50\\u20ac'), { price: 25.50, symbol: '€' });
  });

  test('decodes HTML decimal and hex entities', () => {
    const { _cleanPriceText } = loadInternals();
    assert.deepEqual(_cleanPriceText('&#163;12.99'), { price: 12.99, symbol: '£' });
    assert.deepEqual(_cleanPriceText('&#x20ac;25.50'), { price: 25.50, symbol: '€' });
  });

  test('returns null for empty or invalid strings', () => {
    const { _cleanPriceText } = loadInternals();
    assert.equal(_cleanPriceText(''), null);
    assert.equal(_cleanPriceText('no price here'), null);
    assert.equal(_cleanPriceText('$abc'), null);
  });
});

describe('_normalizeBrandText', () => {
  test('normalizes common Amazon byline formats', () => {
    const { _normalizeBrandText } = loadInternals();
    assert.equal(_normalizeBrandText('Brand: Acme'), 'Acme');
    assert.equal(_normalizeBrandText('Visit the ATHMILE Store'), 'ATHMILE');
    assert.equal(_normalizeBrandText('Shop the Example Store'), 'Example');
  });

  test('drops empty generic byline labels', () => {
    const { _normalizeBrandText } = loadInternals();
    assert.equal(_normalizeBrandText('Store'), '');
    assert.equal(_normalizeBrandText('Brand'), '');
  });
});

// ─── Variant→price mapping integrity (enrichment tier, stubbed DOM) ──────────
// Locks the fix for the parent-price-on-every-variant bug: a click that never
// switches the page to the target ASIN must NOT stamp the visible buybox price
// onto that variant.

function loadWithDoc(doc) {
  const win = makeWindow();
  win.document = doc;
  loadInto(win, 'content_scripts/amazon-scraper-v2.js');
  return win.SsAmazonScraperV2._internals;
}

function makeDoc({ currentAsin, twisterPlus }) {
  return {
    body: {},
    querySelector(sel) {
      if (sel.includes('input#ASIN')) return currentAsin ? { value: currentAsin } : null;
      if (sel === '.twister-plus-buying-options-price-data') {
        return twisterPlus ? { textContent: JSON.stringify(twisterPlus) } : null;
      }
      return null; // #availability → in stock, quantity select → 1, price els → none
    },
    querySelectorAll() { return []; },
  };
}

const TW_EMPTY = { asinToDimensionIndexMap: {} };

describe('_getBuyboxFromDom — per-ASIN twister-plus lookup', () => {
  const twisterPlus = {
    desktop_buybox_group_1: [
      { asin: 'B0PARENT000', priceAmount: 10.0, currencySymbol: '$' },
      { asin: 'B0TARGET111', priceAmount: 19.99, currencySymbol: '$' },
    ],
  };

  test('prefers the entry matching the requested ASIN', () => {
    const { _getBuyboxFromDom } = loadWithDoc(makeDoc({ currentAsin: 'B0PARENT000', twisterPlus }));
    assert.equal(_getBuyboxFromDom('B0TARGET111').priceAmount, 19.99);
  });

  test('falls back to first entry when no ASIN requested', () => {
    const { _getBuyboxFromDom } = loadWithDoc(makeDoc({ currentAsin: 'B0PARENT000', twisterPlus }));
    assert.equal(_getBuyboxFromDom().priceAmount, 10.0);
  });
});

describe('_clickAndScrapeVariant — mapping integrity', () => {
  test('already-selected variant reads its own per-ASIN price without clicking', async () => {
    const twisterPlus = {
      desktop_buybox_group_1: [
        { asin: 'B0PARENT000', priceAmount: 10.0, currencySymbol: '$' },
        { asin: 'B0TARGET111', priceAmount: 19.99, currencySymbol: '$' },
      ],
    };
    const { _clickAndScrapeVariant } = loadWithDoc(makeDoc({ currentAsin: 'B0TARGET111', twisterPlus }));
    const r = await _clickAndScrapeVariant(TW_EMPTY, 'B0TARGET111', [], [], {});
    assert.equal(r.price, 19.99);
    assert.equal(r.currency, 'USD');
  });

  test('unmatched click never stamps the visible (parent) buybox price', async () => {
    // Page stays on the parent ASIN; parent price 10.0 is visible but must NOT
    // be reported for B0TARGET111 (old behavior stamped it as _enriched).
    const twisterPlus = {
      desktop_buybox_group_1: [{ asin: 'B0PARENT000', priceAmount: 10.0, currencySymbol: '$' }],
    };
    const { _clickAndScrapeVariant } = loadWithDoc(makeDoc({ currentAsin: 'B0PARENT000', twisterPlus }));
    const r = await _clickAndScrapeVariant(TW_EMPTY, 'B0TARGET111', [], [], {});
    assert.equal(r.price, null);
    assert.equal(r.quantity, 0);
  });

  test('unmatched click recovers the price from per-ASIN twister-plus data', async () => {
    const twisterPlus = {
      desktop_buybox_group_1: [
        { asin: 'B0PARENT000', priceAmount: 10.0, currencySymbol: '$' },
        { asin: 'B0TARGET111', priceAmount: 24.99, currencySymbol: '$' },
      ],
    };
    const { _clickAndScrapeVariant } = loadWithDoc(makeDoc({ currentAsin: 'B0PARENT000', twisterPlus }));
    const r = await _clickAndScrapeVariant(TW_EMPTY, 'B0TARGET111', [], [], {});
    assert.equal(r.price, 24.99);
    assert.equal(r.currency, 'USD');
    assert.equal(r.quantity, 1);
  });
});

describe('_harvestDomVariantPrices — swatch price tier', () => {
  test('maps data-asin swatches to their printed prices', () => {
    const swatches = [
      {
        getAttribute: (a) => (a === 'data-asin' ? 'b0aaa11111' : null),
        querySelector: () => ({ textContent: '$12.99' }),
      },
      {
        getAttribute: (a) => (a === 'data-asin' ? 'B0BBB22222' : null),
        querySelector: () => ({ textContent: '$24.50' }),
      },
      { // swatch without a printed price — must be omitted, not zeroed
        getAttribute: (a) => (a === 'data-asin' ? 'B0CCC33333' : null),
        querySelector: () => null,
      },
    ];
    const doc = {
      body: {},
      querySelector: () => null,
      querySelectorAll: (sel) => (sel.includes('data-asin') ? swatches : []),
    };
    const { _harvestDomVariantPrices } = loadWithDoc(doc);
    const map = _harvestDomVariantPrices();
    assert.equal(map.B0AAA11111.price, 12.99);
    assert.equal(map.B0BBB22222.price, 24.5);
    assert.equal(map.B0CCC33333, undefined);
  });
});

describe('_iframeScrapeVariant — hidden-iframe price tier', () => {
  test('reads the variant page own buybox out of the iframe document', async () => {
    const variantDoc = makeDoc({
      currentAsin: 'B0TARGET111',
      twisterPlus: { desktop_buybox_group_1: [{ asin: 'B0TARGET111', priceAmount: 42.5, currencySymbol: '$' }] },
    });
    let removed = false;
    const fakeFrame = {
      style: {}, src: '',
      setAttribute() {},
      remove() { removed = true; },
      contentDocument: variantDoc,
    };
    const doc = {
      body: { appendChild() {} },
      createElement: () => fakeFrame,
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    const win = makeWindow();
    win.location = { origin: 'https://www.amazon.com' };
    win.document = doc;
    loadInto(win, 'content_scripts/amazon-scraper-v2.js');
    const r = await win.SsAmazonScraperV2._internals._iframeScrapeVariant('B0TARGET111', 3000);
    assert.equal(r.price, 42.5);
    assert.equal(r.currency, 'USD');
    assert.equal(r.quantity, 1);
    assert.equal(removed, true, 'iframe must be removed after the read');
  });

  test('reports unavailable (qty 0, no price) when the page has no offer', async () => {
    const variantDoc = makeDoc({ currentAsin: 'B0TARGET111', twisterPlus: null });
    const fakeFrame = { style: {}, src: '', setAttribute() {}, remove() {}, contentDocument: variantDoc };
    const doc = {
      body: { appendChild() {} },
      createElement: () => fakeFrame,
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    const win = makeWindow();
    win.location = { origin: 'https://www.amazon.com' };
    win.document = doc;
    loadInto(win, 'content_scripts/amazon-scraper-v2.js');
    const r = await win.SsAmazonScraperV2._internals._iframeScrapeVariant('B0TARGET111', 1200);
    assert.equal(r.price, null);
    assert.equal(r.quantity, 0);
    assert.equal(r.unavailable, true);
  });
});
