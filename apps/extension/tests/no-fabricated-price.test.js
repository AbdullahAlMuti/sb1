// no-fabricated-price.test.js — downstream half of the "never guess a price"
// contract: pricing-apply and adaptProduct must not invent a cost or a selling
// price for a variant the scraper could not verify, shipping is part of cost,
// non-USD is refused, and the mock-upload ASIN backdoor is gone.
// Run: node --test apps/extension/tests/no-fabricated-price.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeWindow, loadInto } from './helpers/load-global.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadPricing() {
  const win = makeWindow();
  loadInto(win, 'suppliers/core/pricing-core.js');
  loadInto(win, 'common/pricing-apply.js');
  return win;
}

const RULES = {
  suppliers: [{
    supplierKey: 'amazon', isEnabled: true, ruleVersion: 3,
    calculationRule: {
      formulaVersion: 2, perOrderFee: 0.30, profitMarginPercent: 20, minimumProfit: 0,
      shippingBuffer: 0, fixedHandlingFee: 0, marketplaceFeePercent: 13.25,
      currencyBufferPercent: 0, roundingRule: 'NONE',
    },
  }],
};

describe('SSPricingApply — unverified variants and cost inputs', () => {
  test('an unverified variant is left unpriced and never borrows the parent price', () => {
    const win = loadPricing();
    const product = {
      supplier: 'amazon', price: 20, currency: 'USD',
      variants: [
        { attrs: { Color: { productName: 'Red' } }, price: 20, priceVerified: true },
        { attrs: { Color: { productName: 'Blue' } }, price: null, priceVerified: false },
      ],
    };
    win.SSPricingApply.applyWithRules(product, RULES, 'amazon');
    assert.ok(product.variants[0].finalPrice > 20);
    assert.equal(product.variants[1].finalPrice, undefined);
    assert.equal(product.variants[1].ebayPrice, undefined);
    assert.equal(product.variants[1].raw_supplier_price, undefined);
  });

  test('supplier shipping cost raises the selling price', () => {
    const win = loadPricing();
    const free = { supplier: 'amazon', price: 20, currency: 'USD', shippingCost: 0 };
    const paid = { supplier: 'amazon', price: 20, currency: 'USD', shippingCost: 6.99 };
    win.SSPricingApply.applyWithRules(free, RULES, 'amazon');
    win.SSPricingApply.applyWithRules(paid, RULES, 'amazon');
    assert.ok(paid.finalPrice > free.finalPrice + 6.99, `${paid.finalPrice} vs ${free.finalPrice}`);
  });

  test('a non-USD product is refused, not priced as if it were USD', () => {
    const win = loadPricing();
    const product = { supplier: 'amazon', price: 20, currency: 'CAD' };
    const out = win.SSPricingApply.applyWithRules(product, RULES, 'amazon');
    assert.equal(out.priced, false);
    assert.equal(out.reason, 'unsupported_currency');
    assert.equal(product.finalPrice, undefined);
  });
});

function loadApi() {
  const win = makeWindow();
  loadInto(win, 'common/sku-engine.js');
  loadInto(win, 'common/variation-normalizer.js');
  loadInto(win, 'common/ebay-listing-api.js');
  return win;
}

const variant = (name, extra) => ({
  attrs: { Color: { productName: name } }, price: 20, finalPrice: 30, priceVerified: true, ...extra,
});

describe('adaptProduct — only verified, sellable variants are uploaded', () => {
  test('unverified variants are dropped', () => {
    const win = loadApi();
    const adapted = win.EbayListingApiHelper.adaptProduct({
      title: 'Thing', asin: 'B0AAA11111', supplier: 'amazon', price: 20, hasVariants: true,
      images: ['https://x/1.jpg'],
      variants: [variant('Red'), variant('Blue'), variant('Green', { price: null, finalPrice: undefined, priceVerified: false })],
    });
    assert.equal(adapted.prod_variations.length, 2);
  });

  test('when every variant is unsellable it throws instead of uploading them all', () => {
    const win = loadApi();
    assert.throws(() => win.EbayListingApiHelper.adaptProduct({
      title: 'Thing', asin: 'B0AAA11111', supplier: 'amazon', price: 20, hasVariants: true,
      images: ['https://x/1.jpg'],
      variants: [variant('Red', { inStock: false }), variant('Blue', { priceVerified: false })],
    }), /No sellable variations/);
  });

  test('up to 24 images are passed through', () => {
    const win = loadApi();
    const images = Array.from({ length: 30 }, (_, i) => `https://x/${i}.jpg`);
    const adapted = win.EbayListingApiHelper.adaptProduct({
      title: 'Thing', asin: 'B0AAA11111', supplier: 'amazon', price: 20, finalPrice: 30, images,
    });
    assert.equal(adapted.prod_images.length, 24);
  });

  test('location is always United States', () => {
    const win = loadApi();
    const adapted = win.EbayListingApiHelper.adaptProduct({
      title: 'Thing', asin: 'B0AAA11111', supplier: 'amazon', price: 20, finalPrice: 30, images: ['https://x/1.jpg'],
    });
    assert.equal(adapted.meta.country, 'US');
  });
});

describe('source guards', () => {
  const src = readFileSync(join(__dirname, '..', 'common', 'ebay-listing-api.js'), 'utf8');

  test('no hard-coded mock-upload ASIN in the upload path', () => {
    assert.equal(src.includes('B08KT2Z93D'), false);
  });

  test('no silent $0.99 price fallback', () => {
    assert.equal(/price\s*=\s*0\.99\b/i.test(src.replace('EBAY_MIN_PRICE = 0.99', '')), false);
    assert.equal(/\|\|\s*0\.99\b/.test(src), false);
  });
});
