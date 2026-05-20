// ═══════════════════════════════════════════════════════════
// 🔄 SYNC UTILITIES - Shared helpers for reliable data sync
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL =
  (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.SUPABASE_URL)
    ? ExtensionConfig.URLS.SUPABASE_URL
    : 'https://ojxzssooylmydystjvdo.supabase.co';

const SUPABASE_ANON_KEY =
  (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.API_KEYS?.SUPABASE_ANON)
    ? ExtensionConfig.API_KEYS.SUPABASE_ANON
    : 'sb_publishable_1g365OiHn2VHRYv9GThcVA_QW2yIdyA';

// Debug mode flag - set to true for verbose logging
const DEBUG_SYNC = true;

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
}

/**
 * Fetch with retry and exponential backoff
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      syncLog('debug', `Fetch attempt ${attempt + 1}/${maxRetries + 1}`, { url: url.substring(0, 60) + '...' });
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // If response is ok or it's a client error (4xx), don't retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Server error - worth retrying
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      syncLog('warn', `Request failed with ${response.status}, will retry`, { attempt });
      
    } catch (err) {
      lastError = err;
      
      if (err.name === 'AbortError') {
        syncLog('warn', 'Request timed out', { attempt });
      } else {
        syncLog('warn', `Request error: ${err.message}`, { attempt });
      }
    }
    
    // Don't wait after the last attempt
    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      syncLog('debug', `Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  syncLog('error', `All ${maxRetries + 1} attempts failed`);
  throw lastError;
}

/**
 * Get the current auth token from storage
 * @returns {Promise<{token: string|null, user: object|null}>}
 */
async function getAuthToken() {
  try {
    const data = await chrome.storage.local.get(['saasToken', 'userId', 'userEmail', 'userPlan']);
    return {
      token: data.saasToken || null,
      user: data.userId ? {
        id: data.userId,
        email: data.userEmail,
        plan: data.userPlan
      } : null
    };
  } catch (err) {
    syncLog('error', 'Failed to get auth token from storage', err);
    return { token: null, user: null };
  }
}

/**
 * Check if the token is valid by calling the auth-status endpoint
 * @param {string} token - The JWT token to verify
 * @returns {Promise<{valid: boolean, user: object|null, error: string|null}>}
 */
async function verifyToken(token) {
  if (!token) {
    return { valid: false, user: null, error: 'No token provided' };
  }
  
  try {
    const response = await fetchWithRetry(
      `${SUPABASE_URL}/functions/v1/auth-status`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      },
      2, // Only 2 retries for auth check
      500
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      syncLog('warn', 'Token verification failed', { status: response.status, error: errorText });
      return { valid: false, user: null, error: `Auth failed: ${response.status}` };
    }
    
    const data = await response.json();
    
    if (data.success && data.user) {
      syncLog('success', 'Token verified', { userId: data.user.id, email: data.user.email });
      return { valid: true, user: data.user, error: null };
    }
    
    return { valid: false, user: null, error: data.error || 'Unknown error' };
    
  } catch (err) {
    syncLog('error', 'Token verification error', err);
    return { valid: false, user: null, error: err.message };
  }
}

/**
 * Save auth data to extension storage
 * @param {string} token - The JWT token
 * @param {object} user - User data from auth-status
 */
async function saveAuthData(token, user) {
  try {
    const authData = {
      saasToken: token,
      userId: user?.id,
      userEmail: user?.email,
      userPlan: user?.plan,
      userCredits: user?.credits,
      authTimestamp: Date.now()
    };
    
    await chrome.storage.local.set(authData);
    syncLog('success', 'Auth data saved to storage', { userId: user?.id });
    
  } catch (err) {
    syncLog('error', 'Failed to save auth data', err);
    throw err;
  }
}

/**
 * Clear auth data from storage
 */
async function clearAuthData() {
  try {
    await chrome.storage.local.remove([
      'saasToken', 
      'userId', 
      'userEmail', 
      'userPlan', 
      'userCredits',
      'saasUser',
      'authTimestamp'
    ]);
    syncLog('info', 'Auth data cleared');
  } catch (err) {
    syncLog('error', 'Failed to clear auth data', err);
  }
}

/**
 * Sync a listing to the backend with retry (uses create-listing function)
 * @param {object} listingData - The listing data to sync
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
async function syncListing(listingData) {
  const { token } = await getAuthToken();

  if (!token) {
    return { success: false, data: null, error: 'Not authenticated' };
  }

  try {
    // Ensure we always send a useful raw payload blob for backfill/debug in the dashboard.
    // This is additive and does not change existing top-level fields.
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

    const response = await fetchWithRetry(
      `${SUPABASE_URL}/functions/v1/create-listing`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(enrichedListingData),
      },
      3,
      1000
    );

    const result = await response.json();

    if (!response.ok) {
      syncLog('error', 'Sync listing failed', { status: response.status, error: result.error });
      return { success: false, data: null, error: result.error || `HTTP ${response.status}` };
    }

    syncLog('success', 'Listing synced', { action: result.action, id: result.listing?.id });
    return { success: true, data: result, error: null };
  } catch (err) {
    syncLog('error', 'Sync listing error', err);
    return { success: false, data: null, error: err.message };
  }
}

/**
 * Queue mechanism for offline/failed syncs
 */
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

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.SyncUtils = {
    fetchWithRetry,
    getAuthToken,
    verifyToken,
    saveAuthData,
    clearAuthData,
    syncListing,
    syncQueue,
    syncLog,
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  };
}

// For service workers (background.js)
if (typeof self !== 'undefined' && typeof self.SyncUtils === 'undefined') {
  self.SyncUtils = {
    fetchWithRetry,
    getAuthToken,
    verifyToken,
    saveAuthData,
    clearAuthData,
    syncListing,
    syncQueue,
    syncLog,
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  };
}
