// panel-preflight.test.js — the side panel must run the readiness gate on the
// FINAL merged product (manual edits and draft price included) and stop before
// it asks the background to open an eBay tab. Previously price problems were
// skipped here and only surfaced after the eBay tab had opened.
// Run: node --test apps/extension/tests/panel-preflight.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '..', 'sidepanel', 'panel-main.js'), 'utf8');
const upload = src.slice(src.indexOf('async function doAdvancedUpload'), src.indexOf('async function doExtend'));

describe('doAdvancedUpload pre-flight', () => {
  test('gates the merged ebayProduct before sending import_ebay', () => {
    const gate = upload.indexOf('SSListingReadiness.firstBlock(ebayProduct)');
    const send = upload.indexOf("action: 'import_ebay'");
    assert.ok(gate > 0, 'final-product readiness gate missing');
    assert.ok(send > gate, 'the gate must run before the eBay tab is requested');
  });

  test('a blocked product returns before anything is written or opened', () => {
    const gate = upload.indexOf('SSListingReadiness.firstBlock(ebayProduct)');
    const firstWrite = upload.indexOf('chrome.storage.local.set({ currentProduct: ebayProduct })');
    assert.ok(firstWrite > gate, 'the gate must run before the product is mirrored to storage');
    assert.match(upload.slice(gate, firstWrite), /return;/);
  });
});
