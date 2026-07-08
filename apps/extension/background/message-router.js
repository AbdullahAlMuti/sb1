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

// Write / state-changing (or credit-spending) actions. The auth gate re-verifies
// against the backend and fails CLOSED for these — no offline grace. (M4)
const WRITE_ACTIONS = new Set([
  "START_OPTILIST", "SYNC_LISTING", "LISTING_PUBLISHED", "import_ebay",
  "sync_ebay_orders", "trigger_ebay_sync",
  "SS_AI_GENERATE", "GENERATE_TITLE", "GENERATE_AI_TITLES", "GENERATE_DESCRIPTION",
  "AI_REMOVE_BG", "SAVE_TO_SHEET", "LOG_TO_SHEET", "logSheet",
  "START_BULK_JOB", "RESUME_BULK_JOB"
]);

function cleanPrice(price) {
  if (price === null || price === undefined) return null;
  if (typeof price === 'number') {
    return isNaN(price) ? null : price;
  }
  const s = String(price).replace(/[^\d.-]/g, '').trim();
  if (s === '' || s === '-') return null;
  const parsed = parseFloat(s);
  return isNaN(parsed) ? null : parsed;
}

// ─────────────────────────────────────────────────────────────
// URL SAFETY (W4 hardening)
// chrome.tabs.create() must never open an attacker-supplied javascript:,
// data:, file: or off-domain URL. Every URL that reaches tabs.create is run
// through isSafeNavUrl() first, which enforces:
//   • https: scheme ONLY (blocks javascript:/data:/file:/blob:/chrome:)
//   • host is on an explicit allowlist of first-party + supported marketplaces
// Anything else is rejected and the tab is not opened.
// ─────────────────────────────────────────────────────────────
const ALLOWED_NAV_HOST_SUFFIXES = [
  'sellersuit.com',
  'ebay.com', 'ebay.co.uk', 'ebay.de', 'ebay.fr', 'ebay.com.au', 'ebay.it', 'ebay.es',
  'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.ca', 'amazon.com.au',
  'walmart.com', 'walmart.ca',
  'aliexpress.com', 'aliexpress.ru', 'aliexpress.us'
];

function isSafeNavUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl) return false;
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  return ALLOWED_NAV_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith('.' + suffix)
  );
}

// Image fetch proxy safety: FETCH_IMAGE_AS_BASE64 lets any content script fetch a
// URL via the worker. Restrict it to marketplace image CDNs. (M5)
const ALLOWED_IMAGE_HOST_SUFFIXES = [
  'media-amazon.com', 'ssl-images-amazon.com', 'images-amazon.com',
  'walmartimages.com', 'walmartimages.ca', 'alicdn.com'
];
function isAllowedImageUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl) return false;
  let u;
  try { u = new URL(rawUrl); } catch { return false; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  const host = u.hostname.toLowerCase();
  return ALLOWED_IMAGE_HOST_SUFFIXES.some((s) => host === s || host.endsWith('.' + s));
}

function detectSupplier(product) {
  if (!product) return 'amazon';
  if (product.supplier === 'walmart') return 'walmart';
  if (product.supplier === 'aliexpress') return 'aliexpress';
  if (product.supplier === 'amazon') return 'amazon';
  const url = product.url || product.amazonUrl || '';
  if (url.includes('walmart.')) return 'walmart';
  if (url.includes('aliexpress.')) return 'aliexpress';
  return 'amazon';
}

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

function formatAiGenerationError(functionName, error, status) {
  const raw = (error || '').toString().trim();
  const label = functionName === 'generate-description' ? 'Description generation' : 'Title generation';

  if (status === 0) {
    return `${label} backend is unreachable. ${raw || 'Please check the extension backend target and network connection.'}`;
  }
  if (status === 401) return raw || 'Session expired. Please log in again.';
  if (status === 402) return raw || 'AI credits exhausted. Please add credits to continue.';
  if (status === 429) return raw || 'Rate limit exceeded. Please wait a moment and try again.';
  if (status && status >= 500) return raw || `${label} service is temporarily unavailable.`;
  return raw || `${label} failed.`;
}

function normalizeAiEdgeResult(functionName, edgeResult) {
  if (!edgeResult) {
    return {
      success: false,
      error: formatAiGenerationError(functionName, 'No response from AI backend.', 0),
      status: 0
    };
  }

  if (edgeResult.error) {
    return {
      success: false,
      error: formatAiGenerationError(functionName, edgeResult.error, edgeResult.status),
      status: edgeResult.status
    };
  }

  const data = edgeResult.data;
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      error: formatAiGenerationError(functionName, 'Invalid AI backend response.', edgeResult.status),
      status: edgeResult.status
    };
  }

  if (data.success === false || data.error) {
    return {
      ...data,
      success: false,
      error: formatAiGenerationError(functionName, data.error, edgeResult.status),
      status: edgeResult.status
    };
  }

  return { ...data, success: true, status: edgeResult.status };
}

function getFirstGeneratedTitle(result) {
  if (!result) return '';
  if (typeof result.title === 'string') return result.title.trim();
  if (!Array.isArray(result.titles) || result.titles.length === 0) return '';
  const first = result.titles[0];
  if (typeof first === 'string') return first.trim();
  return (first?.title || '').toString().trim();
}

// getUrls and getApiKeys are declared globally in background/index.js

// Register the single message listener. Named so the auth gate can re-route a
// request after a successful re-verification (see the unlock gate below).
function routeMessage(request, sender, sendResponse) {
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
            const updates = { extensionBootstrapCache: bootstrapRes.data };
            if (bootstrapRes.data.user?.selectedListingTemplateId) {
              updates.selectedListingTemplateId = bootstrapRes.data.user.selectedListingTemplateId;
            }
            await chrome.storage.local.set(updates);
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
        if (typeof SSPricingRuleSync !== 'undefined') {
          SSPricingRuleSync.sync(true).catch(() => {});
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
          chrome.sidePanel.setOptions({
            tabId,
            path: 'sidepanel/side-panel.html',
            enabled: true
          }).catch(() => {});
          await chrome.sidePanel.open({ tabId });
        } else {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            chrome.sidePanel.setOptions({
              tabId: tab.id,
              path: 'sidepanel/side-panel.html',
              enabled: true
            }).catch(() => {});
            await chrome.sidePanel.open({ tabId: tab.id });
          }
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (request.action === 'AUTO_LIST_NEW_TAB') {
    (async () => {
      try {
        if (!isSafeNavUrl(request.url)) {
          console.warn('[Background] AUTO_LIST_NEW_TAB blocked unsafe URL:', request.url);
          sendResponse({ ok: false, error: 'Blocked: URL is not an allowed https destination' });
          return;
        }
        const tab = await chrome.tabs.create({ url: request.url, active: true });
        await chrome.sidePanel.setOptions({
          tabId: tab.id,
          path: 'sidepanel/side-panel.html',
          enabled: true
        });
        if (!request.skipSidePanelOpen) {
          await chrome.sidePanel.open({ tabId: tab.id });
        }
        sendResponse({ ok: true, tabId: tab.id });
      } catch (e) {
        console.error('[Background] Failed to open side panel on new tab:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (request.action === 'CLOSE_SIDE_PANEL') {
    (async () => {
      try {
        let windowId;
        if (sender?.tab?.windowId) {
          windowId = sender.tab.windowId;
        } else if (request.tabId) {
          const tab = await chrome.tabs.get(request.tabId);
          windowId = tab.windowId;
        } else {
          const win = await chrome.windows.getCurrent();
          windowId = win.id;
        }
        await chrome.sidePanel.close({ windowId });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (request.action === 'OPEN_BACKGROUND_TAB') {
    if (!isSafeNavUrl(request.url)) {
      console.warn('[Background] OPEN_BACKGROUND_TAB blocked unsafe URL:', request.url);
      sendResponse({ ok: false, error: 'Blocked: URL is not an allowed https destination' });
      return true;
    }
    chrome.tabs.create({ url: request.url, active: false });
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'sync_ebay_orders' || request.action === 'trigger_ebay_sync') {
    (async () => {
      try {
        const isAuth = await AuthHelper.verifyAuthStatus(false, false);
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
          if (request.refreshToken) {
            saveData.saasRefreshToken = request.refreshToken;
          }
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
            if (typeof SSPricingRuleSync !== 'undefined') {
              SSPricingRuleSync.sync(true).catch(() => {});
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

  // ── Bulk Lister internal signaling (before the unlock gate: BULK_ITEM_RESULT
  //    comes from our own eBay content scripts mid-upload and must never be
  //    swallowed or trigger the gate's dashboard-tab side effect) ──
  if (request.action === 'BULK_ITEM_RESULT') {
    sendResponse(handleBulkItemResult(request));
    return true;
  }

  if (request.action === 'GET_BULK_STATE') {
    getBulkState().then(sendResponse);
    return true;
  }

  const isUnlocked = AuthHelper.isUnlocked();
  if (!isUnlocked) {
    // The unlock flag lives in service-worker memory, so every MV3 cold start
    // resets it even though the user is still logged in. The old gate verified
    // auth but ALWAYS responded "Please Log In" — the first click after any
    // idle period failed, and rapid retries failed too (verify still in
    // flight). On successful re-verification, route the original request
    // instead of failing it; the flag is now true so the gate won't re-enter.
    const requireFreshAuth = WRITE_ACTIONS.has(request.action);
    AuthHelper.verifyAuthStatus(false, !requireFreshAuth).then(unlocked => {
      if (unlocked) {
        routeMessage(request, sender, sendResponse);
        return;
      }
      if (request.action !== 'AI_REMOVE_BG' && request.action !== 'GENERATE_TITLE' && request.action !== 'GENERATE_DESCRIPTION') {
        chrome.tabs.create({ url: urls.WEB_APP_DASHBOARD });
      }
      sendResponse({ success: false, error: "Please Log In to use the extension." });
    }).catch(() => {
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

        // Store product under uploadSessionId first to prevent race condition.
        // stagedAt drives the prelist tabId-fallback TTL and the storage sweep.
        await chrome.storage.local.set({
          [uploadSessionId]: { product, isImported: false, uploadType: request.uploadType || 'classic', stagedAt: Date.now() },
          ebayListingTabId: ''
        });

        const tab = await chrome.tabs.create({ active: true, url: ebayUrl });
        const tabId = tab.id;

        // Also set legacy tabId keys for backward compatibility
        await chrome.storage.local.set({
          [String(tabId)]: { product, isImported: false, uploadType: request.uploadType || 'classic', stagedAt: Date.now() },
          ebayListingTabId: String(tabId)
        });

        // DB sync intentionally NOT done here. import_ebay fires BEFORE the
        // eBay upload runs, so syncing at this point wrote dashboard rows for
        // uploads that later failed, raced the authoritative post-upload sync,
        // and silently skipped Walmart products (gate was ebaySku || asin).
        // The dashboard write happens after a successful upload only:
        //   single-variation → SellerSuitUploader.run → _syncListingToDashboard
        //   multi-variation  → ebay_bulkedit.js after addVariations
        // Both route through SYNC_LISTING → postCreateListing.
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
            const detectedSup = detectSupplier({
              supplier: request.supplier,
              url: request.productURL
            });

            // Pricing drift check — fire-and-forget; does not block the listing.
            // Logs to console and audit log if the client price has drifted from
            // the server-computed price (stale rule or rounding mismatch).
            if (request.finalPrice && typeof SSPricingRuleSync !== 'undefined') {
              SSPricingRuleSync.getRuleForSupplier(detectedSup).then(async cachedRule => {
                if (!cachedRule) return;
                try {
                  const { token, isValid } = await AuthHelper.getAuthToken();
                  if (!token || !isValid) return;
                  const urls = getUrls();
                  const apiKeys = getApiKeys();
                  if (!urls || !apiKeys) return;
                  await fetch(`${urls.SUPABASE_FUNCTIONS}/pricing-verify`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'apikey': apiKeys.SUPABASE_ANON || '',
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      supplierKey: detectedSup,
                      supplierPrice: cleanPrice(request.amazonPrice || request.supplierPrice),
                      shippingCost: 0,
                      clientFinalPrice: cleanPrice(request.finalPrice),
                      clientRuleVersion: cachedRule.ruleVersion || 0
                    })
                  });
                } catch (_) {}
              }).catch(() => {});
            }
            const parsedEbayPrice = cleanPrice(request.finalPrice);
            const parsedSupplierPrice = cleanPrice(request.amazonPrice || request.supplierPrice);

            await postCreateListing({
              title: request.title, sku: request.sku,
              ebay_price: parsedEbayPrice,
              // Supplier-neutral fields (preferred going forward)
              supplier: detectedSup,
              supplier_id: request.sourceId || request.asin || null,
              supplier_url: request.productURL,
              supplier_price: parsedSupplierPrice,
              // Legacy Amazon-named fields — kept until backend/DB migrates
              amazon_price: parsedSupplierPrice,
              amazon_url: request.productURL, amazon_asin: request.asin,
              // 'draft', not 'active' — this fires on scan/pre-upload, before any
              // eBay item exists. Marking it active here let scans silently eat the
              // plan's listing quota and block the real post-upload dashboard sync.
              status: "draft", amazon_data: { image: request.mainImage }
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
    if (typeof startBulkJob === 'function') {
      startBulkJob(request.payload).then(sendResponse);
    }
    return true;
  } else if (request.action === 'PAUSE_BULK_JOB') {
    if (typeof pauseBulkJob === 'function') {
      pauseBulkJob().then(sendResponse);
    } else {
      sendResponse({ success: true });
    }
    return true;
  } else if (request.action === 'RESUME_BULK_JOB') {
    if (typeof startBulkJob === 'function') {
      startBulkJob(request.payload || {}).then(sendResponse);
    }
    return true;
  } else if (request.action === 'STOP_BULK_JOB') {
    if (typeof stopBulkJob === 'function') {
      stopBulkJob().then(sendResponse);
    } else {
      sendResponse({ success: true });
    }
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
  } else if (request.action === "LISTING_PUBLISHED") {
    (async () => {
      try {
        if (typeof AuthHelper !== 'undefined') {
          const payload = {
            draft_id: request.payload.draftId,
            ebay_item_id: request.payload.ebayItemId,
            status: 'active'
          };
          const response = await AuthHelper.callEdgeFunction('sync-listing', payload);
          if (response.error) {
            sendResponse({ success: false, error: response.error });
          } else {
            sendResponse({ success: true, data: response.data });
          }
        } else {
          sendResponse({ success: false, error: 'AuthHelper not found' });
        }
      } catch (e) {
        sendResponse({ success: false, error: e?.message || 'Listing publication sync failed' });
      }
    })();
    return true;
  } else if (request.action === "SS_AI_GENERATE") {
    // Robust AI title/description via AuthHelper (handles ssat_ + legacy auth).
    // request.kind = 'title' | 'description', request.productData = {...}
    (async () => {
      try {
        const fn = request.kind === 'description' ? 'generate-description-v2' : 'generate-titles';
        const timeout = request.kind === 'description' ? 90000 : 60000;
        const resp = await AuthHelper.callEdgeFunction(fn, request.productData || {}, { timeout });
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
        // null when the user has not configured their own export endpoint → skip (W2).
        if (!endpoint) return;
        fetch(endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ row }) });
      });
    }
    return true;
  } else if (request.action === "GENERATE_TITLE") {
    (async () => {
      try {
        const result = normalizeAiEdgeResult(
          'generate-titles',
          await AuthHelper.callEdgeFunction('generate-titles', request.productData || {}, { timeout: 60000 })
        );
        const title = getFirstGeneratedTitle(result);
        if (result.success && title) {
          sendResponse({ ...result, success: true, title });
        } else {
          // Always respond on failure so the content script surfaces the error
          // instead of receiving an undefined response.
          sendResponse({
            ...result,
            success: false,
            error: result.error || 'No title returned.'
          });
        }
      } catch (e) {
        sendResponse({
          success: false,
          error: formatAiGenerationError('generate-titles', e?.message, 0),
          status: 0
        });
      }
    })();
    return true;
  } else if (request.action === "GENERATE_AI_TITLES") {
    (async () => {
      try {
        sendResponse(normalizeAiEdgeResult(
          'generate-titles',
          await AuthHelper.callEdgeFunction('generate-titles', request.productData || {}, { timeout: 60000 })
        ));
      } catch (e) {
        sendResponse({
          success: false,
          error: formatAiGenerationError('generate-titles', e?.message, 0),
          status: 0
        });
      }
    })();
    return true;
  } else if (request.action === "GENERATE_DESCRIPTION") {
    (async () => {
      try {
        sendResponse(normalizeAiEdgeResult(
          'generate-description',
          await AuthHelper.callEdgeFunction('generate-description', request.productData || {}, { timeout: 90000 })
        ));
      } catch (e) {
        sendResponse({
          success: false,
          error: formatAiGenerationError('generate-description', e?.message, 0),
          status: 0
        });
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

      if (request.order && request.order.url && isSafeNavUrl(request.order.url)) {
        chrome.tabs.create({ url: request.order.url, active: true });
      } else if (request.order && request.order.url) {
        console.warn('[Background] Fulfillment blocked unsafe URL:', request.order.url);
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
        if (!request.url || (!request.url.startsWith('http://') && !request.url.startsWith('https://'))) {
          throw new Error('Unsupported URL scheme: Only http/https fetches are permitted.');
        }
        if (!isAllowedImageUrl(request.url)) {
          sendResponse({ success: false, error: 'Blocked: image host is not on the allowlist.' });
          return;
        }
        const response = await fetch(request.url);
        if (response.type === 'opaque') {
          throw new Error('opaque_response');
        }
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
        let errMsg = err.message || String(err);
        if (errMsg.includes('Failed to fetch') || errMsg === 'opaque_response') {
          try {
            const origin = new URL(request.url).origin;
            errMsg = `Host permission missing for origin: ${origin}`;
          } catch (_) {}
        }
        sendResponse({ success: false, error: errMsg });
      }
    })();
    return true;
  }
}

chrome.runtime.onMessage.addListener(routeMessage);
