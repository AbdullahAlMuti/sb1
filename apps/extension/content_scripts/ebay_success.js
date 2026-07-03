// ─────────────────────────────────────────────────────────────────────────────
// ebay_success.js — Listing publication success hook.
// Scrapes the live eBay item ID and draft ID, then notifies the background script
// to promote the staged 'draft' listing to 'active'.
// ─────────────────────────────────────────────────────────────────────────────

(async function() {
  console.log('[SS] Listing success page loaded. Checking details...');

  // 1. Scraping helper
  function scrapeItemDetails() {
    const params = new URLSearchParams(window.location.search);
    let draftId = params.get('draftId') || params.get('draftid');
    let itemId = params.get('itemId') || params.get('itemid') || params.get('id');

    // Attempt to scrape itemId from DOM if not in URL
    if (!itemId) {
      // Look for a link to the listed item (e.g. /itm/123456789012)
      const itmLink = document.querySelector('a[href*="/itm/"]');
      if (itmLink) {
        const match = itmLink.href.match(/\/itm\/(\d+)/);
        if (match) itemId = match[1];
      }
    }

    if (!itemId) {
      // RegEx fallback in body
      const bodyText = document.body.innerText;
      const match = bodyText.match(/(?:Item ID|Item number|Listing ID|itemId=):\s*(\d{12})/i) ||
                    bodyText.match(/\/itm\/(\d+)/);
      if (match) itemId = match[1];
    }

    return { itemId, draftId };
  }

  // Poll a few times if DOM isn't fully ready
  let details = scrapeItemDetails();
  let attempts = 0;
  while (!details.itemId && attempts < 5) {
    await new Promise(r => setTimeout(r, 1000));
    details = scrapeItemDetails();
    attempts++;
  }

  console.log('[SS] Scraped details:', details);

  if (!details.itemId) {
    console.warn('[SS] Could not find eBay Item ID on success page.');
    return;
  }

  // Retrieve draftId from local storage if not in URL
  if (!details.draftId) {
    // Find the MOST RECENT staged upload session. First-match iteration picked
    // an arbitrary entry (numeric tabId keys sort first), which could promote
    // the wrong dashboard listing when older session blobs were still around.
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

  // Notify background script
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

  // Success overlay UI
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

})();
