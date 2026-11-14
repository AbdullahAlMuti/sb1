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
   * Refresh the session once, using whichever refresh token is in storage.
   * LOGOUT removes both saasRefreshToken and extensionRefreshToken, so a
   * logged-out user has nothing to refresh with and is never revived
   * (EXT-P1-001). `type` picks the matching path after a 401; without it
   * (expired token, type 'none') new-auth is tried first, then legacy.
   *
   * @returns {Promise<'refreshed'|'failed'|'no_refresh_token'>}
   */
  async function _refreshSession(type) {
    let stored = {};
    try {
      stored = await chrome.storage.local.get(['saasRefreshToken', 'extensionRefreshToken']);
    } catch (_) { /* treat as no refresh token */ }

    const attempts = [];
    if (stored.extensionRefreshToken && type !== 'legacy') attempts.push('new');
    if (stored.saasRefreshToken && type !== 'new') attempts.push('legacy');
    if (attempts.length === 0) return 'no_refresh_token';

    for (const kind of attempts) {
      try {
        const ok = kind === 'new'
          ? await AuthHelper.refreshExtensionToken()
          : await AuthHelper.refreshLegacyToken();
        if (ok) return 'refreshed';
      } catch (err) {
        console.warn('[SSPricingRuleSync] token refresh error:', err?.message || err);
      }
    }
    return 'failed';
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

      // Need a valid token before hitting the endpoint. The legacy Supabase
      // JWT lives ~1h; once it expires try one refresh (like
      // AuthHelper.callEdgeFunction does) instead of silently going stale.
      // At most one refresh per sync() call — never loop.
      let refreshed = false;
      let auth = await AuthHelper.getAuthToken();
      if (!auth.token || !auth.isValid) {
        const outcome = await _refreshSession(null);
        if (outcome === 'no_refresh_token') {
          await _recordStatus({ ok: false, reason: 'not_logged_in' });
          return cache;
        }
        refreshed = true;
        if (outcome === 'refreshed') auth = await AuthHelper.getAuthToken();
        if (outcome !== 'refreshed' || !auth.token || !auth.isValid) {
          await _recordStatus({ ok: false, reason: 'refresh_failed' });
          return cache;
        }
      }

      const urls = getUrls();
      const apiKeys = getApiKeys();
      if (!urls || !apiKeys) {
        await _recordStatus({ ok: false, reason: 'config_missing' });
        return cache;
      }

      const doGet = (token) => {
        const headers = {
          'Authorization': `Bearer ${token}`,
          'apikey': apiKeys.SUPABASE_ANON || '',
          'Content-Type': 'application/json'
        };
        if (cache && cache.etag) {
          headers['If-None-Match'] = cache.etag;
        }
        return fetch(
          `${urls.SUPABASE_FUNCTIONS}/pricing-rules-sync`,
          { method: 'GET', headers }
        );
      };

      let response;
      try {
        response = await doGet(auth.token);

        // Token rejected server-side (revoked or expired early): refresh once
        // and retry the GET once, unless we already refreshed above.
        if (response.status === 401 && !refreshed) {
          const outcome = await _refreshSession(auth.type);
          if (outcome === 'refreshed') {
            auth = await AuthHelper.getAuthToken();
            if (!auth.token || !auth.isValid) {
              await _recordStatus({ ok: false, reason: 'refresh_failed', status: 401 });
              return cache;
            }
            response = await doGet(auth.token);
          } else if (outcome === 'failed') {
            await _recordStatus({ ok: false, reason: 'refresh_failed', status: 401 });
            return cache;
          }
          // 'no_refresh_token' → fall through and record the 401 below.
        }
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
