// ═══════════════════════════════════════════════════════════
// 🌐 API CLIENT MODULE
// Centralized fetch wrappers for Supabase Edge Functions
// ═══════════════════════════════════════════════════════════

const ApiClient = (() => {
  'use strict';

  /**
   * Centralized request wrapper
   * @param {string} url - Request URL
   * @param {RequestInit} options - Fetch options
   * @returns {Promise<Response>}
   */
  async function request(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const fetchOptions = {
      ...options,
      headers
    };

    return fetch(url, fetchOptions);
  }

  /**
   * Helper to call Supabase Edge Functions
   * @param {string} functionName - Name of the edge function
   * @param {object} body - Request body
   * @param {object} options - Fetch options override
   * @returns {Promise<Response>}
   */
  async function callEdgeFunction(functionName, body = {}, options = {}) {
    const supabaseUrl = (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.SUPABASE_URL)
      ? ExtensionConfig.URLS.SUPABASE_URL
      : 'https://ojxzssooylmydystjvdo.supabase.co';
    const supabaseAnonKey = (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.API_KEYS?.SUPABASE_ANON)
      ? ExtensionConfig.API_KEYS.SUPABASE_ANON
      : undefined;

    const url = `${supabaseUrl}/functions/v1/${functionName}`;
    const headers = {
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
      ...options.headers
    };

    return request(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      ...options
    });
  }

  return {
    request,
    callEdgeFunction
  };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
if (typeof self !== 'undefined') {
  self.ApiClient = ApiClient;
}
if (typeof window !== 'undefined') {
  window.ApiClient = ApiClient;
}
