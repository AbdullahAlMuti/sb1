/**
 * SellerSuit Bulk Listing Runner (v2)
 *
 * Background worker for the dashboard Bulk Lister. Processes queue items one
 * at a time through the SAME pipeline the side panel uses:
 *   supplier tab → adapter SCRAPE_VARIANTS (variants + pricing + normalizer)
 *   → duplicate pre-check → dashboard overrides (manual tier)
 *   → import_ebay-style uploadSessionId entry → eBay prelist tab
 *   → SellerSuitUploader.run() (+ ebay_bulkedit for variations)
 *   → BULK_ITEM_RESULT message back here → status + cleanup → next item.
 *
 * There is intentionally NO second upload implementation here — the eBay
 * upload, image handling, SKU/pricing and DB sync are the existing ones.
 *
 * State is persisted to chrome.storage.local (BULK_STATE_KEY) after every
 * transition so a service-worker restart resumes instead of losing the job.
 * Scheduling uses chrome.alarms (MV3-safe), never bare setTimeout across items.
 */

// getUrls and getApiKeys are declared globally in background/index.js
// window.SSBulkCore is loaded from bulk-core.js (pure state logic)

const BULK_STATE_KEY  = 'bulkJobStateV2';
const BULK_LOCK_KEY   = 'bulkUploadLock';
const BULK_ALARM_NEXT = 'ss-bulk-next';
const BULK_ALARM_RESUME = 'ss-bulk-resume';

const SCRAPE_TIMEOUT_MS  = 90 * 1000;   // variant scrape clicks through options — give it room
const UPLOAD_TIMEOUT_MS  = 5 * 60 * 1000;
const LOCK_STALE_MS      = 5 * 60 * 1000;

const bulkRuntime = {
  state: null,              // hydrated SSBulkCore state
  supplierTabId: null,
  ebayTabId: null,
  uploadWaiters: new Map(), // uploadSessionId → { resolve, timer }
  processing: false         // re-entrancy guard within one SW lifetime
};

function bulkLog(message) {
  console.log(`[Bulk Runner] ${message}`);
}

// ── persistence ──────────────────────────────────────────────────────────────

async function saveBulkState() {
  if (!bulkRuntime.state) return;
  await chrome.storage.local.set({ [BULK_STATE_KEY]: bulkRuntime.state });
}

async function loadBulkState() {
  if (bulkRuntime.state) return bulkRuntime.state;
  const data = await chrome.storage.local.get(BULK_STATE_KEY);
  bulkRuntime.state = data[BULK_STATE_KEY] || null;
  return bulkRuntime.state;
}

// ── dashboard notifications (broadcast — bridge.js only runs on dashboard) ──

function broadcastToDashboard(message) {
  try {
    chrome.tabs.query({}, tabs => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    });
  } catch (_) { /* non-fatal */ }
}

function notifyItemProgress(item) {
  broadcastToDashboard({
    type: 'BULK_JOB_PROGRESS_UPDATE',
    payload: {
      itemId: item.id,
      status: item.status,
      error: item.error || null,
      listingId: item.listingId || null,
      variationCount: item.variationCount ?? null,
      title: item.title || null,
      image: item.image || null,
      supplier: item.supplier || null,
      supplierId: item.supplierId || null,
      ebayPrice: item.ebayPrice ?? null,
      supplierPrice: item.supplierPrice ?? null,
      sku: item.sku || null,
      counts: window.SSBulkCore.counts(bulkRuntime.state),
      isRunning: !!(bulkRuntime.state && bulkRuntime.state.isRunning)
    }
  });
}

function notifyJobFinished(reason) {
  broadcastToDashboard({
    type: 'BULK_JOB_FINISHED',
    payload: { reason: reason || 'completed', counts: window.SSBulkCore.counts(bulkRuntime.state) }
  });
}

function notifyJobPaused(reason) {
  broadcastToDashboard({
    type: 'BULK_JOB_PAUSED',
    payload: { reason: reason || 'paused', counts: window.SSBulkCore.counts(bulkRuntime.state) }
  });
}

// ── upload lock (no double-listing) ──────────────────────────────────────────

async function acquireUploadLock(itemId) {
  const data = await chrome.storage.local.get(BULK_LOCK_KEY);
  const lock = data[BULK_LOCK_KEY];
  if (lock && lock.itemId !== itemId && Date.now() - (lock.at || 0) < LOCK_STALE_MS) {
    return false;
  }
  await chrome.storage.local.set({ [BULK_LOCK_KEY]: { itemId, at: Date.now() } });
  return true;
}

async function releaseUploadLock(itemId) {
  const data = await chrome.storage.local.get(BULK_LOCK_KEY);
  const lock = data[BULK_LOCK_KEY];
  if (!lock || lock.itemId === itemId) {
    await chrome.storage.local.remove(BULK_LOCK_KEY);
  }
}

// ── public API (called from message-router) ──────────────────────────────────

/**
 * Start a new job (payload.items present) or resume the persisted one.
 * @returns {{success:boolean, message?:string, state?:object}}
 */
async function startBulkJob(payload) {
  payload = payload || {};
  await loadBulkState();

  if (bulkRuntime.state && bulkRuntime.state.isRunning) {
    return { success: false, message: 'A bulk job is already running' };
  }

  // Auth gate — fail fast with a clear message instead of failing every item.
  const isAuth = typeof AuthHelper !== 'undefined' ? await AuthHelper.verifyAuthStatus() : false;
  if (!isAuth) {
    return { success: false, message: 'Not logged in to SellerSuit — open the dashboard and log in first.' };
  }

  if (Array.isArray(payload.items) && payload.items.length > 0) {
    bulkRuntime.state = window.SSBulkCore.createState(payload);
  } else if (!bulkRuntime.state) {
    return { success: false, message: 'No items to process' };
  } else {
    // resume: allow interval/settings refresh without rebuilding the queue
    if (payload.interval) bulkRuntime.state.intervalMs = window.SSBulkCore.sanitizeIntervalMs(payload.interval);
  }

  if (!window.SSBulkCore.nextQueuedItem(bulkRuntime.state)) {
    return { success: false, message: 'All items already processed' };
  }

  bulkRuntime.state.isRunning = true;
  bulkRuntime.state.updatedAt = Date.now();
  await saveBulkState();
  bulkLog(`Job started: ${bulkRuntime.state.items.length} items, interval ${bulkRuntime.state.intervalMs}ms`);

  processNextBulkItem();
  return { success: true, state: getBulkPublicState() };
}

async function pauseBulkJob() {
  await loadBulkState();
  if (!bulkRuntime.state) return { success: true };
  bulkRuntime.state.isRunning = false;
  bulkRuntime.state.updatedAt = Date.now();
  await chrome.alarms.clear(BULK_ALARM_NEXT).catch(() => {});
  await saveBulkState();
  bulkLog('Job paused');
  // The in-flight item (if any) is allowed to finish — pausing only stops
  // claiming the NEXT item, so we never abandon a half-created eBay draft.
  return { success: true, state: getBulkPublicState() };
}

async function stopBulkJob() {
  await pauseBulkJob();
  await chrome.alarms.clear(BULK_ALARM_RESUME).catch(() => {});
  if (bulkRuntime.supplierTabId) {
    chrome.tabs.remove(bulkRuntime.supplierTabId).catch(() => {});
    bulkRuntime.supplierTabId = null;
  }
  bulkRuntime.state = null;
  await chrome.storage.local.remove([BULK_STATE_KEY, BULK_LOCK_KEY]);
  bulkLog('Job stopped and cleared');
  return { success: true };
}

/** Serializable snapshot for the dashboard (GET_BULK_STATE). */
function getBulkPublicState() {
  const s = bulkRuntime.state;
  if (!s) return { active: false };
  return {
    active: true,
    isRunning: s.isRunning,
    intervalMs: s.intervalMs,
    settings: s.settings,
    currentItemId: s.currentItemId,
    counts: window.SSBulkCore.counts(s),
    items: s.items.map(it => ({
      id: it.id, url: it.url, status: it.status, error: it.error,
      listingId: it.listingId, variationCount: it.variationCount,
      title: it.title, image: it.image, supplier: it.supplier,
      supplierId: it.supplierId || null,
      ebayPrice: it.ebayPrice ?? null, supplierPrice: it.supplierPrice ?? null,
      sku: it.sku || null
    }))
  };
}

async function getBulkState() {
  await loadBulkState();
  return getBulkPublicState();
}

/**
 * Terminal signal from ebay_prelist.js / ebay_bulkedit.js for one upload.
 * msg: { uploadSessionId, success, listingId?, variationCount?, error? }
 */
function handleBulkItemResult(msg) {
  const waiter = bulkRuntime.uploadWaiters.get(msg.uploadSessionId);
  if (!waiter) {
    bulkLog(`BULK_ITEM_RESULT for unknown session ${msg.uploadSessionId} — ignored`);
    return { success: false, message: 'No waiter for session' };
  }
  bulkRuntime.uploadWaiters.delete(msg.uploadSessionId);
  clearTimeout(waiter.timer);
  waiter.resolve({
    success: !!msg.success,
    listingId: msg.listingId || null,
    variationCount: msg.variationCount ?? null,
    error: msg.error || null
  });
  return { success: true };
}

// ── core loop ─────────────────────────────────────────────────────────────────

async function processNextBulkItem() {
  if (bulkRuntime.processing) return;
  bulkRuntime.processing = true;
  try {
    await loadBulkState();
    const state = bulkRuntime.state;
    if (!state || !state.isRunning) return;

    const item = window.SSBulkCore.nextQueuedItem(state);
    if (!item) {
      await finishBulkJob();
      return;
    }

    if (!(await acquireUploadLock(item.id))) {
      bulkLog('Upload lock held elsewhere — retrying in 60s');
      chrome.alarms.create(BULK_ALARM_NEXT, { delayInMinutes: 1 });
      return;
    }

    state.currentItemId = item.id;
    await transitionItem(item.id, { status: 'scraping', error: null, startedAt: Date.now() });
    bulkLog(`Processing ${item.url}`);

    let product = null;
    try {
      // 1. Scrape — full variant scan via the supplier adapter pipeline
      //    (registry → adapter → normalizer → pricing engine), same as the panel.
      product = await scrapeSupplierProduct(item.url, state.settings);

      // 2. Snapshot for the dashboard card
      const summary = window.SSBulkCore.summarizeProduct(product);
      await transitionItem(item.id, summary);

      // 3. Duplicate pre-check — bulk runs unattended, so skip instead of modal.
      const dupId = product.parentAsin || product.asin || product.sourceId || null;
      if (dupId && typeof AuthHelper !== 'undefined') {
        try {
          const dupResp = await AuthHelper.callEdgeFunction('check-duplicate', { asin: dupId });
          if (dupResp && dupResp.data && dupResp.data.duplicate) {
            await finishItem(item.id, { status: 'skipped', error: 'Already listed (duplicate supplier ID)' });
            return scheduleNext();
          }
        } catch (_) { /* fail-open like the panel path */ }
      }

      // 4. Data priority: user-edited dashboard overrides win over scraped data.
      product = window.SSBulkCore.applyOverrides(product, item.overrides);
      if (state.settings.useAiTitle) product = { ...product, useAiTitle: true };
      if (state.settings.useAiDescription) product = { ...product, useAiDescription: true };

      // 5. Upload through the existing non-API uploader.
      await transitionItem(item.id, { status: 'uploading' });
      const result = await uploadViaEbayTab(product, item.id);

      if (result.success) {
        await finishItem(item.id, {
          status: 'listed',
          listingId: result.listingId,
          variationCount: result.variationCount ?? (product.variants ? product.variants.length : 1)
        });
      } else {
        await failItem(item.id, result.error || 'eBay upload failed');
      }
    } catch (error) {
      const msg = error && error.message ? error.message : 'Unknown error';
      console.error(`[Bulk Runner] Item ${item.id} failed:`, msg);
      await failItem(item.id, msg);

      // CAPTCHA / logged-out / plan-limit errors will fail every following
      // item too — pause the job so the user can fix the cause once.
      if (window.SSBulkCore.isJobBlockingError(msg)) {
        bulkRuntime.state.isRunning = false;
        await saveBulkState();
        notifyJobPaused(msg);
        bulkLog(`Job paused (blocking error): ${msg}`);
        await releaseUploadLock(item.id);
        return;
      }
    } finally {
      await releaseUploadLock(item.id);
    }

    scheduleNext();
  } finally {
    bulkRuntime.processing = false;
  }
}

async function finishBulkJob() {
  const state = bulkRuntime.state;
  if (!state) return;
  state.isRunning = false;
  state.currentItemId = null;
  await saveBulkState();
  await chrome.storage.local.remove(BULK_LOCK_KEY).catch(() => {});
  bulkLog('All items processed');
  notifyJobFinished('completed');
}

// Called at the end of one item, still inside processNextBulkItem's
// re-entrancy guard — so the no-items-left case must finish inline rather
// than re-enter processNextBulkItem (which would bounce off the guard).
function scheduleNext() {
  const state = bulkRuntime.state;
  if (!state || !state.isRunning) return;
  if (!window.SSBulkCore.nextQueuedItem(state)) {
    finishBulkJob();
    return;
  }
  const minutes = Math.max(0.5, state.intervalMs / 60000);
  chrome.alarms.create(BULK_ALARM_NEXT, { delayInMinutes: minutes });
  bulkLog(`Next item in ${Math.round(minutes * 60)}s`);
}

async function transitionItem(itemId, patch) {
  bulkRuntime.state = window.SSBulkCore.patchItem(bulkRuntime.state, itemId, patch);
  await saveBulkState();
  const item = window.SSBulkCore.getItem(bulkRuntime.state, itemId);
  if (item) notifyItemProgress(item);
}

async function finishItem(itemId, patch) {
  bulkRuntime.state.currentItemId = null;
  await transitionItem(itemId, patch);
}

async function failItem(itemId, error) {
  await finishItem(itemId, { status: 'failed', error: String(error).slice(0, 500) });
}

// ── step 1: supplier scrape ───────────────────────────────────────────────────

function scrapeSupplierProduct(url, settings) {
  return new Promise((resolve, reject) => {
    let done = false;
    let pollInterval = null;

    const cleanup = () => {
      if (pollInterval) clearInterval(pollInterval);
      if (bulkRuntime.supplierTabId) {
        chrome.tabs.remove(bulkRuntime.supplierTabId).catch(() => {});
        bulkRuntime.supplierTabId = null;
      }
    };

    const timeout = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error('Scraping timed out — page stuck, blocked, or CAPTCHA'));
    }, SCRAPE_TIMEOUT_MS);

    chrome.tabs.create({ url, active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        clearTimeout(timeout);
        return reject(new Error(chrome.runtime.lastError.message));
      }
      bulkRuntime.supplierTabId = tab.id;
      let scrapeInFlight = false;

      pollInterval = setInterval(() => {
        if (done || scrapeInFlight) return;
        scrapeInFlight = true;
        chrome.tabs.sendMessage(tab.id, {
          action: 'SCRAPE_VARIANTS',
          options: { minQty: settings.minQty || 0, allowLowQty: settings.allowLowQty !== false }
        }, (response) => {
          scrapeInFlight = false;
          if (done) return;
          if (chrome.runtime.lastError) return; // content script not ready yet — keep polling
          if (!response) return;
          done = true;
          clearTimeout(timeout);
          cleanup();
          if (response.success && response.data) {
            resolve(response.data);
          } else {
            reject(new Error((response && response.error) || 'Scrape failed'));
          }
        });
      }, 3000);
    });
  });
}

// ── step 5: eBay upload via existing pipeline ─────────────────────────────────

/**
 * Mirrors the import_ebay handler (message-router.js) but adds bulk metadata
 * and awaits a BULK_ITEM_RESULT terminal signal from the eBay content scripts.
 */
function uploadViaEbayTab(product, bulkItemId) {
  return new Promise((resolve) => {
    const uploadSessionId = crypto.randomUUID();
    const ebayUrl = `https://www.ebay.com/sl/prelist/suggest?sr=shBulkLister&uploadSessionId=${uploadSessionId}`;

    const settle = (result) => {
      // Close the eBay tab and clean the session blob — bulk runs must not
      // accumulate product/image data in chrome.storage (rule: cleanup without
      // corrupting storage; the preview image lives in the DB row).
      if (bulkRuntime.ebayTabId) {
        chrome.tabs.remove(bulkRuntime.ebayTabId).catch(() => {});
        bulkRuntime.ebayTabId = null;
      }
      chrome.storage.local.remove(uploadSessionId).catch(() => {});
      resolve(result);
    };

    const timer = setTimeout(() => {
      bulkRuntime.uploadWaiters.delete(uploadSessionId);
      settle({ success: false, error: 'eBay upload timed out (5 min) — page stuck or eBay flow changed' });
    }, UPLOAD_TIMEOUT_MS);

    bulkRuntime.uploadWaiters.set(uploadSessionId, {
      timer,
      resolve: (result) => settle(result)
    });

    (async () => {
      const bulkProduct = { ...product, bulkMode: true };
      await chrome.storage.local.set({
        [uploadSessionId]: {
          product: bulkProduct,
          isImported: false,
          uploadType: 'classic',
          bulkMode: true,
          bulkItemId,
          stagedAt: Date.now()
        },
        ebayListingTitle: bulkProduct.title || ''
      });

      chrome.tabs.create({ url: ebayUrl, active: true }, (tab) => {
        if (chrome.runtime.lastError) {
          clearTimeout(timer);
          bulkRuntime.uploadWaiters.delete(uploadSessionId);
          settle({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        bulkRuntime.ebayTabId = tab.id;
      });
    })().catch((e) => {
      clearTimeout(timer);
      bulkRuntime.uploadWaiters.delete(uploadSessionId);
      settle({ success: false, error: 'Could not stage upload: ' + (e && e.message ? e.message : e) });
    });
  });
}

// ── alarms + SW-restart recovery ─────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === BULK_ALARM_NEXT || alarm.name === BULK_ALARM_RESUME) {
    processNextBulkItem();
  }
});

// On SW (re)start: recover a persisted running job. Items stuck mid-flight are
// requeued (scraping) or failed with guidance (uploading — ambiguous outcome).
(async () => {
  try {
    const state = await loadBulkState();
    if (!state) return;
    const { state: recovered, changed } = window.SSBulkCore.recoverState(state);
    bulkRuntime.state = recovered;
    if (changed) await saveBulkState();
    if (recovered.isRunning && window.SSBulkCore.nextQueuedItem(recovered)) {
      bulkLog('Recovered running job after restart — resuming in 15s');
      chrome.alarms.create(BULK_ALARM_RESUME, { delayInMinutes: 0.25 });
    } else if (recovered.isRunning) {
      recovered.isRunning = false;
      await saveBulkState();
    }
  } catch (e) {
    console.warn('[Bulk Runner] recovery failed:', e && e.message);
  }
})();

// ═══════════════════════════════════════════════════════════
// LISTING SYNC HELPERS (shared with message-router / panel paths)
// ═══════════════════════════════════════════════════════════

async function parseListingSyncResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function getSafeListingSyncIdentity(payload = {}) {
  return {
    sku: payload.sku || payload.ebaySku || null,
    asin: payload.amazon_asin || payload.amazonAsin || null
  };
}

async function recordListingSyncError({ source = 'background', status = null, error = 'Unknown sync error', details = null, payload = {} } = {}) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      status,
      source,
      error: String(error || 'Unknown sync error').slice(0, 500),
      ...getSafeListingSyncIdentity(payload)
    };

    if (details && typeof details === 'object') {
      entry.details = {
        action: details.action || undefined,
        code: details.code || undefined,
        message: details.message ? String(details.message).slice(0, 300) : undefined
      };
    }

    const data = await chrome.storage.local.get(['listingSyncErrors']);
    const errors = Array.isArray(data.listingSyncErrors) ? data.listingSyncErrors : [];
    await chrome.storage.local.set({
      listingSyncLastError: entry,
      listingSyncErrors: [entry, ...errors].slice(0, 10)
    });
  } catch (err) {
    console.warn('[listing-sync] Failed to record sync error:', err?.message || err);
  }
}

async function postCreateListing(payload, source = 'background') {
  if (typeof AuthHelper === 'undefined') {
    const error = 'AuthHelper is not defined.';
    await recordListingSyncError({ source, status: 500, error, payload });
    return { success: false, source, status: 500, error };
  }

  const response = await AuthHelper.callEdgeFunction('create-listing', payload);
  const data = response.data;
  const status = response.status || 0;

  if (response.error) {
    const error = response.error || `create-listing failed with HTTP ${status}`;
    await recordListingSyncError({ source, status, error, details: data, payload });
    return { success: false, source, status, error, details: data };
  }

  return {
    success: true,
    source,
    status,
    listingId: data?.listing?.id,
    data
  };
}

globalThis.postCreateListing = postCreateListing;
globalThis.recordListingSyncError = recordListingSyncError;
