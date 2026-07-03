// e2e-simulation.test.js — end-to-end simulation of the listing pipeline's
// pure seams, driving the mandatory debug matrix:
//   normal / missing / invalid / decimal price · changed pricing rules ·
//   product with / without supplier ID · long messy title · dirty supplier
//   description · multiple listings in a row (SKU isolation).
// Auto-Edit ON/OFF wiring is locked separately in auto-edit-mode.test.js;
// admin prompt/template fetch is server-side (generate-titles /
// generate-description-v2 read admin_settings + description_config per
// request — no client cache to go stale).
// Run: node --test apps/extension/tests/e2e-simulation.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadPipeline() {
  const win = makeWindow();
  loadInto(win, 'common/pricing-engine.js');
  loadInto(win, 'common/sku-engine.js');
  loadInto(win, 'common/variation-normalizer.js');
  loadInto(win, 'common/ebay-listing-api.js');
  return win;
}

// Simulates the scan-time pricing stamp all three injectors perform
// (amazon _applyPricingToProduct / walmart _wmApplyPricingToProduct /
// aliexpress applyPricing): finalPrice from SSPricingEngine.
function stampPricing(win, product, cfg) {
  const p = { ...product };
  p.finalPrice = win.SSPricingEngine.calculatePrice(p.price, cfg);
  p.ebayFinalPrice = p.finalPrice;
  p.supplierPrice = p.price;
  return p;
}

const CFG_DEFAULT = null; // engine falls back to DEFAULTS
const CFG_HIGH_PROFIT = { taxPercent: 9, trackingFee: 0.20, ebayFeePercent: 20, promoFeePercent: 10, desiredProfit: 15, paymentFixedFee: 0.30 };

const BASE = {
  isSingleMode: true,
  asin: 'B0TEST123',
  parentAsin: 'B0TEST123',
  supplier: 'amazon',
  title: 'Stainless Steel Water Bottle 24oz Insulated',
  description: 'Keeps drinks cold for 24 hours.',
  images: ['https://img/a.jpg'],
  price: 12.49,
  hasVariants: false,
  variants: [],
};

describe('E2E case: normal price → dashboard-calculated eBay price, never supplier price', () => {
  test('final eBay price equals the pricing-engine output for the user settings', () => {
    const win = loadPipeline();
    const staged = stampPricing(win, BASE, CFG_DEFAULT);
    const adapted = win.EbayListingApiHelper.adaptProduct(staged);
    const expected = win.SSPricingEngine.calculatePrice(12.49, CFG_DEFAULT);
    assert.equal(adapted.prod_variations[0].price, expected);
    assert.notEqual(adapted.prod_variations[0].price, 12.49, 'supplier price must never be the eBay price');
    assert.equal(adapted.prod_variations[0].raw_supplier_price, 12.49);
  });

  test('decimal supplier price rounds to 2 decimals', () => {
    const win = loadPipeline();
    const staged = stampPricing(win, { ...BASE, price: 7.777 }, CFG_DEFAULT);
    const adapted = win.EbayListingApiHelper.adaptProduct(staged);
    const decimals = (String(adapted.prod_variations[0].price).split('.')[1] || '').length;
    assert.ok(decimals <= 2, `price ${adapted.prod_variations[0].price} not rounded`);
  });
});

describe('E2E case: changed dashboard pricing rules affect the next listing', () => {
  test('same product, higher desiredProfit → strictly higher eBay price', () => {
    const win = loadPipeline();
    const before = win.EbayListingApiHelper.adaptProduct(stampPricing(win, BASE, CFG_DEFAULT));
    const after = win.EbayListingApiHelper.adaptProduct(stampPricing(win, BASE, CFG_HIGH_PROFIT));
    assert.ok(after.prod_variations[0].price > before.prod_variations[0].price,
      `rule change ignored: ${after.prod_variations[0].price} <= ${before.prod_variations[0].price}`);
  });
});

describe('E2E case: missing / invalid price is blocked before reaching eBay', () => {
  test('missing price → SellerSuitUploader.run rejects with a clear error (no network)', async () => {
    const win = loadPipeline();
    const noPrice = { ...BASE }; // no finalPrice/ebayFinalPrice stamped
    await assert.rejects(
      () => win.SellerSuitUploader.run(noPrice),
      /eBay Final Price is missing/,
    );
  });

  test('invalid (NaN) price → rejected', async () => {
    const win = loadPipeline();
    const bad = { ...BASE, finalPrice: 'not-a-number', ebayFinalPrice: 'not-a-number' };
    await assert.rejects(() => win.SellerSuitUploader.run(bad), /eBay Final Price is missing/);
  });

  test('price equal to supplier price (markup not applied) → rejected unless manual', async () => {
    const win = loadPipeline();
    const leak = { ...BASE, finalPrice: 12.49, ebayFinalPrice: 12.49, supplierPrice: 12.49 };
    await assert.rejects(() => win.SellerSuitUploader.run(leak), /equal to the original Supplier Price/);
  });

  test('manual price override is allowed even when equal to supplier price', async () => {
    const win = loadPipeline();
    // With price_source manual, validation passes — run() then proceeds to the
    // eBay-auth preflight, which we stub to fail so no network is touched.
    const manual = { ...BASE, finalPrice: 12.49, ebayFinalPrice: 12.49, supplierPrice: 12.49, price_source: 'manual' };
    win.EbayListingApiHelper.checkEbayAuth = async () => false;
    await assert.rejects(() => win.SellerSuitUploader.run(manual), /not logged into eBay/,
      'must pass pricing validation and fail only at the (stubbed) auth preflight');
  });
});

describe('E2E case: product with and without supplier ID → SKU always generated', () => {
  test('with ID: readable supplier-prefixed SKU', () => {
    const win = loadPipeline();
    const adapted = win.EbayListingApiHelper.adaptProduct(stampPricing(win, BASE, CFG_DEFAULT));
    assert.equal(adapted.prod_variations[0].sku, 'AZS-B0TEST123');
  });

  test('without ID: deterministic title-hash SKU, unique across products', () => {
    const win = loadPipeline();
    const noId = { ...BASE, asin: undefined, parentAsin: undefined, sourceId: undefined };
    const a = win.EbayListingApiHelper.adaptProduct(stampPricing(win, noId, CFG_DEFAULT));
    const b = win.EbayListingApiHelper.adaptProduct(stampPricing(win, { ...noId, title: 'Completely Different Product Name' }, CFG_DEFAULT));
    assert.match(a.prod_variations[0].sku, /^AZS-T[A-Z0-9]{6}$/);
    assert.notEqual(a.prod_variations[0].sku, b.prod_variations[0].sku);
    assert.ok(a.prod_variations[0].sku.length <= win.SSSkuEngine.MAX_LEN);
  });
});

describe('E2E case: multiple listings in a row → no cross-product SKU/data bleed', () => {
  test('sequential adapts of different products never share SKUs or prices', () => {
    const win = loadPipeline();
    const products = [
      { ...BASE, asin: 'B0AAA1111', parentAsin: 'B0AAA1111', price: 10 },
      { ...BASE, asin: 'B0BBB2222', parentAsin: 'B0BBB2222', price: 20 },
      { ...BASE, asin: 'B0CCC3333', parentAsin: 'B0CCC3333', price: 30 },
    ];
    const skus = new Set();
    let lastPrice = 0;
    for (const p of products) {
      const adapted = win.EbayListingApiHelper.adaptProduct(stampPricing(win, p, CFG_DEFAULT));
      const v = adapted.prod_variations[0];
      assert.ok(!skus.has(v.sku), `duplicate SKU across listings: ${v.sku}`);
      skus.add(v.sku);
      assert.ok(v.price > lastPrice, 'each product must carry its own calculated price');
      lastPrice = v.price;
    }
  });
});

describe('E2E case: long messy title + dirty supplier description', () => {
  test('80+ char Amazon-badged title → sanitized, word-boundary trimmed, ≤ 80', () => {
    const win = loadPipeline();
    const messy = {
      ...BASE,
      title: "Amazon's Choice #1 Best Seller Amazon Basics Premium Stainless Steel Insulated Water Bottle 24oz Wide Mouth BPA Free (Pack of 2) | Leak Proof",
    };
    const adapted = win.EbayListingApiHelper.adaptProduct(stampPricing(win, messy, CFG_DEFAULT));
    assert.ok(adapted.prod_title.length <= 80, `title too long: ${adapted.prod_title.length}`);
    assert.ok(!/amazon/i.test(adapted.prod_title), adapted.prod_title);
    assert.ok(!adapted.prod_title.includes('|'), 'pipe separators must be stripped');
    assert.ok(adapted.prod_title.includes('Stainless Steel'), 'legitimate keywords preserved');
  });

  test('description with links/ASIN/UPC/rank/supplier refs → all stripped', () => {
    const win = loadPipeline();
    const dirty = {
      ...BASE,
      description:
        '<p>Sold by Amazon. ASIN B0TEST123. UPC 012345678905.</p>' +
        '<p>#1 Best Seller in Kitchen. See https://www.amazon.com/dp/B0TEST123</p>' +
        '<img src="https://m.media-amazon.com/badge.png">' +
        '<p>Double-wall vacuum insulation keeps drinks cold.</p>',
    };
    const adapted = win.EbayListingApiHelper.adaptProduct(stampPricing(win, dirty, CFG_DEFAULT));
    const d = adapted.prod_desc;
    assert.ok(!/amazon/i.test(d), d);
    assert.ok(!/\bASIN\b/i.test(d), d);
    assert.ok(!/\bUPC\b/i.test(d), d);
    assert.ok(!/Best Seller/i.test(d), d);
    assert.ok(!/https?:\/\//i.test(d), d);
    assert.ok(!/<img/i.test(d), d);
    assert.ok(d.includes('Double-wall vacuum insulation'), 'legitimate copy preserved');
  });
});
