// ═══════════════════════════════════════════════════════════
// 🚀 BACKGROUND SERVICE WORKER - OPTIMIZED
// Centralized extension logic with modular architecture
// ═══════════════════════════════════════════════════════════

// Import config (self-registered in service worker context)
importScripts(
  'common/config.js',
  'common/performance.js',
  'common/message-handler.js'
);

// ═══════════════════════════════════════════════════════════
// 🔧 CONFIGURATION (from centralized config)
// ═══════════════════════════════════════════════════════════

const { URLS, API_KEYS, TIMING, STORAGE_KEYS, ACTIONS, FEATURES } = ExtensionConfig;

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
    const data = await chrome.storage.local.get(['saasToken', 'authTimestamp']);
    const token = data.saasToken;

    if (!token) {
      authLog('warn', 'LOCKDOWN: No saasToken found');
      isExtensionUnlocked = false;
      return false;
    }

    // Call Backend Authority with retry
    const response = await fetchWithRetry(
      `${URLS.SUPABASE_FUNCTIONS}/auth-status`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Supabase Edge Functions gateway requires `apikey`.
          'apikey': API_KEYS.SUPABASE_ANON,
          'Content-Type': 'application/json'
        }
      },
      2,
      500
    );

    if (response.ok) {
      const result = await response.json();

      if (result.success && result.user) {
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
    }

    // Auth failed - check response details
    const errorData = await response.json().catch(() => ({}));
    authLog('warn', 'LOCKDOWN: Invalid session', { status: response.status, error: errorData.error });
    isExtensionUnlocked = false;
    return false;

  } catch (e) {
    authLog('error', 'Auth Check Error', { message: e.message });

    // If network error but we have recent valid auth, stay unlocked temporarily
    if (isExtensionUnlocked && Date.now() - lastAuthCheck < 30 * 60 * 1000) {
      authLog('info', 'Network error but using cached auth status');
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

// ═══════════════════════════════════════════════════════════
// 📦 AUTOMATIC EBAY ORDER SYNC
// ═══════════════════════════════════════════════════════════

// Sync state
const EBAY_ORDER_SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
const EBAY_ORDER_SYNC_DAYS = 90;
let ebayOrderSyncIntervalId = null;
let isEbayOrderSyncInProgress = false;
let lastEbayOrderSync = 0;

// (Merged/Cleaned logic is at the bottom of the file to ensure dependencies are loaded)
// Forward declaration or alias if needed, but 'function' hosting handles it.


// Top-Level CSV Parser
async function fetchEbayCsv(syncDays = 90) {
  // Step 1: Fetch CSRF token from eBay
  const csrfRes = await fetch('https://www.ebay.com/sh/reports/', { credentials: 'include' });
  const csrfHtml = await csrfRes.text();

  const extractEbayDownloadCsrfToken = (html) => {
    if (!html || typeof html !== 'string') return null;
    const patterns = [
      /downloadCsrfToken['"]\s*:\s*['"]([A-Za-z0-9_-]+)['"]/,
      /downloadCsrfToken\s*=\s*['"]([A-Za-z0-9_-]+)['"]/,
      /['"]srt['"]\s*[:=]\s*['"]([A-Za-z0-9_-]+)['"]/,
      /name=['"]srt['"][^>]*value=['"]([A-Za-z0-9_-]+)['"]/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1]) return m[1];
    }
    const idx = html.search(/downloadCsrfToken/i);
    if (idx !== -1) {
      const window = html.slice(Math.max(0, idx - 500), Math.min(html.length, idx + 500));
      const m = window.match(/['"]([A-Za-z0-9_-]{10,})['"]/);
      if (m && m[1]) return m[1];
    }
    return null;
  };

  const srt = extractEbayDownloadCsrfToken(csrfHtml);
  if (!srt) {
    syncLog('warn', 'Failed to extract eBay CSRF token (downloadCsrfToken/srt not found)');
    throw new Error('Failed to access eBay Seller Hub (not logged in to eBay?)');
  }

  // Step 2: Build date range
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - syncDays);
  startDate.setHours(0, 0, 0, 0);

  const dateParam = `CUSTOM&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
  syncLog('info', `Syncing orders for last ${syncDays} days (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`);
  syncLog('debug', `Date range param: ${dateParam}`);

  // Step 3: Create report task
  syncLog('debug', 'Creating eBay report task...');
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
    syncLog('error', 'Report Task Error', taskJson);
    throw new Error('Failed to create eBay orders report task: ' + (taskJson?.errorMessage || 'Unknown error'));
  }

  const taskIdRaw = String(taskJson.taskId);
  const taskIdParts = taskIdRaw.split('-');
  const taskId = taskIdParts.length >= 2 ? taskIdParts[1] : taskIdRaw;

  syncLog('debug', `Report Task Created: ${taskId}`);

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
      syncLog('debug', 'Report Task Completed');
      break;
    }
    if (pollJson?.status === 'ERROR') {
      throw new Error('Report Task Failed during processing');
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }

  // Step 5: Download CSV
  syncLog('debug', 'Downloading CSV...');
  const csvRes = await fetch(
    `https://www.ebay.com/sh/fpp/getfiledetails?client=sh-orders&requestId=${taskId}&filetype=output`,
    { credentials: 'include' }
  );

  if (!csvRes.ok) throw new Error(`CSV Download Failed: ${csvRes.status}`);

  const csvText = await csvRes.text();
  if (!csvText || csvText.length < 10) throw new Error("CSV file was empty or invalid");

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
  if (isEbayOrderSyncInProgress) {
    syncLog('warn', 'Sync already in progress, skipping');
    return;
  }

  // Prevent frequent automatic syncs
  if (source === 'auto' && Date.now() - lastEbayOrderSync < 5 * 60 * 1000) {
    return;
  }

  isEbayOrderSyncInProgress = true;
  syncLog('info', `Starting eBay Order Sync (${source})`);

  try {
    const isAuth = await verifyAuthStatus();
    if (!isAuth) {
      throw new Error("User not authenticated");
    }

    const { saasToken } = await chrome.storage.local.get(['saasToken']);
    if (!saasToken) throw new Error("No auth token found");

    // 1. Get Settings
    const settings = await chrome.storage.local.get(['ebaySyncDays']);
    const days = settings.ebaySyncDays || 90;

    // 2. Fetch CSV
    syncLog('info', `Fetching CSV report (Last ${days} days)...`);
    const csvText = await fetchEbayCsv(days);
    if (!csvText) throw new Error("Failed to fetch CSV");

    // 3. Parse CSV
    const orders = parseEbayCsv(csvText);
    syncLog('success', `Parsed ${orders.length} orders from CSV`);

    if (orders.length === 0) {
      syncLog('info', 'No orders found in CSV');
      isEbayOrderSyncInProgress = false;
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
        errorCount++;
        // Continue to next batch instead of stopping entirely
      }

      // Small delay between batches to be nice to the server
      await new Promise(r => setTimeout(r, 500));
    }

    const summary = `Sync Complete. Synced: ${totalSynced}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}, Errors: ${errorCount} batches.`;
    syncLog(errorCount > 0 ? 'warn' : 'success', summary);

    lastEbayOrderSync = Date.now();
    chrome.storage.local.set({ lastSyncTime: lastEbayOrderSync });

    // Notify popup/UI
    chrome.runtime.sendMessage({
      action: 'EBAY_SYNC_COMPLETE',
      stats: { synced: totalSynced, updated: totalUpdated, total: orders.length }
    }).catch(() => { });

  } catch (err) {
    syncLog('error', `Sync Failed: ${err.message}`, { stack: err.stack });
    console.error('Full Sync Error:', err);
  } finally {
    isEbayOrderSyncInProgress = false;
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

async function startEbayOrderSyncInterval() {
  if (ebayOrderSyncIntervalId) {
    clearInterval(ebayOrderSyncIntervalId);
    ebayOrderSyncIntervalId = null;
  }

  const data = await chrome.storage.local.get(['ebaySyncInterval', 'ebaySyncEnabled']);
  const interval = data.ebaySyncInterval || EBAY_ORDER_SYNC_INTERVAL;
  const enabled = data.ebaySyncEnabled !== false;

  if (!enabled) {
    syncLog('info', 'eBay auto-sync is DISABLED by user.');
    return;
  }

  ebayOrderSyncIntervalId = setInterval(() => {
    triggerEbayOrderSync('interval');
  }, interval);

  syncLog('info', `eBay order sync interval started (every ${interval / 60000} minutes)`);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.ebaySyncInterval || changes.ebaySyncEnabled) {
      console.log('🔄 Settings changed. Restarting Sync Interval...');
      startEbayOrderSyncInterval();
    }
  }
});

function stopEbayOrderSyncInterval() {
  if (ebayOrderSyncIntervalId) {
    clearInterval(ebayOrderSyncIntervalId);
    ebayOrderSyncIntervalId = null;
    syncLog('info', 'eBay order sync interval stopped');
  }
}

chrome.runtime.onStartup.addListener(async () => {
  const isAuth = await verifyAuthStatus();
  syncSettings();
  if (isAuth) {
    setTimeout(() => triggerEbayOrderSync('startup'), 10000);
    startEbayOrderSyncInterval();
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const isAuth = await verifyAuthStatus();
  syncSettings();
  if (isAuth) {
    setTimeout(() => triggerEbayOrderSync('install'), 10000);
    startEbayOrderSyncInterval();
  }
});

setInterval(syncSettings, 30 * 60 * 1000);

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('🎉 Extension installed for the first time!');
    await chrome.storage.local.set({ firstInstall: true });
    const onboardingUrl = URLS.WEB_APP_BASE || 'https://sellersuit.com';
    chrome.tabs.create({ url: onboardingUrl });
  } else if (details.reason === 'update') {
    console.log('🔄 Extension updated to version', chrome.runtime.getManifest().version);
  }
});

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
    console.log("✅ Logged to sheet:", data);
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

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
        await chrome.storage.local.remove([
          'saasToken', 'saasUser', 'userId', 'userEmail',
          'userPlan', 'userCredits', 'authTimestamp'
        ]);
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
            try {
              const tokenData = await chrome.storage.local.get('saasToken');
              if (tokenData.saasToken) {
                await fetch(`${URLS.SUPABASE_FUNCTIONS}/create-listing`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenData.saasToken}` },
                  body: JSON.stringify({
                    title: request.title, sku: request.sku,
                    ebay_price: request.finalPrice, amazon_price: request.amazonPrice,
                    amazon_url: request.productURL, amazon_asin: request.asin,
                    status: "active"
                  })
                });
              }
            } catch (e) { }
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
      } catch (e) { }
    })();
    return true;
  } else if (request.action === "logSheet") {
    logToSheet(request.payload);
    return true;
  } else if (request.action === "LOG_TO_SHEET") {
    logProductToSheet(request.payload);
    sendResponse({ success: true });
    return true;
  } else if (request.action === "SYNC_LISTING") {
    (async () => {
      try {
        const tokenData = await chrome.storage.local.get(['saasToken']);
        if (tokenData.saasToken) {
          await fetch(`${URLS.SUPABASE_FUNCTIONS}/create-listing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenData.saasToken}` },
            body: JSON.stringify(request.payload)
          });
          sendResponse({ success: true });
        }
      } catch (e) {
        sendResponse({ success: false, error: e.message });
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
    // 1. Save Task State
    const task = {
      status: 'INIT',
      order: request.order,
      timestamp: Date.now()
    };

    chrome.storage.local.set({ fulfillmentTask: task }, () => {
      console.log('📦 FULFILLMENT: Task saved, opening Amazon...', task);

      // 2. Open Amazon URL in new tab
      if (request.order && request.order.url) {
        chrome.tabs.create({ url: request.order.url, active: true });
      }

      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'ORDER_COMPLETED') {
    console.log('🎉 ORDER COMPLETED:', request.payload);

    // Broadcast to Dashboard (so it can update DB)
    chrome.tabs.query({ url: "*://*/*" }, (tabs) => {
      for (const tab of tabs) {
        // We look for our dashboard tab (optional: filter by URL)
        // Since we don't know exact localhost port or domain, we try all or rely on auth_sync
        chrome.tabs.sendMessage(tab.id, {
          action: 'ORDER_COMPLETED_BROADCAST',
          payload: request.payload
        }).catch(() => { });
      }
    });

    sendResponse({ success: true });
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

function convertEbayCsvToSupabaseFormat(csvOrders) {
  const parseNum = (val) => {
    if (!val) return null;
    const num = parseFloat(String(val).replace(/[$,]/g, '').trim());
    return isNaN(num) ? null : num;
  };

  const parseDate = (val) => {
    if (!val) return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date.toISOString();
  };

  const rawOrders = csvOrders.map(row => ({
    ebay_order_id: row['Order number'] || row['Order Number'] || '',
    sales_record_number: row['Sales record number'] || row['Sales Record Number'] || row['Sales Record'] || row['Sales Record #'] || row['Sale No'] || row['Sale No.'] || row['Record #'] || '',
    order_date: parseDate(row['Sale date'] || row['Paid on date'] || row['Date sold'] || row['Date Paid'] || row['Paid date']),
    quantity: parseInt(String(row['Quantity'] || 1), 10),
    item_number: row['Custom label'] || row['Item number'] || null,
    total_amount: parseNum(row['Total price'] || row['Total Amount']),
    item_title: row['Item title'] || row['Title'] || 'Untitled Item',
    order_status: 'paid',
    platform: 'eBay',
    currency: 'USD'
  }));

  const aggregatedOrdersMap = new Map();
  for (const order of rawOrders) {
    const id = order.ebay_order_id;
    if (!id) continue;
    if (!aggregatedOrdersMap.has(id)) {
      aggregatedOrdersMap.set(id, { ...order, line_items: [] });
    }
    const existing = aggregatedOrdersMap.get(id);
    existing.line_items.push({ title: order.item_title, sku: order.item_number, quantity: order.quantity });
    existing.quantity = existing.line_items.reduce((sum, item) => sum + item.quantity, 0);
  }

  return Array.from(aggregatedOrdersMap.values());
}

chrome.runtime.onMessage.addListener(MessageHandler.createListener());
console.log('✅ Background Service Worker Fully Initialized');