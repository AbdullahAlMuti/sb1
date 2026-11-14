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

// ── Regression: dashboard pricing change must survive the draft mirror ────────
// Bug (2026-11-15): after a Supplier Pricing save the panel re-priced
// currentProduct, then patchDraft({variants}) re-mirrored the draft — whose
// pricing.finalPrice was still the scan-time value — back over currentProduct.
// The new top-level price reverted and ebayPrice was dropped, so the listing
// uploaded at the OLD price.
describe('re-price → draft sync keeps the new price', () => {
  function statefulWindow() {
    const win = makeWindow();
    const store = {};
    const clone = (x) => JSON.parse(JSON.stringify(x));
    win.chrome = {
      runtime: { lastError: null },
      storage: {
        local: {
          get: (k, cb) => {
            const o = {};
            [].concat(k).forEach((key) => { if (key in store) o[key] = clone(store[key]); });
            cb(o);
          },
          set: (obj, cb) => { Object.assign(store, clone(obj)); cb && cb(); },
          remove: (k, cb) => { [].concat(k).forEach((key) => delete store[key]); cb && cb(); },
        },
      },
    };
    loadInto(win, 'common/listing-draft.js');
    return { D: win.SSListingDraft, store };
  }

  const SCANNED = {
    marketplace: 'amazon', asin: 'B0X', price: 10, finalPrice: 19.99,
    variants: [{ asin: 'B0X', price: 10, finalPrice: 19.99, ebayPrice: 19.99, price_source: 'calculated' }],
  };

  function reprice(product, price) {
    const p = JSON.parse(JSON.stringify(product));
    p.finalPrice = price; p.ebayPrice = price; p.price_source = 'calculated';
    p.pricingRuleVersion = 7; p.supplierKey = 'amazon'; p.shippingCost = 0;
    p.variants.forEach((v) => { v.finalPrice = price; v.ebayPrice = price; });
    return p;
  }

  test('syncPricingFromProduct: currentProduct keeps the re-priced values', async () => {
    const { D, store } = statefulWindow();
    await D.saveDraft(D.productToDraft(SCANNED, 'single'));
    const updated = reprice(store.currentProduct, 24.99);
    await D.syncPricingFromProduct(updated);

    assert.equal(store.currentProduct.finalPrice, 24.99);
    assert.equal(store.currentProduct.ebayPrice, 24.99);
    assert.equal(store.currentProduct.pricingRuleVersion, 7);
    assert.equal(store.currentProduct.supplierKey, 'amazon');
    assert.equal(store.currentProduct.variants[0].finalPrice, 24.99);
    assert.equal(store.listingDraft.pricing.finalPrice, 24.99);
  });

  test('syncPricingFromProduct: manual price_source is carried, not reset', async () => {
    const { D, store } = statefulWindow();
    await D.saveDraft(D.productToDraft(SCANNED, 'single'));
    const updated = { ...reprice(store.currentProduct, 30), price_source: 'manual' };
    await D.syncPricingFromProduct(updated);
    assert.equal(store.currentProduct.price_source, 'manual');
    assert.equal(store.currentProduct.finalPrice, 30);
  });

  test('syncPricingFromProduct: clearing a price (unpriced) is mirrored, not resurrected', async () => {
    const { D, store } = statefulWindow();
    await D.saveDraft(D.productToDraft(SCANNED, 'single'));
    const updated = { ...store.currentProduct, finalPrice: null, ebayPrice: null,
      pricingIssue: { reason: 'rule_disabled' } };
    await D.syncPricingFromProduct(updated);
    assert.equal(store.currentProduct.finalPrice, null);
    assert.deepEqual(store.currentProduct.pricingIssue, { reason: 'rule_disabled' });
  });

  test('legacy mirror preserves ebayPrice / ruleVersion / supplierKey / shippingCost from scan', async () => {
    const { D, store } = statefulWindow();
    await D.saveDraft(D.productToDraft({ ...SCANNED, ebayPrice: 19.99, pricingRuleVersion: 3,
      supplierKey: 'amazon', shippingCost: 4.5 }, 'single'));
    assert.equal(store.currentProduct.ebayPrice, 19.99);
    assert.equal(store.currentProduct.pricingRuleVersion, 3);
    assert.equal(store.currentProduct.supplierKey, 'amazon');
    assert.equal(store.currentProduct.shippingCost, 4.5);
  });

  test('patchDraft (e.g. AI title) keeps manual price edits and variant deletions made on currentProduct', async () => {
    const { D, store } = statefulWindow();
    const multi = { ...SCANNED, variants: [
      { asin: 'A', price: 10, finalPrice: 19.99, ebayPrice: 19.99, price_source: 'calculated' },
      { asin: 'B', price: 12, finalPrice: 21.99, ebayPrice: 21.99, price_source: 'calculated' },
    ] };
    await D.saveDraft(D.productToDraft(multi, 'all'));
    // Extended editor: manual parent price + delete variant B (writes currentProduct only)
    const edited = JSON.parse(JSON.stringify(store.currentProduct));
    edited.finalPrice = 29; edited.price_source = 'manual';
    edited.variants = edited.variants.filter((v) => v.asin !== 'B');
    edited.variants[0].ebayPrice = 27; edited.variants[0].price_source = 'manual';
    store.currentProduct = edited;

    await D.patchDraft({ title: 'AI title', title_source: 'ai' });

    assert.equal(store.currentProduct.title, 'AI title');
    assert.equal(store.currentProduct.finalPrice, 29);
    assert.equal(store.currentProduct.price_source, 'manual');
    assert.equal(store.currentProduct.variants.length, 1);
    assert.equal(store.currentProduct.variants[0].ebayPrice, 27);
  });

  test('patchDraft does not pull pricing from a currentProduct for a different item', async () => {
    const { D, store } = statefulWindow();
    await D.saveDraft(D.productToDraft(SCANNED, 'single'));
    store.currentProduct = { ...store.currentProduct, sourceId: 'OTHER', asin: 'OTHER', finalPrice: 99 };
    await D.patchDraft({ title: 'x' });
    assert.equal(store.currentProduct.finalPrice, 19.99);
  });

  test('side panel never re-mirrors a re-priced product with a variants-only patch', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../sidepanel/panel-main.js', import.meta.url), 'utf8');
    const variantsOnly = /patchDraft\(\{\s*variants:[^}]*variationCount:[^}]*\}\)/g;
    assert.deepEqual(src.match(variantsOnly) || [], [],
      'use SSListingDraft.syncPricingFromProduct(updatedProduct) so draft.pricing moves with the variants');
  });
});
