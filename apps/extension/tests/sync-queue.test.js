// sync-queue.test.js — a listing that reached eBay must never be lost because
// the dashboard write failed once. Pure queue logic (no chrome.* calls).
// Run: node --test apps/extension/tests/sync-queue.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function core() {
  const win = makeWindow();
  loadInto(win, 'background/sync-queue.js');
  return win.SSSyncQueue;
}

const T0 = 1_800_000_000_000;
const PAYLOAD = { sku: 'AMZ-B0AAA11111', amazon_asin: 'B0AAA11111', title: 'Thing' };

describe('SSSyncQueue — pure logic', () => {
  test('retryable vs final failures', () => {
    const Q = core();
    for (const s of [0, 401, 408, 429, 500, 502, 503]) assert.equal(Q.isRetryable(s), true, String(s));
    for (const s of [400, 402, 403, 404, 405, 422]) assert.equal(Q.isRetryable(s), false, String(s));
  });

  test('enqueue dedupes by SKU, keeping the newest payload', () => {
    const Q = core();
    let q = Q.enqueue([], PAYLOAD, T0);
    q = Q.enqueue(q, { ...PAYLOAD, title: 'Thing v2' }, T0 + 5);
    assert.equal(q.length, 1);
    assert.equal(q[0].payload.title, 'Thing v2');
    assert.equal(q[0].attempts, 0);
  });

  test('an entry is due immediately, then backs off exponentially', () => {
    const Q = core();
    let q = Q.enqueue([], PAYLOAD, T0);
    assert.equal(Q.due(q, T0).length, 1);
    q = Q.afterAttempt(q, q[0].id, { success: false, status: 503 }, T0);
    assert.equal(q[0].attempts, 1);
    assert.equal(Q.due(q, T0 + 30_000).length, 0);
    assert.equal(Q.due(q, T0 + 61_000).length, 1);
    q = Q.afterAttempt(q, q[0].id, { success: false, status: 503 }, T0 + 61_000);
    assert.equal(Q.due(q, T0 + 61_000 + 60_000).length, 0); // second wait is 2 min
    assert.equal(Q.due(q, T0 + 61_000 + 121_000).length, 1);
  });

  test('Retry-After from a 429 is honoured', () => {
    const Q = core();
    let q = Q.enqueue([], PAYLOAD, T0);
    q = Q.afterAttempt(q, q[0].id, { success: false, status: 429, retryAfter: 300 }, T0);
    assert.equal(Q.due(q, T0 + 200_000).length, 0);
    assert.equal(Q.due(q, T0 + 301_000).length, 1);
  });

  test('success and non-retryable failures leave the queue', () => {
    const Q = core();
    let q = Q.enqueue([], PAYLOAD, T0);
    assert.equal(Q.afterAttempt(q, q[0].id, { success: true }, T0).length, 0);
    assert.equal(Q.afterAttempt(q, q[0].id, { success: false, status: 402 }, T0).length, 0);
  });

  test('gives up after the attempt limit and the queue is size-capped', () => {
    const Q = core();
    let q = Q.enqueue([], PAYLOAD, T0);
    for (let i = 0; i < Q.MAX_ATTEMPTS; i++) q = Q.afterAttempt(q, q[0]?.id, { success: false, status: 500 }, T0);
    assert.equal(q.length, 0);

    let big = [];
    for (let i = 0; i < Q.MAX_ENTRIES + 10; i++) big = Q.enqueue(big, { sku: 'S' + i }, T0 + i);
    assert.equal(big.length, Q.MAX_ENTRIES);
    assert.equal(big[big.length - 1].payload.sku, 'S' + (Q.MAX_ENTRIES + 9));
  });
});
