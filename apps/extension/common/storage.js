// ═══════════════════════════════════════════════════════════
// Storage Helper Module - Chrome Storage Abstraction
// ═══════════════════════════════════════════════════════════

const StorageHelper = (() => {
  // Storage keys constants
  const KEYS = {
    WATERMARKED_IMAGES: 'watermarkedImages',
    USER_STICKERS: 'userStickers',
    THEME: 'snipeEditorTheme',
    ADMIN_AUTH: 'adminAuth',
    ADMIN_SETTINGS: 'adminSettings',
    ANALYTICS: 'analytics',
    FIRST_INSTALL: 'firstInstall',
    USER_ROLE: 'userRole',
    LICENSE_KEY: 'licenseKey',
    GOOGLE_SHEET_URL: 'googleSheetUrl',
    GOOGLE_APPS_SCRIPT_URL: 'googleAppsScriptUrl',
    LISTED_COUNT: 'listedCount',
    AUTO_WATERMARK_ENABLED: 'autoWatermarkEnabled'
  };

  /**
   * Get data from chrome.storage.local
   * @param {string|string[]} keys - Single key or array of keys
   * @returns {Promise<any>} Retrieved data
   */
  async function getLocal(keys) {
    try {
      const result = await chrome.storage.local.get(keys);
      return Array.isArray(keys) ? result : result[keys];
    } catch (error) {
      console.error('Storage getLocal error:', error);
      throw error;
    }
  }

  /**
   * Set data in chrome.storage.local
   * @param {Object} items - Key-value pairs to store
   * @returns {Promise<void>}
   */
  async function setLocal(items) {
    try {
      await chrome.storage.local.set(items);
    } catch (error) {
      console.error('Storage setLocal error:', error);
      throw error;
    }
  }

  /**
   * Remove data from chrome.storage.local
   * @param {string|string[]} keys - Keys to remove
   * @returns {Promise<void>}
   */
  async function removeLocal(keys) {
    try {
      await chrome.storage.local.remove(keys);
    } catch (error) {
      console.error('Storage removeLocal error:', error);
      throw error;
    }
  }

  /**
   * Get data from chrome.storage.sync
   * @param {string|string[]} keys - Single key or array of keys
   * @returns {Promise<any>} Retrieved data
   */
  async function getSync(keys) {
    try {
      const result = await chrome.storage.sync.get(keys);
      return Array.isArray(keys) ? result : result[keys];
    } catch (error) {
      console.error('Storage getSync error:', error);
      throw error;
    }
  }

  /**
   * Set data in chrome.storage.sync
   * @param {Object} items - Key-value pairs to store
   * @returns {Promise<void>}
   */
  async function setSync(items) {
    try {
      await chrome.storage.sync.set(items);
    } catch (error) {
      console.error('Storage setSync error:', error);
      throw error;
    }
  }

  /**
   * Clear all chrome.storage.local data
   * @returns {Promise<void>}
   */
  async function clearLocal() {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Storage clearLocal error:', error);
      throw error;
    }
  }

  /**
   * Export all settings as JSON
   * @returns {Promise<Object>} All settings
   */
  async function exportSettings() {
    try {
      const settings = await getLocal([
        KEYS.ADMIN_SETTINGS,
        KEYS.THEME,
        KEYS.USER_ROLE
      ]);
      return settings;
    } catch (error) {
      console.error('Export settings error:', error);
      throw error;
    }
  }

  /**
   * Import settings from JSON
   * @param {Object} settings - Settings object to import
   * @returns {Promise<void>}
   */
  async function importSettings(settings) {
    try {
      await setLocal(settings);
    } catch (error) {
      console.error('Import settings error:', error);
      throw error;
    }
  }

  /**
   * Validate Google Apps Script URL format
   * @param {string} url - URL to validate
   * @returns {Object} Validation result with isValid and error message
   */
  function validateGoogleScriptUrl(url) {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL is required' };
    }

    // Check if it's a valid HTTPS URL
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'https:') {
        return { isValid: false, error: 'URL must use HTTPS' };
      }
    } catch (e) {
      return { isValid: false, error: 'Invalid URL format' };
    }

    // Check if it matches Google Apps Script URL pattern
    // Allow query parameters and trailing slashes
    const googleScriptPattern = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(\/|\?|$)/;
    if (!googleScriptPattern.test(url)) {
      return {
        isValid: false,
        error: 'URL must match pattern: https://script.google.com/macros/s/[SCRIPT_ID]/exec'
      };
    }

    return { isValid: true, error: null };
  }

  // Public API
  return {
    KEYS,
    getLocal,
    setLocal,
    removeLocal,
    getSync,
    setSync,
    clearLocal,
    exportSettings,
    importSettings,
    validateGoogleScriptUrl
  };
})();

// Make it available globally or as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageHelper;
}
