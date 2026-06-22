const fs = require('fs');
const file = 'apps/extension/content_scripts/ebay_lister.js';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const startLine = 449; // index 449 is line 450
const endLine = 840; // index 840 is line 841

const updatedLogicLines = `async function runEbayAutomation(data) {
  if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('🚀 Starting eBay automation with data (hidden in prod)', data);

  // Fetch additional data from storage (images, specs) if not provided
  const storageData = await chrome.storage.local.get(['watermarkedImages', 'imageUrls', 'itemSpecifics']);
  
  const auctionData = {
    title: data.ebayTitle || '',
    sku: data.ebaySku || '',
    price: data.ebayPrice,
    images: data.ebayImages || storageData.watermarkedImages || storageData.imageUrls || [],
    description: data.ebayDescription || '',
    specs: data.itemSpecifics || storageData.itemSpecifics || []
  };

  // Utility: React-safe setter
  const reactInput = (el, value) => {
    const lastValue = el.value;
    el.value = value;
    const event = new Event('input', { bubbles: true });
    const tracker = el._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    el.dispatchEvent(event);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  function log(step, message) { console.log('[eBay Agent] [' + step + ']: ' + message); }

  try {
    // ---------------------------------------------------------
    // STEP 1: IMAGES
    // ---------------------------------------------------------
    log('STEP 1', 'Starting Image Upload');
    if (!auctionData.images || !Array.isArray(auctionData.images) || auctionData.images.length === 0) {
      log('STEP 1', 'SKIP: No images provided. Continuing.');
    } else {
      let fileInput = null;
      try {
        fileInput = await findElementWithSelectors([
          'input[type="file"][accept*="image"]',
          'input[type="file"]',
          '[data-testid*="photo"] input[type="file"]',
          '[aria-label*="photo" i] input[type="file"]',
          '[aria-label*="image" i] input[type="file"]'
        ], 5000);
      } catch(e) {}
      
      if (!fileInput) { log('STEP 1', 'ERROR: Image upload input not found. Skipping.'); }
      else {
        const dt = new DataTransfer();
        for (const imgPath of auctionData.images) {
          try {
            const res = await fetch(imgPath);
            const blob = await res.blob();
            const fileName = imgPath.split('/').pop() || 'image.jpg';
            const file = new File([blob], fileName, { type: blob.type });
            dt.items.add(file);
          } catch (e) { log('STEP 1', 'Failed to fetch image: ' + imgPath); }
        }
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));

        try {
          const startTime = Date.now();
          let confirmed = false;
          while (Date.now() - startTime < 10000) {
            const blobImgs = document.querySelectorAll('img[src^="blob:"]');
            const thumbnails = document.querySelectorAll('.thumbnail, [class*="thumbnail"]');
            if (blobImgs.length > 0 || thumbnails.length > 0) { confirmed = true; break; }
            await wait(500);
          }
          if (!confirmed) log('STEP 1', 'WARNING: Image upload confirmation not detected. Proceeding anyway.');
        } catch (e) {}
        await wait(1000);
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
              'input.textbox__control[maxlength="80"]',
              'input[name="title"]',
              'input[id*="title" i]',
              '#editpane-title input',
              '[data-testid="title-input"] input',
              'input[aria-label*="title" i]'
            ], 8000);
        } catch(e) {}
        
        if (!titleInput) { log('STEP 2', 'ERROR: Title field not found. Skipping.'); }
        else {
            if (titleInput.value && titleInput.value.trim() !== '') {
                log('STEP 2', 'Title field already has content, overwriting...');
            }
            reactInput(titleInput, auctionData.title);
            await wait(300);
        }
    }

    // ---------------------------------------------------------
    // STEP 3: SKU
    // ---------------------------------------------------------
    log('STEP 3', 'Starting SKU Paste');
    if (auctionData.sku) {
        let skuInput = null;
        try {
            skuInput = await findElementWithSelectors([
              'input[name="customLabel"].textbox__control',
              'input.textbox__control[name="customLabel"]',
              'input[name="customLabel"]',
              'input[type="text"][name="customLabel"]',
              'input[name="customLabel"][maxlength="50"]',
              'input.textbox__control[maxlength="50"]',
              'input[id*="customLabel" i]',
              'input[id*="custom-label" i]',
              'input[aria-label*="custom" i]',
              'input[aria-label*="sku" i]',
              'input[placeholder*="sku" i]',
              'input[data-testid*="sku" i]'
            ], 8000);
        } catch(e) {}
        
        if (!skuInput) log('STEP 3', 'SKIP: SKU field not found. Continuing.');
        else { 
            reactInput(skuInput, auctionData.sku); 
            await wait(300); 
        }
    }

    // ---------------------------------------------------------
    // STEP 4: ADDITIONAL OPTIONAL ITEM SPECIFICS
    // ---------------------------------------------------------
    log('STEP 4', 'Starting Additional Optional Item Specifics');
    let sectionElement = null;
    const labels = Array.from(document.querySelectorAll('h2,h3,h4,legend,label,div,span'));
    sectionElement = labels.find(el => el.textContent && el.textContent.trim().toLowerCase().includes('additional') && el.textContent.trim().toLowerCase().includes('optional'));
    
    if (!sectionElement) log('STEP 4', 'SKIP: Additional optional section not found. Continuing.');
    else {
      let checkboxesClicked = 0;
      const container = sectionElement.parentElement || document.body;
      const unchecked = container.querySelectorAll('input[type="checkbox"]:not(:checked)');
      for (let i = 0; i < unchecked.length; i++) {
        if (checkboxesClicked >= 5) break;
        if (unchecked[i].offsetParent !== null) {
            unchecked[i].click();
            checkboxesClicked++;
            await wait(300);
        }
      }
    }

    // ---------------------------------------------------------
    // STEP 5: CUSTOM ITEM SPECIFICS
    // ---------------------------------------------------------
    log('STEP 5', 'Starting Custom Item Specifics');
    if (!auctionData.specs || !Array.isArray(auctionData.specs) || auctionData.specs.length === 0) {
        log('STEP 5', 'SKIP: No custom specs provided. Continuing.');
    } else {
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
        
        if (!addCustomBtn) log('STEP 5', 'SKIP: Add custom item specific button not found.');
        else {
            for (const spec of auctionData.specs) {
                if (!spec.value) continue;
                addCustomBtn.click();
                await wait(600);
                
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
                    
                    const modal = nameInput.closest('[role="dialog"]') || document.querySelector('.modal');
                    if (modal) {
                        const saveBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent && /save|done|add/i.test(b.textContent));
                        if (saveBtn) saveBtn.click();
                    }
                    await wait(500);
                } catch(e) { log('STEP 5', 'Failed to add custom spec: ' + spec.name); }
            }
        }
    }

    // ---------------------------------------------------------
    // STEP 6: CONDITION
    // ---------------------------------------------------------
    log('STEP 6', 'Starting Condition');
    let conditionField = null;
    try { 
        conditionField = await findElementWithSelectors([
            'select[name*="condition" i]',
            '[role="combobox"][aria-label*="condition" i]',
            '[data-testid*="condition" i]',
            'button.condition-recommendation-value'
        ], 5000); 
    } catch(e) {}
    
    if (!conditionField) { log('STEP 6', 'ERROR: Condition field not found. Skipping.'); }
    else {
        if (conditionField.tagName.toLowerCase() === 'select') {
          const options = Array.from(conditionField.options);
          const newOption = options.find(o => /new/i.test(o.text));
          if (newOption) { conditionField.value = newOption.value; conditionField.dispatchEvent(new Event('change', { bubbles: true })); }
        } else if (conditionField.getAttribute('role') === 'combobox' || conditionField.getAttribute('role') === 'listbox' || conditionField.tagName.toLowerCase() === 'button') {
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
        let cleanedDesc = auctionData.description.replace(/amazon\\.com|walmart\\.com|ebay\\.com/gi, '').replace(/ASIN|UPC|ISBN|Seller Rank|Sales Rank|Sold by|Fulfilled by|Available at/gi, '').replace(/https?:\\/\\/[^\\s]+/gi, '').replace(/<img[^>]+src=["']?[^"'>]+["']?[^>]*>/gi, '');
        
        // Wait for iframe or textbox
        let descElement = null;
        try {
            descElement = await findElementWithSelectors([
                'iframe[id*="desc" i]',
                'iframe[title*="description" i]',
                '[contenteditable="true"][aria-label*="desc" i]',
                'textarea[name*="desc" i]'
            ], 8000);
        } catch(e) {}

        if (!descElement) {
            log('STEP 7', 'ERROR: Description field not found. Skipping.');
        } else {
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
                'input[name*="price" i]',
                'input[id*="price" i]',
                '[aria-label*="price" i]',
                '[data-testid*="price" i]'
            ], 5000); 
        } catch(e) {}
        
        if (!priceField) { log('STEP 8', 'ERROR: Price field not found. Skipping.'); }
        else {
            const priceNum = parseFloat(auctionData.price);
            if (!isNaN(priceNum) && priceNum > 0) {
                reactInput(priceField, priceNum.toFixed(2));
                await wait(300);
            }
        }
    }

    // ---------------------------------------------------------
    // STEP 9: COUNTRY
    // ---------------------------------------------------------
    log('STEP 9', 'Starting Country of Origin');
    let countryField = null;
    try { 
        countryField = await findElementWithSelectors([
            'select[name*="country" i]',
            '[role="combobox"][aria-label*="country" i]',
            '[data-testid*="country" i]'
        ], 3000); 
    } catch(e) {}
    
    if (countryField) {
      if (countryField.tagName.toLowerCase() === 'select') {
        const options = Array.from(countryField.options);
        const usOption = options.find(o => /united states/i.test(o.text));
        if (usOption) { countryField.value = usOption.value; countryField.dispatchEvent(new Event('change', { bubbles: true })); }
      } else if (countryField.getAttribute('role') === 'combobox' || countryField.getAttribute('role') === 'listbox') {
        countryField.click();
        await wait(500);
        const optionList = Array.from(document.querySelectorAll('[role="option"], li, [class*="option"]'));
        const usOption = optionList.find(o => o.textContent && /united states/i.test(o.textContent.trim()));
        if (usOption) usOption.click();
      }
    } else { log('STEP 9', 'SKIP: Country field not found.'); }

    await wait(500);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    log('COMPLETION', 'COMPLETE: All 9 steps finished. Form is ready for review.');
    if (typeof UIHelper !== 'undefined') UIHelper.showToast('eBay Automation Completed', 'success');

  } catch (error) {
    console.error('[eBay Agent] ERROR: ' + error.message);
    if (typeof UIHelper !== 'undefined') UIHelper.showToast('Automation Error: ' + error.message, 'error');
  }
}
`.split('\n');

lines.splice(startLine, endLine - startLine + 1, ...updatedLogicLines);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Successfully patched runEbayAutomation securely with findElementWithSelectors!');
