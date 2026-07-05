// scan-pricing-parity.test.js — every supplier injector must stamp finalPrice
// at scan time in its SCRAPE_SINGLE / SCRAPE_VARIANTS handler. The side panel
// re-prices products that arrive without finalPrice, but the Bulk Lister
// (background/listing-runner.js scrapeSupplierProduct) consumes the scrape
// response directly — a supplier that skips pricing makes every bulk item for
// that supplier fail validateProductPricing ("eBay Final Price is missing").
// Run: node --test apps/extension/tests/scan-pricing-parity.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = join(__dirname, '..');
const read = (rel) => readFileSync(join(EXT_ROOT, rel), 'utf8');

// Extract the SCRAPE_SINGLE/SCRAPE_VARIANTS handler region of an injector:
// from the action check to the closing `return true;` (bounded window).
function scrapeHandlerRegion(src) {
  const idx = src.search(/['"]SCRAPE_SINGLE['"]\s*\|\|\s*request\.action\s*===\s*['"]SCRAPE_VARIANTS['"]/);
  assert.ok(idx > -1, 'injector must handle SCRAPE_SINGLE || SCRAPE_VARIANTS');
  return src.slice(idx, idx + 2000);
}

describe('scan-time pricing parity across supplier injectors', () => {
  test('amazon_injector applies pricing in its scan handlers', () => {
    const src = read('content_scripts/amazon_injector.js');
    assert.match(src, /_applyPricingToProduct\(/, 'amazon must stamp finalPrice at scan time');
  });

  test('walmart_injector applies pricing inside the SCRAPE handler', () => {
    const src = read('content_scripts/walmart_injector.js');
    const region = scrapeHandlerRegion(src);
    assert.match(region, /_wmApplyPricingToProduct\(/,
      'walmart SCRAPE_SINGLE/SCRAPE_VARIANTS must stamp finalPrice before responding (Bulk Lister reads the response directly)');
  });

  test('aliexpress_injector applies pricing in its scan path', () => {
    const src = read('content_scripts/aliexpress_injector.js');
    assert.match(src, /applyPricing\(product,/, 'aliexpress must stamp finalPrice at scan time');
  });

  test('walmart pricing helper respects manual edits (fill-only)', () => {
    const src = read('content_scripts/walmart_injector.js');
    assert.match(src, /SSPricingEngine\.applyPricingToProduct/,
      'delegates to applyPricingToProduct which preserves manual edits');
  });

  test('walmart pricing helper uses SSPricingEngine (no duplicated math)', () => {
    const src = read('content_scripts/walmart_injector.js');
    assert.match(src, /SSPricingEngine\.applyPricingToProduct/,
      'must delegate to the shared pricing engine, not reimplement the formula');
  });

  test('ui/calculator.js keeps its load-bearing window assignment', () => {
    // Without a side effect this module is DROPPED from the Vite IIFE bundles,
    // silently removing calculateSellingPrice — every scan-time pricing call
    // then no-ops behind its `typeof` guard (observed live: finalPrice never
    // stamped in the packaged extension). The window assignment is the fix.
    const src = read('ui/calculator.js');
    assert.match(src, /window\.calculateSellingPrice\s*=\s*calculateSellingPrice/,
      'calculator.js must expose calculateSellingPrice on window — bundle inclusion depends on it');
  });

  test('built amazon bundle (if present) actually contains calculateSellingPrice', (t) => {
    // Bundle-level canary: catches any future bundler change that drops the
    // module again. Skipped when no build output exists (e.g. fresh checkout).
    const bundlePath = join(EXT_ROOT, 'build', 'amazon.bundle.js');
    let bundle;
    try { bundle = readFileSync(bundlePath, 'utf8'); } catch { t.skip('build/amazon.bundle.js not built'); return; }
    assert.match(bundle, /function calculateSellingPrice/,
      'packaged amazon bundle lost calculateSellingPrice — scan-time pricing would silently die');
  });
});
