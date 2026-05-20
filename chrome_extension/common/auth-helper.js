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

  function log(level, message, data = null) {
    if (!DEBUG && level === 'debug') return;
    const prefix = { debug: '🔍', info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' }[level] || '📝';
    const logMessage = `[AuthHelper] ${prefix} ${message}`;
    data ? console.log(logMessage, data) : console.log(logMessage);
  }

  /**
   * Get the current auth token from extension storage
   * @returns {Promise<{token: string|null, user: object|null, isValid: boolean}>}
   */
  async function getAuthToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['saasToken', 'saasUser', 'authTimestamp'], (result) => {
        const token = result.saasToken;
        const user = result.saasUser;
        const timestamp = result.authTimestamp || 0;
        
        // Check if token exists and is recent (within 1 hour)
        const isRecent = Date.now() - timestamp < 60 * 60 * 1000;
        
        if (token && isRecent) {
          log('debug', 'Token retrieved from storage', { 
            hasUser: !!user, 
            age: Math.round((Date.now() - timestamp) / 1000) + 's' 
          });
          resolve({ token, user, isValid: true });
        } else if (token) {
          log('warn', 'Token exists but may be stale');
          resolve({ token, user, isValid: true }); // Still try to use it
        } else {
          log('debug', 'No auth token found');
          resolve({ token: null, user: null, isValid: false });
        }
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
    const { token, isValid } = await getAuthToken();
    
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
   * Get current user info
   * @returns {Promise<{id: string, email: string, plan: string}|null>}
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
