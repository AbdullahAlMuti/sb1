// pricing-rule-sync.js — Service worker: syncs per-supplier pricing rules from
// the backend into chrome.storage.local. Uses ETag to avoid re-fetching when
// rules haven't changed.
//
// Exposed as window.SSPricingRuleSync (globalThis in the SW context).
// Bundled into build/background.bundle.js via background/index.js.
//
// Called by:
//   background/alarm-handler.js — PRICING_RULES_SYNC alarm (every 10 min)
//   background/message-router.js — on LOGIN_SUCCESS / SYNC_TOKEN

window.SSPricingRuleSync = (() => {
  'use strict';

  const CACHE_KEY = 'pricingRulesCache';
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — matches Cache-Control: max-age=300

  /**
   * Sync pricing rules from the backend.
   *
   * @param {boolean} [forceRefresh=false]  Skip TTL and always fetch.
   * @returns {Promise<object|null>}         Cached rules or null on total failure.
   */
  async function sync(forceRefresh = false) {
    try {
      const stored = await chrome.storage.local.get(CACHE_KEY);
      const cache = stored[CACHE_KEY] || null;

      if (
        !forceRefresh &&
        cache &&
        typeof cache.fetchedAt === 'number' &&
        (Date.now() - cache.fetchedAt) < CACHE_TTL_MS
      ) {
        return cache;
      }

      // Need a valid token before hitting the endpoint
      const { token, isValid } = await AuthHelper.getAuthToken();
      if (!token || !isValid) return cache;

      const urls = getUrls();
      const apiKeys = getApiKeys();
      if (!urls || !apiKeys) return cache;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'apikey': apiKeys.SUPABASE_ANON || '',
        'Content-Type': 'application/json'
      };

      if (cache && cache.etag) {
        headers['If-None-Match'] = cache.etag;
      }

      let response;
      try {
        response = await fetch(
          `${urls.SUPABASE_FUNCTIONS}/pricing-rules-sync`,
          { method: 'GET', headers }
        );
      } catch (networkErr) {
        console.warn('[SSPricingRuleSync] network error:', networkErr?.message || networkErr);
        return cache;
      }

      if (response.status === 304) {
        // Not Modified — reset TTL without re-parsing
        const refreshed = { ...cache, fetchedAt: Date.now() };
        await chrome.storage.local.set({ [CACHE_KEY]: refreshed });
        return refreshed;
      }

      if (!response.ok) {
        console.warn('[SSPricingRuleSync] server error:', response.status);
        return cache;
      }

      const data = await response.json();
      const etag = response.headers.get('ETag') || '';

      const newCache = { ...data, etag, fetchedAt: Date.now() };
      await chrome.storage.local.set({ [CACHE_KEY]: newCache });
      return newCache;

    } catch (err) {
      console.warn('[SSPricingRuleSync] sync error:', err?.message || err);
      // Fail gracefully: return stale cache rather than null
      try {
        const stored = await chrome.storage.local.get(CACHE_KEY);
        return stored[CACHE_KEY] || null;
      } catch (_) {
        return null;
      }
    }
  }

  /**
   * Read the cached rule for a specific supplier (local only, no network).
   *
   * @param {string} supplierKey  e.g. 'amazon', 'walmart', 'aliexpress'
   * @returns {Promise<object|null>}
   */
  async function getRuleForSupplier(supplierKey) {
    try {
      const stored = await chrome.storage.local.get(CACHE_KEY);
      const cache = stored[CACHE_KEY];
      if (!cache || !Array.isArray(cache.suppliers)) return null;
      return cache.suppliers.find(s => s.supplierKey === supplierKey) || null;
    } catch (_) {
      return null;
    }
  }

  return { sync, getRuleForSupplier };
})();
