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
  // LOCAL DEV (as requested): point to localhost where you log into the web app.
  // IMPORTANT: AuthSync reads the Supabase session from the web app's localStorage and copies it into the extension.
  // When you later switch to a real domain, update this value.
  const WEB_APP_DOMAIN = 'http://localhost:8080';

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

  // ═══════════════════════════════════════════════════════════
  // 📦 STORAGE KEYS
  // ═══════════════════════════════════════════════════════════
  const STORAGE_KEYS = Object.freeze({
    // Auth
    SAAS_TOKEN: 'saasToken',
    SAAS_USER: 'saasUser',
    USER_ID: 'userId',
    USER_EMAIL: 'userEmail',
    USER_PLAN: 'userPlan',
    USER_CREDITS: 'userCredits',
    AUTH_TIMESTAMP: 'authTimestamp',

    // Settings
    GOOGLE_SHEET_URL: 'googleSheetUrl',
    GOOGLE_APPS_SCRIPT_URL: 'googleAppsScriptUrl',
    GEMINI_API_KEY: 'geminiApiKey',
    REPLICATE_API_KEY: 'replicateApiKey',

    // UI/Features
    THEME: 'snipeEditorTheme',
    AUTO_WATERMARK: 'autoWatermarkEnabled',
    FIRST_INSTALL: 'firstInstall',
    LISTED_COUNT: 'listedCount',

    // Sync Queue
    PENDING_SYNC_QUEUE: 'pendingSyncQueue',

    // Cache
    IMAGE_CACHE: 'imageCache',
    SCRAPE_CACHE: 'scrapeCache'
  });

  // ═══════════════════════════════════════════════════════════
  // 📨 MESSAGE ACTIONS
  // ═══════════════════════════════════════════════════════════
  const ACTIONS = Object.freeze({
    // Auth
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGOUT: 'LOGOUT',
    SYNC_TOKEN: 'SYNC_TOKEN',
    CHECK_AUTH: 'CHECK_AUTH',

    // AI/Processing
    AI_REMOVE_BG: 'AI_REMOVE_BG',
    GENERATE_TITLE: 'GENERATE_TITLE',
    BG_REMOVED_SUCCESS: 'BG_REMOVED_SUCCESS',
    BG_REMOVED_ERROR: 'BG_REMOVED_ERROR',

    // Listing
    START_OPTILIST: 'START_OPTILIST',
    CREATE_AUTO_ORDER: 'createAutoOrder',

    // Scraping
    SCRAPE_PRODUCT: 'SCRAPE_PRODUCT',
    GET_IMAGES: 'GET_IMAGES',

    // UI
    SHOW_TOAST: 'SHOW_TOAST',
    UPDATE_BADGE: 'UPDATE_BADGE'
  });

  // ═══════════════════════════════════════════════════════════
  // 🔍 DOM SELECTORS (Amazon)
  // ═══════════════════════════════════════════════════════════
  const AMAZON_SELECTORS = Object.freeze({
    // Title
    TITLE: '#productTitle',

    // Price
    PRICE: [
      '#corePriceDisplay_desktop_feature_div .a-price-whole',
      '#corePrice_desktop .a-price .a-offscreen',
      '#price_inside_buybox',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price .a-offscreen',
      '[data-a-color="price"] .a-offscreen'
    ],

    // Images
    IMAGES: [
      '#landingImage',
      '#imgTagWrapperId img',
      '#main-image-container img',
      '.a-dynamic-image',
      '#imgBlkFront',
      '#imageBlock img',
      '#altImages img',
      '#altImages li img'
    ],

    // Details
    DETAIL_BULLETS: '#detailBullets_feature_div ul, #detail-bullets_feature_div ul',
    TECH_SPECS: 'table[id*="productDetails"], #productDetails_techSpec_section_1, #productDetails_techSpec_section_2',
    DESCRIPTION: '#productDescription',

    // ASIN
    ASIN: '#ASIN, input[name="ASIN"]'
  });

  // ═══════════════════════════════════════════════════════════
  // 🖼️ IMAGE PROCESSING
  // ═══════════════════════════════════════════════════════════
  const IMAGE_CONFIG = Object.freeze({
    // Size thresholds
    MIN_WIDTH: 200,
    MIN_HEIGHT: 200,
    PREFERRED_MIN_WIDTH: 500,

    // High-res transformation
    HIGH_RES_SIZE: '_SL1500_',
    FALLBACK_SIZES: ['_SL1200_', '_SL1000_', '_SL800_'],

    // Validation
    BLOCKED_PATTERNS: [
      'sprite', 'transparent', 'pixel', 'spacer', 'blank',
      'loading', 'placeholder', 'icon', 'badge', 'logo'
    ],

    // Max images to process
    MAX_IMAGES: 12
  });

  // ═══════════════════════════════════════════════════════════
  // 🛡️ FEATURE FLAGS
  // ═══════════════════════════════════════════════════════════
  const FEATURES = Object.freeze({
    DEBUG_MODE: true,
    ENABLE_CACHING: true,
    ENABLE_AUTO_ORDERS: false,  // Disabled for local testing
    ENABLE_ANALYTICS: true,
    ENABLE_SYNC_QUEUE: true
  });

  // ═══════════════════════════════════════════════════════════
  // 📝 LOGGING
  // ═══════════════════════════════════════════════════════════
  const LOG_PREFIXES = Object.freeze({
    debug: '🔍',
    info: 'ℹ️',
    success: '✅',
    warn: '⚠️',
    error: '❌',
    auth: '🔒',
    sync: '🔄',
    api: '🌐'
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
