// sync-queue.js — retry queue for dashboard listing syncs.
//
// When a listing has been created on eBay but the create-listing write fails
// (network blip, 429, 5xx, expired token), the payload is parked here and
// retried with exponential backoff instead of being lost with a toast.
// create-listing is idempotent (dedupes on SKU / ASIN), so a retry can never
// create a second dashboard row.
//
// The pure functions take and return plain arrays (unit-tested in
// tests/sync-queue.test.js). add()/flush() are the only parts that touch
// chrome.storage / chrome.alarms.

window.SSSyncQueue = (() => {
  'use strict';

  const STORAGE_KEY = 'listingSyncQueue';
  const ALARM = 'ss-sync-queue';
  const MAX_ATTEMPTS = 10;
  const MAX_ENTRIES = 50;
  const BASE_DELAY_MS = 60 * 1000;
  const MAX_DELAY_MS = 60 * 60 * 1000;

  /** Network errors (0), auth expiry, throttling and server errors are worth retrying. */
  function isRetryable(status) {
    const s = Number(status) || 0;
    return s === 0 || s === 401 || s === 408 || s === 429 || s >= 500;
  }

  function _keyOf(payload) {
    const p = payload || {};
    return String(p.sku || p.ebaySku || p.amazon_asin || p.amazonAsin || p.supplier_id || '');
  }

  function enqueue(queue, payload, now) {
    const list = Array.isArray(queue) ? queue.slice() : [];
    const key = _keyOf(payload);
    const existing = key ? list.findIndex(e => e.key === key) : -1;
    const entry = {
      id: existing >= 0 ? list[existing].id : `${now}-${Math.random().toString(36).slice(2, 8)}`,
      key,
      payload,
      attempts: 0,
      nextAt: now,
      queuedAt: now,
      lastError: null
    };
    if (existing >= 0) list.splice(existing, 1);
    list.push(entry);
    // Keep the newest entries when over the cap.
    return list.length > MAX_ENTRIES ? list.slice(list.length - MAX_ENTRIES) : list;
  }

  function due(queue, now) {
    return (Array.isArray(queue) ? queue : []).filter(e => (e.nextAt || 0) <= now);
  }

  /** Apply the outcome of one attempt. Returns the new queue. */
  function afterAttempt(queue, id, result, now) {
    const list = Array.isArray(queue) ? queue : [];
    const out = [];
    for (const e of list) {
      if (e.id !== id) { out.push(e); continue; }
      if (result && result.success) continue;                       // done
      if (!isRetryable(result && result.status)) continue;          // final failure (plan limit, bad input)
      const attempts = (e.attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) continue;                       // give up
      const backoff = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempts - 1));
      const retryAfterMs = Number(result && result.retryAfter) > 0 ? Number(result.retryAfter) * 1000 : 0;
      out.push({
        ...e,
        attempts,
        nextAt: now + Math.max(backoff, retryAfterMs),
        lastError: String((result && result.error) || 'unknown error').slice(0, 300)
      });
    }
    return out;
  }

  // ── chrome-side wrappers ────────────────────────────────────────────────────

  async function _load() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  }

  async function _save(queue) {
    await chrome.storage.local.set({ [STORAGE_KEY]: queue });
    if (queue.length > 0) {
      chrome.alarms.create(ALARM, { delayInMinutes: 1 });
    } else {
      await chrome.alarms.clear(ALARM).catch(() => {});
    }
  }

  /** Park a failed sync. Returns true when it was queued for retry. */
  async function add(payload, result) {
    if (!isRetryable(result && result.status)) return false;
    let queue = enqueue(await _load(), payload, Date.now());
    // The attempt that just failed counts.
    queue = afterAttempt(queue, queue[queue.length - 1].id, result, Date.now());
    await _save(queue);
    return queue.length > 0;
  }

  let flushing = false;

  /**
   * Retry every due entry once. `send(payload)` must resolve to
   * { success, status, error, retryAfter }.
   */
  async function flush(send) {
    if (flushing) return { sent: 0, remaining: (await _load()).length };
    flushing = true;
    let sent = 0;
    try {
      let queue = await _load();
      for (const entry of due(queue, Date.now())) {
        let result;
        try {
          result = await send(entry.payload);
        } catch (e) {
          result = { success: false, status: 0, error: e && e.message ? e.message : String(e) };
        }
        if (result && result.success) sent++;
        queue = afterAttempt(await _load(), entry.id, result, Date.now());
        await _save(queue);
      }
      return { sent, remaining: queue.length };
    } finally {
      flushing = false;
    }
  }

  return {
    STORAGE_KEY, ALARM, MAX_ATTEMPTS, MAX_ENTRIES,
    isRetryable, enqueue, due, afterAttempt,
    add, flush
  };
})();
