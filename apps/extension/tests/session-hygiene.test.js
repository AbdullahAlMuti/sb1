// session-hygiene.test.js — locks the listing-session isolation fixes:
//  1. staging writes stamp stagedAt (message-router, listing-runner, uploader handoffs)
//  2. ebay_prelist.js tabId fallback ignores stale stagings (TTL guard)
//  3. ebay_success.js resolves draftId from the NEWEST staging, not first-match
//  4. sweepStaleListingSessions removes expired/legacy session blobs and
//     nothing else (behavioral, against a fake chrome.storage)
// Run: node --test apps/extension/tests/session-hygiene.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeWindow, loadInto } from './helpers/load-global.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = join(__dirname, '..');
const read = (rel) => readFileSync(join(EXT_ROOT, rel), 'utf8');

// ─── Static locks ──────────────────────────────────────────────────────────────

describe('staging writes stamp stagedAt', () => {
  test('message-router import_ebay stamps stagedAt on both session keys', () => {
    const src = read('background/message-router.js');
    const handler = src.slice(src.indexOf('"import_ebay"'), src.indexOf('"GET_TAB_ID"'));
    const stamps = handler.match(/stagedAt: Date\.now\(\)/g) || [];
    assert.equal(stamps.length, 2, 'both the uploadSessionId and legacy tabId writes must stamp stagedAt');
  });

  test('bulk listing-runner staging stamps stagedAt', () => {
    const src = read('background/listing-runner.js');
    assert.match(src, /bulkItemId,\s*\r?\n\s*stagedAt: Date\.now\(\)/);
  });

  test('uploader draft-editor handoffs stamp stagedAt (single + multi variation)', () => {
    const src = read('common/ebay-listing-api.js');
    const stamps = src.match(/stagedAt: Date\.now\(\)/g) || [];
    assert.ok(stamps.length >= 2, `expected >= 2 stagedAt stamps in uploader handoffs, got ${stamps.length}`);
  });
});

describe('ebay_prelist tabId fallback TTL guard', () => {
  test('stale fallback entries are ignored and removed', () => {
    const src = read('content_scripts/ebay_prelist.js');
    const fallback = src.slice(src.indexOf('storageKey = String(tabId)'), src.indexOf("!entry?.product"));
    assert.match(fallback, /STALE_MS/, 'fallback path must define a staleness window');
    assert.match(fallback, /entry\.stagedAt/, 'fallback path must check stagedAt');
    assert.match(fallback, /chrome\.storage\.local\.remove\(storageKey\)/, 'stale entry must be removed');
  });

  test('UUID (uploadSessionId) path has no TTL guard — URL names its exact session', () => {
    const src = read('content_scripts/ebay_prelist.js');
    const uuidPath = src.slice(src.indexOf('if (uploadSessionId) {'), src.indexOf('} else {'));
    assert.ok(!uuidPath.includes('STALE_MS'), 'UUID path must stay untouched (retry-on-reload is intended)');
  });
});

describe('ebay_success draftId resolution', () => {
  test('picks the newest staging by stagedAt instead of first key match', () => {
    const src = read('content_scripts/ebay_success.js');
    assert.match(src, /entry\.stagedAt \|\| 0/, 'must rank candidates by stagedAt');
    assert.match(src, /at > latest\.at/, 'must keep the newest candidate');
    assert.ok(!/latestDraftId = entry\.draftId;\s*\r?\n\s*break;/.test(src),
      'first-match break must be gone');
  });
});

// ─── Behavioral: sweepStaleListingSessions ─────────────────────────────────────

function makeSweepWindow(initialStore) {
  const win = makeWindow();
  const store = { ...initialStore };
  const removed = [];
  win.chrome = {
    storage: {
      local: {
        get: async (q) => (q === null ? { ...store } : { [q]: store[q] }),
        remove: async (keys) => {
          for (const k of [].concat(keys)) { removed.push(k); delete store[k]; }
        },
        set: async (obj) => Object.assign(store, obj),
      },
      onChanged: { addListener: () => {} },
    },
    alarms: { create: () => {}, clear: async () => {}, onAlarm: { addListener: () => {} } },
    runtime: { onStartup: { addListener: () => {} }, onInstalled: { addListener: () => {} } },
    sidePanel: { setPanelBehavior: () => Promise.resolve() },
  };
  loadInto(win, 'background/alarm-handler.js');
  return { win, store, removed };
}

const DAY = 24 * 60 * 60 * 1000;
const sessionBlob = (over) => ({
  product: { title: 'X' },
  isImported: false,
  uploadType: 'classic',
  ...over,
});

describe('sweepStaleListingSessions — behavioral', () => {
  test('removes session blobs older than 24h (UUID and tabId keys)', async () => {
    const { win, removed } = makeSweepWindow({
      'uuid-old': sessionBlob({ stagedAt: Date.now() - 2 * DAY }),
      '123456': sessionBlob({ stagedAt: Date.now() - 2 * DAY, isImported: true }),
    });
    await win.SSSessionSweep.sweepStaleListingSessions();
    assert.deepEqual(removed.sort(), ['123456', 'uuid-old']);
  });

  test('keeps fresh session blobs', async () => {
    const { win, store, removed } = makeSweepWindow({
      'uuid-fresh': sessionBlob({ stagedAt: Date.now() - 60 * 1000 }),
    });
    await win.SSSessionSweep.sweepStaleListingSessions();
    assert.deepEqual(removed, []);
    assert.ok(store['uuid-fresh']);
  });

  test('removes legacy (no stagedAt) blobs only when already imported', async () => {
    const { win, store, removed } = makeSweepWindow({
      'legacy-done': sessionBlob({ isImported: true }),
      'legacy-inflight': sessionBlob({ isImported: false }),
    });
    await win.SSSessionSweep.sweepStaleListingSessions();
    assert.deepEqual(removed, ['legacy-done']);
    assert.ok(store['legacy-inflight'], 'possibly in-flight pre-update staging must survive');
  });

  test('never touches non-session storage entries', async () => {
    const { win, store, removed } = makeSweepWindow({
      currentProduct: { title: 'Product', price: 9.99 },           // product itself, not a blob
      bulkJobStateV2: { items: [], isRunning: false },             // bulk state
      calculatorValues: { 'tax-percent': '9' },                    // settings
      pricingRulesCache: { suppliers: [], fetchedAt: 0 },          // cache (stale but not a session)
      saasToken: 'tok',
    });
    await win.SSSessionSweep.sweepStaleListingSessions();
    assert.deepEqual(removed, []);
    assert.equal(Object.keys(store).length, 5);
  });
});
