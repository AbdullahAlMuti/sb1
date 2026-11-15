// amazon-v1-no-fabricated-price.test.js — the v1 (click-based fallback) Amazon
// scraper must obey the same "never guess a price" contract as v2: no
// placeholder price, no parent price passed off as a variant's own price, and
// no GBP/EUR/CAD amount relabelled as USD.
// Run: node --test apps/extension/tests/amazon-v1-no-fabricated-price.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeWindow, loadInto } from './helpers/load-global.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function load(host) {
  const win = makeWindow();
  win.location = { host, hostname: host, href: `https://${host}/dp/B0AAA11111` };
  loadInto(win, 'content_scripts/amazon-variant-scraper.js');
  return win.SsAmazonVariantScraper._internals;
}

describe('v1 resolveCurrency', () => {
  test('an already-resolved ISO code is returned unchanged', () => {
    const { _resolveCurrency } = load('www.amazon.co.uk');
    assert.equal(_resolveCurrency('GBP'), 'GBP');
    assert.equal(_resolveCurrency('EUR'), 'EUR');
  });

  test('explicit symbols map to their currency', () => {
    const { _resolveCurrency } = load('www.amazon.com');
    assert.equal(_resolveCurrency('£'), 'GBP');
    assert.equal(_resolveCurrency('€'), 'EUR');
    assert.equal(_resolveCurrency('$'), 'USD');
  });

  test('a bare "$" follows the storefront host', () => {
    assert.equal(load('www.amazon.ca')._resolveCurrency('$'), 'CAD');
    assert.equal(load('www.amazon.com.au')._resolveCurrency('$'), 'AUD');
  });

  test('a missing symbol follows the storefront host, not USD', () => {
    assert.equal(load('www.amazon.co.uk')._resolveCurrency(''), 'GBP');
    assert.equal(load('www.amazon.de')._resolveCurrency(undefined), 'EUR');
  });
});

describe('v1 _variantPrice — a variant is priced only from its own reading', () => {
  test('selected variant with a buybox price is verified', () => {
    const { _variantPrice } = load('www.amazon.com');
    const out = _variantPrice({ matched: true, bb: { priceAmount: 24.5, currencySymbol: '$' } });
    assert.deepEqual({ ...out }, { price: 24.5, currency: 'USD', priceVerified: true });
  });

  test('selected variant with no readable buybox is unpriced, not $999', () => {
    const { _variantPrice } = load('www.amazon.com');
    const out = _variantPrice({ matched: true, bb: null });
    assert.equal(out.price, null);
    assert.equal(out.priceVerified, false);
  });

  test('variant the page never switched to uses its own twister entry when present', () => {
    const { _variantPrice } = load('www.amazon.co.uk');
    const out = _variantPrice({ matched: false, hit: { priceAmount: 12, currencySymbol: '£' } });
    assert.deepEqual({ ...out }, { price: 12, currency: 'GBP', priceVerified: true });
  });

  test('variant the page never switched to does not borrow the parent price', () => {
    const { _variantPrice } = load('www.amazon.com');
    const out = _variantPrice({ matched: false, hit: null });
    assert.equal(out.price, null);
    assert.equal(out.priceVerified, false);
  });

  test('an unpriced variant still reports the storefront currency', () => {
    const { _variantPrice } = load('www.amazon.de');
    assert.equal(_variantPrice({ matched: true, bb: null }).currency, 'EUR');
  });
});

describe('v1 _baseFromVariants — product-level price', () => {
  test('uses a verified in-stock variant and keeps its currency', () => {
    const { _baseFromVariants } = load('www.amazon.co.uk');
    const out = _baseFromVariants([
      { price: null, priceVerified: false, currency: 'GBP', quantity: 3 },
      { price: 18, priceVerified: true, currency: 'GBP', quantity: 2 },
    ]);
    assert.deepEqual({ ...out }, { price: 18, currency: 'GBP', quantity: 2 });
  });

  test('is unpriced when no variant has a verified price', () => {
    const { _baseFromVariants } = load('www.amazon.com');
    const out = _baseFromVariants([{ price: null, priceVerified: false, currency: 'USD', quantity: 1 }]);
    assert.equal(out.price, 0);
  });
});

describe('v1 source guard', () => {
  test('no placeholder price literal', () => {
    const src = readFileSync(join(__dirname, '..', 'content_scripts', 'amazon-variant-scraper.js'), 'utf8');
    assert.equal(/price\s*=\s*999\b/.test(src), false);
  });
});
