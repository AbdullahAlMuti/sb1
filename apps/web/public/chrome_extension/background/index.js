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

// Global helper functions to be shared across imported scripts
const getUrls = () => typeof ExtensionConfig !== 'undefined' ? ExtensionConfig.URLS : null;
const getApiKeys = () => typeof ExtensionConfig !== 'undefined' ? ExtensionConfig.API_KEYS : null;

// Set on every SW init — lost on SW restart if only set in event listeners
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

importScripts(
  '../common/config.js',
  '../common/constants.js',
  '../common/auth-helper.js',
  '../common/performance.js',
  '../common/message-handler.js',
  '../common/retry-helper.js',
  '../common/api-client.js',
  '../common/sync-utils.js',
  'listing-runner.js',
  'alarm-handler.js',
  'message-router.js'
);

if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES?.DEBUG_MODE) {
  console.log('✅ Background Service Worker Entry Point Fully Initialized');
}
