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

  // ─── Overlay helpers ───────────────────────────────────────────────────────
  function _ssShowOverlay(msg) {
    if (document.getElementById('_ss_upload_overlay')) {
      _ssUpdateOverlay(msg);
      return;
    }

    // Inject Google Font Outfit
    if (!document.getElementById('_ss_font_outfit')) {
      const link = document.createElement('link');
      link.id = '_ss_font_outfit';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }

    const div = document.createElement('div');
    div.id = '_ss_upload_overlay';
    div.setAttribute('superSolid', 'true');
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-modal', 'true');
    div.setAttribute('aria-labelledby', 'ss_overlay_title');

    div.innerHTML = `
      <div class="ss-overlay-container">
        <div class="ss-overlay-card">
          <!-- Brand Header -->
          <div class="ss-brand-header">
            <svg class="ss-brand-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#ss-logo-grad)" stroke="#3563d6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#3563d6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="ss-logo-grad" x1="2" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#3563d6"/>
                  <stop offset="1" stop-color="#7c3aed"/>
                </linearGradient>
              </defs>
            </svg>
            <span class="ss-brand-name">SellerSuit</span>
          </div>

          <!-- GIF Container -->
          <div class="ss-gif-container">
            <div id="_ss_overlay_icon" class="ss-gif-wrapper">
              <div class="ss-gif-placeholder">📦</div>
            </div>
          </div>

          <!-- Heading & Info -->
          <h2 id="ss_overlay_title" class="ss-title">Preparing your eBay listing</h2>
          <p class="ss-subtitle">We’re analyzing your product data and building an optimized draft.</p>

          <!-- Progress Section -->
          <div class="ss-progress-section">
            <div class="ss-progress-info">
              <span id="_ss_overlay_msg" aria-live="polite" class="ss-progress-text">${msg}</span>
              <span id="_ss_overlay_pct" class="ss-progress-pct">85%</span>
            </div>
            <div class="ss-progress-track">
              <div id="_ss_overlay_bar" class="ss-progress-bar" style="width: 85%"></div>
            </div>
          </div>

          <!-- 3-Step Tracker -->
          <div class="ss-steps-container">
            <!-- Step 1 -->
            <div id="ss_step_1" class="ss-step ss-step-completed">
              <div class="ss-step-status-icon">
                <span class="ss-step-bullet"></span>
                <svg class="ss-step-check" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div class="ss-step-label">Analyzing item</div>
            </div>
            <!-- Step 2 -->
            <div id="ss_step_2" class="ss-step ss-step-completed">
              <div class="ss-step-status-icon">
                <span class="ss-step-bullet"></span>
                <svg class="ss-step-check" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div class="ss-step-label">Writing listing</div>
            </div>
            <!-- Step 3 -->
            <div id="ss_step_3" class="ss-step ss-step-active">
              <div class="ss-step-status-icon">
                <span class="ss-step-bullet"></span>
                <svg class="ss-step-check" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div class="ss-step-label">Creating draft</div>
            </div>
          </div>

          <!-- Footer Row -->
          <div class="ss-footer-row">
            <span class="ss-footer-helper">Usually takes less than a minute</span>
            <span class="ss-footer-trust">
              <svg class="ss-trust-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 4.61 3.293 8.448 7.724 9.292a.75.75 0 00.552 0C14.707 15.448 18 11.61 18 7c0-.681-.056-1.351-.166-2A11.954 11.954 0 0110 1.944zM11 5a1 1 0 11-2 0 1 1 0 012 0zM9 8a.75.75 0 000 1.5h.25v2.25H9a.75.75 0 000 1.5h2.5a.75.75 0 000-1.5h-.25V9.5a.75.75 0 00-.75-.75H9z" clip-rule="evenodd"/>
              </svg>
              Secure process — please keep this tab open
            </span>
          </div>
        </div>
      </div>`;

    // Fetch the GIF and convert to Base64 to bypass eBay's CSP img-src restrictions
    fetch(chrome.runtime.getURL('assets/preparing.gif'))
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const iconWrapper = div.querySelector('#_ss_overlay_icon');
          if (iconWrapper) {
            iconWrapper.innerHTML = `<img src="${reader.result}" alt="Preparing..." />`;
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => {
        console.warn('[SS] Failed to load custom overlay GIF:', err);
      });

    const style = document.createElement('style');
    style.id = '_ss_overlay_styles';
    style.textContent = `
      #_ss_upload_overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        display: block;
        box-sizing: border-box;
      }
      
      .ss-overlay-container {
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-sizing: border-box;
        padding: 16px;
      }
      
      .ss-overlay-card {
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 24px;
        box-shadow: 0 20px 48px -12px rgba(15, 23, 42, 0.12), 0 8px 20px -8px rgba(15, 23, 42, 0.08);
        width: 100%;
        max-width: 520px;
        padding: 36px;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        max-height: 90vh;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      
      .ss-overlay-card::-webkit-scrollbar {
        display: none;
      }
      
      .ss-brand-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-bottom: 24px;
      }
      
      .ss-brand-logo {
        width: 28px;
        height: 28px;
        display: block;
      }
      
      .ss-brand-name {
        font-size: 18px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: -0.02em;
      }
      
      .ss-gif-container {
        width: 100%;
        height: 180px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 24px;
        border-radius: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        overflow: hidden;
      }
      
      .ss-gif-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ss-gif-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
      
      .ss-gif-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        font-size: 32px;
      }
      
      .ss-title {
        font-size: 22px;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 8px 0;
        text-align: center;
        letter-spacing: -0.02em;
        line-height: 1.25;
      }
      
      .ss-subtitle {
        font-size: 14px;
        color: #475569;
        line-height: 1.5;
        margin: 0 0 28px 0;
        text-align: center;
      }
      
      .ss-progress-section {
        width: 100%;
        margin-bottom: 28px;
      }
      
      .ss-progress-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .ss-progress-text {
        font-size: 13px;
        font-weight: 600;
        color: #3563d6;
      }
      
      .ss-progress-pct {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
      }
      
      .ss-progress-track {
        height: 6px;
        background: #f1f5f9;
        border-radius: 6px;
        overflow: hidden;
      }
      
      .ss-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #3563d6 0%, #7c3aed 100%);
        border-radius: 6px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .ss-steps-container {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 0;
        border-top: 1px dashed #e2e8f0;
        border-bottom: 1px dashed #e2e8f0;
        margin-bottom: 24px;
      }
      
      .ss-step {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
        transition: all 0.3s ease;
      }
      
      .ss-step-status-icon {
        width: 20px;
        height: 20px;
        min-width: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }
      
      .ss-step-bullet {
        border-radius: 50%;
      }
      
      .ss-step-check {
        width: 12px;
        height: 12px;
        fill: currentColor;
        display: none;
      }
      
      .ss-step-label {
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      /* Step - Pending */
      .ss-step-pending {
        opacity: 0.5;
      }
      .ss-step-pending .ss-step-status-icon {
        background: #f1f5f9;
        border: 1.5px solid #cbd5e1;
      }
      .ss-step-pending .ss-step-bullet {
        width: 6px;
        height: 6px;
        background: #94a3b8;
      }
      .ss-step-pending .ss-step-label {
        color: #475569;
      }
      
      /* Step - Active */
      .ss-step-active {
        opacity: 1;
      }
      .ss-step-active .ss-step-status-icon {
        background: rgba(53, 99, 214, 0.08);
        border: 1.5px solid #3563d6;
        box-shadow: 0 0 0 3px rgba(53, 99, 214, 0.12);
        animation: ss-pulse-icon 2s infinite ease-in-out;
      }
      .ss-step-active .ss-step-bullet {
        width: 8px;
        height: 8px;
        background: #3563d6;
        animation: ss-pulse-bullet 1.5s infinite ease-in-out;
      }
      .ss-step-active .ss-step-label {
        color: #0f172a;
        font-weight: 600;
      }
      
      /* Step - Completed */
      .ss-step-completed {
        opacity: 1;
      }
      .ss-step-completed .ss-step-status-icon {
        background: #10b981;
        border: 1.5px solid #10b981;
      }
      .ss-step-completed .ss-step-bullet {
        display: none;
      }
      .ss-step-completed .ss-step-check {
        display: block;
        color: #fff;
      }
      .ss-step-completed .ss-step-label {
        color: #475569;
      }
      
      .ss-footer-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      
      .ss-footer-helper {
        font-size: 12px;
        color: #94a3b8;
        font-weight: 500;
      }
      
      .ss-footer-trust {
        font-size: 12px;
        color: #475569;
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 500;
      }
      
      .ss-trust-icon {
        width: 14px;
        height: 14px;
        color: #10b981;
        flex-shrink: 0;
      }
      
      @keyframes ss-pulse-icon {
        0%, 100% { box-shadow: 0 0 0 2px rgba(53, 99, 214, 0.08); }
        50% { box-shadow: 0 0 0 6px rgba(53, 99, 214, 0.2); }
      }
      
      @keyframes ss-pulse-bullet {
        0%, 100% { transform: scale(0.8); opacity: 0.7; }
        50% { transform: scale(1.2); opacity: 1; }
      }
      
      @media (max-width: 576px) {
        .ss-overlay-container {
          padding: 12px;
        }
        .ss-overlay-card {
          border-radius: 20px;
          padding: 24px;
        }
        .ss-gif-container {
          height: 140px;
          margin-bottom: 20px;
        }
        .ss-steps-container {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 0;
        }
        .ss-step {
          width: 100%;
        }
        .ss-footer-row {
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
        }
      }
    `;
    div.appendChild(style);
    document.body.appendChild(div);

    _ssUpdateOverlay(msg);
    document.body.style.overflow = 'hidden';
  }

  function _ssUpdateOverlay(msg) {
    const overlay = document.getElementById('_ss_upload_overlay');
    if (!overlay) return;

    const msgEl = document.getElementById('_ss_overlay_msg');
    if (msgEl) msgEl.textContent = msg;

    const STAGE_MAPPINGS = {
      'variations':  { pct: 90, step: 3 },
      'syncing':     { pct: 95, step: 3 },
      'done':        { pct: 100, step: 4 },
      'listed':      { pct: 100, step: 4 }
    };

    let stageKey = 'variations';
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes('sync')) stageKey = 'syncing';
    else if (lowerMsg.includes('done') || lowerMsg.includes('listed')) stageKey = 'done';

    const stage = STAGE_MAPPINGS[stageKey];

    const pctEl = document.getElementById('_ss_overlay_pct');
    if (pctEl) {
      pctEl.textContent = `${stage.pct}%`;
    }

    const barEl = document.getElementById('_ss_overlay_bar');
    if (barEl) {
      barEl.style.width = `${stage.pct}%`;
    }

    for (let s = 1; s <= 3; s++) {
      const stepEl = document.getElementById(`ss_step_${s}`);
      if (!stepEl) continue;

      stepEl.classList.remove('ss-step-pending', 'ss-step-active', 'ss-step-completed');

      if (s < stage.step) {
        stepEl.classList.add('ss-step-completed');
      } else if (s === stage.step) {
        stepEl.classList.add('ss-step-active');
      } else {
        stepEl.classList.add('ss-step-pending');
      }
    }
  }

  function _ssHideOverlay() {
    const el = document.getElementById('_ss_upload_overlay');
    if (el) el.remove();
    document.body.style.removeProperty('overflow');
  }

  function _ssShowError(msg) {
    _ssHideOverlay();
    const div = document.createElement('div');
    div.setAttribute('superSolid', 'true');
    div.style.cssText = [
      'position:fixed','bottom:24px','right:24px','z-index:999999',
      'background:#d32f2f','color:#fff','padding:16px 20px',
      'border-radius:8px','font-family:sans-serif','font-size:13px',
      'max-width:360px','box-shadow:0 4px 16px rgba(0,0,0,.3)'
    ].join(';');
    div.innerHTML = `<strong>SellerSuit variation upload failed:</strong><br>${msg}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 12000);
  }

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
    _ssShowOverlay('Adding listing variations…');
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
    _ssUpdateOverlay('Syncing to dashboard…');
    let syncResp = null;
    if (typeof window._syncListingToDashboard === 'function') {
      syncResp = await window._syncListingToDashboard(adapted, entry.product, entry.draftId);
    }

    if (isBulkRun) {
      // Worker owns this tab: report + clean this phase's session blob; the
      // background closes the tab. No navigation to the draft editor.
      _ssUpdateOverlay('Done! Redirecting…');
      _ssReportBulkResult({
        success: true,
        listingId: (syncResp && syncResp.listingId) || null,
        variationCount: adapted.prod_variations.length,
        draftId: entry.draftId
      });
      _ssHideOverlay();
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

    _ssUpdateOverlay('Done! Redirecting…');
    _ssHideOverlay();
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
    _ssShowError(err.message || String(err));
  }
})();
