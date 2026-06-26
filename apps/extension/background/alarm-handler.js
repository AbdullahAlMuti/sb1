/**
 * SellerSuit Alarm Handler
 * Consolidates all alarm listeners and settings synchronization logic.
 */

const EBAY_ORDER_SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes

// getUrls and getApiKeys are declared globally in background/index.js

async function syncSettings() {
  try {
    if (typeof AuthHelper === 'undefined') return;
    const isAuth = await AuthHelper.isAuthenticated();
    if (!isAuth) return;

    const response = await AuthHelper.callEdgeFunction('extension-bootstrap');
    if (response.data && response.data.success) {
      const data = response.data;
      const updates = {
        extensionBootstrapCache: data
      };

      // Map feature flags if present
      if (data.featureFlags) {
        updates.ebaySyncEnabled = data.featureFlags.ebay_sync_enabled !== false;
        if (data.featureFlags.ebay_sync_interval) {
          updates.ebaySyncInterval = parseInt(data.featureFlags.ebay_sync_interval, 10) * 60 * 1000;
        }
      }

      // Sync calculator settings from DB — DB is authoritative when a row exists.
      // Maps snake_case DB columns to the hyphen-cased keys the panel UI and pricing
      // engine read from chrome.storage.local.calculatorValues.
      if (data.calculatorSettings) {
        const cs = data.calculatorSettings;
        updates.calculatorValues = {
          'tax-percent':       cs.tax_percent          ?? 9,
          'tracking-fee':      cs.tracking_fee         ?? 0.20,
          'ebay-fee-percent':  cs.ebay_fee_percent     ?? 20,
          'promo-fee-percent': cs.promotional_fee_percent ?? 10,
          'desired-profit':    cs.desired_profit_percent  ?? 0,
          'payment-fixed-fee': cs.payment_fixed_fee    ?? 0.30,
        };
      }

      await chrome.storage.local.set(updates);
      console.log('🔄 SYNC: Bootstrap cache and settings updated.', updates);
      startEbayOrderSyncInterval();
    }
  } catch (error) {
    console.error('🔄 SYNC ERROR:', error);
  }
}

const ALARM_SYNC_ORDERS = 'ebay-order-sync';
const ALARM_SYNC_SETTINGS = 'sync-settings';

async function startEbayOrderSyncInterval() {
  const data = await chrome.storage.local.get(['ebaySyncInterval', 'ebaySyncEnabled']);
  const interval = data.ebaySyncInterval || EBAY_ORDER_SYNC_INTERVAL;
  const enabled = data.ebaySyncEnabled !== false;

  if (!enabled) {
    if (typeof SyncUtils !== 'undefined') {
      SyncUtils.syncLog('info', 'eBay auto-sync is DISABLED by user.');
    } else {
      console.log('SyncUtils undefined, eBay auto-sync is DISABLED by user.');
    }
    await chrome.alarms.clear(ALARM_SYNC_ORDERS);
    return;
  }

  // chrome.alarms minimum period is 1 minute
  const periodMinutes = Math.max(1, interval / 60000);
  await chrome.alarms.create(ALARM_SYNC_ORDERS, { periodInMinutes: periodMinutes });
  if (typeof SyncUtils !== 'undefined') {
    SyncUtils.syncLog('info', `eBay order sync alarm set (every ${periodMinutes} min)`);
  } else {
    console.log(`eBay order sync alarm set (every ${periodMinutes} min)`);
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.ebaySyncInterval || changes.ebaySyncEnabled) {
      startEbayOrderSyncInterval();
    }
  }
});

async function stopEbayOrderSyncInterval() {
  await chrome.alarms.clear(ALARM_SYNC_ORDERS);
  if (typeof SyncUtils !== 'undefined') {
    SyncUtils.syncLog('info', 'eBay order sync alarm cleared');
  } else {
    console.log('eBay order sync alarm cleared');
  }
}

// ═══════════════════════════════════════════════════════════
// 🔔 ALARM LISTENER
// ═══════════════════════════════════════════════════════════
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_SYNC_ORDERS) {
    if (typeof SyncUtils !== 'undefined') {
      SyncUtils.triggerEbayOrderSync('alarm');
    }
  } else if (alarm.name === ALARM_SYNC_SETTINGS) {
    syncSettings();
  }
});

// ═══════════════════════════════════════════════════════════
// 🚀 LIFECYCLE EVENTS
// ═══════════════════════════════════════════════════════════

chrome.runtime.onStartup.addListener(async () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  const isAuth = typeof AuthHelper !== 'undefined' ? await AuthHelper.verifyAuthStatus() : false;
  syncSettings();
  if (isAuth) {
    if (typeof SyncUtils !== 'undefined') {
      setTimeout(() => SyncUtils.triggerEbayOrderSync('startup'), 10000);
    }
    startEbayOrderSyncInterval();
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  const isAuth = typeof AuthHelper !== 'undefined' ? await AuthHelper.verifyAuthStatus() : false;
  syncSettings();
  if (isAuth) {
    if (typeof SyncUtils !== 'undefined') {
      setTimeout(() => SyncUtils.triggerEbayOrderSync('install'), 10000);
    }
    startEbayOrderSyncInterval();
  }

  // First-install specific behavior
  if (details.reason === 'install') {
    await chrome.storage.local.set({ firstInstall: true });
    const urls = getUrls();
    const onboardingUrl = (urls && urls.WEB_APP_BASE) || 'https://sellersuit.com';
    console.log('🎉 [Background] First Install! Opening onboarding:', onboardingUrl);
    chrome.tabs.create({ url: onboardingUrl });
  }
});

// Periodic settings sync via chrome.alarms
chrome.alarms.create(ALARM_SYNC_SETTINGS, { periodInMinutes: 30 });
