// dashboard-sync-after-upload.test.js — the dashboard row is written only
// after the eBay draft exists. Writing it when the upload *starts* left rows
// for uploads that later failed, and made a retry flag itself as a duplicate
// of its own earlier attempt (check-duplicate matches any row for the item).
// Also: a finished bulk item is an eBay draft, so the overlay must not call it
// "Listed".
// Run: node --test apps/extension/tests/dashboard-sync-after-upload.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '..', 'content_scripts', 'ebay_prelist.js'), 'utf8');

describe('ebay_prelist — no dashboard write before the upload', () => {
  test('nothing syncs to the dashboard between staging and SellerSuitUploader.run', () => {
    const start = src.indexOf('isImported: true } })');
    const end = src.indexOf('window.SellerSuitUploader.run(productToRun)');
    assert.ok(start > 0 && end > start, 'anchors not found — update this test with the handler');
    const beforeRun = src.slice(start, end);
    assert.equal(beforeRun.includes('_syncListingToDashboard'), false);
  });

  test('ebay_prelist never calls the dashboard sync itself (the uploader owns it)', () => {
    assert.equal(/_syncListingToDashboard\s*\(/.test(src), false);
  });
});

describe('ebay_prelist — a finished bulk item is a draft, not a live listing', () => {
  test('the overlay does not say "Listed"', () => {
    assert.equal(/_ssUpdateOverlay\(\s*['"`]Listed/.test(src), false);
  });
});
