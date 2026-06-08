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

  try {
    const api     = window.EbayListingApiHelper;
    const adapted = api.adaptProduct(entry.product);

    await api.addVariations(
      entry.draftId,
      entry.epsData,
      adapted,
      entry.smsAspects || []
    );

    console.log('[SS Bulkedit] AddVariations complete. Navigating to draft editor...');

    // 3.4 — sync to dashboard now that variations are saved
    if (typeof window._syncListingToDashboard === 'function') {
      window._syncListingToDashboard(adapted, entry.product, entry.draftId);
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

    // Show error toast
    const div = document.createElement('div');
    div.setAttribute('superSolid', 'true');
    div.style.cssText = [
      'position:fixed','bottom:24px','right:24px','z-index:999999',
      'background:#d32f2f','color:#fff','padding:16px 20px',
      'border-radius:8px','font-family:sans-serif','font-size:13px',
      'max-width:360px','box-shadow:0 4px 16px rgba(0,0,0,.3)'
    ].join(';');
    div.innerHTML = `<strong>SellerSuit variation upload failed:</strong><br>${err.message || err}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 12000);
  }
})();
