// listing-draft.test.js — locks productToDraft transform + draft→legacy round-trip.
// These shapes feed the universal pipeline; a drift here silently breaks every
// supplier. Run: node --test apps/extension/tests/listing-draft.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

// productToDraft is pure (no chrome). Load with a bare window.
function loadDraftModule() {
  const win = makeWindow();
  loadInto(win, 'common/listing-draft.js');
  return win.SSListingDraft;
}

// A representative scraped Amazon product (single + variation cases).
const AMAZON_SINGLE = {
  marketplace: 'amazon',
  asin: 'B08XYZ',
  parentAsin: 'B08XYZ',
  title: 'Test Widget',
  description: 'A widget.',
  images: ['https://img/a.jpg', 'https://img/b.jpg'],
  price: 19.99,
  currency: 'USD',
  variants: [],
  specs: { Brand: 'Acme' },
};

const SUPPLIER_GENERIC = {
  supplier: 'aliexpress',
  sourceId: 'ALI-12345',
  title: 'Generic Gadget',
  images: ['https://img/x.jpg'],
  price: 5.5,
  variants: [{ supplierVariantId: 'v1', attrs: { Color: { productName: 'Red' } }, price: 5.5 }],
};

describe('productToDraft — supplier identity', () => {
  test('Amazon: sourceId falls back to parentAsin', () => {
    const d = loadDraftModule().productToDraft(AMAZON_SINGLE, 'single');
    assert.equal(d.sourceId, 'B08XYZ');
    assert.equal(d.supplier, 'amazon');
  });

  test('generic supplier: sourceId + supplier preserved', () => {
    const d = loadDraftModule().productToDraft(SUPPLIER_GENERIC, 'all');
    assert.equal(d.sourceId, 'ALI-12345');
    assert.equal(d.supplier, 'aliexpress');
  });

  test('supplier read from marketplace OR supplier field', () => {
    const d1 = loadDraftModule().productToDraft({ marketplace: 'walmart' }, 'single');
    const d2 = loadDraftModule().productToDraft({ supplier: 'temu' }, 'single');
    assert.equal(d1.supplier, 'walmart');
    assert.equal(d2.supplier, 'temu');
  });
});

describe('productToDraft — pricing split', () => {
  test('rawPrice parsed, finalPrice null until pricing applied', () => {
    const d = loadDraftModule().productToDraft(AMAZON_SINGLE, 'single');
    assert.equal(d.pricing.rawPrice, 19.99);
    assert.equal(d.pricing.finalPrice, null);
    assert.equal(d.pricing.currency, 'USD');
  });

  test('finalPrice carried through when pre-stamped', () => {
    const d = loadDraftModule().productToDraft({ ...AMAZON_SINGLE, finalPrice: 31.86 }, 'single');
    assert.equal(d.pricing.finalPrice, 31.86);
  });
});

describe('productToDraft — content + variants', () => {
  test('images + mainImage preserved in order', () => {
    const d = loadDraftModule().productToDraft(AMAZON_SINGLE, 'single');
    assert.deepEqual(d.images, ['https://img/a.jpg', 'https://img/b.jpg']);
    assert.equal(d.mainImage, 'https://img/a.jpg');
  });

  test('variants preserved, count derived', () => {
    const d = loadDraftModule().productToDraft(SUPPLIER_GENERIC, 'all');
    assert.equal(d.variants.length, 1);
    assert.equal(d.variationCount, 1);
  });

  test('single mode selects first variant', () => {
    const withVars = { ...AMAZON_SINGLE, variants: [{ attrs: { A: 1 } }, { attrs: { A: 2 } }] };
    const d = loadDraftModule().productToDraft(withVars, 'single');
    assert.deepEqual(d.selectedVariant, { attrs: { A: 1 } });
  });
});

describe('saveDraft → currentProduct mirror (round-trip to legacy shape)', () => {
  // saveDraft calls _draftToLegacyProduct then chrome.storage.local.set({currentProduct}).
  // Capture that arg to exercise the private legacy transform end-to-end.
  function captureMirror(product, mode) {
    const win = makeWindow();
    let mirrored = null;
    win.chrome = {
      runtime: { lastError: null },
      storage: {
        local: {
          set: (obj, cb) => {
            if (obj.currentProduct) mirrored = obj.currentProduct;
            cb && cb();
          },
        },
        session: {
          set: (obj, cb) => cb && cb(),
          get: (k, cb) => cb({}),
          remove: (k, cb) => cb && cb(),
        },
      },
    };
    loadInto(win, 'common/listing-draft.js');
    const draft = win.SSListingDraft.productToDraft(product, mode);
    win.SSListingDraft.saveDraft(draft);
    return mirrored;
  }

  test('legacy currentProduct carries sourceId', () => {
    const legacy = captureMirror(AMAZON_SINGLE, 'single');
    assert.ok(legacy, 'mirror not captured');
    assert.equal(legacy.sourceId, 'B08XYZ');
  });

  test('legacy shape preserves title, images, supplier', () => {
    const legacy = captureMirror(SUPPLIER_GENERIC, 'all');
    assert.equal(legacy.title, 'Generic Gadget');
    assert.deepEqual(legacy.images, ['https://img/x.jpg']);
    assert.equal(legacy.marketplace, 'aliexpress');
    assert.equal(legacy.sourceId, 'ALI-12345');
  });

  test('hasVariants true only when >1 variant', () => {
    const single = captureMirror(AMAZON_SINGLE, 'single');
    const multi = captureMirror(
      { ...AMAZON_SINGLE, variants: [{ attrs: { A: 1 } }, { attrs: { A: 2 } }] },
      'all'
    );
    assert.equal(single.hasVariants, false);
    assert.equal(multi.hasVariants, true);
  });
});
