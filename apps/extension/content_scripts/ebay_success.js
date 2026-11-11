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

    // eBay item IDs are numeric — never trust a URL parameter as HTML/ID.
    if (!/^\d{9,15}$/.test(String(details.itemId || ''))) {
      console.warn('[SS] Ignoring non-numeric item id from success page');
      return;
    }

    if (!details.draftId) {
      // The success URL did not carry the draftId. Only link when it is
      // UNAMBIGUOUS: exactly one draft was staged recently. Picking "the newest
      // staged draft" attached the eBay item ID to the wrong dashboard row
      // whenever more than one draft was open.
      const RECENT_MS = 2 * 60 * 60 * 1000;
      const storage = await chrome.storage.local.get(null);
      const candidates = new Set();
      for (const key of Object.keys(storage)) {
        const entry = storage[key];
        if (entry && typeof entry === 'object' && entry.isImported && entry.draftId &&
            Date.now() - (entry.stagedAt || 0) < RECENT_MS) {
          candidates.add(String(entry.draftId));
        }
      }
      if (candidates.size === 1) {
        details.draftId = [...candidates][0];
        console.log('[SS] Resolved draftId from the single recent staged draft:', details.draftId);
      } else {
        console.warn(`[SS] Cannot link published item ${details.itemId}: ${candidates.size} recent drafts — not guessing.`);
        _showNotice(
          'Published on eBay — not linked in SellerSuit',
          `Item ${details.itemId} could not be matched to one draft. Open Listings in your dashboard and sync.`,
          false
        );
        return;
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
        _showNotice('Published on eBay — dashboard update failed',
          String(resp?.error || 'unknown error').slice(0, 160), false);
      }
    });
  }

  // Text-only notice (textContent, no HTML) for outcomes the seller must see.
  function _showNotice(title, detail, ok) {
    try {
      const div = document.createElement('div');
      div.setAttribute('superSolid', 'true');
      div.style.cssText = [
        'position:fixed', 'bottom:24px', 'right:24px', 'z-index:999999',
        `background:${ok ? '#10b981' : '#b45309'}`, 'color:#fff', 'padding:14px 18px',
        'border-radius:12px', 'font-family:sans-serif', 'font-size:13px', 'max-width:360px',
        'box-shadow:0 10px 25px -5px rgba(0,0,0,.2)'
      ].join(';');
      const strong = document.createElement('strong');
      strong.style.cssText = 'display:block;font-size:14px;margin-bottom:2px';
      strong.textContent = title;
      const span = document.createElement('span');
      span.textContent = detail;
      div.appendChild(strong);
      div.appendChild(span);
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 12000);
    } catch (_) { /* console record above stands */ }
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
