(function () {
  'use strict';

  const STORAGE_KEYS = [
    'currentProduct',
    'selectedEbayTitle',
    'ebayTitle',
    'saasToken',
    'userEmail',
    'saasUser',
    'lastSyncTime',
    'ebaySyncEnabled',
    'ebaySyncInterval',
    'ebaySyncDays',
    'ebaySessionRequired'
  ];

  const state = {
    product: null,
    title: null,
    images: [],
    variants: [],
    marketplace: null,
    auth: { isValid: false, email: null, type: null, config: null },
    sync: {
      enabled: true,
      intervalMins: 60,
      days: 90,
      lastSync: null,
      ebaySessionRequired: false
    },
    listeners: []
  };

  function notify() {
    const snap = getState();
    state.listeners.forEach(fn => { try { fn(snap); } catch (e) {} });
  }

  function subscribe(fn) {
    state.listeners.push(fn);
    return function unsubscribe() {
      state.listeners = state.listeners.filter(l => l !== fn);
    };
  }

  function applyProduct(product) {
    state.product = product || null;
    state.marketplace = product ? (product.marketplace || null) : null;
    state.images = product ? (product.images || []) : [];
    state.variants = product ? (product.variants || []) : [];
  }

  function applyAuthFromStorage(data) {
    const hasToken = !!(data.saasToken);
    const email = (data.saasUser && data.saasUser.email) || data.userEmail || null;
    state.auth.isValid = hasToken;
    state.auth.email = email;
  }

  function applySyncFromStorage(data) {
    state.sync.enabled = data.ebaySyncEnabled !== false;
    state.sync.intervalMins = data.ebaySyncInterval
      ? Math.round(data.ebaySyncInterval / 60000)
      : 60;
    state.sync.days = data.ebaySyncDays || 90;
    state.sync.lastSync = data.lastSyncTime || null;
    state.sync.ebaySessionRequired = !!data.ebaySessionRequired;
  }

  function hydrate() {
    return new Promise(resolve => {
      chrome.storage.local.get(STORAGE_KEYS, data => {
        applyProduct(data.currentProduct || null);
        state.title = data.selectedEbayTitle || data.ebayTitle || null;
        applyAuthFromStorage(data);
        applySyncFromStorage(data);
        notify();
        resolve();
      });
    });
  }

  function hydrateAuth() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'GET_EXTENSION_AUTH_STATE' }, response => {
        if (chrome.runtime.lastError || !response) {
          state.auth = { isValid: false, email: null, type: null, config: null };
        } else {
          state.auth.isValid = !!response.isValid;
          state.auth.email = response.user ? response.user.email : null;
          state.auth.type = response.type || null;
          state.auth.config = response.config || null;
        }
        notify();
        resolve(state.auth);
      });
    });
  }

  function getState() {
    return {
      product: state.product,
      title: state.title,
      images: state.images,
      variants: state.variants,
      marketplace: state.marketplace,
      auth: { ...state.auth },
      sync: { ...state.sync }
    };
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let changed = false;

    if ('currentProduct' in changes) {
      applyProduct(changes.currentProduct.newValue || null);
      changed = true;
    }
    if ('selectedEbayTitle' in changes) {
      state.title = changes.selectedEbayTitle.newValue || state.title;
      changed = true;
    }
    if ('ebayTitle' in changes && !state.title) {
      state.title = changes.ebayTitle.newValue || null;
      changed = true;
    }

    const authKeys = ['saasToken', 'saasUser', 'userEmail'];
    if (authKeys.some(k => k in changes)) {
      chrome.storage.local.get(['saasToken', 'saasUser', 'userEmail'], data => {
        applyAuthFromStorage(data);
        notify();
      });
      changed = false; // notify handled async above
    }

    const syncKeys = ['lastSyncTime', 'ebaySyncEnabled', 'ebaySyncInterval', 'ebaySyncDays', 'ebaySessionRequired'];
    if (syncKeys.some(k => k in changes)) {
      chrome.storage.local.get(syncKeys, data => {
        applySyncFromStorage(data);
        notify();
      });
      changed = false;
    }

    if (changed) notify();
  });

  hydrate();
  hydrateAuth();

  window.SSPanelStore = { subscribe, hydrate, hydrateAuth, getState };
})();
