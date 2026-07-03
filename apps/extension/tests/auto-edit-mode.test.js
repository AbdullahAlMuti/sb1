// auto-edit-mode.test.js — locks the Auto Edit Mode wiring: the top-level
// `autoEditEnabled` toggle (side panel + panel.html) must drive the existing
// AI title/description rewrite path (product.useAiTitle / useAiDescription,
// consumed by SellerSuitUploader.run() in common/ebay-listing-api.js), not
// just image watermarking. ON should only fire for untouched ('scraped')
// content — a manual edit or an already-fresh AI draft must never be
// silently overwritten or re-billed against credits.
// Run: node --test apps/extension/tests/auto-edit-mode.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = join(__dirname, '..');
const read = (rel) => readFileSync(join(EXT_ROOT, rel), 'utf8');

describe('Auto Edit Mode — single-item upload paths read autoEditEnabled', () => {
  test('sidepanel/panel-main.js gates useAiTitle/useAiDescription on autoEditEnabled', () => {
    const src = read('sidepanel/panel-main.js');
    assert.match(src, /autoEditEnabled.*\r?\n.*if \(autoEditEnabled\)/,
      'panel-main.js must read autoEditEnabled before building the upload payload');
    assert.match(src, /ebayProduct\.useAiTitle\s*=\s*true/, 'must set useAiTitle when eligible');
    assert.match(src, /ebayProduct\.useAiDescription\s*=\s*true/, 'must set useAiDescription when eligible');
  });

  test('common/panel-extended.js gates useAiTitle/useAiDescription on autoEditEnabled', () => {
    const src = read('common/panel-extended.js');
    assert.match(src, /autoEditEnabled/, 'panel-extended.js must read autoEditEnabled');
    assert.match(src, /uploadProduct\.useAiTitle\s*=\s*true/, 'must set useAiTitle when eligible');
    assert.match(src, /uploadProduct\.useAiDescription\s*=\s*true/, 'must set useAiDescription when eligible');
  });

  test('both paths gate on titleSource/descSource === "scraped" (never override manual or fresh AI)', () => {
    for (const rel of ['sidepanel/panel-main.js', 'common/panel-extended.js']) {
      const src = read(rel);
      assert.match(src, /titleSource === 'scraped'/, `${rel} must only auto-rewrite untouched titles`);
      assert.match(src, /descSource === 'scraped'/, `${rel} must only auto-rewrite untouched descriptions`);
    }
  });
});

describe('Auto Edit Mode — SellerSuitUploader honors the flags (ON vs OFF)', () => {
  const src = read('common/ebay-listing-api.js');

  test('useAiTitle triggers AI title generation', () => {
    assert.match(src, /if \(product\.useAiTitle\)/);
    assert.match(src, /aiGenerateTitle\(product\)/);
  });

  test('useAiDescription triggers AI description generation', () => {
    assert.match(src, /if \(product\.useAiDescription\)/);
    assert.match(src, /aiGenerateDescription\(product\)/);
  });

  test('OFF path (no useAiDescription) still applies minimal cleanup via template compiler', () => {
    // The else-branch (Auto Edit OFF) must still run when useAiDescription is falsy.
    const elseBranchIdx = src.indexOf('} else {', src.indexOf('useAiDescription'));
    assert.ok(elseBranchIdx > -1, 'expected an else branch for the OFF case');
    const elseBranch = src.slice(elseBranchIdx, elseBranchIdx + 500);
    assert.match(elseBranch, /compileTemplate/, 'OFF path must still apply the minimal-cleanup template compiler');
  });
});

describe('Auto Edit Mode — Bulk Lister symmetry (useAiTitle + useAiDescription)', () => {
  test('bulk-core.js sanitizes both useAiTitle and useAiDescription into job settings', () => {
    const src = read('background/bulk-core.js');
    assert.match(src, /useAiTitle:\s*!!\(payload\.settings/);
    assert.match(src, /useAiDescription:\s*!!\(payload\.settings/);
  });

  test('listing-runner.js forwards both flags onto the product before upload', () => {
    const src = read('background/listing-runner.js');
    assert.match(src, /state\.settings\.useAiTitle\)\s*product\s*=\s*\{\s*\.\.\.product,\s*useAiTitle:\s*true\s*\}/);
    assert.match(src, /state\.settings\.useAiDescription\)\s*product\s*=\s*\{\s*\.\.\.product,\s*useAiDescription:\s*true\s*\}/);
  });
});
