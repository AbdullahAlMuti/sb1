console.log("eBay Lister script loaded: Awaiting data...");

// ScenarioManager moved to ebay_prelist.js

// ─────────────────────────────────────────────
// 🔧 Helper Functions
// ─────────────────────────────────────────────
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForElement(selector, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const el = document.querySelector(selector);
    if (el && el.offsetParent !== null) return el; // Also check if element is visible
    await wait(250);
  }
  throw new Error(`Element with selector "${selector}" not found`);
}

// Helper to try multiple selectors with waiting
async function findElementWithSelectors(selectors, timeout = 15000) {
  const startTime = Date.now();
  let lastError = null;

  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null && !el.disabled) {
          console.log(`✅ Found element with selector: ${selector}`);
          return el;
        }
      } catch (e) {
        lastError = e;
      }
    }
    await wait(300);
  }

  throw lastError || new Error(`None of the selectors matched: ${selectors.join(', ')}`);
}

// ─────────────────────────────────────────────
// 🚀 Main Automation
// ─────────────────────────────────────────────
async function runEbayAutomation(data) {
  if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('🚀 Starting eBay automation with data (hidden in prod)', data);

  const storageData = await chrome.storage.local.get(['watermarkedImages', 'imageUrls', 'itemSpecifics', 'brand', 'model', 'color', 'dimensions', 'height', 'weight']);
  
  const auctionData = {
    title: data.ebayTitle || '',
    sku: data.ebaySku || '',
    price: data.ebayPrice,
    images: data.ebayImages || storageData.watermarkedImages || storageData.imageUrls || [],
    description: data.ebayDescription || '',
    specs: (() => {
      let arr = data.itemSpecifics || storageData.itemSpecifics || [];
      if (!Array.isArray(arr) || arr.length === 0) {
          arr = [];
          if (data.brand || storageData.brand) arr.push({ name: 'Brand', value: data.brand || storageData.brand });
          if (data.model || storageData.model) arr.push({ name: 'Model', value: data.model || storageData.model });
          if (data.color || storageData.color) arr.push({ name: 'Color', value: data.color || storageData.color });
          if (data.dimensions || storageData.dimensions) arr.push({ name: 'Dimensions', value: data.dimensions || storageData.dimensions });
          if (data.height || storageData.height) arr.push({ name: 'Height', value: data.height || storageData.height });
          if (data.weight || storageData.weight) arr.push({ name: 'Weight', value: data.weight || storageData.weight });
      }
      
      // ALWAYS enforce Country of Origin to be United States
      arr.push({ name: 'Country/Region of Manufacture', value: 'United States' });
      arr.push({ name: 'Country of Origin', value: 'United States' });
      
      return arr;
    })()
  };

  const reactInput = (el, value) => {
    try {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      if (el.tagName.toLowerCase() === 'textarea') nativeTextAreaValueSetter.call(el, value);
      else if (el.tagName.toLowerCase() === 'input') nativeInputValueSetter.call(el, value);
      else el.value = value;
      
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
      
      if (el._valueTracker) el._valueTracker.setValue(el.value);
    } catch(e) {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  function log(step, message) { console.log('[eBay Agent] [' + step + ']: ' + message); }

  try {
    // ---------------------------------------------------------
    // STEP 1: IMAGES
    // ---------------------------------------------------------
    log('STEP 1', 'Starting Image Upload');
    if (!auctionData.images || !Array.isArray(auctionData.images) || auctionData.images.length === 0) {
      log('STEP 1', 'SKIP: No images provided.');
    } else {
      if (typeof ImageUploadSystem !== 'undefined') {
        const uploadSystem = new ImageUploadSystem();
        await uploadSystem.uploadImages(auctionData.images);
      } else {
        log('STEP 1', 'ERROR: ImageUploadSystem not found. Cannot upload images.');
      }
    }

    // ---------------------------------------------------------
    // STEP 2: TITLE
    // ---------------------------------------------------------
    log('STEP 2', 'Starting Title Paste');
    if (auctionData.title) {
        let titleInput = null;
        try {
            titleInput = await findElementWithSelectors([
              'input.textbox__control[maxlength="80"]', 'input[name="title"]',
              '#editpane-title input', '[data-testid="title-input"] input'
            ], 8000);
        } catch(e) {}
        if (titleInput) { titleInput.focus(); reactInput(titleInput, auctionData.title); await wait(300); }
    }

    // ---------------------------------------------------------
    // STEP 3: SKU
    // ---------------------------------------------------------
    log('STEP 3', 'Starting SKU Paste');
    if (auctionData.sku) {
        let skuInput = null;
        try {
            skuInput = await findElementWithSelectors([
              'input[name="customLabel"].textbox__control', 'input.textbox__control[name="customLabel"]',
              'input[name="customLabel"]', 'input[name="customLabel"][maxlength="50"]'
            ], 8000);
        } catch(e) {}
        if (skuInput) { skuInput.focus(); reactInput(skuInput, auctionData.sku); await wait(300); }
    }

    // ---------------------------------------------------------
    // STEP 4: EXISTING ITEM SPECIFICS
    // ---------------------------------------------------------
    log('STEP 4', 'Starting Existing Item Specifics (Required/Additional)');
    const unhandledSpecs = [];
    
    if (auctionData.specs && Array.isArray(auctionData.specs) && auctionData.specs.length > 0) {
      for (const spec of auctionData.specs) {
        if (!spec.name || !spec.value) continue;
        
        let foundField = null;
        try {
          const safeName = spec.name.replace(/"/g, '\\\"');
          foundField = document.querySelector(`input[aria-label="${safeName}" i], select[aria-label="${safeName}" i], input[name="${safeName}" i], select[name="${safeName}" i]`);
          
          if (!foundField) {
            const allLabels = Array.from(document.querySelectorAll('label, span, div'));
            const matchingLabel = allLabels.find(l => l.textContent && l.textContent.trim().toLowerCase() === spec.name.trim().toLowerCase());
            if (matchingLabel) {
              if (matchingLabel.hasAttribute('for')) foundField = document.getElementById(matchingLabel.getAttribute('for'));
              if (!foundField) {
                const container = matchingLabel.closest('div.item-specific, .form-group, div.fieldset') || matchingLabel.parentElement;
                if (container) foundField = container.querySelector('input:not([type="hidden"]), select, textarea');
              }
            }
          }
        } catch(e) {}

        if (foundField && foundField.offsetParent !== null && !foundField.disabled) {
          log('STEP 4', `Found existing eBay field for "${spec.name}". Filling it...`);
          foundField.focus();
          reactInput(foundField, spec.value);
          await wait(300);
        } else {
          // No existing field found on eBay page, save it for Step 5
          unhandledSpecs.push(spec);
        }
      }
    } else {
      log('STEP 4', 'SKIP: No specs provided.');
    }

    // ---------------------------------------------------------
    // STEP 5: CUSTOM ITEM SPECIFICS
    // ---------------------------------------------------------
    log('STEP 5', `Starting Custom Item Specifics (${unhandledSpecs.length} to add)`);
    if (unhandledSpecs.length > 0) {
        let addCustomBtn = null;
        try { 
            addCustomBtn = await findElementWithSelectors([
                'button:contains("Add custom item specific")',
                '[data-testid*="add-custom"]',
                'button[aria-label*="custom item specific" i]'
            ], 3000); 
        } catch(e) {
            const allBtns = Array.from(document.querySelectorAll('button, a'));
            addCustomBtn = allBtns.find(el => el.textContent && el.textContent.trim().toLowerCase().includes('add custom item specific'));
        }
        
        if (addCustomBtn) {
            for (const spec of unhandledSpecs) {
                addCustomBtn.click();
                await wait(800);
                
                try {
                    const nameInput = await findElementWithSelectors([
                        '[role="dialog"] input[aria-label*="name" i]',
                        '.modal input[name*="name" i]',
                        '[data-testid*="modal"] input'
                    ], 3000);
                    if (nameInput) reactInput(nameInput, spec.name);
                    
                    const valueInput = await findElementWithSelectors([
                        '[role="dialog"] input[aria-label*="value" i]',
                        '.modal input[name*="value" i]'
                    ], 2000);
                    if (valueInput) reactInput(valueInput, spec.value);
                    
                    const modal = nameInput ? (nameInput.closest('[role="dialog"]') || document.querySelector('.modal')) : null;
                    if (modal) {
                        const saveBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent && /save|done|add/i.test(b.textContent));
                        if (saveBtn) saveBtn.click();
                    }
                    await wait(600);
                } catch(e) { log('STEP 5', 'Failed to add custom spec: ' + spec.name); }
            }
        } else {
          log('STEP 5', 'ERROR: "Add custom item specific" button not found.');
        }
    }

    // ---------------------------------------------------------
    // STEP 6: CONDITION
    // ---------------------------------------------------------
    log('STEP 6', 'Starting Condition');
    let conditionField = null;
    try { 
        conditionField = await findElementWithSelectors([
            'select[name*="condition" i]', '[role="combobox"][aria-label*="condition" i]',
            'button[aria-label*="condition" i]', 'input[name*="condition" i]'
        ], 5000); 
    } catch(e) {}
    
    if (conditionField) {
        if (conditionField.tagName.toLowerCase() === 'select') {
          const options = Array.from(conditionField.options);
          const newOption = options.find(o => /new/i.test(o.text));
          if (newOption) { conditionField.value = newOption.value; conditionField.dispatchEvent(new Event('change', { bubbles: true })); }
        } else {
          conditionField.click();
          await wait(500);
          const optionList = Array.from(document.querySelectorAll('[role="option"], li, [class*="option"]'));
          const newOption = optionList.find(o => o.textContent && (/^new$/i.test(o.textContent.trim()) || /^brand new$/i.test(o.textContent.trim())));
          if (newOption) newOption.click();
        }
    }

    // ---------------------------------------------------------
    // STEP 7: DESCRIPTION
    // ---------------------------------------------------------
    log('STEP 7', 'Starting Description');
    if (auctionData.description) {
        let cleanedDesc = auctionData.description.replace(/amazon\.com|walmart\.com|ebay\.com/gi, '').replace(/ASIN|UPC|ISBN|Seller Rank|Sales Rank|Sold by|Fulfilled by|Available at/gi, '').replace(/https?:\/\/[^\s]+/gi, '').replace(/<img[^>]+src=["']?[^"'>]+["']?[^>]*>/gi, '');
        
        let descElement = null;
        try {
            descElement = await findElementWithSelectors([
                'iframe[id*="desc" i]', 'iframe[title*="description" i]',
                '[contenteditable="true"][aria-label*="desc" i]', 'textarea[name*="desc" i]'
            ], 8000);
        } catch(e) {}

        if (descElement) {
            if (descElement.tagName.toLowerCase() === 'iframe') {
                if (descElement.contentDocument) {
                    descElement.contentDocument.body.innerHTML = cleanedDesc;
                    descElement.contentDocument.body.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else if (descElement.hasAttribute('contenteditable')) {
                descElement.focus();
                descElement.innerHTML = cleanedDesc;
                descElement.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (descElement.tagName.toLowerCase() === 'textarea') {
                reactInput(descElement, cleanedDesc);
            }
        }
        await wait(400);
    }

    // ---------------------------------------------------------
    // STEP 8: PRICE
    // ---------------------------------------------------------
    log('STEP 8', 'Starting Item Price');
    if (auctionData.price) {
        let priceField = null;
        try { 
            priceField = await findElementWithSelectors([
                'input[name*="price" i]', 'input[id*="price" i]',
                '[aria-label*="price" i]', '[data-testid*="price" i]'
            ], 5000); 
        } catch(e) {}
        if (priceField) {
            const priceNum = parseFloat(auctionData.price);
            if (!isNaN(priceNum) && priceNum > 0) { priceField.focus(); reactInput(priceField, priceNum.toFixed(2)); await wait(300); }
        }
    }

    // ---------------------------------------------------------
    // STEP 9: COUNTRY
    // ---------------------------------------------------------
    log('STEP 9', 'Starting Country of Origin');
    let countryField = null;
    try { 
        countryField = await findElementWithSelectors([
            'select[name*="country" i]', '[role="combobox"][aria-label*="country" i]',
            '[data-testid*="country" i]', 'button[aria-label*="country" i]'
        ], 3000); 
    } catch(e) {}
    if (countryField) {
      if (countryField.tagName.toLowerCase() === 'select') {
        const usOption = Array.from(countryField.options).find(o => /united states/i.test(o.text));
        if (usOption) { countryField.value = usOption.value; countryField.dispatchEvent(new Event('change', { bubbles: true })); }
      } else {
        countryField.click();
        await wait(500);
        const usOption = Array.from(document.querySelectorAll('[role="option"], li, [class*="option"]')).find(o => o.textContent && /united states/i.test(o.textContent.trim()));
        if (usOption) usOption.click();
      }
    }

    await wait(500);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    log('COMPLETION', 'COMPLETE: All 9 steps finished.');
    if (typeof UIHelper !== 'undefined') UIHelper.showToast('eBay Automation Completed', 'success');

  } catch (error) {
    console.error('[eBay Agent] ERROR: ' + error.message);
  }
}

// 🔍 Page Readiness Check
// ─────────────────────────────────────────────
async function waitForPageReady() {
  console.log("⏳ Waiting for eBay listing page to be ready...");
  const maxWait = 15000; // 15 seconds max
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    // Check for key eBay listing page indicators
    const hasForm = document.querySelector('form') !== null;
    const hasInputs = document.querySelectorAll('input[type="text"], input[type="number"]').length > 0;
    const hasBody = document.body !== null;
    const hasInteractiveElements = document.querySelectorAll('button, input, select').length > 5;

    if (hasForm && hasInputs && hasBody && hasInteractiveElements) {
      const waitTime = Date.now() - startTime;
      console.log(`✅ Page ready detected after ${waitTime}ms`);
      return true;
    }

    await wait(500);
  }

  console.warn("⚠️ Page readiness timeout, continuing anyway...");
  return false;
}

// ─────────────────────────────────────────────
// 🏁 Message Listener
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  // Original RUN_EBAY_LISTER handler (preserved)
  if (request.action === "RUN_EBAY_LISTER") {
    console.log("🎯 RUN_EBAY_LISTER received, starting automation...");

    // Wait for page to be ready
    await waitForPageReady();
    await wait(2000); // Additional buffer

    const data = await chrome.storage.local.get([
      "ebayTitle", "ebayPrice", "ebaySku", "watermarkedImages", "imageUrls", "itemSpecifics",
      "productTitle", "pricingConfig", "amazonPrice", "selectedEbayDescription", "generatedDescription"
    ]);

    if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log("📦 Retrieved data from storage:", {
      hasTitle: !!(data.ebayTitle || data.productTitle),
      hasPrice: !!data.ebayPrice,
      hasSku: !!data.ebaySku,
      hasDescription: !!(data.selectedEbayDescription || data.generatedDescription),
      price: data.ebayPrice,
      sku: data.ebaySku,
      title: data.ebayTitle || data.productTitle
    });

    // Verify we have at least title
    if (!data.ebayTitle && !data.productTitle) {
      console.error("❌ No stored product title. Need to run List-It first.");
      return;
    }

    // Fallback price calculation if ebayPrice is missing
    let finalPrice = data.ebayPrice;
    if (!finalPrice && data.pricingConfig && data.amazonPrice) {
      console.log("💰 Calculating price from pricing config...");
      const { tax, trackingCost, ebayFee, promo, profit } = data.pricingConfig;
      finalPrice = (data.amazonPrice + trackingCost) * (1 + tax + ebayFee + profit - promo);
      finalPrice = finalPrice.toFixed(2);
      console.log(`💰 Calculated price: ${finalPrice}`);
    }

    if (!finalPrice) {
      console.warn("⚠️ No price available - price will not be filled");
    }

    if (!data.ebaySku) {
      console.warn("⚠️ No SKU available - SKU will not be filled");
    }

    // Get description from storage
    const ebayDescription = data.selectedEbayDescription || data.generatedDescription;
    if (!ebayDescription) {
      console.warn("⚠️ No description available - description will not be filled");
    }

    const title = data.ebayTitle || data.productTitle;

    await runEbayAutomation({
      ebayTitle: title,
      ebayPrice: finalPrice,
      ebaySku: data.ebaySku,
      ebayDescription: ebayDescription
    });

    console.log("✅ eBay automation completed");

    // Sync listing to dashboard database
    try {
      const syncData = await chrome.storage.local.get([
        "ebayTitle",
        "amazonPrice",
        "ebayPrice",
        "amazonURL",
        "sku",
        "productTitle",
        "amazonAsin",
        "ebaySku",
        // Full Amazon scrape payload (includes mainImage/allImages)
        "completeProductData",
        // Optional: some flows store images here
        "productImages",
      ]);
      
      const scraped = syncData?.completeProductData;
      const mainImage = scraped?.mainImage || (Array.isArray(scraped?.allImages) ? scraped.allImages[0] : null) || (Array.isArray(syncData?.productImages) ? syncData.productImages[0] : null);
      const allImages = Array.isArray(scraped?.allImages) ? scraped.allImages : (Array.isArray(syncData?.productImages) ? syncData.productImages : undefined);

      const listingData = {
        title: syncData.ebayTitle || syncData.productTitle || title,
        sku: syncData.sku || syncData.ebaySku || data.ebaySku,
        ebay_price: parseFloat(syncData.ebayPrice || finalPrice) || null,
        amazon_price: parseFloat(syncData.amazonPrice) || null,
        amazon_url: syncData.amazonURL || null,
        amazon_asin: syncData.amazonAsin || null,
        status: 'active',
        // Pass through existing scraped Amazon data (no business-logic changes)
        ...(mainImage || allImages ? {
          amazon_data: {
            ...(scraped && typeof scraped === 'object' ? scraped : {}),
            ...(mainImage ? { mainImage, imageUrl: mainImage } : {}),
            ...(allImages ? { allImages } : {}),
            source: 'extension',
          }
        } : {})
      };

      if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log("📤 Syncing listing to dashboard (hidden in prod)", listingData);

      const syncViaBackground = () => new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "SYNC_LISTING",
          payload: listingData
        }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              source: 'background',
              error: chrome.runtime.lastError.message || 'Background sync failed'
            });
            return;
          }
          resolve(response || { success: false, source: 'background', error: 'No background response' });
        });
      });

      let syncResult = null;

      // Use SyncUtils if available
      if (typeof window.SyncUtils !== 'undefined' && window.SyncUtils.syncListing) {
        try {
          syncResult = await window.SyncUtils.syncListing(listingData);
        } catch (syncUtilsErr) {
          syncResult = {
            success: false,
            source: 'sync_utils',
            error: syncUtilsErr?.message || 'SyncUtils threw an error'
          };
        }

        if (!syncResult?.success) {
          console.warn("⚠️ SyncUtils failed, trying background fallback:", syncResult?.error);
          syncResult = await syncViaBackground();
        }
      } else {
        syncResult = await syncViaBackground();
        console.log("📤 Sent SYNC_LISTING message to background script");
      }

      if (syncResult?.success) {
        console.log("✅ Listing synced to dashboard successfully:", syncResult);
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast('Listing synced to dashboard', 'success');
        }
      } else {
        const errorMessage = syncResult?.error || 'Unknown listing sync error';
        console.error("❌ Failed to sync listing after fallback:", syncResult);
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast(`Sync failed: ${errorMessage}`, 'error');
        }
        if (window.SyncUtils?.recordListingSyncError) {
          await window.SyncUtils.recordListingSyncError({
            source: syncResult?.source || 'ebay_lister',
            status: syncResult?.status || null,
            error: errorMessage,
            details: syncResult?.details || null,
            listingData
          });
        }
        if (window.SyncUtils?.syncQueue) {
          await window.SyncUtils.syncQueue.add({ type: 'listing', data: listingData });
        }
      }
    } catch (syncErr) {
      console.error("❌ Error syncing listing:", syncErr);
      if (window.SyncUtils?.recordListingSyncError) {
        await window.SyncUtils.recordListingSyncError({
          source: 'ebay_lister',
          error: syncErr?.message || 'Unexpected listing sync error'
        });
      }
    }

    // Log to Google Sheets after automation completes
    chrome.storage.local.get(["ebayTitle", "amazonPrice", "ebayPrice", "amazonURL", "sku"], (sheetData) => {
      chrome.runtime.sendMessage({
        action: "LOG_TO_SHEET",
        payload: {
          sku: sheetData.sku || "",
          title: sheetData.ebayTitle || "",
          amazon_price: sheetData.amazonPrice || "",
          ebay_price: sheetData.ebayPrice || "",
          amazon_url: sheetData.amazonURL || ""
        }
      });
    });
  }
});

window.debugSkuFields = function () {
  console.log("🔍 Debugging SKU fields...");

  const allTextInputs = document.querySelectorAll('input[type="text"]');
  console.log(`📝 Found ${allTextInputs.length} text inputs:`,
    Array.from(allTextInputs).map(input => ({
      name: input.name,
      id: input.id,
      placeholder: input.placeholder,
      ariaLabel: input.getAttribute('aria-label'),
      className: input.className,
      value: input.value
    }))
  );

  const allLabels = document.querySelectorAll('label');
  console.log(`🏷️ Found ${allLabels.length} labels:`,
    Array.from(allLabels).map(label => ({
      text: label.textContent?.trim(),
      for: label.getAttribute('for'),
      id: label.id
    }))
  );
};

// ─────────────────────────────────────────────
// 🔄 Continuous Condition Monitor for Listing Pages
// ─────────────────────────────────────────────
let conditionCheckInterval = null;

function startConditionMonitor() {
  if (conditionCheckInterval) return;
  
  const url = window.location.href;
  if (url.includes('/lstng') || url.includes('draftId=') || url.includes('mode=AddItem')) {
    console.log("👁️ Starting condition monitor for listing page...");
    
    conditionCheckInterval = setInterval(async () => {
      const conditionBtn = document.querySelector('button.condition-recommendation-value.btn');
      if (conditionBtn) {
        console.log("🎯 Condition button detected by monitor, clicking...");
        clearInterval(conditionCheckInterval);
        conditionCheckInterval = null;
        conditionBtn.click();
        await wait(800);
        await selectNewConditionFallback();
      }
    }, 2000);
    
    // Stop monitoring after 30 seconds
    setTimeout(() => {
      if (conditionCheckInterval) {
        clearInterval(conditionCheckInterval);
        conditionCheckInterval = null;
        console.log("⏱️ Condition monitor timeout - stopped watching");
      }
    }, 30000);
  }
}

function stopConditionMonitor() {
  if (conditionCheckInterval) {
    clearInterval(conditionCheckInterval);
    conditionCheckInterval = null;
  }
}

async function selectNewConditionFallback() {
  console.log("🎯 Selecting 'New' condition (condition-1000) as fallback...");
  
  // Try multiple selectors for condition-1000 (New)
  const selectors = [
    'input[value="1000"]',
    'input[id*="condition-1000"]',
    'input.radio_control[id*="condition-1000"]',
    '[data-value="1000"]',
    'input[name*="condition"][value="1000"]',
    'label[for*="condition-1000"]',
    '[id*="condition-side-pane"] input[value="1000"]',
    '[id*="condition-dialog"] input[value="1000"]',
    'input[type="radio"][value="1000"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      element.click();
      console.log(`✅ Selected 'New' condition using: ${selector}`);
      await wait(500);
      
      // Look for confirm/apply button
      await clickConditionConfirmButton();
      return true;
    }
  }
  
  // Fallback: text-based search for "New" option
  const allLabels = document.querySelectorAll('label, span, div[role="radio"], div[role="option"]');
  for (const label of allLabels) {
    const text = label.textContent?.trim().toLowerCase();
    if (text === 'new' || text === 'new with tags' || text === 'brand new') {
      const input = label.querySelector('input') || 
                    document.querySelector(`input[id="${label.getAttribute('for')}"]`) ||
                    label.closest('[role="radio"]');
      if (input) {
        input.click();
        console.log("✅ Selected 'New' condition via label text match");
        await wait(500);
        await clickConditionConfirmButton();
        return true;
      }
      label.click();
      console.log("✅ Clicked 'New' label directly");
      await wait(500);
      await clickConditionConfirmButton();
      return true;
    }
  }
  
  console.log("⚠️ Could not find 'New' condition option in fallback");
  return false;
}

async function clickConditionConfirmButton() {
  await wait(300);
  
  const confirmSelectors = [
    'button[class*="confirm"]',
    'button[class*="apply"]',
    'button[class*="save"]',
    'button[class*="done"]',
    '[data-test*="confirm"]',
    '[data-test*="apply"]'
  ];
  
  for (const selector of confirmSelectors) {
    const btn = document.querySelector(selector);
    if (btn) {
      btn.click();
      console.log(`✅ Clicked confirm button: ${selector}`);
      return;
    }
  }
  
  // Text-based fallback
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const text = btn.textContent?.toLowerCase();
    if (text?.includes('confirm') || text?.includes('apply') || text?.includes('done') || text?.includes('save')) {
      btn.click();
      console.log("✅ Clicked confirm button (text match)");
      return;
    }
  }
}

// ─────────────────────────────────────────────
// 🔁 Auto Start - Automatic Scenario Detection & Execution
// ─────────────────────────────────────────────
async function attemptAutoFill() {
  console.log("🔄 Attempting auto-detection on page load...");

  // Wait a bit for page to be ready
  await wait(2000);
  await waitForPageReady();

  const url = window.location.href;
  console.log("🔍 [attemptAutoFill] Fetching storage data...");
  
  const data = await chrome.storage.local.get([
    "ebayTitle", "ebayPrice", "ebaySku", "productTitle", 
    "selectedEbayDescription", "generatedDescription",
    "selectedEbayTitle", "selectedTitleTimestamp", "isBulkJob"
  ]);

  if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log("📦 [attemptAutoFill] Raw storage data:", {
    selectedEbayTitle: data.selectedEbayTitle ? data.selectedEbayTitle.substring(0, 50) + '...' : null,
    selectedTitleTimestamp: data.selectedTitleTimestamp,
    ebayTitle: data.ebayTitle ? data.ebayTitle.substring(0, 50) + '...' : null,
    productTitle: data.productTitle ? data.productTitle.substring(0, 50) + '...' : null,
    hasDescription: !!(data.selectedEbayDescription || data.generatedDescription)
  });

  const ebayDescription = data.selectedEbayDescription || data.generatedDescription;

  // Prioritize selectedEbayTitle (from popup) if it's recent (within 30 minutes)
  const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
  const selectedTitleIsRecent = data.selectedTitleTimestamp && 
                                 data.selectedTitleTimestamp >= thirtyMinutesAgo;
  
  const title = (selectedTitleIsRecent && data.selectedEbayTitle) || 
                data.ebayTitle || 
                data.productTitle;
  
  console.log("📋 [attemptAutoFill] Title selection:", {
    selectedEbayTitle: data.selectedEbayTitle ? data.selectedEbayTitle.substring(0, 50) + '...' : null,
    timestamp: data.selectedTitleTimestamp,
    isRecent: selectedTitleIsRecent,
    timeSinceSelection: data.selectedTitleTimestamp ? Math.round((Date.now() - data.selectedTitleTimestamp) / 1000) + 's ago' : 'N/A',
    fallbackTitle: (data.ebayTitle || data.productTitle) ? (data.ebayTitle || data.productTitle).substring(0, 50) + '...' : null,
    usingTitle: title ? title.substring(0, 50) + '...' : null
  });

  // Detect page type and auto-execute appropriate scenario
  // Prelist pages: /prelist/home, /prelist, sr=shListingsTopNav, s=rshListingsCTA
  const isPrelistPage = url.includes('prelist/home') || 
                        url.includes('prelist') || 
                        url.includes('sr=shListingsTopNav') || 
                        url.includes('s=rshListingsCTA');
  
  // Listing/Draft pages: /lstng, draftId=, mode=AddItem
  const isListingPage = url.includes('/lstng') || 
                        url.includes('draftId=') || 
                        url.includes('mode=AddItem');
  
  // General sell pages
  const isSellPage = url.includes('/sl/') || url.includes('/sell');

  if (isListingPage) {
    // Listing/Draft page - check condition first, then fill fields
    console.log("🎯 Detected eBay Listing/Draft page - checking condition and auto-filling...");
    
    // Start condition monitor for this page
    // Removed condition monitor
    
    // First, check and handle condition selection
    // Removed handleListingPageCondition
    
    // Then fill SKU/Price if available
    if (data.ebaySku || data.ebayPrice || ebayDescription) {
      console.log("✅ Found stored data, attempting auto-fill...", {
        hasSku: !!data.ebaySku,
        hasPrice: !!data.ebayPrice,
        hasDescription: !!ebayDescription
      });

      await runEbayAutomation({
        ebayTitle: title,
        ebayPrice: data.ebayPrice,
        ebaySku: data.ebaySku,
        ebayDescription: ebayDescription,
        isBulkJob: data.isBulkJob
      });
    } else {
      console.log("ℹ️ No SKU/Price/Description data found, skipping field auto-fill");
    }
  } else {
    console.log("ℹ️ Not on a recognized eBay page, waiting for manual trigger...");
  }
}

// URL change observer for SPA navigation
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log("🔄 URL changed, re-checking page type...");
    stopConditionMonitor(); // Stop old monitor
    setTimeout(attemptAutoFill, 1500);
    setTimeout(startConditionMonitor, 2000); // Start new monitor if needed
  }
});

// Start observing URL changes
urlObserver.observe(document.body, { childList: true, subtree: true });

// Auto-fill attempt after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(attemptAutoFill, 1000);
    setTimeout(startConditionMonitor, 1500);
    setTimeout(autoPasteSelectedTitle, 2000);
    setTimeout(autoPasteSelectedDescription, 3000);
  });
} else {
  setTimeout(attemptAutoFill, 2000);
  setTimeout(startConditionMonitor, 2500);
  setTimeout(autoPasteSelectedTitle, 3000);
  setTimeout(autoPasteSelectedDescription, 4000);
}

console.log("🚀 eBay Lister script initialized with auto-detection and condition fallback");

// ─────────────────────────────────────────────
// 🎯 Auto-Paste Selected Title on Page Load
// ─────────────────────────────────────────────
async function autoPasteSelectedTitle() {
  try {
    console.log('[autoPasteSelectedTitle] 🔍 Checking for selected title in storage...');
    
    // Check if we have a selected title in storage
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['selectedEbayTitle', 'selectedTitleTimestamp'], resolve);
    });

    console.log('[autoPasteSelectedTitle] 📦 Storage result:', {
      hasTitle: !!result.selectedEbayTitle,
      title: result.selectedEbayTitle ? result.selectedEbayTitle.substring(0, 50) + '...' : null,
      timestamp: result.selectedTitleTimestamp
    });

    const selectedTitle = result.selectedEbayTitle;
    const timestamp = result.selectedTitleTimestamp;

    if (!selectedTitle) {
      console.log('[autoPasteSelectedTitle] ℹ️ No selected title found for auto-paste');
      return;
    }

    // Check if the title is recent (within last 30 minutes)
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    if (timestamp && timestamp < thirtyMinutesAgo) {
      console.log('[autoPasteSelectedTitle] ⏰ Selected title is too old, skipping auto-paste');
      return;
    }

    console.log('[eBay Lister] Auto-pasting selected title:', selectedTitle);

    // Try to find and fill the eBay title input field
    const titleSelectors = [
      'input.textbox__control#s0-1-1-19-7-\\@keyword-\\@keywords-search-box-\\@keywords-box-\\@input-textbox',
      'input[id*="keyword"][id*="input-textbox"]',
      'input.textbox__control[maxlength="80"]',
      'input[name="title"]',
      'input[id*="title" i]',
      '#editpane-title input',
      '[data-testid="title-input"] input'
    ];

    // Wait for title input with retries
    let titleInput = null;
    let retries = 0;
    const maxRetries = 10;

    while (!titleInput && retries < maxRetries) {
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) {
          titleInput = el;
          console.log('[eBay Lister] Found title input with selector:', selector);
          break;
        }
      }

      if (!titleInput) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (titleInput) {
      // Only paste if the field is empty
      if (titleInput.value && titleInput.value.trim() !== '') {
        console.log('[eBay Lister] Title field already has content, skipping auto-paste');
        return;
      }

      // React-safe input
      const lastValue = titleInput.value;
      titleInput.focus();
      titleInput.value = selectedTitle;

      const inputEvent = new Event('input', { bubbles: true });
      const tracker = titleInput._valueTracker;
      if (tracker) tracker.setValue(lastValue);
      titleInput.dispatchEvent(inputEvent);
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      titleInput.dispatchEvent(new Event('blur', { bubbles: true }));

      console.log('[eBay Lister] ✅ Title auto-pasted successfully!');

      // Clear the selected title from storage after pasting
      chrome.storage.local.remove(['selectedEbayTitle', 'selectedTitleTimestamp'], () => {
        console.log('[eBay Lister] Cleared selected title from storage after auto-paste');
      });

    } else {
      console.warn('[eBay Lister] Could not find title input field for auto-paste');
    }
  } catch (error) {
    console.error('[eBay Lister] Auto-paste error:', error);
  }
}
// ─────────────────────────────────────────────
// 🎯 Message Handler: Paste Selected Title from Storage
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PASTE_SELECTED_TITLE') {
    console.log('[eBay Lister] Received PASTE_SELECTED_TITLE request');
    
    // Get selected title from storage
    chrome.storage.local.get(['selectedEbayTitle'], async (result) => {
      const selectedTitle = result.selectedEbayTitle;
      
      if (!selectedTitle) {
        console.warn('[eBay Lister] No selected title found in storage');
        sendResponse({ success: false, error: 'No title selected. Please generate and select a title first.' });
        return;
      }
      
      console.log('[eBay Lister] Pasting selected title:', selectedTitle);
      
      try {
        // Try to find and fill the eBay title input field
        const titleSelectors = [
          'input.textbox__control#s0-1-1-19-7-\\@keyword-\\@keywords-search-box-\\@keywords-box-\\@input-textbox',
          'input[id*="keyword"][id*="input-textbox"]',
          'input.textbox__control[maxlength="80"]',
          'input[name="title"]',
          'input[id*="title" i]',
          '#editpane-title input',
          '[data-testid="title-input"] input'
        ];
        
        let titleInput = null;
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.offsetParent !== null) {
            titleInput = el;
            console.log('[eBay Lister] Found title input with selector:', selector);
            break;
          }
        }
        
        if (titleInput) {
          // React-safe input
          const lastValue = titleInput.value;
          titleInput.focus();
          titleInput.value = selectedTitle;
          
          const inputEvent = new Event('input', { bubbles: true });
          const tracker = titleInput._valueTracker;
          if (tracker) tracker.setValue(lastValue);
          titleInput.dispatchEvent(inputEvent);
          titleInput.dispatchEvent(new Event('change', { bubbles: true }));
          titleInput.dispatchEvent(new Event('blur', { bubbles: true }));
          
          console.log('[eBay Lister] Title pasted successfully!');
          sendResponse({ success: true, title: selectedTitle });
        } else {
          console.warn('[eBay Lister] Could not find title input field');
          sendResponse({ success: false, error: 'Could not find title input field on this page.' });
        }
      } catch (error) {
        console.error('[eBay Lister] Error pasting title:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
    
    return true; // Keep message channel open for async response
  }
  
  // Handle GET_SELECTED_TITLE for checking if a title is selected
  if (request.action === 'GET_SELECTED_TITLE') {
    chrome.storage.local.get(['selectedEbayTitle', 'selectedTitleTimestamp'], (result) => {
      sendResponse({
        success: true,
        title: result.selectedEbayTitle || null,
        timestamp: result.selectedTitleTimestamp || null
      });
    });
    return true;
  }
  
  // Handle PASTE_DESCRIPTION for manual description paste
  if (request.action === 'PASTE_DESCRIPTION') {
    console.log('[eBay Lister] Received PASTE_DESCRIPTION request');
    
    chrome.storage.local.get(['selectedEbayDescription'], async (result) => {
      const description = result.selectedEbayDescription || request.description;
      
      if (!description) {
        console.warn('[eBay Lister] No description found');
        sendResponse({ success: false, error: 'No description available. Please generate a description first.' });
        return;
      }
      
      try {
        const success = await pasteDescriptionToEbay(description);
        sendResponse({ success });
      } catch (error) {
        console.error('[eBay Lister] Error pasting description:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
    
    return true;
  }
});

// ─────────────────────────────────────────────
// 🎯 Auto-Paste Selected Description on Page Load
// ─────────────────────────────────────────────
async function autoPasteSelectedDescription() {
  try {
    // Check if we have a selected description in storage
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['selectedEbayDescription', 'selectedDescriptionTimestamp'], resolve);
    });

    const selectedDescription = result.selectedEbayDescription;
    const timestamp = result.selectedDescriptionTimestamp;

    if (!selectedDescription) {
      console.log('[eBay Lister] No selected description found for auto-paste');
      return;
    }

    // Check if the description is recent (within last 30 minutes)
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    if (timestamp && timestamp < thirtyMinutesAgo) {
      console.log('[eBay Lister] Selected description is too old, skipping auto-paste');
      return;
    }

    console.log('[eBay Lister] Auto-pasting selected description...');
    
    const success = await pasteDescriptionToEbay(selectedDescription);
    
    if (success) {
      // Clear the selected description from storage after pasting
      chrome.storage.local.remove(['selectedEbayDescription', 'selectedDescriptionTimestamp'], () => {
        console.log('[eBay Lister] Cleared selected description from storage after auto-paste');
      });
    }
  } catch (error) {
    console.error('[eBay Lister] Description auto-paste error:', error);
  }
}

// ─────────────────────────────────────────────
// 🎯 Paste Description to eBay Editor
// Workflow: Check "Show HTML code" → Paste HTML into textarea → Uncheck
// ─────────────────────────────────────────────
async function pasteDescriptionToEbay(description) {
  console.log('[eBay Lister] 📝 Starting description paste workflow...');
  console.log('[eBay Lister] Description length:', description?.length || 0);
  
  // Selectors for the "Show HTML code" checkbox
  const checkboxSelectors = [
    'input.checkbox__control#s0-1-0-24-6-\\@DESCRIPTION-1-33-\\@rich-text-editor-1-36-9-2-descriptionEditorMode',
    'input[id*="descriptionEditorMode"]',
    'input[id*="EditorMode"]',
    'input[id*="rich-text-editor"][type="checkbox"]',
    'input[type="checkbox"][id*="DESCRIPTION"]',
    'input[type="checkbox"][id*="description"]',
    'input.checkbox__control[id*="editor"]',
    'input.checkbox__control[id*="Editor"]'
  ];
  
  // Selectors for the HTML textarea (appears when checkbox is checked)
  const htmlTextareaSelectors = [
    'textarea#se-rte-frame__summary',
    'textarea[id*="rte-frame"]',
    'textarea[id*="se-rte"]',
    'textarea[id*="description"]',
    'textarea[id*="DESCRIPTION"]',
    'textarea[name*="description"]',
    'textarea.rte-textarea',
    '.description-editor textarea',
    '[data-testid*="description"] textarea'
  ];
  
  let checkbox = null;
  let attempts = 0;
  const maxAttempts = 5;
  
  // ─────────────────────────────────────────────
  // STEP 1: Find the "Show HTML code" checkbox
  // ─────────────────────────────────────────────
  console.log('[eBay Lister] 🔍 [STEP 1] Searching for "Show HTML code" checkbox...');
  
  while (!checkbox && attempts < maxAttempts) {
    attempts++;
    console.log(`[eBay Lister] Checkbox search attempt ${attempts}/${maxAttempts}...`);
    
    // Method 1: Direct selectors
    for (const selector of checkboxSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          checkbox = el;
          console.log('[eBay Lister] ✅ Found checkbox with selector:', selector);
          break;
        }
      } catch (e) {
        // Selector might have special characters, continue
      }
    }
    
    // Method 2: Search by label text
    if (!checkbox) {
      const labels = document.querySelectorAll('label, span');
      for (const element of labels) {
        const text = (element.textContent || '').toLowerCase().trim();
        if (text === 'show html code' || text.includes('html code') || text.includes('show html')) {
          console.log(`[eBay Lister] 🔍 Found "Show HTML code" label: "${text}"`);
          
          // Check for associated checkbox via 'for' attribute
          const forAttr = element.getAttribute('for');
          if (forAttr) {
            const found = document.getElementById(forAttr);
            if (found && found.type === 'checkbox') {
              checkbox = found;
              console.log('[eBay Lister] ✅ Found checkbox via label for attribute');
              break;
            }
          }
          
          // Check parent for checkbox
          const parent = element.closest('label, div, span');
          if (parent) {
            const nearbyCheckbox = parent.querySelector('input[type="checkbox"]');
            if (nearbyCheckbox) {
              checkbox = nearbyCheckbox;
              console.log('[eBay Lister] ✅ Found checkbox near "Show HTML code" label');
              break;
            }
          }
          
          // Check previous sibling
          const prevSibling = element.previousElementSibling;
          if (prevSibling && prevSibling.type === 'checkbox') {
            checkbox = prevSibling;
            console.log('[eBay Lister] ✅ Found checkbox as previous sibling');
            break;
          }
        }
      }
    }
    
    // Method 3: Find checkbox in description section
    if (!checkbox) {
      const descSection = document.querySelector('[id*="DESCRIPTION"], [id*="description"]');
      if (descSection) {
        const sectionCheckboxes = descSection.querySelectorAll('input[type="checkbox"]');
        for (const cb of sectionCheckboxes) {
          const id = (cb.id || '').toLowerCase();
          if (id.includes('editor') || id.includes('mode')) {
            checkbox = cb;
            console.log('[eBay Lister] ✅ Found checkbox in description section:', cb.id);
            break;
          }
        }
      }
    }
    
    if (!checkbox) {
      await wait(500 * attempts);
    }
  }
  
  if (!checkbox) {
    console.error('[eBay Lister] ❌ Could not find "Show HTML code" checkbox');
    return false;
  }
  
  // ─────────────────────────────────────────────
  // STEP 2: Check the "Show HTML code" checkbox
  // ─────────────────────────────────────────────
  const wasChecked = checkbox.checked;
  console.log('[eBay Lister] 🔍 [STEP 2] Checkbox state - wasChecked:', wasChecked);
  
  if (!wasChecked) {
    console.log('[eBay Lister] ✅ Checking "Show HTML code" checkbox...');
    
    // Scroll into view if needed
    checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(300);
    
    // Click the checkbox to enable HTML mode
    checkbox.click();
    
    // Also dispatch events for React/eBay framework
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Wait for textarea to appear
    await wait(1500);
    console.log('[eBay Lister] ✅ HTML mode enabled, waiting for textarea...');
  }
  
  // ─────────────────────────────────────────────
  // STEP 3: Find and fill the HTML textarea
  // ─────────────────────────────────────────────
  console.log('[eBay Lister] 🔍 [STEP 3] Searching for HTML textarea...');
  
  let textarea = null;
  attempts = 0;
  
  while (!textarea && attempts < maxAttempts) {
    attempts++;
    console.log(`[eBay Lister] Textarea search attempt ${attempts}/${maxAttempts}...`);
    
    // Try textarea selectors
    for (const selector of htmlTextareaSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) {
          textarea = el;
          console.log('[eBay Lister] ✅ Found textarea with selector:', selector);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Fallback: Find any visible textarea in description section
    if (!textarea) {
      const descSection = document.querySelector('[id*="DESCRIPTION"], [id*="description"]');
      if (descSection) {
        const textareas = descSection.querySelectorAll('textarea');
        for (const ta of textareas) {
          if (ta.offsetParent !== null) {
            textarea = ta;
            console.log('[eBay Lister] ✅ Found textarea in description section');
            break;
          }
        }
      }
    }
    
    // Fallback: Find any visible textarea on page that's for description
    if (!textarea) {
      const allTextareas = document.querySelectorAll('textarea');
      for (const ta of allTextareas) {
        if (ta.offsetParent !== null) {
          const id = (ta.id || '').toLowerCase();
          const name = (ta.name || '').toLowerCase();
          const placeholder = (ta.placeholder || '').toLowerCase();
          
          if (id.includes('description') || id.includes('rte') || 
              name.includes('description') || placeholder.includes('html')) {
            textarea = ta;
            console.log('[eBay Lister] ✅ Found description textarea by attributes');
            break;
          }
        }
      }
    }
    
    if (!textarea) {
      await wait(500 * attempts);
    }
  }
  
  if (!textarea) {
    console.error('[eBay Lister] ❌ Could not find HTML textarea');
    // Restore checkbox state
    if (!wasChecked && checkbox.checked) {
      checkbox.click();
    }
    return false;
  }
  
  // ─────────────────────────────────────────────
  // STEP 4: Paste HTML description into textarea
  // ─────────────────────────────────────────────
  console.log('[eBay Lister] 📝 [STEP 4] Pasting HTML description into textarea...');
  
  try {
    // Focus the textarea
    textarea.focus();
    
    // Clear existing content
    textarea.value = '';
    
    // Use React-safe input method
    const lastValue = textarea.value;
    textarea.value = description;
    
    const event = new Event('input', { bubbles: true });
    const tracker = textarea._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    
    textarea.dispatchEvent(event);
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.dispatchEvent(new Event('blur', { bubbles: true }));
    
    // Verify the value was set
    if (textarea.value.length > 0) {
      console.log('[eBay Lister] ✅ HTML description pasted successfully! Length:', textarea.value.length);
    } else {
      console.warn('[eBay Lister] ⚠️ Textarea value may not have been set correctly');
    }
  } catch (error) {
    console.error('[eBay Lister] ❌ Error pasting description:', error);
    // Restore checkbox state
    if (!wasChecked && checkbox.checked) {
      checkbox.click();
    }
    return false;
  }
  
  // ─────────────────────────────────────────────
  // STEP 5: Uncheck "Show HTML code" checkbox (return to visual mode)
  // ─────────────────────────────────────────────
  await wait(800);
  
  console.log('[eBay Lister] 🔄 [STEP 5] Unchecking "Show HTML code" checkbox...');
  
  if (checkbox.checked) {
    checkbox.click();
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(500);
    console.log('[eBay Lister] ✅ Returned to visual mode');
  }
  
  console.log('[eBay Lister] ✅ Description paste workflow completed successfully!');
  return true;
}
