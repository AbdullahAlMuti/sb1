// ═══════════════════════════════════════════════════════════
// 🔄 SYNC UTILITIES - Centralized order sync and queue engine
// ═══════════════════════════════════════════════════════════

const SyncUtils = (() => {
  'use strict';

  const SUPABASE_URL =
    (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.SUPABASE_URL)
      ? ExtensionConfig.URLS.SUPABASE_URL
      : 'https://ojxzssooylmydystjvdo.supabase.co';

  const SUPABASE_ANON_KEY =
    (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.API_KEYS?.SUPABASE_ANON)
      ? ExtensionConfig.API_KEYS.SUPABASE_ANON
      : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc';

  // Debug mode flag - set to true for verbose logging
  const DEBUG_SYNC = true;

  function _sessionStore() {
    try {
      if (chrome.storage && chrome.storage.session) {
        return chrome.storage.session;
      }
    } catch (_) {}
    return chrome.storage.local;
  }

  function syncLog(level, message, data = null) {
    if (!DEBUG_SYNC && level === 'debug') return;
    
    const prefix = {
      debug: '🔍',
      info: 'ℹ️',
      success: '✅',
      warn: '⚠️',
      error: '❌'
    }[level] || '📝';
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    
    if (data) {
      console.log(`[${timestamp}] ${prefix} [SYNC] ${message}`, data);
    } else {
      console.log(`[${timestamp}] ${prefix} [SYNC] ${message}`);
    }

    // Broadcast to tabs for visual debugging
    try {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'SYNC_LOG',
            level: level,
            message: `[${timestamp}] ${prefix} [Sync] ${message}`,
            data: data
          }).catch(() => { });
        }
      });
    } catch (e) {}
  }

  function getSafeListingIdentity(listingData = {}) {
    return {
      sku: listingData.sku || listingData.ebaySku || null,
      asin: listingData.amazon_asin || listingData.amazonAsin || null
    };
  }

  async function recordListingSyncError({ source = 'sync_utils', status = null, error = 'Unknown sync error', details = null, listingData = {} } = {}) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        status,
        source,
        error: String(error || 'Unknown sync error').slice(0, 500),
        ...getSafeListingIdentity(listingData)
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
      const nextErrors = [entry, ...errors].slice(0, 10);
      await chrome.storage.local.set({
        listingSyncLastError: entry,
        listingSyncErrors: nextErrors
      });
    } catch (err) {
      syncLog('warn', 'Failed to record listing sync error', err?.message || err);
    }
  }

  async function parseResponseBody(response) {
    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return { message: text.slice(0, 500) };
    }
  }

  /**
   * Sync a listing to the backend with retry (uses create-listing function)
   * @param {object} listingData - The listing data to sync
   * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
   */
  async function syncListing(listingData) {
    if (typeof AuthHelper === 'undefined') {
      const error = 'AuthHelper is not available.';
      await recordListingSyncError({ source: 'sync_utils', error, listingData });
      return { success: false, source: 'sync_utils', status: 500, error };
    }

    try {
      // Ensure we always send a useful raw payload blob for backfill/debug in the dashboard.
      const enrichedListingData = {
        ...listingData,
        amazon_data: listingData?.amazon_data ?? {
          ...(listingData?.amazon_url ? { amazonUrl: listingData.amazon_url } : {}),
          ...(listingData?.amazon_asin ? { asin: listingData.amazon_asin } : {}),
          ...(listingData?.title ? { title: listingData.title } : {}),
          ...(listingData?.amazon_price != null ? { price: listingData.amazon_price } : {}),
          source: 'extension',
        },
        ebay_data: listingData?.ebay_data ?? {
          ...(listingData?.title ? { title: listingData.title } : {}),
          ...(listingData?.sku ? { sku: listingData.sku } : {}),
          ...(listingData?.ebay_price != null ? { price: listingData.ebay_price } : {}),
          ...(listingData?.ebay_item_id ? { ebayItemId: listingData.ebay_item_id } : {}),
          source: 'extension',
        },
      };

      syncLog('info', 'Syncing listing via create-listing...', { title: listingData.title, sku: listingData.sku });

      const response = await AuthHelper.callEdgeFunction('create-listing', enrichedListingData);
      const result = response.data;
      const status = response.status || 0;

      if (response.error) {
        const error = response.error || `create-listing failed with HTTP ${status}`;
        syncLog('error', 'Sync listing failed', { status, error });
        await recordListingSyncError({
          source: 'sync_utils',
          status,
          error,
          details: result,
          listingData
        });
        return {
          success: false,
          source: 'sync_utils',
          status,
          error,
          details: result
        };
      }

      syncLog('success', 'Listing synced', { action: result.action, id: result.listing?.id });
      return {
        success: true,
        source: 'sync_utils',
        listingId: result?.listing?.id,
        status,
        details: result
      };
    } catch (err) {
      syncLog('error', 'Sync listing error', err);
      const error = err?.message || 'Listing sync failed';
      await recordListingSyncError({ source: 'sync_utils', error, listingData });
      return { success: false, source: 'sync_utils', error };
    }
  }

  // 📦 AUTOMATIC EBAY ORDER SYNC (Moved from background.js)
  
  async function injectedFetchEbayCsv(syncDays) {
    try {
      let srt = null;
      try {
        if (window.raptor && window.raptor.require) {
          srt = window.raptor.require('ebay.raptor.engine.Context').get('csrftoken');
        }
      } catch (e) {
        console.log("SellerSuit: raptor context not found");
      }

      if (!srt) {
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

      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - syncDays);
      startDate.setHours(0, 0, 0, 0);

      const dateParam = `CUSTOM&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

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
      
      const newTab = await chrome.tabs.create({ url: 'https://www.ebay.com/sh/ord', active: false });
      tabId = newTab.id;
      createdTab = true;
      await logEbaySyncEvent('info', null, 'manual_sync_opened_ebay_tab', null, { tabId });
      
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
        world: 'MAIN',
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

  function parseEbayCsv(text) {
    const firstLine = text.substring(0, 1000).split('\n')[0];
    let delimiter = ',';
    const commas = (firstLine.match(/,/g) || []).length;
    const semis = (firstLine.match(/;/g) || []).length;
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

    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const lineStr = rows[i].join(' ').toLowerCase();
      if (lineStr.includes('order number') || lineStr.includes('sales record') || lineStr.includes('buyer name')) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = rows[headerRowIndex].map(h => (h || '').trim());

    const rawOrders = rows.slice(headerRowIndex + 1).map(r => {
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i] || `col_${i}`;
        obj[key] = r[i] ?? '';
      }
      return obj;
    });

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

      const qtyRaw = pick(o, ['Quantity', 'Qty']);
      const parsedQty = parseInt(String(qtyRaw).replace(/[^0-9]/g, ''), 10) || 1;

      const subtotalRaw = pick(o, ['Sold For', 'Subtotal', 'Item price']);
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
          item_title: itemTitle,
          quantity: parsedQty,
          custom_label: customLabel,
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
    const result = await chrome.storage.local.get(['ebay_orders_cache_v1', 'lastSyncTime']);
    if (result.lastSyncTime && (Date.now() - result.lastSyncTime > 3600000)) {
      await chrome.storage.local.remove(['ebay_orders_cache_v1', 'lastSyncTime']);
      return null;
    }
    return result['ebay_orders_cache_v1'] || null;
  }

  async function triggerEbayOrderSync(source = 'manual') {
    const sessionData = await _sessionStore().get(['isEbayOrderSyncInProgress', 'lastEbayOrderSync']);
    if (sessionData.isEbayOrderSyncInProgress) {
      syncLog('warn', 'Sync already in progress, skipping');
      return;
    }

    const { saasToken, userId, userEbaySettings } = await chrome.storage.local.get(['saasToken', 'userId', 'userEbaySettings']);
    
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
          const supabaseUrl = (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.SUPABASE_URL) ? ExtensionConfig.URLS.SUPABASE_URL : SUPABASE_URL;
          await fetch(`${supabaseUrl}/rest/v1/user_ebay_settings?user_id=eq.${userId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${saasToken}`, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sync_state: 'syncing' })
          });
        }
      }
    }

    const lastSyncTime = sessionData.lastEbayOrderSync || 0;
    if (source === 'auto' && !bypassDebounce && Date.now() - lastSyncTime < 5 * 60 * 1000) {
      return;
    }

    await _sessionStore().set({ isEbayOrderSyncInProgress: true });
    syncLog('info', `Starting eBay Order Sync (${source})`);
    await logEbaySyncEvent('info', null, 'extension_sync_started', null, { source, bypassDebounce });

    try {
      let isAuth = false;
      if (typeof AuthHelper !== 'undefined') {
        isAuth = await AuthHelper.verifyAuthStatus();
      } else {
        isAuth = !!saasToken;
      }
      if (!isAuth) {
        await logEbaySyncEvent('error', 'extension_dependency', 'extension_sync_failed', null, { reason: 'User not authenticated' });
        throw new Error("User not authenticated");
      }
      if (!saasToken) {
        await logEbaySyncEvent('error', 'extension_dependency', 'extension_sync_failed', null, { reason: 'No auth token found' });
        throw new Error("No auth token found");
      }

      const settings = await chrome.storage.local.get(['ebaySyncDays']);
      const days = settings.ebaySyncDays || 90;

      syncLog('info', `Fetching CSV report (Last ${days} days)...`);
      await logEbaySyncEvent('info', null, 'csv_download_started', null, { days });
      let csvText;
      try {
        csvText = await fetchEbayCsv(days, source);
        if (!csvText) throw new Error("Failed to fetch CSV - no data returned");
        await logEbaySyncEvent('info', null, 'csv_download_completed', null, { bytes: csvText.length });
        
        await chrome.storage.local.set({ ebaySessionRequired: false });
        await logEbaySyncEvent('info', null, 'ebay_session_required_flag_cleared', null, {});
        
      } catch(e) {
        if (e.message === 'ebay_session_required') {
          syncLog('warn', 'eBay Session Required - auto-sync paused until user opens eBay');
          await logEbaySyncEvent('warn', 'ebay_session', 'sync_waiting_for_user_session', null, { source });
          await chrome.storage.local.set({ ebaySessionRequired: true });
          await logEbaySyncEvent('info', null, 'ebay_session_required_flag_set', null, {});
          
          if (bypassDebounce && saasToken && userId) {
            const supabaseUrl = (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.SUPABASE_URL) ? ExtensionConfig.URLS.SUPABASE_URL : SUPABASE_URL;
            await fetch(`${supabaseUrl}/rest/v1/user_ebay_settings?user_id=eq.${userId}`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bearer ${saasToken}`, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({ sync_state: 'waiting_for_user_session' })
            }).catch(console.error);
          }
        } else {
          await logEbaySyncEvent('error', 'csv_download', 'csv_download_failed', null, { error: e.message });
        }
        throw e;
      }

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
        await _sessionStore().set({ isEbayOrderSyncInProgress: false });
        return;
      }

      const BATCH_SIZE = 50;
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

          const supabaseFunctions = (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.SUPABASE_FUNCTIONS) ? ExtensionConfig.URLS.SUPABASE_FUNCTIONS : `${SUPABASE_URL}/functions/v1`;
          const response = await fetch(`${supabaseFunctions}/sync-ebay-orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${saasToken}`,
              'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ orders: batch })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Batch ${batchNum} failed (${response.status}): ${errText}`);
          }

          const result = await response.json();
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
        }

        await new Promise(r => setTimeout(r, 500));
      }

      const summary = `Sync Complete. Synced: ${totalSynced}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}, Errors: ${errorCount} batches.`;
      syncLog(errorCount > 0 ? 'warn' : 'success', summary);

      if (errorCount === 0) {
        await logEbaySyncEvent('success', null, 'extension_sync_completed', null, { totalSynced, totalUpdated });
      } else {
        await logEbaySyncEvent('warning', null, 'extension_sync_completed', null, { totalSynced, totalUpdated, errorCount });
      }

      if (saasToken && userId) {
        const supabaseUrl = (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.SUPABASE_URL) ? ExtensionConfig.URLS.SUPABASE_URL : SUPABASE_URL;
        await fetch(`${supabaseUrl}/rest/v1/user_ebay_settings?user_id=eq.${userId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${saasToken}`, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sync_state: 'idle' })
        }).catch(console.error);
      }

      const now = Date.now();
      await _sessionStore().set({ lastEbayOrderSync: now });
      chrome.storage.local.set({ lastSyncTime: now });

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
      await _sessionStore().set({ isEbayOrderSyncInProgress: false });
    }
  }

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

      const supabaseUrl = (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.SUPABASE_URL) ? ExtensionConfig.URLS.SUPABASE_URL : SUPABASE_URL;
      await fetch(`${supabaseUrl}/rest/v1/ebay_sync_logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
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

  // 📋 GOOGLE SHEET LOGGING (Moved from background.js)

  async function getGoogleSheetUrl() {
    if (typeof PerformanceUtils !== 'undefined') {
      return PerformanceUtils.withCache('googleSheetUrl', async () => {
        try {
          const result = await chrome.storage.local.get([
            'googleAppsScriptUrl',
            'googleSheetUrl'
          ]);

          const url = result['googleAppsScriptUrl'] ||
            result['googleSheetUrl'] ||
            'https://script.google.com/macros/s/AKfycbwU_ER6RWnY0koDjq7zs__LTdkMCF07nP8wvTe_05qZ5pcbDlpTu0VBlPZ3sI-sqIV5/exec';

          syncLog('debug', 'Google Sheet URL retrieved', {
            hasCustomUrl: url !== 'https://script.google.com/macros/s/AKfycbwU_ER6RWnY0koDjq7zs__LTdkMCF07nP8wvTe_05qZ5pcbDlpTu0VBlPZ3sI-sqIV5/exec'
          });

          return url;
        } catch (error) {
          syncLog('warn', 'Using default Google Sheet URL', { error: error.message });
          return 'https://script.google.com/macros/s/AKfycbwU_ER6RWnY0koDjq7zs__LTdkMCF07nP8wvTe_05qZ5pcbDlpTu0VBlPZ3sI-sqIV5/exec';
        }
      }, 5 * 60 * 1000);
    } else {
      const result = await chrome.storage.local.get([
        'googleAppsScriptUrl',
        'googleSheetUrl'
      ]);

      return result['googleAppsScriptUrl'] ||
        result['googleSheetUrl'] ||
        'https://script.google.com/macros/s/AKfycbwU_ER6RWnY0koDjq7zs__LTdkMCF07nP8wvTe_05qZ5pcbDlpTu0VBlPZ3sI-sqIV5/exec';
    }
  }

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
      if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log("✅ Logged to sheet (data hidden in prod)", data);
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

  // ⏳ QUEUE MECHANISM FOR OFFLINE/FAILED SYNCS

  const syncQueue = {
    QUEUE_KEY: 'pendingSyncQueue',
    
    async add(item) {
      try {
        const data = await chrome.storage.local.get(this.QUEUE_KEY);
        const queue = data[this.QUEUE_KEY] || [];
        queue.push({
          ...item,
          queuedAt: Date.now(),
          attempts: 0
        });
        await chrome.storage.local.set({ [this.QUEUE_KEY]: queue });
        syncLog('info', 'Item added to sync queue', { type: item.type, queueSize: queue.length });
      } catch (err) {
        syncLog('error', 'Failed to add to sync queue', err);
      }
    },
    
    async processQueue() {
      try {
        const data = await chrome.storage.local.get(this.QUEUE_KEY);
        const queue = data[this.QUEUE_KEY] || [];
        
        if (queue.length === 0) return;
        
        syncLog('info', `Processing sync queue (${queue.length} items)`);
        
        const remaining = [];
        
        for (const item of queue) {
          if (item.type === 'listing') {
            const result = await syncListing(item.data);
            if (!result.success && item.attempts < 5) {
              remaining.push({ ...item, attempts: item.attempts + 1 });
            }
          }
        }
        
        await chrome.storage.local.set({ [this.QUEUE_KEY]: remaining });
        syncLog('info', `Queue processed, ${remaining.length} items remaining`);
        
      } catch (err) {
        syncLog('error', 'Failed to process sync queue', err);
      }
    },
    
    async clear() {
      await chrome.storage.local.remove(this.QUEUE_KEY);
    }
  };

  return {
    syncListing,
    syncQueue,
    recordListingSyncError,
    syncLog,
    triggerEbayOrderSync,
    fetchEbayCsv,
    parseEbayCsv,
    getEbayOrdersCache,
    logEbaySyncEvent,
    getGoogleSheetUrl,
    logToSheetMinimal,
    logToSheet,
    logProductToSheet,
    // Delegate auth functions to AuthHelper for window.SyncUtils backwards compatibility
    getAuthToken: () => {
      if (typeof AuthHelper !== 'undefined') return AuthHelper.getAuthToken();
      return getAuthToken(); // local fallback
    },
    verifyToken: (token) => {
      if (typeof AuthHelper !== 'undefined') return AuthHelper.verifyAuthStatus();
      return { valid: true };
    },
    saveAuthData: (token, user) => {
      if (typeof AuthHelper !== 'undefined') return AuthHelper.setNewAuthSession({ access_token: token, user });
      return Promise.resolve();
    },
    clearAuthData: () => {
      if (typeof AuthHelper !== 'undefined') return AuthHelper.clearNewAuthSession();
      return Promise.resolve();
    },
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  };
})();

// Export for window context
if (typeof window !== 'undefined') {
  window.SyncUtils = SyncUtils;
}

// For service workers (background.js)
if (typeof self !== 'undefined') {
  self.SyncUtils = SyncUtils;
}

// For module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncUtils;
}
