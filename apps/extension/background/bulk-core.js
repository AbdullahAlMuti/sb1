// bulk-core.js — pure logic for the Bulk Lister worker. No chrome.* calls so
// the state machine is unit-testable with the node:test harness
// (tests/helpers/load-global.js). listing-runner.js owns all side effects.

window.SSBulkCore = (() => {
  'use strict';

  const MIN_INTERVAL_MS = 30 * 1000;
  const MAX_INTERVAL_MS = 60 * 60 * 1000;
  const DEFAULT_INTERVAL_MS = 60 * 1000;

  // Item statuses mirror the bulk_job_items.status CHECK constraint.
  const TERMINAL = new Set(['listed', 'failed', 'skipped']);

  function sanitizeIntervalMs(seconds) {
    const n = parseInt(seconds, 10);
    if (isNaN(n) || n <= 0) return DEFAULT_INTERVAL_MS;
    return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, n * 1000));
  }

  /**
   * Build a fresh job state from a START_BULK_JOB payload.
   * @param {object} payload { items:[{id,url,overrides}], interval, settings }
   */
  function createState(payload) {
    const items = (Array.isArray(payload.items) ? payload.items : [])
      .filter(it => it && it.url && it.id)
      .map(it => ({
        id: String(it.id),
        url: String(it.url),
        overrides: (it.overrides && typeof it.overrides === 'object') ? it.overrides : {},
        status: 'queued',
        error: null,
        listingId: null,
        variationCount: null,
        title: it.title || null,
        image: it.image || null,
        supplier: it.supplier || null,
        startedAt: null,
        finishedAt: null
      }));
    return {
      version: 2,
      items,
      isRunning: false,
      intervalMs: sanitizeIntervalMs(payload.interval),
      settings: {
        useAiTitle: !!(payload.settings && payload.settings.useAiTitle),
        minQty: parseInt(payload.settings && payload.settings.minQty, 10) || 0,
        allowLowQty: (payload.settings && payload.settings.allowLowQty) !== false
      },
      currentItemId: null,
      startedAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  function nextQueuedItem(state) {
    if (!state || !Array.isArray(state.items)) return null;
    return state.items.find(it => it.status === 'queued') || null;
  }

  function getItem(state, itemId) {
    if (!state || !Array.isArray(state.items)) return null;
    return state.items.find(it => it.id === itemId) || null;
  }

  /** Immutable item patch; stamps finishedAt on terminal transitions. */
  function patchItem(state, itemId, patch) {
    const items = state.items.map(it => {
      if (it.id !== itemId) return it;
      const next = { ...it, ...patch };
      if (TERMINAL.has(next.status) && !next.finishedAt) next.finishedAt = Date.now();
      if (!TERMINAL.has(next.status)) next.finishedAt = null;
      return next;
    });
    return { ...state, items, updatedAt: Date.now() };
  }

  function isTerminal(status) {
    return TERMINAL.has(status);
  }

  function counts(state) {
    const c = { total: 0, queued: 0, scraping: 0, uploading: 0, listed: 0, failed: 0, skipped: 0 };
    for (const it of (state && state.items) || []) {
      c.total++;
      if (c[it.status] !== undefined) c[it.status]++;
    }
    return c;
  }

  /**
   * Apply dashboard pre-upload overrides onto a scraped product — the
   * user-edited tier of the data-priority rule. Manual values win and are
   * source-flagged so a later re-scrape can never clobber them.
   * Price override applies to single-listing products only; variation prices
   * stay with the per-variant calculator output.
   * @param {object} product normalized scraped product
   * @param {object} overrides { title?, price?, sku? }
   */
  function applyOverrides(product, overrides) {
    if (!overrides || typeof overrides !== 'object') return product;
    const out = { ...product };
    const title = typeof overrides.title === 'string' ? overrides.title.trim() : '';
    if (title) {
      out.title = title;
      out.title_source = 'manual';
    }
    const sku = typeof overrides.sku === 'string' ? overrides.sku.trim() : '';
    if (sku) {
      out.ebaySku = sku;
      out.sku_source = 'manual';
    }
    const price = parseFloat(overrides.price);
    const hasVariants = !!out.hasVariants && Array.isArray(out.variants) && out.variants.length > 1;
    if (!isNaN(price) && price > 0 && !hasVariants) {
      out.finalPrice = price;
      out.price_source = 'manual';
    }
    return out;
  }

  /**
   * Dashboard display snapshot for one scraped product. Image is the supplier
   * CDN URL — internal preview only; public eBay images go through EPS.
   */
  function summarizeProduct(product) {
    const p = product || {};
    const variants = Array.isArray(p.variants) ? p.variants : [];
    return {
      title: p.title || null,
      image: (Array.isArray(p.images) && p.images.find(u => typeof u === 'string' && u.startsWith('http'))) || p.mainImage || null,
      supplier: p.supplier || p.marketplace || null,
      supplierId: p.sourceId || p.parentAsin || p.asin || null,
      variationCount: variants.length || (p.hasVariants ? null : 1),
      supplierPrice: parseFloat(p.price) || null,
      ebayPrice: parseFloat(p.finalPrice) || null,
      sku: p.ebaySku || null
    };
  }

  /**
   * Recover a persisted state after a service-worker / browser restart.
   * - scraping items had no side effects yet → back to queued
   * - uploading items are ambiguous (may have listed) → failed with guidance
   * Returns { state, changed }.
   */
  function recoverState(state) {
    if (!state || !Array.isArray(state.items)) return { state, changed: false };
    let changed = false;
    const items = state.items.map(it => {
      if (it.status === 'scraping') {
        changed = true;
        return { ...it, status: 'queued', error: null };
      }
      if (it.status === 'uploading') {
        const started = it.startedAt || 0;
        const elapsed = Date.now() - started;
        const limitMs = 5 * 60 * 1000;
        if (elapsed < limitMs) {
          return it;
        }
        changed = true;
        return {
          ...it,
          status: 'failed',
          finishedAt: Date.now(),
          error: 'Interrupted during eBay upload (browser/extension restarted). Check your eBay drafts before retrying to avoid a duplicate.'
        };
      }
      return it;
    });
    return { state: changed ? { ...state, items, currentItemId: null, updatedAt: Date.now() } : state, changed };
  }

  /** Detects errors that should pause the whole job, not just fail one item. */
  function isJobBlockingError(message) {
    const m = String(message || '');
    return /CAPTCHA/i.test(m) ||
           /not logged into eBay/i.test(m) ||
           /Please Log In/i.test(m) ||
           /(limit reached|Insufficient credits|subscription|Trial expired)/i.test(m);
  }

  return {
    MIN_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
    sanitizeIntervalMs,
    createState,
    nextQueuedItem,
    getItem,
    patchItem,
    isTerminal,
    counts,
    applyOverrides,
    summarizeProduct,
    recoverState,
    isJobBlockingError
  };
})();
