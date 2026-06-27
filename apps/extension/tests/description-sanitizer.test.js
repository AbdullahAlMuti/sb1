// description-sanitizer.test.js — proves supplier identifiers are stripped from
// eBay listing descriptions and titles before reaching eBay (B1 fix).
// Run: node --test apps/extension/tests/description-sanitizer.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadAdapt() {
  const win = makeWindow();
  loadInto(win, 'common/sku-engine.js');
  loadInto(win, 'common/ebay-listing-api.js');
  return win.EbayListingApiHelper.adaptProduct;
}

const BASE = {
  isSingleMode: true,
  asin: 'B09TEST',
  parentAsin: 'B09TEST',
  title: 'Product Title',
  images: ['https://img/a.jpg'],
  price: 10,
  finalPrice: 15,
  hasVariants: false,
  variants: [],
};

function adapt(overrides) {
  return loadAdapt()({ ...BASE, ...overrides });
}

// ─── Plain-text description path ──────────────────────────────────────────────

describe('description (plain text) — supplier phrases stripped', () => {
  test('strips "Sold by Amazon" full phrase', () => {
    const { prod_desc } = adapt({ description: 'Great product. Sold by Amazon Inc. Free returns.' });
    assert.ok(!prod_desc.includes('Sold by'), `still contains "Sold by": ${prod_desc}`);
    assert.ok(!prod_desc.includes('Amazon Inc'), prod_desc);
  });

  test('strips "Fulfilled by Amazon" full phrase', () => {
    const { prod_desc } = adapt({ description: 'Fulfilled by Amazon. Ships next day.' });
    assert.ok(!prod_desc.includes('Fulfilled by'), prod_desc);
    assert.ok(!prod_desc.includes('Amazon'), prod_desc);
  });

  test('strips "Dispatched by Amazon" full phrase', () => {
    const { prod_desc } = adapt({ description: 'Dispatched by Amazon from UK warehouse.' });
    assert.ok(!prod_desc.includes('Dispatched by'), prod_desc);
  });

  test('strips "Ships from Amazon" phrase', () => {
    const { prod_desc } = adapt({ description: 'Ships from Amazon warehouse in 2 days.' });
    assert.ok(!prod_desc.includes('Amazon'), prod_desc);
  });

  test('strips "Visit the Amazon Store" phrase', () => {
    const { prod_desc } = adapt({ description: 'Visit the Amazon Store for more products.' });
    assert.ok(!prod_desc.includes('Amazon'), prod_desc);
  });

  test('strips "Visit the Store" generic phrase', () => {
    const { prod_desc } = adapt({ description: 'Visit the Store page for our full catalog.' });
    assert.ok(!prod_desc.includes('Visit the'), prod_desc);
  });

  test('strips amazon.com domain name', () => {
    const { prod_desc } = adapt({ description: 'See more at amazon.com today.' });
    assert.ok(!prod_desc.includes('amazon.com'), prod_desc);
  });

  test('strips walmart.com domain name', () => {
    const { prod_desc } = adapt({ description: 'Also available at walmart.com.' });
    assert.ok(!prod_desc.includes('walmart.com'), prod_desc);
  });

  test('strips "Amazon Basics" private-label brand', () => {
    const { prod_desc } = adapt({ description: 'Amazon Basics quality guarantee included.' });
    assert.ok(!prod_desc.includes('Amazon Basics'), prod_desc);
  });

  test('strips "Amazon\'s Choice" shopping signal', () => {
    const { prod_desc } = adapt({ description: "Amazon's Choice for kitchen tools." });
    assert.ok(!prod_desc.includes("Amazon's Choice"), prod_desc);
  });

  test('strips "#1 Best Seller" ranking phrase', () => {
    const { prod_desc } = adapt({ description: '#1 Best Seller in Kitchen Appliances.' });
    assert.ok(!prod_desc.includes('Best Seller'), prod_desc);
  });

  test('strips bare ASIN keyword', () => {
    const { prod_desc } = adapt({ description: 'ASIN B09TEST123. Quality product.' });
    assert.ok(!prod_desc.includes('ASIN'), prod_desc);
  });

  test('strips URL from description', () => {
    const { prod_desc } = adapt({ description: 'More info at https://www.amazon.com/dp/B09TEST.' });
    assert.ok(!prod_desc.includes('https://'), prod_desc);
  });

  test('strips phrase from bullet points', () => {
    const { prod_desc } = adapt({
      bulletPoints: ['Durable and lightweight', 'Sold by Amazon — fast shipping', 'Money-back guarantee'],
    });
    assert.ok(!prod_desc.includes('Sold by'), prod_desc);
    assert.ok(!prod_desc.includes('Amazon'), prod_desc);
    assert.ok(prod_desc.includes('Durable'), prod_desc);
    assert.ok(prod_desc.includes('Money-back guarantee'), prod_desc);
  });
});

// ─── HTML description path (was completely unsanitized before B1) ─────────────

describe('description (HTML) — supplier phrases stripped', () => {
  test('strips "Sold by" from HTML paragraph', () => {
    const { prod_desc } = adapt({
      description: '<p>Great item.</p><p>Sold by Acme Corp via Amazon.</p>',
    });
    assert.ok(!prod_desc.includes('Sold by'), prod_desc);
    assert.ok(!prod_desc.includes('Amazon'), prod_desc);
    assert.ok(prod_desc.includes('Great item'), prod_desc);
  });

  test('strips amazon.com from HTML link text', () => {
    const { prod_desc } = adapt({
      description: '<p>Find more at <a href="#">amazon.com</a>.</p>',
    });
    assert.ok(!prod_desc.includes('amazon.com'), prod_desc);
  });

  test('strips <img> tags from HTML description', () => {
    const { prod_desc } = adapt({
      description: '<p>See image:</p><img src="https://img.amazon.com/badge.png"><p>Details here.</p>',
    });
    assert.ok(!prod_desc.includes('<img'), prod_desc);
    assert.ok(prod_desc.includes('Details here'), prod_desc);
  });

  test('strips "Amazon Basics" from HTML with inline formatting', () => {
    const { prod_desc } = adapt({
      description: '<p>By <strong>Amazon Basics</strong> — trusted quality.</p>',
    });
    assert.ok(!prod_desc.includes('Amazon Basics'), prod_desc);
  });

  test('strips "Fulfilled by Amazon" from HTML list item', () => {
    const { prod_desc } = adapt({
      description: '<ul><li>Prime eligible</li><li>Fulfilled by Amazon</li></ul>',
    });
    assert.ok(!prod_desc.includes('Fulfilled by'), prod_desc);
    assert.ok(!prod_desc.includes('Amazon'), prod_desc);
    assert.ok(prod_desc.includes('Prime eligible'), prod_desc);
  });

  test('strips "Amazon\'s Choice" badge text from HTML', () => {
    const { prod_desc } = adapt({
      description: "<div class='badge'>Amazon's Choice</div><p>Product details.</p>",
    });
    assert.ok(!prod_desc.includes("Amazon's Choice"), prod_desc);
    assert.ok(prod_desc.includes('Product details'), prod_desc);
  });

  test('does not corrupt HTML tag attributes', () => {
    const { prod_desc } = adapt({
      description: '<ul><li class="highlight">Feature one</li><li>Feature two</li></ul>',
    });
    assert.ok(prod_desc.includes('class="highlight"'), prod_desc);
    assert.ok(prod_desc.includes('Feature one'), prod_desc);
  });
});

// ─── Title sanitization ───────────────────────────────────────────────────────

describe('title — supplier identifier stripping', () => {
  test('strips "Amazon\'s Choice" from title', () => {
    const { prod_title } = adapt({ title: "Amazon's Choice Wireless Headphones 2024" });
    assert.ok(!prod_title.includes("Amazon's Choice"), prod_title);
    assert.ok(prod_title.includes('Wireless Headphones'), prod_title);
  });

  test('strips "Amazon Basics" brand from title', () => {
    const { prod_title } = adapt({ title: 'Amazon Basics USB-C Cable 6ft Fast Charge' });
    assert.ok(!prod_title.includes('Amazon Basics'), prod_title);
    assert.ok(prod_title.length <= 80, `title too long: ${prod_title.length}`);
  });

  test('strips "Best Seller" from title', () => {
    const { prod_title } = adapt({ title: 'Best Seller Kitchen Knife Set Stainless Steel' });
    assert.ok(!prod_title.includes('Best Seller'), prod_title);
    assert.ok(prod_title.includes('Kitchen Knife'), prod_title);
  });

  test('strips amazon.com from title', () => {
    const { prod_title } = adapt({ title: 'Widget Pro from amazon.com Official Store' });
    assert.ok(!prod_title.includes('amazon.com'), prod_title);
  });

  test('result is still ≤ 80 chars after stripping long supplier phrases', () => {
    const { prod_title } = adapt({
      title: "Amazon's Choice #1 Best Seller Amazon Basics Wireless Noise Cancelling Headphones Over Ear",
    });
    assert.ok(prod_title.length <= 80, `too long: ${prod_title.length} — "${prod_title}"`);
    assert.ok(!prod_title.includes('Amazon'), prod_title);
  });

  test('strips "Sold by Amazon" from title', () => {
    const { prod_title } = adapt({ title: 'Leather Wallet Slim Sold by Amazon Premium' });
    assert.ok(!prod_title.includes('Sold by'), prod_title);
    assert.ok(!prod_title.includes('Amazon'), prod_title);
  });
});

// ─── B2 — user-edited (SKU-override) title path ──────────────────────────────
// All upload paths flow: panel finalTitle → import_ebay → chrome.storage
// → ebay_prelist.js → SellerSuitUploader.run → adaptProduct → _enforceEbayTitle.
// There is no bypass; this test locks that guarantee in.

describe('title — user-edited override path (B2)', () => {
  test('manually typed supplier title is sanitized through adaptProduct', () => {
    const { prod_title } = adapt({
      title: "Amazon's Choice - Amazon Basics Wireless Mouse Fulfilled by Amazon",
    });
    assert.ok(!prod_title.includes("Amazon's Choice"), prod_title);
    assert.ok(!prod_title.includes('Amazon Basics'), prod_title);
    assert.ok(!prod_title.includes('Fulfilled by'), prod_title);
    assert.ok(prod_title.includes('Wireless Mouse'), prod_title);
    assert.ok(prod_title.length <= 80, `too long: ${prod_title.length} — "${prod_title}"`);
  });

  test('pasted Amazon title over 80 chars is truncated + sanitized', () => {
    const { prod_title } = adapt({
      title: "Amazon's Choice Best Seller Acme Brand Premium Wireless Noise Cancelling Over Ear Headphones with Mic",
    });
    assert.ok(prod_title.length <= 80, `too long: ${prod_title.length}`);
    assert.ok(!prod_title.includes("Amazon's Choice"), prod_title);
    assert.ok(!prod_title.includes('Best Seller'), prod_title);
  });
});

// ─── False-positive guard — legitimate content must not be stripped ────────────

describe('false-positive guard', () => {
  test('neutral product description preserved in full', () => {
    const { prod_desc } = adapt({
      description: 'High quality stainless steel knife. Dishwasher safe. 6-inch blade.',
    });
    assert.ok(prod_desc.includes('stainless steel'), prod_desc);
    assert.ok(prod_desc.includes('Dishwasher safe'), prod_desc);
  });

  test('legitimate third-party brand name not stripped', () => {
    const { prod_title } = adapt({ title: 'KitchenAid Stand Mixer Bowl 5 Quart Stainless' });
    assert.ok(prod_title.includes('KitchenAid'), prod_title);
  });

  test('"sold" in non-"sold by" context is preserved', () => {
    const { prod_desc } = adapt({ description: 'Over 10,000 units sold worldwide.' });
    assert.ok(prod_desc.includes('sold'), prod_desc);
  });

  test('"ships" in non-supplier context preserved', () => {
    const { prod_desc } = adapt({ description: 'Package ships in protective foam padding.' });
    assert.ok(prod_desc.includes('ships'), prod_desc);
  });

  test('HTML structure preserved after sanitization', () => {
    const { prod_desc } = adapt({
      description: '<ul><li>Durable</li><li>Lightweight</li><li>Waterproof</li></ul>',
    });
    assert.ok(prod_desc.includes('<ul>'), prod_desc);
    assert.ok(prod_desc.includes('<li>Durable</li>'), prod_desc);
    assert.ok(prod_desc.includes('<li>Waterproof</li>'), prod_desc);
  });

  test('empty description falls back to default placeholder', () => {
    const { prod_desc } = adapt({ description: '' });
    assert.ok(prod_desc.length > 0, 'should not be empty');
  });
});
