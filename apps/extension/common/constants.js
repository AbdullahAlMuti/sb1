// ═══════════════════════════════════════════════════════════
// 🔑 CENTRALIZED CONSTANTS MODULE
// All action types, storage keys, selectors, and prefixes
// ═══════════════════════════════════════════════════════════

const ExtensionConstants = (() => {
  // 📦 STORAGE KEYS
  const STORAGE_KEYS = Object.freeze({
    // Auth
    SAAS_TOKEN: 'saasToken',
    SAAS_USER: 'saasUser',
    USER_ID: 'userId',
    USER_EMAIL: 'userEmail',
    USER_PLAN: 'userPlan',
    USER_CREDITS: 'userCredits',
    AUTH_TIMESTAMP: 'authTimestamp',
    
    // New Extension Auth
    EXTENSION_DEVICE_ID: 'extensionDeviceId',
    EXTENSION_ACCESS_TOKEN: 'extensionAccessToken',
    EXTENSION_REFRESH_TOKEN: 'extensionRefreshToken',
    EXTENSION_TOKEN_EXPIRES_AT: 'extensionTokenExpiresAt',
    EXTENSION_BOOTSTRAP_CACHE: 'extensionBootstrapCache',
    EXTENSION_INSTALL_ID: 'extensionInstallId',
    LEGACY_BACKUP_V1: 'legacyExtensionStorageBackup_v1',

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

  // 📨 MESSAGE ACTIONS
  const ACTIONS = Object.freeze({
    // Auth
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGOUT: 'LOGOUT',
    SYNC_TOKEN: 'SYNC_TOKEN',
    CHECK_AUTH: 'CHECK_AUTH',
    START_PAIRING: 'START_PAIRING',
    POLL_PAIRING_STATUS: 'POLL_PAIRING_STATUS',
    REDEEM_PAIRING: 'REDEEM_PAIRING',
    GET_EXTENSION_AUTH_STATE: 'GET_EXTENSION_AUTH_STATE',
    LOGOUT_EXTENSION_SESSION: 'LOGOUT_EXTENSION_SESSION',

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

  // 🔍 DOM SELECTORS (Amazon)
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

  // 🖼️ IMAGE PROCESSING
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

  // 📝 LOGGING PREFIXES
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

  // 🌐 WEB APPLICATION BASE URL
  const WEB_BASE_URL = 'https://sellersuit.com';

  return Object.freeze({
    WEB_BASE_URL,
    STORAGE_KEYS,
    ACTIONS,
    AMAZON_SELECTORS,
    IMAGE_CONFIG,
    LOG_PREFIXES
  });
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionConstants;
}
if (typeof self !== 'undefined') {
  self.ExtensionConstants = ExtensionConstants;
}
if (typeof window !== 'undefined') {
  window.ExtensionConstants = ExtensionConstants;
}
