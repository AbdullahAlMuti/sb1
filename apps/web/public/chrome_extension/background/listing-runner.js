/**
 * SellerSuit Bulk Listing Runner
 * Manages the background state machine for bulk listing items from a supplier
 * site (Amazon, Walmart, …) to eBay. Supplier detection happens in the content
 * script: any injector that answers SCRAPE_COMPLETE_PRODUCT works here.
 */

// getUrls and getApiKeys are declared globally in background/index.js

const bulkState = {
    urls: [],
    currentIndex: 0,
    intervalMs: 60000,
    isRunning: false,
    currentTabId: null,
    dashboardTabId: null,
    timer: null
};

function debugLog(message) {
    console.log(`[DEBUG] ${message}`);
    if (bulkState.dashboardTabId) {
        chrome.tabs.sendMessage(bulkState.dashboardTabId, { type: 'BULK_JOB_DEBUG', message: message }).catch(()=>{});
    }
}


// Start or Resume a bulk job
async function startBulkJob(payload, dashboardTabId) {
    bulkState.dashboardTabId = dashboardTabId || bulkState.dashboardTabId;
    debugLog(`startBulkJob called. isRunning: ${bulkState.isRunning}`);
    if (bulkState.isRunning) return { success: false, message: 'Job already running' };
    
    if (payload.urls && payload.urls.length > 0) {
        debugLog(`Received ${payload.urls.length} URLs. Setting currentIndex to ${payload.currentIndex || 0}`);
        bulkState.urls = payload.urls;
        bulkState.currentIndex = payload.currentIndex || 0;
        bulkState.intervalMs = (payload.interval || 60) * 1000;
    }

    if (bulkState.currentIndex >= bulkState.urls.length) {
        debugLog(`currentIndex (${bulkState.currentIndex}) >= urls.length (${bulkState.urls.length}). Aborting.`);
        return { success: false, message: 'All URLs processed' };
    }

    bulkState.isRunning = true;
    
    debugLog(`Starting job at index ${bulkState.currentIndex} with ${bulkState.intervalMs}ms interval`);
    processNextItem();
    
    return { success: true };
}

function pauseBulkJob() {
    bulkState.isRunning = false;
    if (bulkState.timer) {
        clearTimeout(bulkState.timer);
        bulkState.timer = null;
    }
    console.log('[Bulk Runner] Job paused');
    
    // Close the current tab if any
    if (bulkState.currentTabId) {
        chrome.tabs.remove(bulkState.currentTabId).catch(() => {});
        bulkState.currentTabId = null;
    }
}

function stopBulkJob() {
    pauseBulkJob();
    bulkState.urls = [];
    bulkState.currentIndex = 0;
    console.log('[Bulk Runner] Job stopped');
}

async function processNextItem() {
    debugLog(`processNextItem called. isRunning: ${bulkState.isRunning}`);
    if (!bulkState.isRunning) return;

    if (bulkState.currentIndex >= bulkState.urls.length) {
        debugLog(`All items processed! Index: ${bulkState.currentIndex}`);
        bulkState.isRunning = false;
        
        // Notify the bridge
        if (bulkState.dashboardTabId) {
            chrome.tabs.sendMessage(bulkState.dashboardTabId, { type: 'BULK_JOB_FINISHED' }).catch(()=>{});
        }
        
        if (bulkState.processingWindowId) {
            chrome.windows.remove(bulkState.processingWindowId).catch(() => {});
            bulkState.processingWindowId = null;
        }
        return;
    }

    const currentUrl = bulkState.urls[bulkState.currentIndex];
    debugLog(`Processing ${currentUrl}`);

    updateDashboardStatus(bulkState.currentIndex, 'Processing');

    try {
        debugLog(`Step 1: Scraping supplier page... calling scrapeSupplierProduct`);
        // Step 1: Scrape supplier page (Amazon, Walmart, … — any injector answering SCRAPE_COMPLETE_PRODUCT)
        const scrapedData = await scrapeSupplierProduct(currentUrl);
        
        updateDashboardStatus(bulkState.currentIndex, 'Generating AI Title');

        // Step 2: Smart Engine (AI Title & Pricing)
        const optimizedData = await runSmartEngine(scrapedData, currentUrl);

        updateDashboardStatus(bulkState.currentIndex, 'Syncing to Supabase');

        // Step 3: Save to Database (Opti-List)
        await syncToDatabase(optimizedData);

        updateDashboardStatus(bulkState.currentIndex, 'Listing to eBay Drafts');

        // Step 4: Inject into eBay
        await createEbayDraft(optimizedData);
        
        updateDashboardStatus(bulkState.currentIndex, 'Completed', true);

    } catch (error) {
        console.error(`[Bulk Runner] Error processing index ${bulkState.currentIndex}:`, error);
        updateDashboardStatus(bulkState.currentIndex, `Failed: ${error.message || 'Unknown error'}`, false, true);
    }

    // Step 5: Wait and Loop
    if (bulkState.isRunning) {
        bulkState.currentIndex++;
        console.log(`[Bulk Runner] Waiting ${bulkState.intervalMs}ms before next item...`);
        bulkState.timer = setTimeout(() => {
            processNextItem();
        }, bulkState.intervalMs);
    }
}

// ---------------------------------------------
// Core Engine Functions
// ---------------------------------------------

async function scrapeSupplierProduct(url) {
    return new Promise((resolve, reject) => {
        let isDone = false;
        debugLog(`scrapeSupplierProduct promise started for ${url}`);
        const timeout = setTimeout(() => {
            debugLog(`scrapeSupplierProduct timeout triggered!`);
            if (isDone) return;
            isDone = true;
            if (bulkState.currentTabId) chrome.tabs.remove(bulkState.currentTabId).catch(() => {});
            reject(new Error('Scraping timeout (15s) - Page stuck or CAPTCHA'));
        }, 15000);

        function attachListener(tabId) {
            debugLog(`attachListener called for tab ${tabId}. Starting poll interval.`);
            const pollInterval = setInterval(() => {
                if (isDone) {
                    clearInterval(pollInterval);
                    return;
                }
                
                debugLog(`Polling Amazon Tab ${tabId} for SCRAPE_COMPLETE_PRODUCT...`);
                chrome.tabs.sendMessage(tabId, { action: "SCRAPE_COMPLETE_PRODUCT" }, (response) => {
                    if (isDone) return;
                    
                    if (chrome.runtime.lastError) {
                        // This is expected if the content script hasn't loaded yet.
                        debugLog(`Poll failed (content script not ready yet): ${chrome.runtime.lastError.message}`);
                        return;
                    }
                    
                    if (response && response.success) {
                        debugLog(`Received successful response from Amazon content script!`);
                        isDone = true;
                        clearInterval(pollInterval);
                        clearTimeout(timeout);
                        
                        // Remove Amazon tab after scrape
                        chrome.tabs.remove(tabId).catch(() => {});
                        bulkState.currentTabId = null;
                        
                        resolve(response.data);
                    }
                });
            }, 2000); // Poll every 2 seconds
        }

        // Just create a normal tab
        debugLog(`Calling chrome.tabs.create for Amazon URL`);
        chrome.tabs.create({ url: url, active: true }, (tab) => {
            debugLog(`chrome.tabs.create callback fired. lastError: ${chrome.runtime.lastError ? chrome.runtime.lastError.message : 'none'}`);
            if (chrome.runtime.lastError) {
                clearTimeout(timeout);
                return reject(new Error(chrome.runtime.lastError.message));
            }
            bulkState.currentTabId = tab.id;
            attachListener(bulkState.currentTabId);
        });
    });
}

async function runSmartEngine(scrapedData, url) {
    console.log('[Bulk Runner] Running Smart Engine...');
    
    // Default fallback values
    let aiTitle = scrapedData.title ? scrapedData.title.substring(0, 80) : "Item";
    let calculatedPrice = "0.00";
    let sku = "AB" + Date.now().toString().slice(-6);
    
    // Math: Calculate eBay price (30% markup)
    if (scrapedData.price) {
        const rawPriceMatch = scrapedData.price.match(/[\d.]+/);
        if (rawPriceMatch) {
            const rawPrice = parseFloat(rawPriceMatch[0]);
            calculatedPrice = (rawPrice * 1.30).toFixed(2);
        }
    }
    
    // AI: Attempt to generate Title via Supabase
    try {
        const tokenData = await chrome.storage.local.get(['saasToken']);
        const urls = getUrls();
        const apiKeys = getApiKeys();
        if (tokenData.saasToken && urls && urls.SUPABASE_FUNCTIONS) {
            const resp = await fetch(`${urls.SUPABASE_FUNCTIONS}/generate-titles`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'apikey': apiKeys.SUPABASE_ANON, 
                    'Authorization': `Bearer ${tokenData.saasToken}` 
                },
                body: JSON.stringify(scrapedData)
            });
            const json = await resp.json();
            if (json.success && json.titles && json.titles.length > 0) {
                aiTitle = json.titles[0].title || json.titles[0];
                aiTitle = aiTitle.substring(0, 80);
            }
        }
    } catch (e) {
        console.warn('[Bulk Runner] AI Title generation failed, using raw title.', e);
    }

    return {
        title: aiTitle,
        sku: sku,
        ebay_price: calculatedPrice,
        // Supplier-neutral fields (preferred going forward)
        supplier: scrapedData.supplier || 'amazon',
        supplier_id: scrapedData.sourceId || scrapedData.asin || null,
        supplier_url: url,
        supplier_price: scrapedData.price ? scrapedData.price.replace(/[^\d.]/g, '') : "0",
        // Legacy Amazon-named fields — kept until backend/DB migrates
        amazon_price: scrapedData.price ? scrapedData.price.replace(/[^\d.]/g, '') : "0",
        amazon_url: url,
        amazon_asin: scrapedData.asin || "NOASIN",
        status: "active",
        amazon_data: { 
            image: scrapedData.mainImage || (scrapedData.allImages && scrapedData.allImages.length > 0 ? scrapedData.allImages[0] : ""),
            all_images: scrapedData.allImages || [],
            description: scrapedData.description || ""
        }
    };
}

async function syncToDatabase(payload) {
    console.log('[Bulk Runner] Simulating START_OPTILIST database sync...');
    try {
        // Reuse the exact postCreateListing function
        const syncResult = await postCreateListing(payload, 'bulk_runner');
        if (!syncResult.success) {
            console.warn('[Bulk Runner] Listing sync failed:', syncResult);
            throw new Error('Database sync failed');
        }
        return true;
    } catch (e) {
        console.warn('[Bulk Runner] Database error:', e);
        throw e; // Fail the item if db sync fails
    }
}

async function createEbayDraft(productData) {
    return new Promise((resolve, reject) => {
        let isDone = false;
        const timeout = setTimeout(() => {
            if (isDone) return;
            isDone = true;
            reject(new Error('eBay listing timeout (15s) - Page stuck'));
        }, 15000);

        function attachListener(tabId) {
            chrome.tabs.onUpdated.addListener(function listener(tId, info, updatedTab) {
                if (isDone) {
                    chrome.tabs.onUpdated.removeListener(listener);
                    return;
                }
                if (tId === tabId && (info.status === 'complete' || updatedTab.status === 'complete')) {
                    chrome.tabs.onUpdated.removeListener(listener);
                    
                    setTimeout(() => {
                        if (isDone) return;
                        isDone = true;
                        clearTimeout(timeout);
                        
                        const storageData = {
                            ebayTitle: productData.title,
                            ebayPrice: productData.ebay_price,
                            ebaySku: productData.sku,
                            amazonPrice: productData.amazon_price,
                            productTitle: productData.title,
                            selectedEbayDescription: productData.amazon_data?.description || "",
                            imageUrls: productData.amazon_data?.all_images || [],
                            watermarkedImages: (productData.amazon_data?.all_images || []).map(url => ({
                                url: url,
                                isWatermarked: false,
                                isReplaced: false
                            }))
                        };
                        chrome.storage.local.set(storageData, () => {
                             try {
                                 chrome.tabs.sendMessage(tabId, { action: "RUN_EBAY_LISTER" }, (response) => {
                                     resolve();
                                 });
                             } catch (e) {
                                 resolve();
                             }
                        });
                    }, 2500);
                }
            });
        }

        const ebayUrl = "https://www.ebay.com/sl/prelist/suggest?sr=sh";
        chrome.tabs.create({ url: ebayUrl, active: true }, (tab) => {
            if (chrome.runtime.lastError) {
                clearTimeout(timeout);
                return reject(new Error(chrome.runtime.lastError.message));
            }
            attachListener(tab.id);
        });
    });
}

function updateDashboardStatus(index, statusText, isCompleted = false, isError = false) {
    const payload = { index, status: statusText, isCompleted, isError };
    
    if (bulkState.dashboardTabId) {
        chrome.tabs.sendMessage(bulkState.dashboardTabId, { type: 'BULK_JOB_PROGRESS_UPDATE', payload }).catch(()=>{});
    }
}

// ═══════════════════════════════════════════════════════════
// LISTING SYNC HELPERS (Moved from background.js for global access)
// ═══════════════════════════════════════════════════════════

async function parseListingSyncResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function getSafeListingSyncIdentity(payload = {}) {
  return {
    sku: payload.sku || payload.ebaySku || null,
    asin: payload.amazon_asin || payload.amazonAsin || null
  };
}

async function recordListingSyncError({ source = 'background', status = null, error = 'Unknown sync error', details = null, payload = {} } = {}) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      status,
      source,
      error: String(error || 'Unknown sync error').slice(0, 500),
      ...getSafeListingSyncIdentity(payload)
    };

    if (details && typeof details === 'object') {
      entry.details = {
        action: details.action || undefined,
        code: details.code || undefined,
        message: details.message ? String(details.message).slice(0, 300) : undefined
      };
    }

    const data = await chrome.storage.local.get(['listingSyncErrors']);
    const errors = Array.isArray(data.listingSyncErrors) ? data.listingSyncErrors : [];
    await chrome.storage.local.set({
      listingSyncLastError: entry,
      listingSyncErrors: [entry, ...errors].slice(0, 10)
    });
  } catch (err) {
    console.warn('[listing-sync] Failed to record sync error:', err?.message || err);
  }
}

async function postCreateListing(payload, source = 'background') {
  if (typeof AuthHelper === 'undefined') {
    const error = 'AuthHelper is not defined.';
    await recordListingSyncError({ source, status: 500, error, payload });
    return { success: false, source, status: 500, error };
  }

  const response = await AuthHelper.callEdgeFunction('create-listing', payload);
  const data = response.data;
  const status = response.status || 0;

  if (response.error) {
    const error = response.error || `create-listing failed with HTTP ${status}`;
    await recordListingSyncError({ source, status, error, details: data, payload });
    return { success: false, source, status, error, details: data };
  }

  return {
    success: true,
    source,
    status,
    listingId: data?.listing?.id,
    data
  };
}
