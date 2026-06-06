// ═══════════════════════════════════════════════════════════
// 🚀 BACKGROUND SERVICE WORKER - OPTIMIZED
// Centralized extension logic with modular architecture
// ═══════════════════════════════════════════════════════════

// Import config (self-registered in service worker context)
importScripts(
  'common/config.js',
  'common/auth-helper.js',
  'common/performance.js',
  'common/message-handler.js',
  'background/amazon_bulk_runner.js'
);

// ═══════════════════════════════════════════════════════════
// 🔧 CONFIGURATION (from centralized config)
// ═══════════════════════════════════════════════════════════

const { URLS, API_KEYS, TIMING, STORAGE_KEYS, ACTIONS, FEATURES } = ExtensionConfig;

console.log('🚀 [Background] Service Worker Started. WEB_APP_BASE:', URLS.WEB_APP_BASE);

const HOMEPAGE_URL = URLS.WEB_APP_BASE;
const DEFAULT_SHEET_URL = URLS.DEFAULT_GOOGLE_SHEET;

// ═══════════════════════════════════════════════════════════
// 📦 STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════

const AuthState = {
  isUnlocked: false,
  lastCheck: 0,
  checkInterval: TIMING.AUTH_CHECK_INTERVAL,
  gracePeriod: TIMING.AUTH_GRACE_PERIOD
};

// Define missing variables that are used throughout the code
let isExtensionUnlocked = false;
let lastAuthCheck = 0;
const AUTH_CHECK_INTERVAL = TIMING.AUTH_CHECK_INTERVAL || 5 * 60 * 1000; // 5 minutes default

// ═══════════════════════════════════════════════════════════
// 📝 LOGGING UTILITIES
// ═══════════════════════════════════════════════════════════

function createLogger(prefix) {
  const icons = { debug: '🔍', info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' };

  return (level, message, data = null) => {
    if (!FEATURES.DEBUG_MODE && level === 'debug') return;

    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const icon = icons[level] || '📝';
    const logStr = `[${timestamp}] ${icon} [${prefix}] ${message}`;

    data ? console.log(logStr, data) : console.log(logStr);

    // BROADCAST TO TABS for visual debugging (only for Sync logs)
    if (prefix === 'Sync') {
      // Find active tabs (eBay or Dashboard) to send logs to
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'SYNC_LOG',
            level: level,
            message: logStr, // Send full formatted string
            data: data
          }).catch(() => { }); // Ignore errors if tab doesn't have listener
        }
      });
    }
  };
}

const authLog = createLogger('Auth');
const syncLog = createLogger('Sync');

// ═══════════════════════════════════════════════════════════
// 🌐 NETWORK UTILITIES (using PerformanceUtils)
// ═══════════════════════════════════════════════════════════

async function fetchWithRetry(url, options, maxRetries = 3, baseDelay = 1000) {
  return PerformanceUtils.fetchWithRetry(url, options, {
    maxRetries,
    baseDelay,
    timeout: TIMING.REQUEST_TIMEOUT
  });
}

// ═══════════════════════════════════════════════════════════
// 📊 STORAGE HELPERS (with caching)
// ═══════════════════════════════════════════════════════════

async function getGoogleSheetUrl() {
  return PerformanceUtils.withCache('googleSheetUrl', async () => {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.GOOGLE_APPS_SCRIPT_URL,
        STORAGE_KEYS.GOOGLE_SHEET_URL
      ]);

      const url = result[STORAGE_KEYS.GOOGLE_APPS_SCRIPT_URL] ||
        result[STORAGE_KEYS.GOOGLE_SHEET_URL] ||
        DEFAULT_SHEET_URL;

      syncLog('debug', 'Google Sheet URL retrieved', {
        hasCustomUrl: url !== DEFAULT_SHEET_URL
      });

      return url;
    } catch (error) {
      syncLog('warn', 'Using default Google Sheet URL', { error: error.message });
      return DEFAULT_SHEET_URL;
    }
  }, 5 * 60 * 1000); // Cache for 5 minutes
}

// Verify Auth with Backend (Enhanced)
async function verifyAuthStatus(forceRefresh = false) {
  // Skip if recently checked (unless forced)
  if (!forceRefresh && Date.now() - lastAuthCheck < AUTH_CHECK_INTERVAL && isExtensionUnlocked) {
    authLog('debug', 'Skipping auth check (recently verified)');
    return true;
  }

  try {
    const { token, type, isValid } = await AuthHelper.getAuthToken();

    if (!token || !isValid) {
      authLog('warn', 'LOCKDOWN: No valid auth token found');
      isExtensionUnlocked = false;
      return false;
    }

    // Call Backend Authority
    const response = await AuthHelper.callEdgeFunction('auth-status');
    const result = response.data || {};

    if (!response.error && result.success && result.user) {
      authLog('success', 'Session verified', { userId: result.user.id, email: result.user.email });

      // SYNC: Update Extension Storage with fresh data
      await chrome.storage.local.set({
        userId: result.user.id,
        userPlan: result.user.plan,
        userCredits: result.user.credits,
        userEmail: result.user.email,
        authTimestamp: Date.now()
      });

      isExtensionUnlocked = true;
      lastAuthCheck = Date.now();
      return true;
    }

    // Auth failed
    authLog('warn', 'LOCKDOWN: Invalid session', { status: response.status, error: result.error || response.error });
    
    // If it's a network error or edge function timeout, and we JUST got this token from the web app
    const storage = await chrome.storage.local.get('authTimestamp');
    const justSynced = storage.authTimestamp && (Date.now() - storage.authTimestamp < 60 * 1000);
    
    if (response.error && justSynced) {
       authLog('info', 'Edge function failed but token was just synced from web app. Trusting it temporarily.');
       isExtensionUnlocked = true;
       lastAuthCheck = Date.now();
       return true;
    }
    
    isExtensionUnlocked = false;
    return false;

  } catch (e) {
    authLog('error', 'Auth Check Error', { message: e.message });

    const storage = await chrome.storage.local.get('authTimestamp');
    const justSynced = storage.authTimestamp && (Date.now() - storage.authTimestamp < 60 * 1000);

    // If network error but we have recent valid auth, stay unlocked temporarily
    if ((isExtensionUnlocked && Date.now() - lastAuthCheck < 30 * 60 * 1000) || justSynced) {
      authLog('info', 'Network error but using cached/synced auth status');
      isExtensionUnlocked = true;
      lastAuthCheck = Date.now();
      return true;
    }

    isExtensionUnlocked = false;
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 📦 AUTOMATIC EBAY ORDER SYNC
// Syncs orders on startup, login, and at regular intervals
// ═══════════════════════════════════════════════════════════

// Sync state
const EBAY_ORDER_SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
const EBAY_ORDER_SYNC_DAYS = 90;
// MV3 State is now stored in chrome.storage.session to survive service worker restarts


async function injectedFetchEbayCsv(syncDays) {
  try {
    // Step 1: Extract CSRF token directly from eBay's Javascript Engine
    let srt = null;
    try {
      if (window.raptor && window.raptor.require) {
        srt = window.raptor.require('ebay.raptor.engine.Context').get('csrftoken');
      }
    } catch (e) {
      console.log("SellerSuit: raptor context not found");
    }

    if (!srt) {
      // Fallback: search the global variables for anything that looks like a token
      const patterns = [
        /downloadCsrfToken['"]\s*:\s*['"]([A-Za-z0-9_-]+)['"]/,
        /downloadCsrfToken\s*=\s*['"]([A-Za-z0-9_-]+)['"]/,
        /['"]srt['"]\s*[:=]\s*['"]([A-Za-z0-9_-]+)['"]/,
        /name=['"]srt['"][^>]*value=['"]([A-Za-z0-9_-]+)['"]/i,
        /\"csrftoken\"[\s\:]+[\'\"]([A-Za-z0-9_-]+)[\'\"]/i,
        /\"srt\"[\s\:]+[\'\"]([A-Za-z0-9_-]+)[\'\"]/i
      ];
      const html = document.documentElement.innerHTML;
      for (const re of patterns) {
        const m = html.match(re);
        if (m && m[1]) {
          srt = m[1];
          break;
        }
      }
    }

    if (!srt) {
      throw new Error('Please log in to eBay first.');
    }

    // Step 2: Build date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - syncDays);
    startDate.setHours(0, 0, 0, 0);

    const dateParam = `CUSTOM&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

    // Step 3: Create report task
    const body = new URLSearchParams();
    body.append('feedType', 'sh-orders-summary');
    body.append('domainServiceQueryParameters', `filter=status:ALL_ORDERS,timerange:${dateParam}`);
    body.append('srt', srt);

    let taskRes;
    try {
      taskRes = await fetch('https://www.ebay.com/sh/fpp/createreporttask', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'x-ebay-client-name': 'sh-orders',
          'x-requested-with': 'XMLHttpRequest',
        },
        body,
      });
    } catch (netErr) {
      throw new Error(`Report Task Network Error: ${netErr.message}`);
    }

    if (!taskRes.ok) {
      throw new Error(`Create Task Failed: ${taskRes.status} ${taskRes.statusText}`);
    }

    const taskJson = await taskRes.json().catch(() => null);
    if (!taskJson || taskJson.status === 'ERROR' || !taskJson.taskId) {
      throw new Error('Failed to create eBay orders report task: ' + (taskJson?.errorMessage || 'Unknown error'));
    }

    const taskIdRaw = String(taskJson.taskId);
    const taskIdParts = taskIdRaw.split('-');
    const taskId = taskIdParts.length >= 2 ? taskIdParts[1] : taskIdRaw;

    // Step 4: Poll for completion
    const pollStarted = Date.now();
    const POLL_TIMEOUT = 90000;
    const POLL_INTERVAL = 2000;

    while (Date.now() - pollStarted < POLL_TIMEOUT) {
      const pollRes = await fetch(`https://www.ebay.com/sh/fpp/gettask?client=sh-orders&taskId=task-${taskId}`, {
        credentials: 'include',
        headers: { 'x-requested-with': 'XMLHttpRequest' },
      });

      const pollJson = await pollRes.json().catch(() => null);
      if (pollJson?.status === 'COMPLETED') {
        break;
      }
      if (pollJson?.status === 'ERROR') {
        throw new Error('Report Task Failed during processing');
      }

      await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }

    // Step 5: Download CSV
    const csvRes = await fetch(
      `https://www.ebay.com/sh/fpp/getfiledetails?client=sh-orders&requestId=${taskId}&filetype=output`,
      { credentials: 'include' }
    );

    if (!csvRes.ok) throw new Error(`CSV Download Failed: ${csvRes.status}`);

    const csvText = await csvRes.text();
    if (!csvText || csvText.length < 10) throw new Error("CSV file was empty or invalid");

    return { success: true, csvText };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function fetchEbayCsv(syncDays = 90, source = 'manual') {
  // 1. Tab Management: Search for existing eBay tab (like Orders page)
  const tabs = await chrome.tabs.query({ url: "*://*.ebay.com/*" });
  let tabId;
  let createdTab = false;

  if (tabs.length > 0) {
    tabId = tabs[0].id;
    syncLog('info', `Using existing eBay tab: ${tabId}`);
    await logEbaySyncEvent('info', null, 'existing_ebay_tab_reused', null, { source, tabId });
  } else {
    if (source !== 'manual') {
      syncLog('warn', `Tab open blocked for auto source: ${source}`);
      await logEbaySyncEvent('warn', 'ebay_session', 'tab_open_blocked_auto_source', null, { source });
      throw new Error('ebay_session_required');
    }

    syncLog('info', `Creating temporary inactive eBay tab...`);
    await logEbaySyncEvent('info', null, 'tab_open_requested', null, { source });
    chrome.runtime.sendMessage({ action: 'SYNC_PROGRESS', status: 'Opening eBay...' }).catch(() => {});
    
    // We open Orders instead of Reports because not everyone has Reports enabled
    const newTab = await chrome.tabs.create({ url: 'https://www.ebay.com/sh/ord', active: false });
    tabId = newTab.id;
    createdTab = true;
    await logEbaySyncEvent('info', null, 'manual_sync_opened_ebay_tab', null, { tabId });
    
    // Wait for tab to load
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error("Timeout waiting for eBay tab to load"));
      }, 30000);

      function listener(tId, info) {
        if (tId === tabId && info.status === 'complete') {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  syncLog('info', `Tab loaded, injecting fetch script into tab ${tabId}`);
  chrome.runtime.sendMessage({ action: 'SYNC_PROGRESS', status: 'Syncing orders...' }).catch(() => {});

  let result;
  try {
    const executePromise = chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN', // Crucial: Inject into MAIN world so we can read window.raptor
      func: injectedFetchEbayCsv,
      args: [syncDays]
    });
    
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for eBay sync (60s)")), 60000));
    
    const results = await Promise.race([executePromise, timeoutPromise]);
    
    if (results && results[0] && results[0].result) {
      result = results[0].result;
    } else {
      throw new Error("No result returned from tab injection");
    }
  } finally {
    if (createdTab) {
      if (result && !result.success && result.error && result.error.includes('Please log in')) {
        try {
          await chrome.tabs.update(tabId, { active: true });
          syncLog('info', `Made sign-in tab active: ${tabId}`);
        } catch(e) {}
      } else {
        try {
          await chrome.tabs.remove(tabId);
          syncLog('info', `Temporary tab closed: ${tabId}`);
        } catch (e) {
          syncLog('warn', `Failed to close temporary tab ${tabId}: ${e.message}`);
        }
      }
    }
  }

  if (!result.success) {
    throw new Error(result.error || "Unknown error inside eBay tab");
  }

  const csvText = result.csvText;
  syncLog('success', `CSV downloaded: ${csvText.length} bytes`);
  return csvText;
}

// Top-Level CSV Parser
function parseEbayCsv(text) {
  // Auto-detect delimiter
  const firstLine = text.substring(0, 1000).split('\n')[0];
  let delimiter = ',';
  const commas = (firstLine.match(/,/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  // If significantly more semicolons, assume it's the delimiter
  if (semis > commas) delimiter = ';';

  syncLog('debug', `CSV Parser detected delimiter: "${delimiter}"`);

  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { inQuotes = false; continue; }
      cur += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delimiter) { row.push(cur); cur = ''; continue; }
    if (ch === '\n') { row.push(cur); cur = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; continue; }
    if (ch === '\r') continue;
    cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  if (!rows.length) return [];

  // Find the header row (look for "Order number" or "Sales record")
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const lineStr = rows[i].join(' ').toLowerCase();
    if (lineStr.includes('order number') || lineStr.includes('sales record') || lineStr.includes('buyer name')) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = rows[headerRowIndex].map(h => (h || '').trim());

  // Map remaining rows to objects
  const rawOrders = rows.slice(headerRowIndex + 1).map(r => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i] || `col_${i}`;
      obj[key] = r[i] ?? '';
    }
    return obj;
  });

  // Helper for flexible field picking
  const pick = (obj, patterns) => {
    const keys = Object.keys(obj);
    for (const pattern of patterns) {
      const patternLower = pattern.toLowerCase();
      for (const k of keys) {
        if (k.toLowerCase() === patternLower) {
          const val = obj[k];
          if (typeof val !== 'undefined' && String(val).trim() !== '') return val;
        }
      }
      for (const k of keys) {
        if (k.toLowerCase().includes(patternLower) || patternLower.includes(k.toLowerCase())) {
          const val = obj[k];
          if (typeof val !== 'undefined' && String(val).trim() !== '') return val;
        }
      }
    }
    return '';
  };

  const aggregatedOrdersMap = new Map();

  rawOrders.forEach(o => {
    const orderId = pick(o, [
      'Order Number', 'Order number', 'Order', 'Order ID', 'OrderNumber',
      'Order #', 'Order no.', 'Order No'
    ]);

    if (!orderId) return;

    const transactionId = pick(o, ['Transaction ID', 'PayPal Transaction ID', 'Paypal Transaction ID']);
    const salesRecordNumber = pick(o, ['Sales Record Number', 'Sales record number', 'Sales Record', 'Sales Record #']);
    const itemTitle = pick(o, ['Item Title', 'Item title', 'Title']);
    const itemNumber = pick(o, ['Item Number', 'Item number', 'Item ID']);
    const customLabel = pick(o, ['Custom Label', 'Custom label', 'SKU']);

    // Quantity parsing
    const qtyRaw = pick(o, ['Quantity', 'Qty']);
    const parsedQty = parseInt(String(qtyRaw).replace(/[^0-9]/g, ''), 10) || 1;

    // Price parsing
    const subtotalRaw = pick(o, ['Sold For', 'Subtotal', 'Item price']); // 'Sold For' is in user's header
    const totalRaw = pick(o, ['Total Price', 'Total price', 'Total']);
    const parsePrice = (v) => v ? parseFloat(String(v).replace(/[^0-9.-]/g, '')) : 0;

    const lineItem = {
      title: itemTitle,
      sku: customLabel,
      item_number: itemNumber,
      quantity: parsedQty,
      transaction_id: transactionId,
    };

    if (!aggregatedOrdersMap.has(orderId)) {
      aggregatedOrdersMap.set(orderId, {
        ebay_order_id: orderId,
        sales_record_number: salesRecordNumber,
        buyer_name: pick(o, ['Buyer Name', 'Buyer name', 'Ship to name']),
        buyer_username: pick(o, ['Buyer Username', 'Buyer username', 'Buyer user ID']),
        buyer_email: pick(o, ['Buyer Email', 'Buyer email', 'Email']),
        order_date: pick(o, ['Sale Date', 'Date sold', 'Sold date']),
        date_paid: pick(o, ['Paid On Date', 'Date paid', 'Paid on date']),
        ship_by_date: pick(o, ['Ship By Date', 'Ship by date']),
        order_status: pick(o, ['Order status', 'Status']) || 'paid',
        total_amount: parsePrice(totalRaw),
        subtotal: parsePrice(subtotalRaw),
        currency: pick(o, ['Currency']) || 'USD',
        shipping_address: {
          name: pick(o, ['Ship To Name', 'Ship to name']),
          address1: pick(o, ['Ship To Address 1', 'Ship to address 1', 'Address']),
          address2: pick(o, ['Ship To Address 2', 'Ship to address 2']),
          city: pick(o, ['Ship To City', 'Ship to city', 'City']),
          state: pick(o, ['Ship To State', 'Ship to state', 'State']),
          postal_code: pick(o, ['Ship To Zip', 'Ship to zip', 'ZIP']),
          country: pick(o, ['Ship To Country', 'Ship to country']),
          phone: pick(o, ['Ship To Phone', 'Ship to phone']),
        },
        line_items: [lineItem],
        item_title: itemTitle, // Main title fallback
        quantity: parsedQty,   // Initial quantity
        custom_label: customLabel, // Add SKU to top level
      });
    } else {
      const existing = aggregatedOrdersMap.get(orderId);
      existing.line_items.push(lineItem);
      existing.quantity += parsedQty;
    }
  });

  return Array.from(aggregatedOrdersMap.values());
}

async function getEbayOrdersCache() {
  const result = await chrome.storage.local.get(['ebay_orders_cache_v1']);
  return result['ebay_orders_cache_v1'] || null;
}

async function triggerEbayOrderSync(source = 'manual') {
  const sessionData = await chrome.storage.session.get(['isEbayOrderSyncInProgress', 'lastEbayOrderSync']);
  if (sessionData.isEbayOrderSyncInProgress) {
    syncLog('warn', 'Sync already in progress, skipping');
    return;
  }

  const { saasToken, userId, userEbaySettings } = await chrome.storage.local.get(['saasToken', 'userId', 'userEbaySettings']);
  
  // 0. Process Admin Overrides & Debounce
  let bypassDebounce = false;
  if (userEbaySettings) {
    if (userEbaySettings.is_sync_enabled === false) {
      syncLog('info', 'eBay auto-sync is DISABLED by admin/user settings.');
      if (source === 'manual') syncLog('warn', 'Sync disabled by settings.');
      return;
    }
    if (userEbaySettings.sync_state === 'reset_requested') {
      bypassDebounce = true;
      syncLog('info', 'Admin requested manual resync. Bypassing debounce.');
      await logEbaySyncEvent('info', null, 'reset_requested_consumed', null, { source });
      if (saasToken && userId) {
        await fetch(`${URLS.SUPABASE_URL}/rest/v1/user_ebay_settings?user_id=eq.${userId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${saasToken}`, 'apikey': API_KEYS.SUPABASE_ANON, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sync_state: 'syncing' })
        });
      }
    }
  }

  // Prevent frequent automatic syncs
  const lastSyncTime = sessionData.lastEbayOrderSync || 0;
  if (source === 'auto' && !bypassDebounce && Date.now() - lastSyncTime < 5 * 60 * 1000) {
    return;
  }

  await chrome.storage.session.set({ isEbayOrderSyncInProgress: true });
  syncLog('info', `Starting eBay Order Sync (${source})`);
  await logEbaySyncEvent('info', null, 'extension_sync_started', null, { source, bypassDebounce });

  try {
    const isAuth = await verifyAuthStatus();
    if (!isAuth) {
      await logEbaySyncEvent('error', 'extension_dependency', 'extension_sync_failed', null, { reason: 'User not authenticated' });
      throw new Error("User not authenticated");
    }
    if (!saasToken) {
      await logEbaySyncEvent('error', 'extension_dependency', 'extension_sync_failed', null, { reason: 'No auth token found' });
      throw new Error("No auth token found");
    }

    // 1. Get Settings
    const settings = await chrome.storage.local.get(['ebaySyncDays']);
    const days = settings.ebaySyncDays || 90;

    // 2. Fetch CSV
    syncLog('info', `Fetching CSV report (Last ${days} days)...`);
    await logEbaySyncEvent('info', null, 'csv_download_started', null, { days });
    let csvText;
    try {
      csvText = await fetchEbayCsv(days, source);
      if (!csvText) throw new Error("Failed to fetch CSV - no data returned");
      await logEbaySyncEvent('info', null, 'csv_download_completed', null, { bytes: csvText.length });
      
      // Clear the session required flag on successful fetch
      await chrome.storage.local.set({ ebaySessionRequired: false });
      await logEbaySyncEvent('info', null, 'ebay_session_required_flag_cleared', null, {});
      
    } catch(e) {
      if (e.message === 'ebay_session_required') {
        syncLog('warn', 'eBay Session Required - auto-sync paused until user opens eBay');
        await logEbaySyncEvent('warn', 'ebay_session', 'sync_waiting_for_user_session', null, { source });
        await chrome.storage.local.set({ ebaySessionRequired: true });
        await logEbaySyncEvent('info', null, 'ebay_session_required_flag_set', null, {});
        
        // If admin requested reset, move state to waiting_for_user_session
        if (bypassDebounce && saasToken && userId) {
          await fetch(`${URLS.SUPABASE_URL}/rest/v1/user_ebay_settings?user_id=eq.${userId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${saasToken}`, 'apikey': API_KEYS.SUPABASE_ANON, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sync_state: 'waiting_for_user_session' })
          }).catch(console.error);
        }
      } else {
        await logEbaySyncEvent('error', 'csv_download', 'csv_download_failed', null, { error: e.message });
      }
      throw e;
    }

    // 3. Parse CSV
    await logEbaySyncEvent('info', null, 'csv_parse_started');
    let orders;
    try {
      orders = parseEbayCsv(csvText);
      syncLog('success', `Parsed ${orders.length} orders from CSV`);
      await logEbaySyncEvent('info', null, 'csv_parse_completed', null, { count: orders.length });
    } catch(e) {
      await logEbaySyncEvent('error', 'csv_parser', 'csv_parse_failed', null, { error: e.message });
      throw e;
    }

    if (orders.length === 0) {
      syncLog('info', 'No orders found in CSV');
      await logEbaySyncEvent('info', null, 'extension_sync_completed', null, { message: 'No orders found in CSV' });
      await chrome.storage.session.set({ isEbayOrderSyncInProgress: false });
      return;
    }

    // 4. Sync to Server with Batching
    const BATCH_SIZE = 50; // Reduce to be even safer
    const totalBatches = Math.ceil(orders.length / BATCH_SIZE);
    let totalSynced = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let errorCount = 0;

    syncLog('info', `Syncing ${orders.length} orders in ${totalBatches} batches...`);

    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const batch = orders.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      try {
        syncLog('debug', `Sending batch ${batchNum}/${totalBatches} (${batch.length} orders)...`);

        const response = await fetch(`${URLS.SUPABASE_FUNCTIONS}/sync-ebay-orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${saasToken}`,
            'apikey': API_KEYS.SUPABASE_ANON
          },
          body: JSON.stringify({ orders: batch })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Batch ${batchNum} failed (${response.status}): ${errText}`);
        }

        const result = await response.json();
        // Force stringify to ensure we see the object in logs
        syncLog('debug', `Batch ${batchNum} Result: ${JSON.stringify(result)}`);

        if (result.success) {
          totalSynced += (result.synced || 0);
          totalUpdated += (result.updated || 0);
          totalSkipped += (result.skipped || 0);
        } else {
          throw new Error(result.error || "Unknown batch error");
        }

      } catch (batchErr) {
        console.error(`❌ Batch ${batchNum} failed:`, batchErr);
        syncLog('error', `Batch ${batchNum} Error`, { message: batchErr.message });
        await logEbaySyncEvent('error', 'backend_sync', 'backend_sync_failed', null, { batchNum, error: batchErr.message });
        errorCount++;
        // Continue to next batch instead of stopping entirely
      }

      // Small delay between batches to be nice to the server
      await new Promise(r => setTimeout(r, 500));
    }

    const summary = `Sync Complete. Synced: ${totalSynced}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}, Errors: ${errorCount} batches.`;
    syncLog(errorCount > 0 ? 'warn' : 'success', summary);

    if (errorCount === 0) {
      await logEbaySyncEvent('success', null, 'extension_sync_completed', null, { totalSynced, totalUpdated });
    } else {
      await logEbaySyncEvent('warning', null, 'extension_sync_completed', null, { totalSynced, totalUpdated, errorCount });
    }

    // Reset sync state to idle if we were resetting
    if (saasToken && userId) {
      await fetch(`${URLS.SUPABASE_URL}/rest/v1/user_ebay_settings?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${saasToken}`, 'apikey': API_KEYS.SUPABASE_ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync_state: 'idle' })
      }).catch(console.error);
    }

    const now = Date.now();
    await chrome.storage.session.set({ lastEbayOrderSync: now });
    chrome.storage.local.set({ lastSyncTime: now });

    // Notify popup/UI
    chrome.runtime.sendMessage({
      action: 'EBAY_SYNC_COMPLETE',
      stats: { synced: totalSynced, updated: totalUpdated, total: orders.length }
    }).catch(() => { });

  } catch (err) {
    syncLog('error', `Sync Failed: ${err.message}`, { stack: err.stack });
    console.error('Full Sync Error:', err);
    await logEbaySyncEvent('error', 'unknown', 'extension_sync_failed', null, { error: err.message });
    throw err;
  } finally {
    await chrome.storage.session.set({ isEbayOrderSyncInProgress: false });
  }
}

// -----------------------------------------------------------------------------
// SECURE EXTENSION SYNC LOGGING
// -----------------------------------------------------------------------------
async function logEbaySyncEvent(status, error_category, message, payload_preview = null, metadata = null) {
  try {
    const data = await chrome.storage.local.get(['saasToken', 'userId']);
    const token = data.saasToken;
    const userId = data.userId;
    if (!token || !userId) return;

    let sanitized = null;
    if (payload_preview) {
      let p = JSON.parse(JSON.stringify(payload_preview));
      if (typeof p === 'string') {
        sanitized = p.substring(0, 500);
      } else {
        const maskPII = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          const sensitiveKeys = ['buyer_name', 'buyer_username', 'buyer_email', 'shipping_address', 'buyer_zip', 'phone', 'csrf', 'token', 'cookie', 'authorization', 'secret', 'password', 'jwt'];
          for (const key of Object.keys(obj)) {
            if (sensitiveKeys.includes(key.toLowerCase()) || key.toLowerCase().includes('token')) obj[key] = '***MASKED***';
            else if (typeof obj[key] === 'object') maskPII(obj[key]);
          }
        };
        if (Array.isArray(p)) {
          p = p.slice(0, 2);
          p.forEach(maskPII);
        } else {
          maskPII(p);
        }
        sanitized = p;
      }
    }

    await fetch(`${URLS.SUPABASE_URL}/rest/v1/ebay_sync_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': API_KEYS.SUPABASE_ANON,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        status: status,
        error_category: error_category,
        payload_preview: sanitized,
        metadata: metadata ? { message, ...metadata } : { message }
      })
    });
  } catch (err) {
    console.error('Failed to write sync log:', err);
  }
}

// Consolidated into triggerEbayOrderSync
// Keeping this stub if other parts of code call it, but it should redirect logic or be removed.
async function performEbayOrderSync(token) {
  await triggerEbayOrderSync('manual');
  return { success: true };
}
async function syncSettings() {
  try {
    const data = await chrome.storage.local.get('saasToken');
    const token = data.saasToken;
    if (!token) return;

    const saasUrl = URLS.SUPABASE_URL;
    const saasKey = API_KEYS.SUPABASE_ANON;

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

// ═══════════════════════════════════════════════════════════
// ⏰ CHROME ALARMS (MV3-compatible persistent scheduling)
// ═══════════════════════════════════════════════════════════

const ALARM_SYNC_ORDERS = 'ebay-order-sync';
const ALARM_SYNC_SETTINGS = 'sync-settings';

async function startEbayOrderSyncInterval() {
  const data = await chrome.storage.local.get(['ebaySyncInterval', 'ebaySyncEnabled']);
  const interval = data.ebaySyncInterval || EBAY_ORDER_SYNC_INTERVAL;
  const enabled = data.ebaySyncEnabled !== false;

  if (!enabled) {
    syncLog('info', 'eBay auto-sync is DISABLED by user.');
    await chrome.alarms.clear(ALARM_SYNC_ORDERS);
    return;
  }

  // chrome.alarms minimum period is 1 minute
  const periodMinutes = Math.max(1, interval / 60000);
  await chrome.alarms.create(ALARM_SYNC_ORDERS, { periodInMinutes: periodMinutes });
  syncLog('info', `eBay order sync alarm set (every ${periodMinutes} min)`);
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
  syncLog('info', 'eBay order sync alarm cleared');
}

// ═══════════════════════════════════════════════════════════
// 🔔 ALARM LISTENER
// ═══════════════════════════════════════════════════════════
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_SYNC_ORDERS) {
    triggerEbayOrderSync('alarm');
  } else if (alarm.name === ALARM_SYNC_SETTINGS) {
    syncSettings();
  }
});

// ═══════════════════════════════════════════════════════════
// 🚀 LIFECYCLE EVENTS (single consolidated handler)
// ═══════════════════════════════════════════════════════════

chrome.runtime.onStartup.addListener(async () => {
  const isAuth = await verifyAuthStatus();
  syncSettings();
  if (isAuth) {
    setTimeout(() => triggerEbayOrderSync('startup'), 10000);
    startEbayOrderSyncInterval();
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  // Auth & settings sync for all install/update events
  const isAuth = await verifyAuthStatus();
  syncSettings();
  if (isAuth) {
    setTimeout(() => triggerEbayOrderSync('install'), 10000);
    startEbayOrderSyncInterval();
  }

  // First-install specific behavior
  if (details.reason === 'install') {
    await chrome.storage.local.set({ firstInstall: true });
    const onboardingUrl = URLS.WEB_APP_BASE || 'https://sellersuit.com';
    console.log('🎉 [Background] First Install! Opening onboarding:', onboardingUrl);
    chrome.tabs.create({ url: onboardingUrl });
  }
});

// Periodic settings sync via chrome.alarms (replaces setInterval)
chrome.alarms.create(ALARM_SYNC_SETTINGS, { periodInMinutes: 30 });

function todayISO() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function logToSheetMinimal({ title, sku, ebayPrice, supplierPrice, supplierUrl }) {
  try {
    const payload = {
      date: todayISO(),
      title,
      sku,
      ebay_price: (ebayPrice !== undefined && ebayPrice !== null) ? String(ebayPrice) : '',
      supplier_price: (supplierPrice !== undefined && supplierPrice !== null) ? String(supplierPrice) : '',
      supplier: (supplierUrl !== undefined && supplierUrl !== null) ? String(supplierUrl) : ''
    };

    const endpoint = await getGoogleSheetUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Google Sheets request failed: ${res.status} ${res.statusText} - ${errorText}`);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (err) {
    console.error('❌ ERROR IN logToSheetMinimal()', err);
    throw err;
  }
}

async function logToSheet(data) {
  try {
    const endpoint = await getGoogleSheetUrl();
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (typeof FEATURES !== 'undefined' && FEATURES.DEBUG_MODE) console.log("✅ Logged to sheet (data hidden in prod)", data);
  } catch (err) {
    console.error("❌ Sheet logging failed:", err);
  }
}

async function logProductToSheet({ sku, title, amazon_price, ebay_price, amazon_url }) {
  try {
    const endpoint = await getGoogleSheetUrl();
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, title, amazon_price, ebay_price, amazon_url })
    });
  } catch (err) {
    console.error("Sheet Logging Failed:", err);
  }
}

function safeSendResponse(sendResponse, data) {
  try {
    if (sendResponse && typeof sendResponse === 'function') {
      sendResponse(data);
      return true;
    }
  } catch (e) {
    console.error('Error sending response (port may be closed):', e);
  }
  return false;
}

async function getReplicateToken() {
  const result = await chrome.storage.local.get('replicateApiKey');
  return result.replicateApiKey;
}

async function parseListingSyncResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function getSafeListingSyncIdentity(payload = {}) {
  return {
    sku: payload.sku || payload.ebaySku || null,
    asin: payload.amazon_asin || payload.amazonAsin || null
  };
}

async function recordListingSyncError({ source = 'background', status = null, error = 'Unknown sync error', details = null, payload = {} } = {}) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      status,
      source,
      error: String(error || 'Unknown sync error').slice(0, 500),
      ...getSafeListingSyncIdentity(payload)
    };

    if (details && typeof details === 'object') {
      entry.details = {
        action: details.action || undefined,
        code: details.code || undefined,
        message: details.message ? String(details.message).slice(0, 300) : undefined
      };
    }

    const data = await chrome.storage.local.get(['listingSyncErrors']);
    const errors = Array.isArray(data.listingSyncErrors) ? data.listingSyncErrors : [];
    await chrome.storage.local.set({
      listingSyncLastError: entry,
      listingSyncErrors: [entry, ...errors].slice(0, 10)
    });
  } catch (err) {
    console.warn('[listing-sync] Failed to record sync error:', err?.message || err);
  }
}

async function postCreateListing(payload, source = 'background') {
  const tokenData = await chrome.storage.local.get(['saasToken']);
  if (!tokenData.saasToken) {
    const error = 'Not authenticated. Missing legacy saasToken.';
    await recordListingSyncError({ source, status: 401, error, payload });
    return { success: false, source, status: 401, error };
  }

  const response = await fetch(`${URLS.SUPABASE_FUNCTIONS}/create-listing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenData.saasToken}`,
      'apikey': API_KEYS.SUPABASE_ANON
    },
    body: JSON.stringify(payload)
  });
  const data = await parseListingSyncResponse(response);

  if (!response.ok) {
    const error = data?.error || data?.message || `create-listing failed with HTTP ${response.status}`;
    await recordListingSyncError({ source, status: response.status, error, details: data, payload });
    return { success: false, source, status: response.status, error, details: data };
  }

  return {
    success: true,
    source,
    status: response.status,
    listingId: data?.listing?.id,
    data
  };
}

const LOGOUT_STORAGE_KEYS = [
  "saasToken",
  "saasUser",
  "userId",
  "userEmail",
  "userPlan",
  "userCredits",
  "authTimestamp",
  "ebay_orders_cache_v1",
  "fulfillmentTask",
  "copyButtonData"
];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'GET_EXTENSION_AUTH_STATE') {
    AuthHelper.getRemoteConfig().then(config => {
      AuthHelper.getAuthToken().then(({ token, type, isValid, user }) => {
        sendResponse({ config, token, type, isValid, user });
      });
    });
    return true;
  }

  if (request.action === 'LOGOUT_EXTENSION_SESSION') {
    (async () => {
      await AuthHelper.clearNewAuthSession();
      chrome.storage.local.remove(LOGOUT_STORAGE_KEYS, () => {
        sendResponse({ success: true });
      });
    })();
    return true;
  }

  if (request.action === 'START_PAIRING') {
    (async () => {
      try {
        const installId = (await chrome.storage.local.get('extensionInstallId')).extensionInstallId || crypto.randomUUID();
        await chrome.storage.local.set({ extensionInstallId: installId });

        const response = await fetch(`${URLS.SUPABASE_FUNCTIONS}/extension-pairing-start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(API_KEYS.SUPABASE_ANON ? { apikey: API_KEYS.SUPABASE_ANON } : {})
          },
          body: JSON.stringify({
            installId,
            version: chrome.runtime.getManifest().version
          })
        });

        if (!response.ok) throw new Error('Failed to start pairing');
        const data = await response.json();

        // Store connectToken and clientSecret temporarily in memory or local storage
        await chrome.storage.local.set({
          tempConnectToken: data.connectToken,
          tempClientSecret: data.clientSecret,
          tempPairingExpires: data.expiresAt
        });

        sendResponse({ success: true, pairingCode: data.pairingCode, expiresAt: data.expiresAt });
      } catch (err) {
        authLog('error', 'Pairing start error', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'POLL_PAIRING_STATUS') {
    (async () => {
      try {
        const temp = await chrome.storage.local.get(['tempConnectToken', 'tempClientSecret']);
        if (!temp.tempConnectToken) throw new Error('No pairing session');

        const response = await fetch(`${URLS.SUPABASE_FUNCTIONS}/extension-pairing-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(API_KEYS.SUPABASE_ANON ? { apikey: API_KEYS.SUPABASE_ANON } : {})
          },
          body: JSON.stringify({
            connectToken: temp.tempConnectToken,
            clientSecret: temp.tempClientSecret
          })
        });

        const data = await response.json();
        sendResponse({ success: true, status: data.status });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'REDEEM_PAIRING') {
    (async () => {
      try {
        const temp = await chrome.storage.local.get(['tempConnectToken', 'tempClientSecret']);
        if (!temp.tempConnectToken) throw new Error('No pairing session');

        const response = await fetch(`${URLS.SUPABASE_FUNCTIONS}/extension-token-redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(API_KEYS.SUPABASE_ANON ? { apikey: API_KEYS.SUPABASE_ANON } : {})
          },
          body: JSON.stringify({
            connectToken: temp.tempConnectToken,
            clientSecret: temp.tempClientSecret
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to redeem pairing code');
        }

        const data = await response.json();

        if (data.session) {
          await AuthHelper.setNewAuthSession(data.session);
          // Cleanup temp secrets immediately
          await chrome.storage.local.remove(['tempConnectToken', 'tempClientSecret', 'tempPairingExpires']);

          // Trigger Bootstrap
          const bootstrapRes = await AuthHelper.callEdgeFunction('extension-bootstrap');
          if (bootstrapRes.data) {
            await chrome.storage.local.set({ extensionBootstrapCache: bootstrapRes.data });
          }

          verifyAuthStatus(true);
          sendResponse({ success: true });
        } else {
          throw new Error('No session returned');
        }
      } catch (err) {
        authLog('error', 'Redeem error', err);
        // Clean up on error too
        await chrome.storage.local.remove(['tempConnectToken', 'tempClientSecret', 'tempPairingExpires']);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'LOGIN_SUCCESS') {
    verifyAuthStatus().then(success => {
      if (success) {
        setTimeout(() => triggerEbayOrderSync('login'), 5000);
        startEbayOrderSyncInterval();
      }
      sendResponse({ success });
    });
    return true;
  }

  if (request.action === 'OPEN_BACKGROUND_TAB') {
    chrome.tabs.create({ url: request.url, active: false });
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'sync_ebay_orders' || request.action === 'trigger_ebay_sync') {
    (async () => {
      try {
        const isAuth = await verifyAuthStatus();
        if (!isAuth) {
          sendResponse({ ok: false, error: 'Not logged in to SellerSuit.' });
          return;
        }
        const data = await chrome.storage.local.get(['saasToken']);
        const token = data.saasToken;

        // If a payload is provided (from scraper), sync specifically that
        if (request.payload) {
          syncLog('info', 'Syncing custom payload from scraper', { orderCount: request.payload.orders?.length });
          const syncRes = await fetch(`${URLS.SUPABASE_FUNCTIONS}/sync-ebay-orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': API_KEYS.SUPABASE_ANON,
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(request.payload),
          });

          if (!syncRes.ok) {
            const errorText = await syncRes.text();
            syncLog('error', 'Scraper sync failed', errorText);
            sendResponse({ ok: false, error: 'Sync failed: ' + errorText });
          } else {
            const result = await syncRes.json();
            syncLog('success', 'Scraper sync successful', result);
            sendResponse({ ok: true, result });
          }
        } else {
          // Normal CSV sync
          const cache = await performEbayOrderSync(token);
          sendResponse({ ok: true, cache });
        }
      } catch (err) {
        syncLog('error', 'Manual sync request failed', { error: err.message });
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'get_ebay_orders') {
    (async () => {
      const cache = await getEbayOrdersCache();
      sendResponse({ ok: true, cache });
    })();
    return true;
  }

  if (request.action === 'SYNC_TOKEN') {
    if (request.token) {
      (async () => {
        try {
          const saveData = { saasToken: request.token, authTimestamp: Date.now() };
          if (request.user) {
            saveData.saasUser = request.user;
            saveData.userId = request.user.id;
            saveData.userEmail = request.user.email;
          }
          await chrome.storage.local.set(saveData);
          const verified = await verifyAuthStatus(true);
          if (verified) {
            setTimeout(() => triggerEbayOrderSync('token_sync'), 5000);
            startEbayOrderSyncInterval();
          }
          sendResponse({ success: true, verified });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }
  }

  if (request.action === 'LOGOUT') {
    (async () => {
      try {
        stopEbayOrderSyncInterval();
        await chrome.storage.local.remove(LOGOUT_STORAGE_KEYS);
        isExtensionUnlocked = false;
        lastAuthCheck = 0;
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'CHECK_AUTH') {
    (async () => {
      const isAuth = await verifyAuthStatus();
      if (isAuth) {
        const data = await chrome.storage.local.get(['userEmail', 'userId']);
        sendResponse({ success: true, user: { email: data.userEmail, id: data.userId } });
      } else {
        // If auth failed, try to see if we have a token to attempt one more verification or just fail
        sendResponse({ success: false });
      }
    })();
    return true;
  }

  if (!isExtensionUnlocked) {
    verifyAuthStatus().then(unlocked => {
      if (!unlocked && request.action !== 'AI_REMOVE_BG' && request.action !== 'GENERATE_TITLE' && request.action !== 'GENERATE_DESCRIPTION') {
        chrome.tabs.create({ url: URLS.WEB_APP_DASHBOARD });
      }
      sendResponse({ success: false, error: "Please Log In to use the extension." });
    });
    return true;
  }

  if (request.action === "AI_REMOVE_BG") {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['replicateApiKey']);
        const apiKey = result.replicateApiKey;
        if (!apiKey) {
          sendResponse({ success: false, error: 'Replicate API Key is missing.' });
          return;
        }
        const imgResponse = await fetch(request.imageUrl);
        const blob = await imgResponse.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async function () {
          const base64data = reader.result;
          try {
            const response = await fetch(URLS.AI_REMOVE_BG, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_base64: base64data, replicate_api_token: apiKey }),
            });
            const data = await response.json();
            if (data.output) {
              chrome.runtime.sendMessage({ action: "BG_REMOVED_SUCCESS", originalUrl: request.imageUrl, newUrl: data.output });
            }
          } catch (e) { }
        };
      } catch (e) { }
    })();
    return true;
  } else if (request.action === "START_OPTILIST") {
    (async () => {
      try {
        if (request.title && request.sku) {
          sendResponse({ success: true, message: "Processing started" });
          const result = await chrome.storage.local.get('listedCount');
          await chrome.storage.local.set({ listedCount: (result.listedCount || 0) + 1 });

          (async function syncListing() {
            const payload = {
              title: request.title, sku: request.sku,
              ebay_price: request.finalPrice, amazon_price: request.amazonPrice,
              amazon_url: request.productURL, amazon_asin: request.asin,
              status: "active",
              amazon_data: { image: request.mainImage }
            };
            try {
              const syncResult = await postCreateListing(payload, 'start_optilist');
              if (!syncResult.success) {
                console.warn('[START_OPTILIST] Listing sync failed:', {
                  status: syncResult.status,
                  error: syncResult.error,
                  sku: payload.sku,
                  asin: payload.amazon_asin
                });
              }
            } catch (e) {
              console.warn('[START_OPTILIST] Listing sync error:', e?.message || e);
              await recordListingSyncError({
                source: 'start_optilist',
                error: e?.message || 'START_OPTILIST listing sync failed',
                payload
              });
            }
          })();
        }

        const storageData = { ebayTitle: request.title, ebayCondition: request.condition || "1000" };
        chrome.storage.local.set(storageData, () => {
          chrome.tabs.create({ url: "https://www.ebay.com/sl/prelist/suggest?sr=shListingsTopNav" }, (tab) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                setTimeout(() => {
                  chrome.tabs.sendMessage(tab.id, { action: "RUN_EBAY_LISTER" });
                }, 2000);
              }
            });
          });
        });
      } catch (e) {
        console.warn('[START_OPTILIST] Unexpected error:', e?.message || e);
      }
    })();
    return true;
  } else if (request.action === "logSheet") {
    logToSheet(request.payload);
    return true;
  } else if (request.action === 'GET_PRODUCT_META') {
    sendResponse({ success: true, meta: { activeTab: sender.tab.id } });
    return true;
  } else if (request.action === 'START_BULK_JOB') {
    const dashboardTabId = sender?.tab?.id;
    startBulkJob(request.payload, dashboardTabId).then(sendResponse);
    return true;
  } else if (request.action === 'PAUSE_BULK_JOB') {
    pauseBulkJob();
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'RESUME_BULK_JOB') {
    const dashboardTabId = sender?.tab?.id;
    startBulkJob({}, dashboardTabId).then(sendResponse);
    return true;
  } else if (request.action === 'STOP_BULK_JOB') {
    stopBulkJob();
    sendResponse({ success: true });
    return true;
  } else if (request.action === "LOG_TO_SHEET") {
    logProductToSheet(request.payload);
    sendResponse({ success: true });
    return true;
  } else if (request.action === "SYNC_LISTING") {
    (async () => {
      try {
        const result = await postCreateListing(request.payload || {}, 'background');
        sendResponse(result);
      } catch (e) {
        await recordListingSyncError({
          source: 'background',
          error: e?.message || 'Background listing sync failed',
          payload: request.payload || {}
        });
        sendResponse({ success: false, source: 'background', error: e?.message || 'Background listing sync failed' });
      }
    })();
    return true;
  } else if (request.action === "SAVE_TO_SHEET") {
    const { title, sku, ebayPrice, amazonPrice, amazonUrl } = request.payload;
    const date = new Date().toLocaleDateString("en-US");
    const row = [date, title || "", sku || "", ebayPrice || "", amazonPrice || "", "", "", "", "", "", "", amazonUrl || ""];
    getGoogleSheetUrl().then(endpoint => {
      fetch(endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ row }) });
    });
    return true;
  } else if (request.action === 'openNewTabForDescription') {
    chrome.storage.local.set({ tempAmazonURL: request.amazonURL }, () => {
      chrome.tabs.create({ url: request.targetURL, active: false }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(() => {
              chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content_scripts/description_paster.js"] });
            }, 2000);
          }
        });
      });
    });
    return true;
  } else if (request.action === 'openNewTabForProductDetails') {
    chrome.storage.local.set({ tempAmazonTitle: request.amazonTitle }, () => {
      chrome.tabs.create({ url: request.targetURL, active: false }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content_scripts/description_paster.js"] });
          }
        });
      });
    });
    return true;
  } else if (request.action === "GENERATE_TITLE") {
    (async () => {
      try {
        const tokenData = await chrome.storage.local.get(['saasToken']);
        if (!tokenData.saasToken) throw new Error("Please log in.");
        const resp = await fetch(`${URLS.SUPABASE_FUNCTIONS}/generate-titles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': API_KEYS.SUPABASE_ANON, 'Authorization': `Bearer ${tokenData.saasToken}` },
          body: JSON.stringify(request.productData)
        });
        const json = await resp.json();
        if (json.success) sendResponse({ success: true, title: json.titles[0].title || json.titles[0] });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  } else if (request.action === "GENERATE_AI_TITLES") {
    (async () => {
      try {
        const tokenData = await chrome.storage.local.get(['saasToken']);
        const resp = await fetch(`${URLS.SUPABASE_FUNCTIONS}/generate-titles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': API_KEYS.SUPABASE_ANON, 'Authorization': `Bearer ${tokenData.saasToken}` },
          body: JSON.stringify(request.productData)
        });
        const json = await resp.json();
        sendResponse(json);
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  } else if (request.action === "GENERATE_DESCRIPTION") {
    (async () => {
      try {
        const tokenData = await chrome.storage.local.get(['saasToken']);
        const resp = await fetch(`${URLS.SUPABASE_FUNCTIONS}/generate-description`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': API_KEYS.SUPABASE_ANON, 'Authorization': `Bearer ${tokenData.saasToken}` },
          body: JSON.stringify(request.productData)
        });
        const json = await resp.json();
        sendResponse(json);
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  } else if (request.action === 'START_FULFILLMENT') {
    const AMAZON_AUTO_ORDER_ENABLED = false;
    if (!AMAZON_AUTO_ORDER_ENABLED) {
      console.info("Amazon auto-ordering is disabled in this build.");
      sendResponse({ success: false, error: "Auto-ordering is currently disabled." });
      return true;
    }

    // 1. Save Task State
    const task = {
      status: 'INIT',
      order: request.order,
      timestamp: Date.now()
    };

    chrome.storage.local.set({ fulfillmentTask: task }, () => {
      if (typeof FEATURES !== 'undefined' && FEATURES.DEBUG_MODE) console.log('📦 FULFILLMENT: Task saved, opening Amazon...', task);

      // 2. Open Amazon URL in new tab
      if (request.order && request.order.url) {
        chrome.tabs.create({ url: request.order.url, active: true });
      }

      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'ORDER_COMPLETED') {
    if (typeof FEATURES !== 'undefined' && FEATURES.DEBUG_MODE) console.log('🎉 ORDER COMPLETED (payload hidden in prod)', request.payload);

    // Broadcast to Dashboard (so it can update DB)
    chrome.tabs.query({ url: "*://*/*" }, (tabs) => {
      for (const tab of tabs) {
        // We look for our dashboard tab (optional: filter by URL)
        // Since we don't know exact sellersuit domain, we try all or rely on auth_sync
        chrome.tabs.sendMessage(tab.id, {
          action: 'ORDER_COMPLETED_BROADCAST',
          payload: request.payload
        }).catch(() => { });
      }
    });

    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'FETCH_IMAGE_AS_BASE64') {
    (async () => {
      try {
        const response = await fetch(request.url);
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        const blob = await response.blob();
        if (typeof FileReader !== 'undefined') {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            sendResponse({ success: true, base64: reader.result });
          };
          reader.onerror = () => {
            sendResponse({ success: false, error: 'Failed to read blob' });
          };
        } else {
          // Fallback using ArrayBuffer (pure JS, safe in any service worker context)
          const buffer = await blob.arrayBuffer();
          let binary = '';
          const bytes = new Uint8Array(buffer);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64String = btoa(binary);
          sendResponse({ success: true, base64: `data:${blob.type};base64,${base64String}` });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

});

async function generateTitleWithGemini(apiKey, promptTemplate, productData, modelName = "gemini-1.5-flash") {
  let prompt = promptTemplate.replace(/{{title}}/gi, productData.title).replace(/{{keywords}}/gi, (productData.keywords || []).join(", "));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 60 } })
  });
  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim().replace(/^"|"$/g, '');
}

// BUG-02 FIX: Removed orphan MessageHandler.createListener() - no handlers were registered.
// BUG-09 FIX: Removed dead convertEbayCsvToSupabaseFormat() function.
if (FEATURES.DEBUG_MODE) console.log('✅ Background Service Worker Fully Initialized');
