/**
 * SellerSuit Message Router
 * Centralizes all chrome.runtime.onMessage listeners and routes commands.
 */

const LOGOUT_STORAGE_KEYS = [
  "saasToken",
  "saasUser",
  "userId",
  "userEmail",
  "userPlan",
  "userCredits",
  "authTimestamp",
  "ebay_orders_cache_v1",
  "fulfillmentTask",
  "copyButtonData"
];

function createLogger(prefix) {
  const icons = { debug: '🔍', info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' };

  return (level, message, data = null) => {
    if (typeof ExtensionConfig !== 'undefined' && !ExtensionConfig.FEATURES.DEBUG_MODE && level === 'debug') return;

    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const icon = icons[level] || '📝';
    const logStr = `[${timestamp}] ${icon} [${prefix}] ${message}`;

    data ? console.log(logStr, data) : console.log(logStr);

    if (prefix === 'Sync') {
      try {
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'SYNC_LOG',
              level: level,
              message: logStr,
              data: data
            }).catch(() => { });
          }
        });
      } catch (e) {}
    }
  };
}

const authLog = createLogger('Auth');
const syncLog = createLogger('Sync');

// getUrls and getApiKeys are declared globally in background/index.js

// Register the single message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const urls = getUrls();
  const apiKeys = getApiKeys();

  if (request.action === 'GET_EXTENSION_AUTH_STATE') {
    AuthHelper.getRemoteConfig().then(config => {
      AuthHelper.getAuthToken().then(({ token, type, isValid, user }) => {
        sendResponse({ config, token, type, isValid, user });
      });
    });
    return true;
  }

  if (request.action === 'LOGOUT_EXTENSION_SESSION') {
    (async () => {
      await AuthHelper.clearNewAuthSession();
      chrome.storage.local.remove(LOGOUT_STORAGE_KEYS, () => {
        sendResponse({ success: true });
      });
    })();
    return true;
  }

  if (request.action === 'START_PAIRING') {
    (async () => {
      try {
        const installId = (await chrome.storage.local.get('extensionInstallId')).extensionInstallId || crypto.randomUUID();
        await chrome.storage.local.set({ extensionInstallId: installId });

        const response = await fetch(`${urls.SUPABASE_FUNCTIONS}/extension-pairing-start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKeys.SUPABASE_ANON ? { apikey: apiKeys.SUPABASE_ANON } : {})
          },
          body: JSON.stringify({
            installId,
            version: chrome.runtime.getManifest().version
          })
        });

        if (!response.ok) throw new Error('Failed to start pairing');
        const data = await response.json();

        await chrome.storage.local.set({
          tempConnectToken: data.connectToken,
          tempClientSecret: data.clientSecret,
          tempPairingExpires: data.expiresAt
        });

        sendResponse({ success: true, pairingCode: data.pairingCode, expiresAt: data.expiresAt });
      } catch (err) {
        authLog('error', 'Pairing start error', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'POLL_PAIRING_STATUS') {
    (async () => {
      try {
        const temp = await chrome.storage.local.get(['tempConnectToken', 'tempClientSecret']);
        if (!temp.tempConnectToken) throw new Error('No pairing session');

        const response = await fetch(`${urls.SUPABASE_FUNCTIONS}/extension-pairing-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKeys.SUPABASE_ANON ? { apikey: apiKeys.SUPABASE_ANON } : {})
          },
          body: JSON.stringify({
            connectToken: temp.tempConnectToken,
            clientSecret: temp.tempClientSecret
          })
        });

        const data = await response.json();
        sendResponse({ success: true, status: data.status });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'REDEEM_PAIRING') {
    (async () => {
      try {
        const temp = await chrome.storage.local.get(['tempConnectToken', 'tempClientSecret']);
        if (!temp.tempConnectToken) throw new Error('No pairing session');

        const response = await fetch(`${urls.SUPABASE_FUNCTIONS}/extension-token-redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKeys.SUPABASE_ANON ? { apikey: apiKeys.SUPABASE_ANON } : {})
          },
          body: JSON.stringify({
            connectToken: temp.tempConnectToken,
            clientSecret: temp.tempClientSecret
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to redeem pairing code');
        }

        const data = await response.json();

        if (data.session) {
          await AuthHelper.setNewAuthSession(data.session);
          await chrome.storage.local.remove(['tempConnectToken', 'tempClientSecret', 'tempPairingExpires']);

          const bootstrapRes = await AuthHelper.callEdgeFunction('extension-bootstrap');
          if (bootstrapRes.data) {
            await chrome.storage.local.set({ extensionBootstrapCache: bootstrapRes.data });
          }

          AuthHelper.verifyAuthStatus(true);
          sendResponse({ success: true });
        } else {
          throw new Error('No session returned');
        }
      } catch (err) {
        authLog('error', 'Redeem error', err);
        await chrome.storage.local.remove(['tempConnectToken', 'tempClientSecret', 'tempPairingExpires']);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'LOGIN_SUCCESS') {
    AuthHelper.verifyAuthStatus().then(success => {
      if (success) {
        if (typeof SyncUtils !== 'undefined') {
          setTimeout(() => SyncUtils.triggerEbayOrderSync('login'), 5000);
        }
        if (typeof startEbayOrderSyncInterval === 'function') {
          startEbayOrderSyncInterval();
        }
      }
      sendResponse({ success });
    });
    return true;
  }

  if (request.action === 'OPEN_SIDE_PANEL') {
    (async () => {
      try {
        const tabId = request.tabId || sender?.tab?.id;
        if (tabId) {
          await chrome.sidePanel.open({ tabId });
        } else {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) await chrome.sidePanel.open({ tabId: tab.id });
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (request.action === 'OPEN_BACKGROUND_TAB') {
    chrome.tabs.create({ url: request.url, active: false });
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'sync_ebay_orders' || request.action === 'trigger_ebay_sync') {
    (async () => {
      try {
        const isAuth = await AuthHelper.verifyAuthStatus();
        if (!isAuth) {
          sendResponse({ ok: false, error: 'Not logged in to SellerSuit.' });
          return;
        }
        const data = await chrome.storage.local.get(['saasToken']);
        const token = data.saasToken;

        if (request.payload) {
          syncLog('info', 'Syncing custom payload from scraper', { orderCount: request.payload.orders?.length });
          const syncRes = await fetch(`${urls.SUPABASE_FUNCTIONS}/sync-ebay-orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKeys.SUPABASE_ANON,
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(request.payload),
          });

          if (!syncRes.ok) {
            const errorText = await syncRes.text();
            syncLog('error', 'Scraper sync failed', errorText);
            sendResponse({ ok: false, error: 'Sync failed: ' + errorText });
          } else {
            const result = await syncRes.json();
            syncLog('success', 'Scraper sync successful', result);
            sendResponse({ ok: true, result });
          }
        } else {
          if (typeof SyncUtils !== 'undefined') {
            await SyncUtils.triggerEbayOrderSync('manual');
          }
          sendResponse({ ok: true });
        }
      } catch (err) {
        syncLog('error', 'Manual sync request failed', { error: err.message });
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'get_ebay_orders') {
    (async () => {
      if (typeof SyncUtils !== 'undefined') {
        const cache = await SyncUtils.getEbayOrdersCache();
        sendResponse({ ok: true, cache });
      } else {
        sendResponse({ ok: true, cache: null });
      }
    })();
    return true;
  }

  if (request.action === 'SYNC_TOKEN') {
    if (request.token) {
      (async () => {
        try {
          const saveData = { saasToken: request.token, authTimestamp: Date.now() };
          if (request.user) {
            saveData.saasUser = request.user;
            saveData.userId = request.user.id;
            saveData.userEmail = request.user.email;
          }
          await chrome.storage.local.set(saveData);
          const verified = await AuthHelper.verifyAuthStatus(true);
          if (verified) {
            if (typeof SyncUtils !== 'undefined') {
              setTimeout(() => SyncUtils.triggerEbayOrderSync('token_sync'), 5000);
            }
            if (typeof startEbayOrderSyncInterval === 'function') {
              startEbayOrderSyncInterval();
            }
          }
          sendResponse({ success: true, verified });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }
  }

  if (request.action === 'LOGOUT') {
    (async () => {
      try {
        if (typeof stopEbayOrderSyncInterval === 'function') {
          stopEbayOrderSyncInterval();
        }
        await chrome.storage.local.remove(LOGOUT_STORAGE_KEYS);
        AuthHelper.setUnlocked(false);
        AuthHelper.setLastCheck(0);
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'CHECK_AUTH') {
    (async () => {
      const isAuth = await AuthHelper.verifyAuthStatus();
      if (isAuth) {
        const data = await chrome.storage.local.get(['userEmail', 'userId']);
        sendResponse({ success: true, user: { email: data.userEmail, id: data.userId } });
      } else {
        sendResponse({ success: false });
      }
    })();
    return true;
  }

  const isUnlocked = AuthHelper.isUnlocked();
  if (!isUnlocked) {
    AuthHelper.verifyAuthStatus().then(unlocked => {
      if (!unlocked && request.action !== 'AI_REMOVE_BG' && request.action !== 'GENERATE_TITLE' && request.action !== 'GENERATE_DESCRIPTION') {
        chrome.tabs.create({ url: urls.WEB_APP_DASHBOARD });
      }
      sendResponse({ success: false, error: "Please Log In to use the extension." });
    });
    return true;
  }

  if (request.action === "AI_REMOVE_BG") {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['replicateApiKey']);
        const apiKey = result.replicateApiKey;
        if (!apiKey) {
          sendResponse({ success: false, error: 'Replicate API Key is missing.' });
          return;
        }
        const imgResponse = await fetch(request.imageUrl);
        const blob = await imgResponse.blob();
        if (typeof FileReader !== 'undefined') {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async function () {
            const base64data = reader.result;
            try {
              const response = await fetch(urls.AI_REMOVE_BG, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image_base64: base64data, replicate_api_token: apiKey }),
              });
              const data = await response.json();
              if (data.output) {
                chrome.runtime.sendMessage({ action: "BG_REMOVED_SUCCESS", originalUrl: request.imageUrl, newUrl: data.output });
              }
            } catch (e) { }
          };
        }
      } catch (e) { }
    })();
    return true;
  } else if (request.action === "import_ebay") {
    // SuperDS-equivalent: open eBay listing tab, store product keyed by tabId
    (async () => {
      try {
        const product  = request.product || {};
        const isDraft  = request.uploadType === 'draft';
        const uploadSessionId = crypto.randomUUID();
        const ebayUrl  = `https://www.ebay.com/sl/prelist/suggest?sr=shListingsTopNav&uploadSessionId=${uploadSessionId}`;

        // Store product under uploadSessionId first to prevent race condition
        await chrome.storage.local.set({
          [uploadSessionId]: { product, isImported: false, uploadType: request.uploadType || 'classic' },
          ebayListingTitle: product.title || '',
          ebayListingTabId: ''
        });

        const tab = await chrome.tabs.create({ active: true, url: ebayUrl });
        const tabId = tab.id;

        // Also set legacy tabId keys for backward compatibility
        await chrome.storage.local.set({
          [String(tabId)]: { product, isImported: false, uploadType: request.uploadType || 'classic' },
          ebayListingTabId: String(tabId)
        });

        // Fire-and-forget DB sync when product has sku (e.g. from "List on eBay" button)
        if (product.ebaySku || product.asin) {
          (async () => {
            try {
              if (typeof postCreateListing === 'function') {
                let syncPayload = null;
                const hasVariants = product.hasVariants && Array.isArray(product.variants) && product.variants.length > 1;

                if (hasVariants && window.EbayListingApiHelper) {
                  try {
                    const adapted = window.EbayListingApiHelper.adaptProduct(product);
                    if (adapted && Array.isArray(adapted.prod_variations)) {
                      const mainImage = adapted.prod_images?.[0] || null;
                      const firstVar = adapted.prod_variations[0] || {};
                      syncPayload = {
                        title:               adapted.prod_title,
                        sku:                 firstVar.sku || adapted.prod_id || '',
                        ebay_price:          firstVar.price || null,
                        raw_supplier_price:  firstVar.raw_supplier_price || parseFloat(product.price) || null,
                        amazon_price:        parseFloat(product.price) || null,
                        amazon_url:          product.url || null,
                        amazon_asin:         product.asin || product.parentAsin || null,
                        status:              'active',
                        has_variations:      true,
                        variation_count:     adapted.prod_variations.length,
                        // Phase 7: source flags
                        title_source:        product.title_source       || null,
                        description_source:  product.description_source || null,
                        price_source:        product.price_source       || null,
                        sku_source:          product.sku_source         || null,
                        variations: adapted.prod_variations.map(v => ({
                          sku:               v.sku || '',
                          ebay_sku_encoded:  (window.SSSkuEngine ? window.SSSkuEngine.encodeForEbay(v.sku || '') : ''),
                          final_price:       v.price || 0,
                          raw_supplier_price: v.raw_supplier_price || 0,
                          currency:          product.currency || 'USD',
                          stock_quantity:    1,
                          variant_asin:      v.variant_asin || v.supplierVariantId || null,
                          parent_asin:       product.parentAsin || product.asin || null,
                          attributes:        v.attrs || {},
                          image_url:         [v.img, ...(adapted.prod_images || [])].find(u => u && u.startsWith('http')) || null,
                        })),
                        ...(mainImage ? {
                          amazon_data: { mainImage, imageUrl: mainImage, allImages: adapted.prod_images, source: 'extension' }
                        } : {})
                      };
                    }
                  } catch (err) {
                    console.warn('[import_ebay] failed to adapt variations for sync:', err?.message || err);
                  }
                }

                if (!syncPayload) {
                  syncPayload = {
                    title: product.title,
                    sku: product.ebaySku || product.asin,
                    ebay_price: product.price,
                    amazon_price: product.amazonPrice || '',
                    amazon_url: product.url,
                    amazon_asin: product.asin,
                    status: 'active',
                    amazon_data: { image: '' },
                    has_variations: false,
                    // Phase 7: source flags
                    title_source:        product.title_source       || null,
                    description_source:  product.description_source || null,
                    price_source:        product.price_source       || null,
                    sku_source:          product.sku_source         || null,
                  };
                }

                await postCreateListing(syncPayload, 'import_ebay');
              }
            } catch (e) { console.warn('[import_ebay] sync error:', e?.message || e); }
          })();
        }
      } catch (e) {
        console.warn('[import_ebay] Error:', e?.message || e);
      }
    })();
    return true;
  } else if (request.action === "GET_TAB_ID") {
    // Content scripts call this to discover their own tabId
    sendResponse({ tabId: sender.tab ? sender.tab.id : null });
    return true;
  } else if (request.action === "START_OPTILIST") {
    // Sync-only handler — listing is now handled by import_ebay
    (async () => {
      try {
        if (request.title && request.sku) {
          sendResponse({ success: true, message: "Processing started" });
          const result = await chrome.storage.local.get('listedCount');
          await chrome.storage.local.set({ listedCount: (result.listedCount || 0) + 1 });
          if (typeof postCreateListing === 'function') {
            await postCreateListing({
              title: request.title, sku: request.sku,
              ebay_price: request.finalPrice, amazon_price: request.amazonPrice,
              amazon_url: request.productURL, amazon_asin: request.asin,
              status: "active", amazon_data: { image: request.mainImage }
            }, 'start_optilist').catch(e => console.warn('[START_OPTILIST] sync error:', e?.message || e));
          }
        } else {
          sendResponse({ success: false });
        }
      } catch (e) {
        console.warn('[START_OPTILIST] Unexpected error:', e?.message || e);
      }
    })();
    return true;
  } else if (request.action === "logSheet") {
    if (typeof SyncUtils !== 'undefined') {
      SyncUtils.logToSheet(request.payload);
    }
    return true;
  } else if (request.action === 'GET_PRODUCT_META') {
    sendResponse({ success: true, meta: { activeTab: sender.tab.id } });
    return true;
  } else if (request.action === 'START_BULK_JOB') {
    const dashboardTabId = sender?.tab?.id;
    if (typeof startBulkJob === 'function') {
      startBulkJob(request.payload, dashboardTabId).then(sendResponse);
    }
    return true;
  } else if (request.action === 'PAUSE_BULK_JOB') {
    if (typeof pauseBulkJob === 'function') {
      pauseBulkJob();
    }
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'RESUME_BULK_JOB') {
    const dashboardTabId = sender?.tab?.id;
    if (typeof startBulkJob === 'function') {
      startBulkJob({}, dashboardTabId).then(sendResponse);
    }
    return true;
  } else if (request.action === 'STOP_BULK_JOB') {
    if (typeof stopBulkJob === 'function') {
      stopBulkJob();
    }
    sendResponse({ success: true });
    return true;
  } else if (request.action === "LOG_TO_SHEET") {
    if (typeof SyncUtils !== 'undefined') {
      SyncUtils.logProductToSheet(request.payload);
    }
    sendResponse({ success: true });
    return true;
  } else if (request.action === "SYNC_LISTING") {
    // create-listing edge fn now atomically writes parent + listing_variations in one RPC call.
    // No separate REST POST needed here.
    (async () => {
      try {
        if (typeof postCreateListing === 'function') {
          const result = await postCreateListing(request.payload || {}, 'background');
          sendResponse(result);
        }
      } catch (e) {
        if (typeof recordListingSyncError === 'function') {
          await recordListingSyncError({
            source: 'background',
            error: e?.message || 'Background listing sync failed',
            payload: request.payload || {}
          });
        }
        sendResponse({ success: false, source: 'background', error: e?.message || 'Background listing sync failed' });
      }
    })();
    return true;
  } else if (request.action === "SS_AI_GENERATE") {
    // Robust AI title/description via AuthHelper (handles ssat_ + legacy auth).
    // request.kind = 'title' | 'description', request.productData = {...}
    (async () => {
      try {
        const fn = request.kind === 'description' ? 'generate-description-v2' : 'generate-titles';
        const resp = await AuthHelper.callEdgeFunction(fn, request.productData || {});
        if (resp.error) { sendResponse({ success: false, error: resp.error }); return; }
        sendResponse(resp.data || { success: false, error: 'No data' });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || 'AI generation failed' });
      }
    })();
    return true;
  } else if (request.action === "CHECK_DUPLICATE") {
    (async () => {
      try {
        const asin = request.asin;
        if (!asin) { sendResponse({ duplicate: false }); return; }
        const resp = await AuthHelper.callEdgeFunction('check-duplicate', { asin });
        if (resp.error) {
          // Fail-open: don't block listing on auth/infra error
          sendResponse({ duplicate: false, error: resp.error });
          return;
        }
        sendResponse(resp.data || { duplicate: false });
      } catch (e) {
        sendResponse({ duplicate: false, error: e?.message || 'check-duplicate failed' });
      }
    })();
    return true;
  } else if (request.action === "SAVE_TO_SHEET") {
    const { title, sku, ebayPrice, amazonPrice, amazonUrl } = request.payload;
    const date = new Date().toLocaleDateString("en-US");
    const row = [date, title || "", sku || "", ebayPrice || "", amazonPrice || "", "", "", "", "", "", "", amazonUrl || ""];
    if (typeof SyncUtils !== 'undefined') {
      SyncUtils.getGoogleSheetUrl().then(endpoint => {
        fetch(endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ row }) });
      });
    }
    return true;
  } else if (request.action === 'openNewTabForDescription') {
    chrome.storage.local.set({ tempAmazonURL: request.amazonURL }, () => {
      chrome.tabs.create({ url: request.targetURL, active: false }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(() => {
              chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content_scripts/description_paster.js"] });
            }, 2000);
          }
        });
      });
    });
    return true;
  } else if (request.action === 'openNewTabForProductDetails') {
    chrome.storage.local.set({ tempAmazonTitle: request.amazonTitle }, () => {
      chrome.tabs.create({ url: request.targetURL, active: false }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content_scripts/description_paster.js"] });
          }
        });
      });
    });
    return true;
  } else if (request.action === "GENERATE_TITLE") {
    (async () => {
      try {
        const tokenData = await chrome.storage.local.get(['saasToken']);
        if (!tokenData.saasToken) throw new Error("Please log in.");
        const resp = await fetch(`${urls.SUPABASE_FUNCTIONS}/generate-titles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': apiKeys.SUPABASE_ANON, 'Authorization': `Bearer ${tokenData.saasToken}` },
          body: JSON.stringify(request.productData)
        });
        const json = await resp.json();
        if (json.success) sendResponse({ success: true, title: json.titles[0].title || json.titles[0] });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  } else if (request.action === "GENERATE_AI_TITLES") {
    (async () => {
      try {
        const tokenData = await chrome.storage.local.get(['saasToken']);
        const resp = await fetch(`${urls.SUPABASE_FUNCTIONS}/generate-titles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': apiKeys.SUPABASE_ANON, 'Authorization': `Bearer ${tokenData.saasToken}` },
          body: JSON.stringify(request.productData)
        });
        const json = await resp.json();
        sendResponse(json);
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  } else if (request.action === "GENERATE_DESCRIPTION") {
    (async () => {
      try {
        const tokenData = await chrome.storage.local.get(['saasToken']);
        const resp = await fetch(`${urls.SUPABASE_FUNCTIONS}/generate-description`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': apiKeys.SUPABASE_ANON, 'Authorization': `Bearer ${tokenData.saasToken}` },
          body: JSON.stringify(request.productData)
        });
        const json = await resp.json();
        sendResponse(json);
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  } else if (request.action === 'START_FULFILLMENT') {
    const AMAZON_AUTO_ORDER_ENABLED = false;
    if (!AMAZON_AUTO_ORDER_ENABLED) {
      console.info("Amazon auto-ordering is disabled in this build.");
      sendResponse({ success: false, error: "Auto-ordering is currently disabled." });
      return true;
    }

    const task = {
      status: 'INIT',
      order: request.order,
      timestamp: Date.now()
    };

    chrome.storage.local.set({ fulfillmentTask: task }, () => {
      if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('📦 FULFILLMENT: Task saved, opening Amazon...', task);

      if (request.order && request.order.url) {
        chrome.tabs.create({ url: request.order.url, active: true });
      }

      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'ORDER_COMPLETED') {
    if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('🎉 ORDER COMPLETED (payload hidden in prod)', request.payload);

    try {
      chrome.tabs.query({ url: "*://*/*" }, (tabs) => {
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'ORDER_COMPLETED_BROADCAST',
            payload: request.payload
          }).catch(() => { });
        }
      });
    } catch (e) {}

    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'FETCH_IMAGE_AS_BASE64') {
    (async () => {
      try {
        const response = await fetch(request.url);
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        const blob = await response.blob();
        if (typeof FileReader !== 'undefined') {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            sendResponse({ success: true, base64: reader.result });
          };
          reader.onerror = () => {
            sendResponse({ success: false, error: 'Failed to read blob' });
          };
        } else {
          const buffer = await blob.arrayBuffer();
          let binary = '';
          const bytes = new Uint8Array(buffer);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64String = btoa(binary);
          sendResponse({ success: true, base64: `data:${blob.type};base64,${base64String}` });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
