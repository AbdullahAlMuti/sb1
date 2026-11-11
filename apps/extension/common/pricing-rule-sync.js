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
  const STATUS_KEY = 'pricingRulesSyncStatus';

  // Every sync attempt records its outcome. Without this a failed sync was
  // invisible: products silently stayed unpriced ("no_rule_synced") and
  // nothing told the seller whether it was auth, network, or missing rules.
  async function _recordStatus(status) {
    try {
      await chrome.storage.local.set({ [STATUS_KEY]: { ...status, at: Date.now() } });
    } catch (_) { /* diagnostics only */ }
  }

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
      if (!token || !isValid) {
        await _recordStatus({ ok: false, reason: 'not_logged_in' });
        return cache;
      }

      const urls = getUrls();
      const apiKeys = getApiKeys();
      if (!urls || !apiKeys) {
        await _recordStatus({ ok: false, reason: 'config_missing' });
        return cache;
      }

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
        await _recordStatus({ ok: false, reason: 'network', message: String(networkErr?.message || networkErr).slice(0, 200) });
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
        let serverMessage = '';
        try {
          const text = await response.text();
          try { const j = JSON.parse(text); serverMessage = j.error || j.message || text; } catch (_) { serverMessage = text; }
        } catch (_) { /* body unreadable */ }
        await _recordStatus({ ok: false, reason: 'http', status: response.status, message: String(serverMessage || '').slice(0, 200) });
        return cache;
      }

      const data = await response.json();
      const etag = response.headers.get('ETag') || '';

      const newCache = { ...data, etag, fetchedAt: Date.now() };
      await chrome.storage.local.set({ [CACHE_KEY]: newCache });
      await _recordStatus({
        ok: true,
        supplierKeys: Array.isArray(data && data.suppliers) ? data.suppliers.map(s => s.supplierKey) : []
      });
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
