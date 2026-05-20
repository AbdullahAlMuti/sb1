// ═══════════════════════════════════════════════════════════
// 🛠️ PERFORMANCE UTILITIES MODULE
// Caching, debouncing, throttling, and async helpers
// ═══════════════════════════════════════════════════════════

const PerformanceUtils = (() => {
  // ═══════════════════════════════════════════════════════════
  // 📦 IN-MEMORY CACHE
  // ═══════════════════════════════════════════════════════════
  
  const memoryCache = new Map();
  const cacheTimestamps = new Map();
  const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get item from cache with TTL check
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in ms (default: 5 min)
   * @returns {any|null} Cached value or null if expired/missing
   */
  function getCached(key, ttl = DEFAULT_TTL) {
    if (!memoryCache.has(key)) return null;
    
    const timestamp = cacheTimestamps.get(key) || 0;
    if (Date.now() - timestamp > ttl) {
      memoryCache.delete(key);
      cacheTimestamps.delete(key);
      return null;
    }
    
    return memoryCache.get(key);
  }

  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  function setCache(key, value) {
    memoryCache.set(key, value);
    cacheTimestamps.set(key, Date.now());
  }

  /**
   * Clear specific cache entry or all cache
   * @param {string} [key] - Optional key to clear (clears all if omitted)
   */
  function clearCache(key = null) {
    if (key) {
      memoryCache.delete(key);
      cacheTimestamps.delete(key);
    } else {
      memoryCache.clear();
      cacheTimestamps.clear();
    }
  }

  /**
   * Cache wrapper for async functions
   * @param {string} key - Cache key
   * @param {Function} fn - Async function to execute if not cached
   * @param {number} ttl - Time to live
   * @returns {Promise<any>}
   */
  async function withCache(key, fn, ttl = DEFAULT_TTL) {
    const cached = getCached(key, ttl);
    if (cached !== null) {
      return cached;
    }
    
    const result = await fn();
    setCache(key, result);
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // ⏱️ DEBOUNCE & THROTTLE
  // ═══════════════════════════════════════════════════════════
  
  const debounceTimers = new Map();
  const throttleTimestamps = new Map();

  /**
   * Debounce function calls
   * @param {string} key - Unique identifier for this debounce
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in ms
   */
  function debounce(key, fn, delay = 300) {
    if (debounceTimers.has(key)) {
      clearTimeout(debounceTimers.get(key));
    }
    
    debounceTimers.set(key, setTimeout(() => {
      debounceTimers.delete(key);
      fn();
    }, delay));
  }

  /**
   * Throttle function calls
   * @param {string} key - Unique identifier for this throttle
   * @param {Function} fn - Function to throttle
   * @param {number} limit - Minimum time between calls
   * @returns {boolean} True if function was executed
   */
  function throttle(key, fn, limit = 1000) {
    const lastCall = throttleTimestamps.get(key) || 0;
    const now = Date.now();
    
    if (now - lastCall >= limit) {
      throttleTimestamps.set(key, now);
      fn();
      return true;
    }
    return false;
  }

  /**
   * Create a debounced function
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in ms
   * @returns {Function}
   */
  function createDebouncedFn(fn, delay = 300) {
    let timer = null;
    return function(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn.apply(this, args);
      }, delay);
    };
  }

  /**
   * Create a throttled function
   * @param {Function} fn - Function to throttle
   * @param {number} limit - Minimum time between calls
   * @returns {Function}
   */
  function createThrottledFn(fn, limit = 1000) {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        return fn.apply(this, args);
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 🔄 ASYNC UTILITIES
  // ═══════════════════════════════════════════════════════════

  /**
   * Fetch with timeout, retry, and exponential backoff
   * @param {string} url - URL to fetch
   * @param {RequestInit} options - Fetch options
   * @param {Object} config - Retry configuration
   * @returns {Promise<Response>}
   */
  async function fetchWithRetry(url, options = {}, config = {}) {
    const { 
      maxRetries = 3, 
      baseDelay = 1000, 
      timeout = 30000,
      retryOn5xx = true
    } = config;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Success or client error (don't retry)
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        
        // Server error - retry if enabled
        if (!retryOn5xx) {
          return response;
        }
        
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        
      } catch (err) {
        lastError = err;
        
        if (err.name === 'AbortError') {
          console.warn(`[PerformanceUtils] Request timeout (attempt ${attempt + 1}/${maxRetries + 1})`);
        }
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Sleep for a given duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for a condition to be true
   * @param {Function} condition - Function that returns boolean
   * @param {Object} options - Options
   * @returns {Promise<void>}
   */
  async function waitFor(condition, options = {}) {
    const { timeout = 10000, interval = 100 } = options;
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (condition()) return;
      await sleep(interval);
    }
    
    throw new Error('Condition not met within timeout');
  }

  /**
   * Run multiple promises with concurrency limit
   * @param {Array<Function>} tasks - Array of functions returning promises
   * @param {number} concurrency - Max concurrent tasks
   * @returns {Promise<Array>}
   */
  async function parallelLimit(tasks, concurrency = 3) {
    const results = [];
    const running = [];
    
    for (const task of tasks) {
      const promise = task().then(result => {
        running.splice(running.indexOf(promise), 1);
        return result;
      });
      
      running.push(promise);
      results.push(promise);
      
      if (running.length >= concurrency) {
        await Promise.race(running);
      }
    }
    
    return Promise.all(results);
  }

  /**
   * Retry a function with exponential backoff
   * @param {Function} fn - Async function to retry
   * @param {Object} options - Retry options
   * @returns {Promise<any>}
   */
  async function retry(fn, options = {}) {
    const { maxRetries = 3, baseDelay = 1000, shouldRetry = () => true } = options;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(attempt);
      } catch (err) {
        lastError = err;
        
        if (!shouldRetry(err, attempt) || attempt >= maxRetries) {
          throw err;
        }
        
        await sleep(baseDelay * Math.pow(2, attempt));
      }
    }
    
    throw lastError;
  }

  // ═══════════════════════════════════════════════════════════
  // 🖼️ DOM UTILITIES
  // ═══════════════════════════════════════════════════════════

  /**
   * Wait for an element to appear in the DOM
   * @param {string} selector - CSS selector
   * @param {Object} options - Options
   * @returns {Promise<Element>}
   */
  function waitForElement(selector, options = {}) {
    const { timeout = 5000, parent = document.body } = options;
    
    return new Promise((resolve, reject) => {
      // Check if already exists
      const existing = document.querySelector(selector);
      if (existing) {
        return resolve(existing);
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(parent, { childList: true, subtree: true });
      
      // Timeout
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Batch DOM reads to avoid layout thrashing
   * @param {Function} fn - Function with DOM reads
   * @returns {Promise<any>}
   */
  function batchRead(fn) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        resolve(fn());
      });
    });
  }

  /**
   * Batch DOM writes to avoid layout thrashing
   * @param {Function} fn - Function with DOM writes
   * @returns {Promise<void>}
   */
  function batchWrite(fn) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        fn();
        resolve();
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 PERFORMANCE MONITORING
  // ═══════════════════════════════════════════════════════════

  const performanceMarks = new Map();

  /**
   * Start performance measurement
   * @param {string} label - Measurement label
   */
  function perfStart(label) {
    performanceMarks.set(label, performance.now());
  }

  /**
   * End performance measurement and log
   * @param {string} label - Measurement label
   * @returns {number} Duration in ms
   */
  function perfEnd(label) {
    const start = performanceMarks.get(label);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    performanceMarks.delete(label);
    
    console.log(`⏱️ [PERF] ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Measure async function execution time
   * @param {string} label - Measurement label
   * @param {Function} fn - Async function to measure
   * @returns {Promise<any>}
   */
  async function measure(label, fn) {
    perfStart(label);
    try {
      return await fn();
    } finally {
      perfEnd(label);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 📤 PUBLIC API
  // ═══════════════════════════════════════════════════════════
  return Object.freeze({
    // Cache
    getCached,
    setCache,
    clearCache,
    withCache,
    
    // Debounce/Throttle
    debounce,
    throttle,
    createDebouncedFn,
    createThrottledFn,
    
    // Async
    fetchWithRetry,
    sleep,
    waitFor,
    parallelLimit,
    retry,
    
    // DOM
    waitForElement,
    batchRead,
    batchWrite,
    
    // Performance
    perfStart,
    perfEnd,
    measure
  });
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceUtils;
}
if (typeof self !== 'undefined') {
  self.PerformanceUtils = PerformanceUtils;
}
if (typeof window !== 'undefined') {
  window.PerformanceUtils = PerformanceUtils;
}
