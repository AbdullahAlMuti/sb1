// pricing-rule-sync.test.js — SSPricingRuleSync.sync() recovers from expired
// auth: it refreshes the session once (legacy or new-auth) and retries the GET
// once, records pricingRulesSyncStatus for every outcome, and never revives a
// logged-out session (no refresh token → no refresh, no network).

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

const FUNCTIONS_URL = 'https://example.test/functions/v1';
const STALE_CACHE = {
  suppliers: [{ supplierKey: 'amazon', markup: 1.1 }],
  etag: '',
  fetchedAt: 0, // well past the TTL, so sync() goes to the network
};

let store;
let fetchCalls;
let fetchQueue;
let authState;
let refreshCalls;
let refreshResults;
let savedGlobals;

function makeChrome() {
  return {
    storage: {
      local: {
        async get(keys) {
          const list = Array.isArray(keys) ? keys : [keys];
          const out = {};
          for (const k of list) if (k in store) out[k] = store[k];
          return out;
        },
        async set(obj) {
          Object.assign(store, obj);
        },
      },
    },
  };
}

function makeAuthHelper() {
  return {
    async getAuthToken() {
      return authState();
    },
    async refreshLegacyToken() {
      refreshCalls.push('legacy');
      const ok = refreshResults.legacy;
      if (ok) store.saasToken = 'fresh-legacy';
      return ok;
    },
    async refreshExtensionToken() {
      refreshCalls.push('new');
      const ok = refreshResults.new;
      if (ok) store.extensionAccessToken = 'fresh-new';
      return ok;
    },
  };
}

function jsonResponse(status, body, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (h) => headers[h] ?? null },
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

function loadSync() {
  const win = makeWindow();
  win.chrome = makeChrome();
  loadInto(win, 'common/pricing-rule-sync.js');
  return win.SSPricingRuleSync;
}

// Legacy auth state driven by store: valid while saasToken is a fresh token.
function legacyAuthFromStore() {
  if (store.saasToken && store.saasToken.startsWith('fresh')) {
    return { token: store.saasToken, user: null, isValid: true, type: 'legacy' };
  }
  if (store.saasToken === 'still-valid-but-revoked') {
    return { token: store.saasToken, user: null, isValid: true, type: 'legacy' };
  }
  return { token: null, user: null, isValid: false, type: 'none' };
}

beforeEach(() => {
  store = { pricingRulesCache: { ...STALE_CACHE } };
  fetchCalls = [];
  fetchQueue = [];
  refreshCalls = [];
  refreshResults = { legacy: true, new: true };
  authState = legacyAuthFromStore;

  savedGlobals = {
    AuthHelper: globalThis.AuthHelper,
    getUrls: globalThis.getUrls,
    getApiKeys: globalThis.getApiKeys,
    fetch: globalThis.fetch,
  };
  globalThis.AuthHelper = makeAuthHelper();
  globalThis.getUrls = () => ({ SUPABASE_FUNCTIONS: FUNCTIONS_URL });
  globalThis.getApiKeys = () => ({ SUPABASE_ANON: 'anon' });
  globalThis.fetch = async (url, opts) => {
    fetchCalls.push({ url, auth: opts?.headers?.Authorization });
    const next = fetchQueue.shift();
    if (!next) throw new Error('unexpected fetch: ' + url);
    return next;
  };
});

afterEach(() => {
  for (const [k, v] of Object.entries(savedGlobals)) {
    if (v === undefined) delete globalThis[k];
    else globalThis[k] = v;
  }
});

const FRESH_RULES = { suppliers: [{ supplierKey: 'amazon', markup: 1.5 }] };

test('expired legacy token + refresh token → refreshes, then syncs', async () => {
  store.saasToken = 'expired-jwt';
  store.saasRefreshToken = 'rt';
  fetchQueue.push(jsonResponse(200, FRESH_RULES, { ETag: 'v2' }));

  const result = await loadSync().sync(true);

  assert.deepEqual(refreshCalls, ['legacy']);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].auth, 'Bearer fresh-legacy');
  assert.equal(result.suppliers[0].markup, 1.5);
  assert.equal(store.pricingRulesCache.etag, 'v2');
  assert.equal(store.pricingRulesSyncStatus.ok, true);
});

test('expired new-auth token + extension refresh token → uses refreshExtensionToken', async () => {
  store.extensionRefreshToken = 'ert';
  authState = () =>
    store.extensionAccessToken
      ? { token: store.extensionAccessToken, user: null, isValid: true, type: 'new' }
      : { token: null, user: null, isValid: false, type: 'none' };
  fetchQueue.push(jsonResponse(200, FRESH_RULES));

  const result = await loadSync().sync(true);

  assert.deepEqual(refreshCalls, ['new']);
  assert.equal(fetchCalls[0].auth, 'Bearer fresh-new');
  assert.equal(result.suppliers[0].markup, 1.5);
  assert.equal(store.pricingRulesSyncStatus.ok, true);
});

test('HTTP 401 → refreshes once and retries the GET once', async () => {
  store.saasToken = 'still-valid-but-revoked';
  store.saasRefreshToken = 'rt';
  fetchQueue.push(jsonResponse(401, { error: 'Invalid JWT' }));
  fetchQueue.push(jsonResponse(200, FRESH_RULES, { ETag: 'v3' }));

  const result = await loadSync().sync(true);

  assert.deepEqual(refreshCalls, ['legacy']);
  assert.equal(fetchCalls.length, 2);
  assert.equal(fetchCalls[0].auth, 'Bearer still-valid-but-revoked');
  assert.equal(fetchCalls[1].auth, 'Bearer fresh-legacy');
  assert.equal(result.suppliers[0].markup, 1.5);
  assert.equal(store.pricingRulesSyncStatus.ok, true);
});

test('HTTP 401 twice → no loop: one refresh, one retry, status records 401', async () => {
  store.saasToken = 'still-valid-but-revoked';
  store.saasRefreshToken = 'rt';
  fetchQueue.push(jsonResponse(401, { error: 'Invalid JWT' }));
  fetchQueue.push(jsonResponse(401, { error: 'Invalid JWT' }));

  const result = await loadSync().sync(true);

  assert.deepEqual(refreshCalls, ['legacy']);
  assert.equal(fetchCalls.length, 2);
  assert.deepEqual(result.suppliers, STALE_CACHE.suppliers);
  assert.equal(store.pricingRulesSyncStatus.ok, false);
  assert.equal(store.pricingRulesSyncStatus.reason, 'http');
  assert.equal(store.pricingRulesSyncStatus.status, 401);
});

test('refresh fails → status refresh_failed, stale cache returned, no GET', async () => {
  store.saasToken = 'expired-jwt';
  store.saasRefreshToken = 'rt';
  refreshResults.legacy = false;

  const result = await loadSync().sync(true);

  assert.deepEqual(refreshCalls, ['legacy']);
  assert.equal(fetchCalls.length, 0);
  assert.deepEqual(result, STALE_CACHE);
  assert.equal(store.pricingRulesSyncStatus.ok, false);
  assert.equal(store.pricingRulesSyncStatus.reason, 'refresh_failed');
});

test('401 then refresh fails → status refresh_failed, stale cache returned', async () => {
  store.saasToken = 'still-valid-but-revoked';
  store.saasRefreshToken = 'rt';
  refreshResults.legacy = false;
  fetchQueue.push(jsonResponse(401, { error: 'Invalid JWT' }));

  const result = await loadSync().sync(true);

  assert.deepEqual(refreshCalls, ['legacy']);
  assert.equal(fetchCalls.length, 1);
  assert.deepEqual(result, STALE_CACHE);
  assert.equal(store.pricingRulesSyncStatus.reason, 'refresh_failed');
  assert.equal(store.pricingRulesSyncStatus.status, 401);
});

test('no refresh token (logged out) → not_logged_in, no refresh, no network', async () => {
  store.saasToken = 'expired-jwt'; // LOGOUT clears refresh tokens; access token may linger

  const result = await loadSync().sync(true);

  assert.deepEqual(refreshCalls, []);
  assert.equal(fetchCalls.length, 0);
  assert.deepEqual(result, STALE_CACHE);
  assert.equal(store.pricingRulesSyncStatus.ok, false);
  assert.equal(store.pricingRulesSyncStatus.reason, 'not_logged_in');
});

test('401 with no refresh token → no refresh, no retry, status records 401', async () => {
  store.saasToken = 'still-valid-but-revoked';
  fetchQueue.push(jsonResponse(401, { error: 'Invalid JWT' }));

  await loadSync().sync(true);

  assert.deepEqual(refreshCalls, []);
  assert.equal(fetchCalls.length, 1);
  assert.equal(store.pricingRulesSyncStatus.reason, 'http');
  assert.equal(store.pricingRulesSyncStatus.status, 401);
});
