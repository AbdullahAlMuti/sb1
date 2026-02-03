// ═══════════════════════════════════════════════════════════
// eBay Orders Sync Trigger
// Runs on eBay Seller Hub Orders page to trigger order sync
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // FORCE DEBUG MODE
  const DEBUG = true;
  const SYNC_DELAY_MS = 3000;
  const SYNC_DEBOUNCE_KEY = 'ebay_orders_last_sync_trigger';
  const MIN_SYNC_INTERVAL_MS = 5 * 1000; // Reduced to 5s for debugging

  // Status badge & Debug Log reference
  let statusBadge = null;
  let debugLogContainer = null;

  function log(level, message, data = null) {
    // 1. Console log
    const prefix = '[eBay Orders Sync]';
    const msg = `${prefix} ${message}`;
    if (data) console[level](msg, data);
    else console[level](msg);

    // 2. Visual log
    appendVisualLog(level, message);
  }

  // Create Visual Log Container
  function createDebugLogContainer() {
    if (debugLogContainer) return debugLogContainer;

    debugLogContainer = document.createElement('div');
    debugLogContainer.id = 'ss-debug-log';
    debugLogContainer.innerHTML = `
      <style>
        #ss-debug-log {
          position: fixed;
          bottom: 100px; /* Above the badge */
          right: 20px;
          width: 350px;
          max-height: 400px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(4px);
          color: #00ff00;
          font-family: monospace;
          font-size: 11px;
          padding: 10px;
          border-radius: 8px;
          z-index: 999999;
          overflow-y: auto;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          gap: 4px;
          border: 1px solid #333;
        }
        .ss-log-entry { margin: 0; padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .ss-log-entry.error { color: #ff5555; }
        .ss-log-entry.warn { color: #ffaa00; }
        .ss-log-entry.success { color: #55ff55; font-weight: bold; }
        .ss-log-entry.info { color: #aaaaaa; }
        .ss-log-time { color: #666; margin-right: 5px; }
      </style>
      <div style="color: #fff; font-weight: bold; padding-bottom: 5px; border-bottom: 1px solid #444; margin-bottom: 5px; display:flex; justify-content:space-between;">
        <span>SellerSuit Debug Console</span>
        <button id="ss-clear-logs" style="background:none; border:none; color:#888; cursor:pointer;">Clear</button>
      </div>
      <div id="ss-log-content"></div>
    `;
    document.body.appendChild(debugLogContainer);

    document.getElementById('ss-clear-logs').onclick = () => {
      document.getElementById('ss-log-content').innerHTML = '';
    };

    return debugLogContainer;
  }

  function appendVisualLog(level, message) {
    if (!debugLogContainer) createDebugLogContainer();
    const content = document.getElementById('ss-log-content');
    if (!content) return;

    const entry = document.createElement('div');
    entry.className = `ss-log-entry ${level}`;
    const time = new Date().toLocaleTimeString().split(' ')[0];
    entry.innerHTML = `<span class="ss-log-time">[${time}]</span> ${message}`;

    content.appendChild(entry);
    debugLogContainer.scrollTop = debugLogContainer.scrollHeight;
  }

  // Listen for background script logs
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SYNC_LOG') {
      log(request.level || 'info', request.message);
    }
  });

  // Create and inject the sync status badge
  function createStatusBadge() {
    if (statusBadge) return statusBadge;

    statusBadge = document.createElement('div');
    statusBadge.id = 'sellersuit-sync-badge';
    statusBadge.innerHTML = `
      <style>
        #sellersuit-sync-badge {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .ss-badge-container {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(139, 92, 246, 0.1);
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 200px;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        .ss-badge-container:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4), 0 0 50px rgba(139, 92, 246, 0.2);
        }
        .ss-badge-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .ss-badge-icon.checking {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          animation: ss-pulse 1.5s infinite;
        }
        .ss-badge-icon.syncing {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          animation: ss-spin 1s linear infinite;
        }
        .ss-badge-icon.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        .ss-badge-icon.error {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }
        .ss-badge-icon.offline {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        }
        .ss-badge-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ss-badge-title {
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ss-badge-subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
        }
        .ss-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }
        .ss-badge-dot.syncing {
          background: #f59e0b;
          animation: ss-blink 1s infinite;
        }
        .ss-badge-dot.success {
          background: #10b981;
        }
        .ss-badge-dot.error {
          background: #ef4444;
        }
        .ss-badge-dot.offline {
          background: #6b7280;
        }
        .ss-close-btn {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #374151;
          border: none;
          color: #9ca3af;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .ss-badge-container:hover .ss-close-btn {
          opacity: 1;
        }
        .ss-close-btn:hover {
          background: #4b5563;
          color: #fff;
        }
        @keyframes ss-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes ss-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ss-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      </style>
      <div class="ss-badge-container" style="position: relative;">
        <button class="ss-close-btn" title="Hide">×</button>
        <div class="ss-badge-icon checking">🔄</div>
        <div class="ss-badge-content">
          <div class="ss-badge-title">
            <span class="ss-badge-dot syncing"></span>
            SellerSuit Sync
          </div>
          <div class="ss-badge-subtitle">Checking connection...</div>
        </div>
      </div>
    `;

    document.body.appendChild(statusBadge);

    // Add close button handler
    statusBadge.querySelector('.ss-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      statusBadge.style.display = 'none';
    });

    return statusBadge;
  }

  // Update the status badge
  function updateStatusBadge(status, subtitle, orderCount = null) {
    if (!statusBadge) createStatusBadge();

    const iconEl = statusBadge.querySelector('.ss-badge-icon');
    const dotEl = statusBadge.querySelector('.ss-badge-dot');
    const subtitleEl = statusBadge.querySelector('.ss-badge-subtitle');

    // Remove all status classes
    iconEl.className = 'ss-badge-icon';
    dotEl.className = 'ss-badge-dot';

    switch (status) {
      case 'checking':
        iconEl.classList.add('checking');
        iconEl.textContent = '🔄';
        dotEl.classList.add('syncing');
        break;
      case 'syncing':
        iconEl.classList.add('syncing');
        iconEl.textContent = '⬆️';
        dotEl.classList.add('syncing');
        break;
      case 'success':
        iconEl.classList.add('success');
        iconEl.textContent = '✓';
        dotEl.classList.add('success');
        break;
      case 'error':
        iconEl.classList.add('error');
        iconEl.textContent = '✕';
        dotEl.classList.add('error');
        break;
      case 'offline':
        iconEl.classList.add('offline');
        iconEl.textContent = '○';
        dotEl.classList.add('offline');
        break;
    }

    let subtitleText = subtitle;
    if (orderCount !== null && orderCount > 0) {
      subtitleText += ` (${orderCount} orders)`;
    }
    subtitleEl.textContent = subtitleText;
  }

  // Check if we should trigger a sync (debounce)
  async function shouldTriggerSync() {
    try {
      const data = await chrome.storage.local.get(SYNC_DEBOUNCE_KEY);
      const lastSync = data[SYNC_DEBOUNCE_KEY] || 0;
      const now = Date.now();

      if (now - lastSync < MIN_SYNC_INTERVAL_MS) {
        log('debug', `Sync skipped: last sync was ${Math.round((now - lastSync) / 1000)}s ago`);
        return false;
      }

      // Update last sync time
      await chrome.storage.local.set({ [SYNC_DEBOUNCE_KEY]: now });
      return true;
    } catch (err) {
      log('error', 'Error checking sync debounce', err);
      return true; // Proceed anyway if storage check fails
    }
  }

  // Trigger the sync via message to background script
  async function triggerSync() {
    log('info', 'Triggering eBay orders sync...');
    updateStatusBadge('syncing', 'Syncing orders...');

    try {
      // Check if we have auth
      const authData = await chrome.storage.local.get(['saasToken', 'saasUser']);
      if (!authData.saasToken) {
        log('debug', 'Sync skipped: user not authenticated');
        updateStatusBadge('offline', 'Not logged in to SellerSuit');
        return;
      }

      // Send sync message to background script
      chrome.runtime.sendMessage({ action: 'sync_ebay_orders' }, (response) => {
        if (chrome.runtime.lastError) {
          log('error', 'Sync message failed', chrome.runtime.lastError.message);
          updateStatusBadge('error', 'Sync failed - extension error');
          return;
        }

        if (response?.ok) {
          const orderCount = response.cache?.count || 0;
          log('info', `Sync completed: ${orderCount} orders`);
          updateStatusBadge('success', 'Synced to dashboard', orderCount);

          // Notify the web app that sync completed (if open)
          notifyWebApp(response);

          // Auto-hide after 10 seconds on success
          setTimeout(() => {
            if (statusBadge) {
              statusBadge.style.transition = 'opacity 0.5s ease';
              statusBadge.style.opacity = '0.7';
            }
          }, 10000);
        } else {
          log('error', 'Sync failed', response?.error);
          updateStatusBadge('error', response?.error || 'Sync failed');
        }
      });
    } catch (err) {
      log('error', 'Error triggering sync', err);
      updateStatusBadge('error', 'Unexpected error');
    }
  }

  // Notify web app about sync completion via storage event
  function notifyWebApp(response) {
    try {
      // Store sync result for web app to pick up
      chrome.storage.local.set({
        'ebay_orders_sync_result': {
          success: true,
          count: response.cache?.count || 0,
          timestamp: new Date().toISOString()
        }
      });
      log('debug', 'Notified web app of sync completion');
    } catch (err) {
      log('error', 'Error notifying web app', err);
    }
  }

  // Main initialization
  async function init() {
    log('info', 'eBay Seller Hub Orders page detected');

    // Create status badge immediately
    createStatusBadge();
    updateStatusBadge('checking', 'Preparing sync...');

    // Wait for page to stabilize
    await new Promise(r => setTimeout(r, SYNC_DELAY_MS));

    // Check debounce
    const shouldSync = await shouldTriggerSync();
    if (!shouldSync) {
      log('debug', 'Sync debounced, skipping');
      // Still show status for recently synced
      const data = await chrome.storage.local.get(SYNC_DEBOUNCE_KEY);
      const lastSync = data[SYNC_DEBOUNCE_KEY] || 0;
      const secsAgo = Math.round((Date.now() - lastSync) / 1000);
      updateStatusBadge('success', `Synced ${secsAgo}s ago`);
      return;
    }

    // Trigger the sync
    await triggerSync();
  }

  // Run on page load
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }

  // Also listen for SPA navigation (eBay uses client-side routing)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Check if we're on an orders-related page
      if (location.pathname.includes('/sh/ord') || location.pathname.includes('/mesh/ord') || location.pathname.includes('/sh/reports')) {
        log('debug', 'SPA navigation detected to orders page');
        init();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  log('debug', 'eBay Orders Sync Trigger initialized');
})();
