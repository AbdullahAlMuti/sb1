// injector-ai-content.test.js — static locks for the full-editor AI content flow
// in the supplier injectors (amazon_injector / walmart_injector).
//
// Locks two regressions found in the 2026-07 live runs:
// 1. Descriptions saved without selectedDescriptionTimestamp are silently
//    discarded at upload time (panel freshness guards treat missing ts as
//    stale) → eBay drafts fall back to the "Quality product." placeholder.
// 2. The description call's "bonus" title used to unconditionally overwrite
//    selectedEbayTitle + savedTitles, clobbering a title the user just picked.
//
// Run: node --test apps/extension/tests/injector-ai-content.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = join(__dirname, '..');

const read = (rel) => readFileSync(join(EXT_ROOT, rel), 'utf8');

const INJECTORS = [
  'content_scripts/amazon_injector.js',
  'content_scripts/walmart_injector.js',
];

describe('full-editor AI descriptions survive the upload freshness guard', () => {
  test('every selectedEbayDescription save also stamps selectedDescriptionTimestamp', () => {
    for (const f of INJECTORS) {
      const src = read(f);
      const saves = src.match(/selectedEbayDescription:/g) || [];
      assert.ok(saves.length > 0, `${f} must save selectedEbayDescription`);
      // Each save site must stamp the timestamp in the same storage.set call —
      // panel-extended/panel-main/panel treat a missing timestamp as stale.
      const stamped = src.match(/selectedEbayDescription:[\s\S]{0,200}?selectedDescriptionTimestamp:\s*Date\.now\(\)/g) || [];
      assert.equal(
        stamped.length,
        saves.length,
        `${f}: all ${saves.length} selectedEbayDescription saves must stamp selectedDescriptionTimestamp (found ${stamped.length})`
      );
    }
  });

  test('generated descriptions are patched onto the listing draft', () => {
    for (const f of INJECTORS) {
      const src = read(f);
      assert.ok(
        /description_source:\s*'ai'/.test(src),
        `${f} must patch the listing draft with description_source: 'ai'`
      );
    }
  });
});

describe('bonus title from description generation must not clobber a fresh selection', () => {
  test('old wholesale-replace pattern stays deleted', () => {
    for (const f of INJECTORS) {
      const src = read(f);
      assert.ok(
        !src.includes('savedTitles: [bgResp.title]'),
        `${f} must not wholesale-replace savedTitles with the bonus title`
      );
    }
  });

  test('bonus title adoption is gated on selectedTitleTimestamp freshness', () => {
    for (const f of INJECTORS) {
      const src = read(f);
      assert.ok(
        src.includes('keepExistingTitle'),
        `${f} must keep a fresh existing selected title over the bonus title`
      );
      // The gate must use the established 30-minute freshness idiom.
      assert.ok(
        /keepExistingTitle[\s\S]{0,400}?selectedTitleTimestamp\s*>=\s*thirtyMinutesAgo/.test(src),
        `${f} keepExistingTitle gate must compare selectedTitleTimestamp against the 30-minute window`
      );
      // The bonus title is preserved as an option instead of being dropped.
      assert.ok(
        /mergedTitles\.unshift\(bgResp\.title\)/.test(src),
        `${f} must merge the bonus title into savedTitles`
      );
    }
  });
});
