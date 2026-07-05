// ─────────────────────────────────────────────────────────────────────────────
// ebay_success.js — Listing publication success hook.
// Scrapes the live eBay item ID and draft ID, then notifies the background script
// to promote the staged 'draft' listing to 'active'.
//
// Now also injected on the /lstng draft page itself (not just a guessed "/success"
// sub-path), because eBay may confirm publication via an in-page SPA transition
// rather than a full navigation to a separate success URL. A short poll alone
// would miss that if the seller spends more than a few seconds reviewing the
// draft before clicking "List it", so this keeps watching (DOM mutations + SPA
// history changes) for as long as the tab stays open on an eBay listing page.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  console.log('[SS] Listing publish watcher active. Checking for a completed listing...');

  let reported = false;
  const WATCH_TIMEOUT_MS = 20 * 60 * 1000; // 20 min — generous review time, bounded so it can't run forever
  const startedAt = Date.now();

  function scrapeItemDetails() {
    const params = new URLSearchParams(window.location.search);
    let draftId = params.get('draftId') || params.get('draftid');
    let itemId = params.get('itemId') || params.get('itemid') || params.get('id');

    if (!itemId) {
      const itmLink = document.querySelector('a[href*="/itm/"]');
      if (itmLink) {
        const match = itmLink.href.match(/\/itm\/(\d+)/);
        if (match) itemId = match[1];
      }
    }

    if (!itemId) {
      const bodyText = document.body ? document.body.innerText : '';
      const match = bodyText.match(/(?:Item ID|Item number|Listing ID|itemId=):\s*(\d{12})/i) ||
                    bodyText.match(/\/itm\/(\d+)/);
      if (match) itemId = match[1];
    }

    return { itemId, draftId };
  }

  async function handleFound(details) {
    if (reported) return;
    reported = true;
    console.log('[SS] Scraped details:', details);

    if (!details.draftId) {
      const storage = await chrome.storage.local.get(null);
      let latest = null;
      for (const key of Object.keys(storage)) {
        const entry = storage[key];
        if (entry && typeof entry === 'object' && entry.isImported && entry.draftId) {
          const at = entry.stagedAt || 0;
          if (!latest || at > latest.at) latest = { draftId: entry.draftId, at };
        }
      }
      if (latest) {
        details.draftId = latest.draftId;
        console.log('[SS] Resolved draftId from storage (newest staging):', details.draftId);
      }
    }

    chrome.runtime.sendMessage({
      action: 'LISTING_PUBLISHED',
      payload: {
        draftId: details.draftId,
        ebayItemId: details.itemId
      }
    }, (resp) => {
      if (chrome.runtime.lastError) {
        console.error('[SS] Failed to send LISTING_PUBLISHED message:', chrome.runtime.lastError.message);
        return;
      }
      if (resp && resp.success) {
        console.log('[SS] Listing successfully promoted to active in dashboard!');
        _showSuccessOverlay(details.itemId);
      } else {
        console.error('[SS] Dashboard promotion failed:', resp?.error || 'unknown error');
      }
    });
  }

  function _showSuccessOverlay(itemId) {
    const div = document.createElement('div');
    div.id = '_ss_success_overlay';
    div.setAttribute('superSolid', 'true');
    div.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:999999',
      'background:#10b981', 'color:#fff', 'padding:16px 20px',
      'border-radius:12px', 'font-family:sans-serif', 'font-size:13px',
      'box-shadow:0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      'display:flex', 'align-items:center', 'gap:12px', 'border:1px solid #059669'
    ].join(';');
    div.innerHTML = `
      <div style="font-size:20px">✅</div>
      <div>
        <strong style="font-size:14px;display:block;margin-bottom:2px">SellerSuit Synced!</strong>
        <span style="color:#d1fae5">Listing is now active (ID: ${itemId})</span>
      </div>
    `;
    document.body.appendChild(div);
    setTimeout(() => {
      div.style.transition = 'opacity 0.5s ease';
      div.style.opacity = '0';
      setTimeout(() => div.remove(), 500);
    }, 6000);
  }

  function checkNow() {
    if (reported) return true;
    const details = scrapeItemDetails();
    if (details.itemId) {
      handleFound(details);
      return true;
    }
    return false;
  }

  // Immediate check covers the case of loading directly onto an already-published
  // page (e.g. a narrow "/success" URL, if eBay does redirect to one).
  if (checkNow()) return;

  // Persistent watch covers an in-page SPA transition after the seller finishes
  // reviewing the draft and clicks "List it" — DOM mutations, URL changes
  // (history.pushState/replaceState don't fire 'popstate'), and plain polling
  // as a catch-all since eBay's SPA internals aren't something we control.
  const observer = new MutationObserver(() => { checkNow(); });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  let lastUrl = window.location.href;
  const pollInterval = setInterval(() => {
    if (reported || Date.now() - startedAt > WATCH_TIMEOUT_MS) {
      observer.disconnect();
      clearInterval(pollInterval);
      return;
    }
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
    }
    checkNow();
  }, 2000);

  window.addEventListener('beforeunload', () => {
    observer.disconnect();
    clearInterval(pollInterval);
  });
})();
