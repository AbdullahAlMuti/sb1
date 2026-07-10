// load-global.js — test helper to load a `window.X = ...` extension module into
// a fake window object, without a browser. Lets node:test exercise content-script
// globals (SSPricingCore, SSPricingApply, SSSkuEngine, EbayListingApiHelper, SSListingDraft).
//
// Usage:
//   const win = makeWindow();
//   loadInto(win, 'common/sku-engine.js');
//   loadInto(win, 'common/ebay-listing-api.js');
//   win.EbayListingApiHelper.adaptProduct(...)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = join(__dirname, '..', '..'); // apps/extension

/**
 * Build a minimal fake `window` with the globals extension modules expect at
 * load time. Stubs are inert — they never hit the network or chrome APIs.
 */
export function makeWindow() {
  const win = {};
  win.location = { host: 'www.ebay.com', href: '' };
  win.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  win.atob = (s) => Buffer.from(s, 'base64').toString('binary');
  return win;
}

/**
 * Evaluate an extension source file with `window` bound to the supplied fake.
 * The file's top-level `window.X = ...` assignments land on `win`.
 * @param {object} win   fake window from makeWindow()
 * @param {string} relPath  path relative to apps/extension (e.g. 'common/sku-engine.js')
 */
export function loadInto(win, relPath) {
  const src = readFileSync(join(EXT_ROOT, relPath), 'utf8');
  // Bind common globals the source may reference at load time. chrome/crypto are
  // stubbed inert — only orchestration methods use them, never load-time or the
  // pure functions under test (adaptProduct, calculatePrice, buildReadable).
  const sandboxKeys = [
    'window',
    'self',
    'globalThis',
    'chrome',
    'crypto',
    'console',
    'btoa',
    'atob',
    'document',
    'MutationObserver',
    'location',
  ];
  const sandboxVals = [
    win,
    win,
    win,
    win.chrome || {},
    win.crypto || { randomUUID: () => 'test-uuid' },
    console,
    win.btoa,
    win.atob,
    // Default undefined — set win.document / win.MutationObserver in a test to
    // exercise DOM-reading paths (e.g. scraper enrichment) with stubs.
    win.document,
    win.MutationObserver,
    win.location,
  ];
  // eslint-disable-next-line no-new-func
  const fn = new Function(...sandboxKeys, src);
  fn(...sandboxVals);
  return win;
}
