// ═══════════════════════════════════════════════════════════
// Auth Helper Module
// Provides auth token retrieval for panel and content scripts
// ═══════════════════════════════════════════════════════════

const AuthHelper = (() => {
  'use strict';

  const DEBUG = false;
  const SUPABASE_URL =
    (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.SUPABASE_URL)
      ? ExtensionConfig.URLS.SUPABASE_URL
      : 'https://ojxzssooylmydystjvdo.supabase.co';

  const SUPABASE_ANON_KEY =
    (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.API_KEYS?.SUPABASE_ANON)
      ? ExtensionConfig.API_KEYS.SUPABASE_ANON
      : undefined;

  let remoteConfigCache = null;
  let remoteConfigTimestamp = 0;

  function log(level, message, data = null) {
    if (!DEBUG && level === 'debug') return;
    const prefix = { debug: '🔍', info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' }[level] || '📝';
    const logMessage = `[AuthHelper] ${prefix} ${message}`;
    data ? console.log(logMessage, data) : console.log(logMessage);
  }

  /**
   * Safe fetching of feature flags
   */
  async function getRemoteConfig() {
    if (remoteConfigCache && (Date.now() - remoteConfigTimestamp < 5 * 60 * 1000)) {
      return remoteConfigCache;
    }
    
    const defaults = {
      extension_new_auth_enabled: false,
      extension_legacy_fallback_enabled: true,
      extension_pairing_fallback_enabled: true,
      extension_auto_connect_enabled: false
    };

    try {
      // Try fetching from a safe public endpoint if it exists
      // If it 404s or fails, we fallback to defaults silently.
      const url = `${SUPABASE_URL}/functions/v1/extension-config`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        remoteConfigCache = { ...defaults, ...data };
        remoteConfigTimestamp = Date.now();
        return remoteConfigCache;
      }
    } catch (e) {
      log('debug', 'Remote config fetch failed, using safe defaults');
    }
    
    // In Dev/Test, if config.js explicitly turns it on, we can respect it if it was overriden locally.
    // But as per rules, config.js provides safe fallbacks.
    const configDefaults = (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES) ? {
      extension_new_auth_enabled: ExtensionConfig.FEATURES.EXTENSION_NEW_AUTH_ENABLED,
      extension_legacy_fallback_enabled: ExtensionConfig.FEATURES.EXTENSION_LEGACY_FALLBACK_ENABLED,
      extension_pairing_fallback_enabled: ExtensionConfig.FEATURES.EXTENSION_PAIRING_FALLBACK_ENABLED,
      extension_auto_connect_enabled: ExtensionConfig.FEATURES.EXTENSION_AUTO_CONNECT_ENABLED
    } : defaults;

    remoteConfigCache = configDefaults;
    remoteConfigTimestamp = Date.now();
    return remoteConfigCache;
  }

  /**
   * Create local storage backup if it doesn't exist
   */
  async function createLegacyBackupIfNeeded() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        const backupKey = 'legacyExtensionStorageBackup_v1';
        if (!items[backupKey]) {
          log('info', 'Creating legacy storage backup V1');
          chrome.storage.local.set({ [backupKey]: items }, () => resolve());
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Save new auth session
   */
  async function setNewAuthSession(sessionData) {
    await createLegacyBackupIfNeeded();
    return new Promise((resolve) => {
      const updates = {
        extensionAccessToken: sessionData.access_token,
        extensionRefreshToken: sessionData.refresh_token,
        extensionTokenExpiresAt: sessionData.expires_at,
        extensionDeviceId: sessionData.device_id
      };
      if (sessionData.user) {
        updates.saasUser = sessionData.user;
        updates.userId = sessionData.user.id;
        updates.userEmail = sessionData.user.email;
        updates.authTimestamp = Date.now();
      }
      chrome.storage.local.set(updates, resolve);
    });
  }

  /**
   * Clear new auth session (if invalid)
   */
  async function clearNewAuthSession() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([
        'extensionAccessToken', 
        'extensionRefreshToken', 
        'extensionTokenExpiresAt',
        'extensionBootstrapCache'
      ], resolve);
    });
  }

  /**
   * Get the current auth token from extension storage
   * @returns {Promise<{token: string|null, user: object|null, isValid: boolean}>}
   */
  async function getAuthToken() {
    const config = await getRemoteConfig();
    
    return new Promise((resolve) => {
      chrome.storage.local.get([
        'saasToken', 'saasUser', 'authTimestamp',
        'extensionAccessToken', 'extensionTokenExpiresAt'
      ], (result) => {
        
        // 1. Prefer New Auth if Enabled and Token Exists
        if (config.extension_new_auth_enabled && result.extensionAccessToken) {
          const isExpired = result.extensionTokenExpiresAt && (Date.now() / 1000) > result.extensionTokenExpiresAt;
          if (!isExpired) {
            log('debug', 'Using new extension session token');
            return resolve({ 
              token: result.extensionAccessToken, 
              user: result.saasUser, 
              isValid: true,
              type: 'new'
            });
          }
        }

        // 2. Fallback to Legacy Auth
        const token = result.saasToken;
        const user = result.saasUser;
        const timestamp = result.authTimestamp || 0;
        
        if (config.extension_legacy_fallback_enabled && token) {
          const isRecent = Date.now() - timestamp < 60 * 60 * 1000;
          if (isRecent) {
            log('debug', 'Token retrieved from storage (legacy)', { hasUser: !!user });
            return resolve({ token, user, isValid: true, type: 'legacy' });
          } else {
            log('warn', 'Token exists but may be stale (legacy)');
            return resolve({ token, user, isValid: true, type: 'legacy' });
          }
        }
        
        log('debug', 'No valid auth token found');
        resolve({ token: null, user: null, isValid: false, type: 'none' });
      });
    });
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async function isAuthenticated() {
    const { token, isValid } = await getAuthToken();
    return !!token && isValid;
  }

  /**
   * Get auth headers for API calls
   * @returns {Promise<{Authorization?: string}>}
   */
  async function getAuthHeaders() {
    const { token } = await getAuthToken();
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  }

  /**
   * Make an authenticated API call to Supabase edge function
   * @param {string} functionName - Edge function name
   * @param {object} body - Request body
   * @param {object} options - Additional fetch options
   * @returns {Promise<{data: any, error: string|null}>}
   */
  async function callEdgeFunction(functionName, body = {}, options = {}) {
    return performEdgeFunctionCall(functionName, body, options, false);
  }

  async function performEdgeFunctionCall(functionName, body, options, isRetry) {
    const { token, type } = await getAuthToken();
    
    if (!token) {
      log('warn', `Cannot call ${functionName}: No auth token`);
      return { 
        data: null, 
        error: 'Not authenticated. Please log in to your SellerSuit account.' 
      };
    }

    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    
    log('info', `Calling edge function: ${functionName}`, { hasToken: true });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
          'Authorization': `Bearer ${token}`,
          ...options.headers
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let serverMessage = '';

        try {
          const parsed = JSON.parse(errorText);
          serverMessage =
            parsed?.error?.message ||
            parsed?.error ||
            parsed?.message ||
            parsed?.detail ||
            '';
        } catch {
          // Non-JSON error body
        }

        const message = (serverMessage || errorText || '').toString().trim();
        const clipped = message.length > 400 ? message.slice(0, 400) + '…' : message;

        log('error', `API error: ${response.status}`, clipped);

        if (response.status === 401) {
          // If using new session, try refresh once
          if (type === 'new' && !isRetry) {
            log('info', 'Token expired, attempting refresh...');
            const refreshSuccess = await refreshExtensionToken();
            if (refreshSuccess) {
              log('success', 'Refresh succeeded, retrying original request');
              return performEdgeFunctionCall(functionName, body, options, true);
            } else {
              log('error', 'Refresh failed, session marked expired');
              await clearNewAuthSession();
              // A subsequent call will automatically try the legacy fallback if enabled
            }
          }
          return {
            data: null,
            error: clipped || 'Session expired. Please log in again.'
          };
        }

        if (response.status === 429) {
          return {
            data: null,
            error: clipped || 'Rate limit exceeded. Please try again in a moment.'
          };
        }

        if (response.status === 402) {
          return {
            data: null,
            error: clipped || 'AI credits exhausted. Please add funds to your account.'
          };
        }

        return {
          data: null,
          error: clipped || `API error: ${response.status}`
        };
      }

      const data = await response.json();
      log('success', `${functionName} completed`, { success: data.success });
      
      return { data, error: null };

    } catch (error) {
      log('error', `Network error calling ${functionName}`, error.message);
      return { 
        data: null, 
        error: 'Network error. Please check your connection.' 
      };
    }
  }

  /**
   * Refresh extension token
   */
  async function refreshExtensionToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['extensionRefreshToken'], async (result) => {
        if (!result.extensionRefreshToken) {
          return resolve(false);
        }

        try {
          const url = `${SUPABASE_URL}/functions/v1/extension-token-refresh`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {})
            },
            body: JSON.stringify({ refreshToken: result.extensionRefreshToken })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.session) {
              await setNewAuthSession(data.session);
              return resolve(true);
            }
          }
        } catch (e) {
          log('error', 'Token refresh exception', e);
        }
        resolve(false);
      });
    });
  }

  /**
   * Get current user info
   */
  async function getCurrentUser() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['saasUser', 'userId', 'userEmail', 'userPlan'], (result) => {
        if (result.saasUser) {
          resolve(result.saasUser);
        } else if (result.userId) {
          resolve({
            id: result.userId,
            email: result.userEmail || '',
            plan: result.userPlan || 'free'
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Show login prompt to user
   */
  function promptLogin() {
    if (typeof UIHelper !== 'undefined') {
      UIHelper.showToast('Please log in to your SellerSuit account to use this feature.', 'warning');
    } else {
      alert('Please log in to your SellerSuit account to use this feature.');
    }
  }

  // Public API
  return {
    getRemoteConfig,
    createLegacyBackupIfNeeded,
    setNewAuthSession,
    clearNewAuthSession,
    refreshExtensionToken,
    getAuthToken,
    isAuthenticated,
    getAuthHeaders,
    callEdgeFunction,
    getCurrentUser,
    promptLogin,
    SUPABASE_URL
  };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthHelper;
}
