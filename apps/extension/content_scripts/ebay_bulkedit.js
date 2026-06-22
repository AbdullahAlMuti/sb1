// ─────────────────────────────────────────────────────────────────────────────
// SellerSuit eBay Bulkedit (MSKU) handler
// Runs on bulkedit.ebay.com after SellerSuitUploader redirects here for
// multi-variation products. Calls addVariations then redirects to /lstng draft.
// ─────────────────────────────────────────────────────────────────────────────

(async function() {
  const url = window.location.href;
  if (!url.includes('bulkedit.ebay') || !url.includes('msku')) return;
  if (!window.EbayListingApiHelper) return;

  const params = new URLSearchParams(window.location.search);
  const uploadSessionId = params.get('uploadSessionId');

  let entry;
  let storageKey;

  if (uploadSessionId) {
    storageKey = uploadSessionId;
    const stored = await chrome.storage.local.get(uploadSessionId);
    entry = stored[uploadSessionId];
  } else {
    // Get own tabId from SW (legacy fallback)
    const tabId = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'GET_TAB_ID' }, resp => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(resp?.tabId || null);
      });
    });
    if (tabId) {
      storageKey = String(tabId);
      const stored = await chrome.storage.local.get(storageKey);
      entry = stored[storageKey];
    }
  }

  if (!storageKey || !entry) return;

  // Only run if this entry was created by SellerSuitUploader for variations
  if (!entry.needsVariations || entry.isImported) return;

  console.log('[SS Bulkedit] Starting AddVariations for draftId:', entry.draftId);

  // Bulk Lister mode: report the terminal result against the worker's ORIGINAL
  // session id (carried through SellerSuitUploader as entry.bulkSessionId).
  const isBulkRun = !!entry.bulkMode;
  function _ssReportBulkResult(result) {
    try {
      chrome.runtime.sendMessage({
        action: 'BULK_ITEM_RESULT',
        uploadSessionId: entry.bulkSessionId || storageKey,
        ...result
      }, () => { void chrome.runtime.lastError; });
    } catch (_) { /* background unreachable — worker timeout handles it */ }
  }

  try {
    const api     = window.EbayListingApiHelper;
    const adapted = api.adaptProduct(entry.product);

    await api.addVariations(
      entry.draftId,
      entry.epsData,
      adapted,
      entry.smsAspects || []
    );

    console.log('[SS Bulkedit] AddVariations complete.');

    // 3.4 — sync to dashboard now that variations are saved
    let syncResp = null;
    if (typeof window._syncListingToDashboard === 'function') {
      syncResp = await window._syncListingToDashboard(adapted, entry.product, entry.draftId);
    }

    if (isBulkRun) {
      // Worker owns this tab: report + clean this phase's session blob; the
      // background closes the tab. No navigation to the draft editor.
      _ssReportBulkResult({
        success: true,
        listingId: (syncResp && syncResp.listingId) || null,
        variationCount: adapted.prod_variations.length,
        draftId: entry.draftId
      });
      await chrome.storage.local.remove(storageKey).catch(() => {});
      return;
    }

    // Mark as imported, clear needsVariations (keep ssSummary for toast)
    await chrome.storage.local.set({
      [storageKey]: {
        ...entry,
        isImported:      true,
        needsVariations: false
      }
    });

    const suffix = window.location.host.split('ebay').pop()?.replace('.', '') || 'com';
    window.location.href =
      `https://www.ebay.${suffix}/lstng?draftId=${entry.draftId}&mode=AddItem`;

  } catch (err) {
    console.error('[SS Bulkedit] addVariations failed:', err.message || err);
    if (isBulkRun) {
      _ssReportBulkResult({ success: false, error: err.message || String(err) });
      chrome.storage.local.remove(storageKey).catch(() => {});
    }

    // Show error toast
    const div = document.createElement('div');
    div.setAttribute('superSolid', 'true');
    div.style.cssText = [
      'position:fixed','bottom:24px','right:24px','z-index:999999',
      'background:#d32f2f','color:#fff','padding:16px 20px',
      'border-radius:8px','font-family:sans-serif','font-size:13px',
      'max-width:360px','box-shadow:0 4px 16px rgba(0,0,0,.3)'
    ].join(';');
    // XSS fix: static HTML for chrome prefix, err.message injected as text node only
    div.innerHTML = '<strong>SellerSuit variation upload failed:</strong><br>';
    div.appendChild(document.createTextNode(err.message || String(err)));
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 12000);
  }
})();
