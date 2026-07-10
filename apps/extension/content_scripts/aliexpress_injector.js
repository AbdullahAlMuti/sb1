// aliexpress_injector.js - SellerSuit AliExpress content-script bridge.

(function () {
  'use strict';

  let uiInjected = false;

  function getAdapter() {
    return window.SSSupplierRegistry && window.SSSupplierRegistry.match(location.href);
  }

  function cleanFloat(value) {
    if (value == null) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // Prices the product with the user's DASHBOARD Supplier Pricing rule for
  // AliExpress via SSPricingApply/SSPricingCore — same engine as the backend.
  async function applyPricing(product) {
    if (!product || !window.SSPricingApply) return product;
    await window.SSPricingApply.applyToProduct(product, 'aliexpress');
    return product;
  }

  async function saveProduct(product, mode) {
    if (typeof window.SSListingDraft !== 'undefined') {
      const draft = window.SSListingDraft.productToDraft(product, mode);
      await window.SSListingDraft.saveDraft(draft);
      return;
    }
    await chrome.storage.local.set({ currentProduct: product, lastScraped: Date.now() });
  }

  async function scan(mode, options) {
    const adapter = getAdapter();
    if (!adapter) throw new Error('No AliExpress supplier adapter for this page');
    const raw = mode === 'single' ? await adapter.scrapeProduct(options) : await adapter.scrapeVariants(options);
    const product = adapter.normalize(raw);
    await applyPricing(product);
    await saveProduct(product, mode);
    return product;
  }

  async function injectUI({ fromSidebar = false, sidebarImages = [] } = {}) {
    if (uiInjected || document.getElementById('snipe-root-wrapper')) return;
    const panelUrl = chrome.runtime.getURL('ui/panel.html') + '?t=' + Date.now();
    const response = await fetch(panelUrl);
    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const panelContent = parsed.getElementById('snipe-root-wrapper');
    if (!panelContent) throw new Error('Could not find SellerSuit panel markup');
    const clonedPanel = panelContent.cloneNode(true);
    clonedPanel.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('../')) img.src = chrome.runtime.getURL(src.replace(/^\.\.\//, ''));
    });
    if (!document.getElementById('sellersuit-panel-css')) {
      try {
        const cssUrl = chrome.runtime.getURL('ui/panel.css');
        const cssResponse = await fetch(cssUrl);
        const cssText = await cssResponse.text();
        const style = document.createElement('style');
        style.id = 'sellersuit-panel-css';
        style.textContent = cssText;
        document.head.appendChild(style);
      } catch (err) {
        console.error('[SellerSuit] Failed to inject inline CSS:', err);
        const cssLink = document.createElement('link');
        cssLink.id = 'sellersuit-panel-css';
        cssLink.rel = 'stylesheet';
        cssLink.href = chrome.runtime.getURL('ui/panel.css');
        document.head.appendChild(cssLink);
      }
    }
    document.body.prepend(clonedPanel);
    uiInjected = true;
    if (typeof addEventListenersToPanel === 'function') addEventListenersToPanel();
    if (typeof addCalculatorEventListeners === 'function') addCalculatorEventListeners();
    if (fromSidebar && typeof renderGalleryFromUrls === 'function') renderGalleryFromUrls(sidebarImages);
    if (fromSidebar && typeof showSidebarExtended === 'function') await showSidebarExtended();
  }

  function isProductPage() {
    return !!getAdapter() || /\/item\/\d+(?:\.html)?/i.test(location.pathname);
  }

  function openSidePanel(autoScan = false) {
    try {
      chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL' }, (response) => {
        const err = chrome.runtime.lastError;
        if (err || response?.ok === false) {
          console.warn('[AliExpress Injector] Could not open side panel:', err?.message || response?.error);
        }
        if (autoScan) chrome.runtime.sendMessage({ action: 'DOM_READY_AUTO_SCAN' });
      });
    } catch (err) {
      console.warn('[AliExpress Injector] Could not open side panel:', err);
    }
  }

  function createListButton() {
    if (!isProductPage()) return;
    if (document.querySelector('.sb1c-wrapper[data-sb1-detail-card-instance="1"]')) return;
    if (document.getElementById('initial-list-button-container')) return;
    if (!document.body) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'initial-list-button-container';
    wrapper.className = 'sellersuit-btn-wrapper';
    wrapper.style.cssText =
      'position:fixed;right:18px;bottom:18px;z-index:2147483646;display:block;margin:0;padding:0;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,0.22);';

    const btn = document.createElement('button');
    btn.id = 'initial-list-button';
    btn.className = 'sellersuit-btn-marker';
    btn.type = 'button';
    btn.innerHTML = `
      <span aria-hidden="true" style="display:inline-flex;align-items:baseline;margin-right:10px;font-weight:900;font-size:16px;line-height:1;letter-spacing:0;">
        <span style="color:#E53238;">e</span><span style="color:#0064D2;">b</span><span style="color:#F5AF02;">a</span><span style="color:#86B817;">y</span>
      </span>
      <span style="font-weight:600;">List it</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:8px;opacity:0.75;vertical-align:-3px;">
        <path d="M5 12h14M12 5l7 7-7 7"></path>
      </svg>
    `;
    btn.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:8px;background:#0654ba;color:#fff;text-decoration:none;cursor:pointer;border:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-weight:600;font-size:14px;line-height:1;transition:opacity 0.2s,transform 0.2s;';

    btn.addEventListener('mouseenter', () => {
      btn.style.opacity = '0.92';
      btn.style.transform = 'translateY(-1px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.opacity = '1';
      btn.style.transform = 'translateY(0)';
    });
    btn.addEventListener('click', () => {
      openSidePanel(false);
      wrapper.style.display = 'none';
    });

    wrapper.appendChild(btn);
    document.body.appendChild(wrapper);
  }

  function waitForProductPageReady(callback) {
    if (isProductPage()) {
      callback();
      return;
    }
    const observer = new MutationObserver((_, obs) => {
      if (isProductPage()) {
        obs.disconnect();
        callback();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      if (isProductPage()) callback();
    }, 10000);
  }

  function initializeApp() {
    if (!/aliexpress\./i.test(location.hostname)) return;
    if (
      location.hash.includes('sellersuit_auto_list') ||
      location.search.includes('sellersuit_auto_list')
    ) {
      waitForProductPageReady(() => openSidePanel(true));
      const newSearch = location.search.replace(/[?&]sellersuit_auto_list=true/, '').replace(/^&/, '?');
      const newHash = location.hash.replace(/#?sellersuit_auto_list=true/, '');
      history.replaceState(null, '', location.pathname + newSearch + newHash);
    }
    createListButton();
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PEEK_PRODUCT') {
      try {
        const raw = window.SSAliExpressScraper.extractProductDocument(document, location.href);
        sendResponse({
          success: true,
          data: {
            title: raw.title || '',
            mainImg: raw.mainImage || '',
            variantCount: raw.variants ? raw.variants.length : 0,
            selectedLabel: '',
            currentAsin: raw.sourceId || '',
          },
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    if (request.action === 'SCRAPE_SINGLE' || request.action === 'SCRAPE_VARIANTS') {
      (async () => {
        try {
          const mode = request.action === 'SCRAPE_SINGLE' ? 'single' : 'all';
          const product = await scan(mode, request.options || {});
          sendResponse({ success: true, data: product });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    if (request.action === 'PREPARE_EBAY_LISTING') {
      (async () => {
        try {
          let fullData;
          if (request.options && request.options.skipScrape) {
            const stored = await chrome.storage.local.get('currentProduct');
            fullData = stored.currentProduct;
          }
          if (!fullData) fullData = await scan('all', request.options || {});
          sendResponse({
            success: true,
            fullData,
            productDetails: {
              description: fullData.description || '',
              rawSpecs: fullData.specs || fullData.specifications || {},
              brand: fullData.specs?.Brand || '',
            },
          });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    if (request.action === 'EXTEND_PANEL') {
      (async () => {
        try {
          const stored = await chrome.storage.local.get('currentProduct');
          const sidebarImages = Array.isArray(stored.currentProduct?.images) ? stored.currentProduct.images : [];
          await injectUI({ fromSidebar: true, sidebarImages });
          chrome.runtime.sendMessage({ action: 'CLOSE_SIDE_PANEL' });
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    return false;
  });

  function notifyReady() {
    try {
      chrome.runtime.sendMessage({ action: 'DOM_READY_AUTO_SCAN' }, () => {});
    } catch (_) {}
  }

  window.forceLoadAliExpressExtension = function () {
    const existing = document.getElementById('initial-list-button-container');
    if (existing) existing.remove();
    createListButton();
    openSidePanel(false);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeApp();
      notifyReady();
    });
  } else {
    initializeApp();
    notifyReady();
  }

  const observer = new MutationObserver(() => createListButton());
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => observer.observe(document.body, { childList: true, subtree: true }));
})();
