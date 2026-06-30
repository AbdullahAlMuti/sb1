// ═══════════════════════════════════════════════════════════
// 🚀 BACKGROUND SERVICE WORKER - ENTRY POINT
// Central entry point importing all config, helpers, and listeners.
//
// ⚠️ REQUIRED DEPENDENCY RESOLUTION CHAIN (Order is critical):
// 1. ../common/config.js          - Initializes global ExtensionConfig (URLs, API keys, timings)
// 2. ../common/constants.js       - Registers global ExtensionConstants (Actions, storage keys, DOM selectors)
// 3. ../common/auth-helper.js     - Registers global AuthHelper (JWT token extraction, auth-status edge caller)
// 4. ../common/performance.js     - Registers global PerformanceUtils (performance-timing and cache layers)
// 5. ../common/message-handler.js - Registers global MessageHandler (abstractions for port/tab sending)
// 6. ../common/retry-helper.js    - Registers global RetryHelper (reusable fetch with backoff logic)
// 7. ../common/api-client.js       - Registers global ApiClient (unified backend fetch wrappers)
// 8. ../common/sync-utils.js      - Registers global SyncUtils (order sync, sheets logging, offline queue)
// 9. listing-runner.js            - Registers bulk scraper state machine and postCreateListing helpers
// 10. alarm-handler.js            - Registers chrome.alarms schedule listener and settings sync scheduler
// 11. message-router.js           - Registers the single main runtime.onMessage router layer
// ═══════════════════════════════════════════════════════════

import './setup.js';

// Global helper functions to be shared across imported scripts
window.getUrls = () => typeof window.ExtensionConfig !== 'undefined' ? window.ExtensionConfig.URLS : null;
window.getApiKeys = () => typeof window.ExtensionConfig !== 'undefined' ? window.ExtensionConfig.API_KEYS : null;

// Set on every SW init — lost on SW restart if only set in event listeners
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// ── Tab-scoped side panel ─────────────────────────────────────────────────────
// manifest no longer declares side_panel.default_path: a global path made
// Chrome persist the panel on every tab (YouTube etc.) once opened. Instead the
// panel is enabled per-tab, only on supplier domains the panel can act on.
const SIDE_PANEL_DOMAINS = [
  'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.ca', 'amazon.com.au',
  'walmart.com', 'walmart.ca',
  'aliexpress.com', 'aliexpress.ru', 'aliexpress.us'
];

function isSidePanelUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return SIDE_PANEL_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch (_) {
    return false;
  }
}

async function configureSidePanelForTab(tabId, url) {
  if (isSidePanelUrl(url)) {
    await chrome.sidePanel.setOptions({ tabId, path: 'sidepanel/side-panel.html', enabled: true });
  } else {
    await chrome.sidePanel.setOptions({ tabId, enabled: false });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || (changeInfo.status === 'loading' ? tab?.url : null);
  if (url) configureSidePanelForTab(tabId, url).catch(() => {});
});

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    if (chrome.runtime.lastError || !tab) return;
    configureSidePanelForTab(activeInfo.tabId, tab.url).catch(() => {});
  });
});

// Cover tabs already open when the SW (re)starts — onUpdated won't fire for them.
chrome.tabs.query({}, tabs => {
  if (chrome.runtime.lastError || !Array.isArray(tabs)) return;
  for (const tab of tabs) {
    if (tab.id != null) configureSidePanelForTab(tab.id, tab.url).catch(() => {});
  }
});

// Configure session storage access level so that content scripts can access it
if (chrome.storage && chrome.storage.session && typeof chrome.storage.session.setAccessLevel === 'function') {
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' }).catch(err => {
    console.warn('[Background] Failed to set session storage access level:', err);
  });
}

import '../common/config.js';
import '../common/constants.js';
import '../common/auth-helper.js';
import '../common/performance.js';
import '../common/message-handler.js';
import '../common/retry-helper.js';
import '../common/api-client.js';
import '../common/sync-utils.js';
import '../common/sku-engine.js';
import '../common/ebay-image-helper.js';
import '../common/ebay-listing-api.js';
import './bulk-core.js';
import './listing-runner.js';
import './alarm-handler.js';
import './message-router.js';

if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES?.DEBUG_MODE) {
  console.log('✅ Background Service Worker Entry Point Fully Initialized');
}
