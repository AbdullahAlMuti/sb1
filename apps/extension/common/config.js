// ═══════════════════════════════════════════════════════════
// 🔧 CENTRALIZED CONFIGURATION MODULE
// All constants, URLs, and settings in one place for easy maintenance
// ═══════════════════════════════════════════════════════════

const ExtensionConfig = (() => {
  // ═══════════════════════════════════════════════════════════
  // 🌐 API ENDPOINTS & URLS
  // ═══════════════════════════════════════════════════════════
  // Web App base URL
  // NOTE: This must point at the same environment the user is logged into.
  // Local dev default (you can switch to your domain later).
  // Default web app base URL.
  // IMPORTANT: This should point to the environment where users log in (so AuthSync can copy the Supabase session into the extension).
  // PRODUCTION: point to sellersuit.com where you log into the web app.
  // IMPORTANT: AuthSync reads the Supabase session from the web app's localStorage and copies it into the extension.
  // When you later switch to a real domain, update this value.
  const WEB_APP_DOMAIN = 'https://sellersuit.com';

  const URLS = Object.freeze({
    // Supabase
    // IMPORTANT: Must match the web app's backend project.
    SUPABASE_URL: 'https://ojxzssooylmydystjvdo.supabase.co',
    SUPABASE_FUNCTIONS: 'https://ojxzssooylmydystjvdo.supabase.co/functions/v1',

    // Web App (environment-aware)
    WEB_APP_BASE: WEB_APP_DOMAIN,
    WEB_APP_AUTH: `${WEB_APP_DOMAIN}/auth`,
    WEB_APP_DASHBOARD: `${WEB_APP_DOMAIN}/dashboard`,

    // Google Apps Script (default fallback)
    DEFAULT_GOOGLE_SHEET: 'https://script.google.com/macros/s/AKfycbwU_ER6RWnY0koDjq7zs__LTdkMCF07nP8wvTe_05qZ5pcbDlpTu0VBlPZ3sI-sqIV5/exec',

    // Backend API (same as web app)
    LOCAL_BACKEND: WEB_APP_DOMAIN,
    AI_REMOVE_BG: `${WEB_APP_DOMAIN}/v1/ai/remove-bg`
  });

  console.log('🔧 [Config] ExtensionConfig initialized:', {
    DOMAIN: WEB_APP_DOMAIN,
    BASE: URLS.WEB_APP_BASE,
    AUTH: URLS.WEB_APP_AUTH,
    DASHBOARD: URLS.WEB_APP_DASHBOARD
  });

  // ═══════════════════════════════════════════════════════════
  // 🔑 API KEYS (Public/Anon only - secrets in storage)
  // ═══════════════════════════════════════════════════════════
  const API_KEYS = Object.freeze({
    // Supabase Functions gateway requires an `apikey` header.
    // Use the SAME anon/publishable key as the web app.
    // (This is a public key; it is safe to ship in the extension.)
    SUPABASE_ANON: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc'
  });

  // ═══════════════════════════════════════════════════════════
  // ⏱️ TIMING CONSTANTS
  // ═══════════════════════════════════════════════════════════
  const TIMING = Object.freeze({
    // Auth
    AUTH_CHECK_INTERVAL: 5 * 60 * 1000,      // 5 minutes
    AUTH_GRACE_PERIOD: 30 * 60 * 1000,       // 30 minutes (offline grace)

    // Sync
    SETTINGS_SYNC_INTERVAL: 30 * 60 * 1000,  // 30 minutes
    AUTO_ORDER_POLL_INTERVAL: 5 * 60 * 1000, // 5 minutes

    // Requests
    REQUEST_TIMEOUT: 30000,                   // 30 seconds
    AUTH_REQUEST_TIMEOUT: 15000,              // 15 seconds

    // Retry
    BASE_RETRY_DELAY: 1000,                   // 1 second
    MAX_RETRIES: 3,

    // UI
    TOAST_DURATION: 3000,                     // 3 seconds
    DEBOUNCE_DELAY: 300,                      // 300ms
    UI_ANIMATION_DURATION: 300                // 300ms
  });

  // Use ExtensionConstants if available (defined in common/constants.js)
  const constants = typeof ExtensionConstants !== 'undefined' ? ExtensionConstants : {};
  const STORAGE_KEYS = constants.STORAGE_KEYS || {};
  const ACTIONS = constants.ACTIONS || {};
  const AMAZON_SELECTORS = constants.AMAZON_SELECTORS || {};
  const IMAGE_CONFIG = constants.IMAGE_CONFIG || {};
  const LOG_PREFIXES = constants.LOG_PREFIXES || {};

  // ═══════════════════════════════════════════════════════════
  // 🛡️ FEATURE FLAGS
  // ═══════════════════════════════════════════════════════════
  const FEATURES = Object.freeze({
    DEBUG_MODE: false, // Set to false for production
    ENABLE_CACHING: true,
    ENABLE_AUTO_ORDERS: false,
    ENABLE_ANALYTICS: true,
    ENABLE_SYNC_QUEUE: true,
    
    // Auth Fallback Defaults (Overridden by remote config if available)
    EXTENSION_NEW_AUTH_ENABLED: false,
    EXTENSION_LEGACY_FALLBACK_ENABLED: true,
    EXTENSION_PAIRING_FALLBACK_ENABLED: true,
    EXTENSION_AUTO_CONNECT_ENABLED: false
  });


  // ═══════════════════════════════════════════════════════════
  // 🔧 HELPER METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Get full Supabase function URL
   * @param {string} functionName - Edge function name
   * @returns {string} Full URL
   */
  function getSupabaseFunctionUrl(functionName) {
    return `${URLS.SUPABASE_FUNCTIONS}/${functionName}`;
  }

  /**
   * Get Supabase REST URL for a table
   * @param {string} table - Table name
   * @param {string} query - Optional query string
   * @returns {string} Full URL
   */
  function getSupabaseRestUrl(table, query = '') {
    return `${URLS.SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  }

  /**
   * Check if a feature is enabled
   * @param {string} featureName - Feature name
   * @returns {boolean}
   */
  function isFeatureEnabled(featureName) {
    return FEATURES[featureName] === true;
  }

  /**
   * Get timing value with optional multiplier
   * @param {string} key - Timing key
   * @param {number} multiplier - Optional multiplier
   * @returns {number}
   */
  function getTiming(key, multiplier = 1) {
    return (TIMING[key] || 1000) * multiplier;
  }

  // ═══════════════════════════════════════════════════════════
  // 📤 PUBLIC API
  // ═══════════════════════════════════════════════════════════
  return Object.freeze({
    URLS,
    API_KEYS,
    TIMING,
    STORAGE_KEYS,
    ACTIONS,
    AMAZON_SELECTORS,
    IMAGE_CONFIG,
    FEATURES,
    LOG_PREFIXES,

    // Helper methods
    getSupabaseFunctionUrl,
    getSupabaseRestUrl,
    isFeatureEnabled,
    getTiming
  });
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionConfig;
}
if (typeof self !== 'undefined') {
  self.ExtensionConfig = ExtensionConfig;
}
if (typeof window !== 'undefined') {
  window.ExtensionConfig = ExtensionConfig;
}
