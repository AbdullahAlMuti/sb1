// ═══════════════════════════════════════════════════════════
// Analytics Module - Logging & Telemetry
// ═══════════════════════════════════════════════════════════

const Analytics = (() => {
  const LOG_KEY = 'analyticsLogs';
  const USAGE_KEY = 'analyticsUsage';
  const MAX_LOGS = 1000; // Keep last 1000 log entries

  /**
   * Log levels
   */
  const LogLevel = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG'
  };

  /**
   * Log an event
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  async function log(level, message, metadata = {}) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        metadata
      };

      // Get existing logs
      const result = await chrome.storage.local.get(LOG_KEY);
      const logs = result[LOG_KEY] || [];
      
      // Add new log
      logs.push(entry);
      
      // Keep only last MAX_LOGS entries
      const trimmedLogs = logs.slice(-MAX_LOGS);
      
      // Save back
      await chrome.storage.local.set({ [LOG_KEY]: trimmedLogs });
      
      // Console log for debugging
      console.log(`[${level}] ${message}`, metadata);
    } catch (error) {
      console.error('Analytics log error:', error);
    }
  }

  /**
   * Log info message
   * @param {string} message - Message
   * @param {Object} metadata - Metadata
   */
  function info(message, metadata = {}) {
    return log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log warning message
   * @param {string} message - Message
   * @param {Object} metadata - Metadata
   */
  function warn(message, metadata = {}) {
    return log(LogLevel.WARNING, message, metadata);
  }

  /**
   * Log error message
   * @param {string} message - Message
   * @param {Object} metadata - Metadata
   */
  function error(message, metadata = {}) {
    return log(LogLevel.ERROR, message, metadata);
  }

  /**
   * Log debug message
   * @param {string} message - Message
   * @param {Object} metadata - Metadata
   */
  function debug(message, metadata = {}) {
    return log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Track usage event
   * @param {string} action - Action name (e.g., 'image_edited', 'sticker_added')
   * @param {Object} data - Event data
   */
  async function trackEvent(action, data = {}) {
    try {
      const result = await chrome.storage.local.get(USAGE_KEY);
      const usage = result[USAGE_KEY] || {};
      
      // Initialize action counter if doesn't exist
      if (!usage[action]) {
        usage[action] = { count: 0, lastUsed: null, data: [] };
      }
      
      // Increment counter
      usage[action].count++;
      usage[action].lastUsed = new Date().toISOString();
      
      // Store event data (keep last 10)
      usage[action].data.push({
        timestamp: new Date().toISOString(),
        ...data
      });
      usage[action].data = usage[action].data.slice(-10);
      
      // Save back
      await chrome.storage.local.set({ [USAGE_KEY]: usage });
      
      // Also log the event
      await info(`Event: ${action}`, data);
    } catch (error) {
      console.error('Track event error:', error);
    }
  }

  /**
   * Get all logs
   * @param {string} levelFilter - Filter by level (optional)
   * @returns {Promise<Array>} Array of log entries
   */
  async function getLogs(levelFilter = null) {
    try {
      const result = await chrome.storage.local.get(LOG_KEY);
      const logs = result[LOG_KEY] || [];
      
      if (levelFilter) {
        return logs.filter(log => log.level === levelFilter);
      }
      
      return logs;
    } catch (error) {
      console.error('Get logs error:', error);
      return [];
    }
  }

  /**
   * Get usage statistics
   * @returns {Promise<Object>} Usage statistics
   */
  async function getUsageStats() {
    try {
      const result = await chrome.storage.local.get(USAGE_KEY);
      return result[USAGE_KEY] || {};
    } catch (error) {
      console.error('Get usage stats error:', error);
      return {};
    }
  }

  /**
   * Clear all logs
   * @returns {Promise<void>}
   */
  async function clearLogs() {
    try {
      await chrome.storage.local.remove(LOG_KEY);
      await info('Logs cleared');
    } catch (error) {
      console.error('Clear logs error:', error);
    }
  }

  /**
   * Clear usage statistics
   * @returns {Promise<void>}
   */
  async function clearUsage() {
    try {
      await chrome.storage.local.remove(USAGE_KEY);
      await info('Usage statistics cleared');
    } catch (error) {
      console.error('Clear usage error:', error);
    }
  }

  /**
   * Export logs as JSON
   * @returns {Promise<string>} JSON string of logs
   */
  async function exportLogs() {
    try {
      const logs = await getLogs();
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Export logs error:', error);
      return '[]';
    }
  }

  /**
   * Export usage stats as JSON
   * @returns {Promise<string>} JSON string of usage stats
   */
  async function exportUsageStats() {
    try {
      const stats = await getUsageStats();
      return JSON.stringify(stats, null, 2);
    } catch (error) {
      console.error('Export usage stats error:', error);
      return '{}';
    }
  }

  /**
   * Get summary statistics
   * @returns {Promise<Object>} Summary stats
   */
  async function getSummary() {
    try {
      const [logs, usage] = await Promise.all([
        getLogs(),
        getUsageStats()
      ]);
      
      // Count logs by level
      const logsByLevel = logs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {});
      
      // Get most used features
      const sortedUsage = Object.entries(usage)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);
      
      return {
        totalLogs: logs.length,
        logsByLevel,
        mostUsedFeatures: sortedUsage,
        totalEvents: Object.values(usage).reduce((sum, u) => sum + u.count, 0)
      };
    } catch (error) {
      console.error('Get summary error:', error);
      return {};
    }
  }

  // Public API
  return {
    LogLevel,
    log,
    info,
    warn,
    error,
    debug,
    trackEvent,
    getLogs,
    getUsageStats,
    clearLogs,
    clearUsage,
    exportLogs,
    exportUsageStats,
    getSummary
  };
})();

// Make it available globally or as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Analytics;
}
