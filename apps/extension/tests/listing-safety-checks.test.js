// listing-safety-checks.test.js — the VeRO and duplicate screens must never
// "pass" just because they could not run. A check that did not run blocks the
// upload (overridable by the same explicit flags as a real hit).
// Run: node --test apps/extension/tests/listing-safety-checks.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadWithBackground(responder) {
  const win = makeWindow();
  win.chrome = {
    runtime: {
      lastError: undefined,
      sendMessage(msg, cb) {
        const r = responder(msg);
        if (r && r.__lastError) {
          win.chrome.runtime.lastError = { message: r.__lastError };
          cb(undefined);
          win.chrome.runtime.lastError = undefined;
        } else {
          cb(r);
        }
      },
    },
  };
  loadInto(win, 'common/sku-engine.js');
  loadInto(win, 'common/ebay-listing-api.js');
  return win;
}

const PRODUCT = { title: 'Apple iPhone 11', asin: 'B07ZPKBL9V', parentAsin: 'B07ZPKBL9V' };

describe('safety checks — fail closed', () => {
  test('clean product passes when both checks ran', async () => {
    const win = loadWithBackground((msg) => {
      if (msg.action === 'CHECK_VERO') return { checked: true, flagged: false, matches: [] };
      if (msg.action === 'CHECK_DUPLICATE') return { checked: true, duplicate: false };
    });
    await win.SellerSuitUploader._runSafetyChecks(PRODUCT);
  });

  test('a VeRO hit blocks and names the brand', async () => {
    const win = loadWithBackground((msg) => {
      if (msg.action === 'CHECK_VERO') return { checked: true, flagged: true, matches: [{ brand: 'Apple', risk: 'high' }] };
      return { checked: true, duplicate: false };
    });
    await assert.rejects(() => win.SellerSuitUploader._runSafetyChecks(PRODUCT), (e) => {
      assert.equal(e.isVeroBlock, true);
      assert.match(e.message, /Apple/);
      return true;
    });
  });

  test('VeRO check that could not run blocks instead of passing', async () => {
    const win = loadWithBackground((msg) => {
      if (msg.action === 'CHECK_VERO') return { checked: false, error: 'API error: 404' };
      return { checked: true, duplicate: false };
    });
    await assert.rejects(() => win.SellerSuitUploader._runSafetyChecks(PRODUCT), (e) => {
      assert.equal(e.isVeroBlock, true);
      assert.equal(e.isCheckUnavailable, true);
      assert.match(e.message, /could not run/i);
      return true;
    });
  });

  test('duplicate check that could not run blocks instead of passing', async () => {
    const win = loadWithBackground((msg) => {
      if (msg.action === 'CHECK_VERO') return { checked: true, flagged: false, matches: [] };
      return { __lastError: 'Extension context invalidated' };
    });
    await assert.rejects(() => win.SellerSuitUploader._runSafetyChecks(PRODUCT), (e) => {
      assert.equal(e.isDuplicateBlock, true);
      assert.equal(e.isCheckUnavailable, true);
      return true;
    });
  });

  test('a real duplicate blocks with the listing attached', async () => {
    const win = loadWithBackground((msg) => {
      if (msg.action === 'CHECK_VERO') return { checked: true, flagged: false, matches: [] };
      return { checked: true, duplicate: true, listing: { id: 'L1', created_at: '2026-11-01T00:00:00Z' } };
    });
    await assert.rejects(() => win.SellerSuitUploader._runSafetyChecks(PRODUCT), (e) => {
      assert.equal(e.isDuplicateBlock, true);
      assert.equal(e.duplicateListing.id, 'L1');
      return true;
    });
  });

  test('explicit overrides skip the corresponding check', async () => {
    let calls = 0;
    const win = loadWithBackground(() => { calls++; return { checked: false, error: 'down' }; });
    await win.SellerSuitUploader._runSafetyChecks({ ...PRODUCT, forceVeroOverride: true, forceDuplicateOverride: true });
    assert.equal(calls, 0);
  });
});
