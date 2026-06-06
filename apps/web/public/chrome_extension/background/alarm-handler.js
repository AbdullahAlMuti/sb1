/**
 * SellerSuit Alarm Handler
 * Consolidates all alarm listeners and settings synchronization logic.
 */

const EBAY_ORDER_SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes

const getUrls = () => typeof ExtensionConfig !== 'undefined' ? ExtensionConfig.URLS : null;
const getApiKeys = () => typeof ExtensionConfig !== 'undefined' ? ExtensionConfig.API_KEYS : null;

async function syncSettings() {
  try {
    const data = await chrome.storage.local.get('saasToken');
    const token = data.saasToken;
    if (!token) return;

    const urls = getUrls();
    const apiKeys = getApiKeys();
    if (!urls || !apiKeys) return;

    const saasUrl = urls.SUPABASE_URL;
    const saasKey = apiKeys.SUPABASE_ANON;

    const response = await fetch(`${saasUrl}/rest/v1/admin_settings?select=*`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': saasKey,
        'Prefer': 'return=representation'
      }
    });

    if (response.ok) {
      const settingsData = await response.json();
      const updates = {};

      try {
        const userSettingsRes = await fetch(`${saasUrl}/rest/v1/user_ebay_settings?select=*`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'apikey': saasKey, 'Prefer': 'return=representation' }
        });
        if (userSettingsRes.ok) {
          const userSet = await userSettingsRes.json();
          if (userSet && userSet.length > 0) updates.userEbaySettings = userSet[0];
        }
      } catch(e) {}

      settingsData.forEach(setting => {
        if (setting.key === 'gemini_api_key') updates.geminiApiKey = setting.value;
        if (setting.key === 'ebay_sync_enabled') updates.ebaySyncEnabled = setting.value === 'true';
        if (setting.key === 'ebay_sync_days') updates.ebaySyncDays = parseInt(setting.value, 10) || 90;
        if (setting.key === 'ebay_sync_interval') {
          const newInterval = (parseInt(setting.value, 10) || 60) * 60 * 1000;
          updates.ebaySyncInterval = newInterval;
        }
      });

      if (Object.keys(updates).length > 0) {
        await chrome.storage.local.set(updates);
        console.log('🔄 SYNC: Settings updated from Admin Panel.', updates);
        startEbayOrderSyncInterval();
      }
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
