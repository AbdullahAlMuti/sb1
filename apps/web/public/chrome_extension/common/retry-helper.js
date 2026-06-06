// ═══════════════════════════════════════════════════════════
// 🔁 RETRY HELPER MODULE
// Provides exponential backoff retries for robust networking
// ═══════════════════════════════════════════════════════════

const RetryHelper = (() => {
  'use strict';

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
        
      } catch (err) {
        lastError = err;
      }
      
      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  return {
    fetchWithRetry
  };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RetryHelper;
}
if (typeof self !== 'undefined') {
  self.RetryHelper = RetryHelper;
}
if (typeof window !== 'undefined') {
  window.RetryHelper = RetryHelper;
}
