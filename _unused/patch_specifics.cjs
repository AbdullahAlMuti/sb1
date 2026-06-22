const fs = require('fs');
const file = 'apps/extension/content_scripts/ebay_lister.js';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const startLine = 449; // index 449 is line 450
const endLine = 840; // index 840 is line 841

const updatedLogicLines = `async function runEbayAutomation(data) {
  if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('🚀 Starting eBay automation with data (hidden in prod)', data);

  const storageData = await chrome.storage.local.get(['watermarkedImages', 'imageUrls', 'itemSpecifics']);
  
  const auctionData = {
    title: data.ebayTitle || '',
    sku: data.ebaySku || '',
    price: data.ebayPrice,
    images: data.ebayImages || storageData.watermarkedImages || storageData.imageUrls || [],
    description: data.ebayDescription || '',
    specs: data.itemSpecifics || storageData.itemSpecifics || []
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
      let fileInput = null;
      try {
        fileInput = await findElementWithSelectors([
          'input[type="file"][accept*="image"]', 'input[type="file"]',
          '[data-testid*="photo"] input[type="file"]', '[aria-label*="photo" i] input[type="file"]'
        ], 5000);
      } catch(e) {}
      if (fileInput) {
        const dt = new DataTransfer();
        for (const imgPath of auctionData.images) {
          try {
            const res = await fetch(imgPath);
            const blob = await res.blob();
            dt.items.add(new File([blob], imgPath.split('/').pop() || 'image.jpg', { type: blob.type }));
          } catch (e) {}
        }
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
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
          const safeName = spec.name.replace(/"/g, '\\\\\\"');
          foundField = document.querySelector(\`input[aria-label="\${safeName}" i], select[aria-label="\${safeName}" i], input[name="\${safeName}" i], select[name="\${safeName}" i]\`);
          
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
          log('STEP 4', \`Found existing eBay field for "\${spec.name}". Filling it...\`);
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
    log('STEP 5', \`Starting Custom Item Specifics (\${unhandledSpecs.length} to add)\`);
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
        let cleanedDesc = auctionData.description.replace(/amazon\\.com|walmart\\.com|ebay\\.com/gi, '').replace(/ASIN|UPC|ISBN|Seller Rank|Sales Rank|Sold by|Fulfilled by|Available at/gi, '').replace(/https?:\\/\\/[^\\s]+/gi, '').replace(/<img[^>]+src=["']?[^"'>]+["']?[^>]*>/gi, '');
        
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
`.split('\n');

lines.splice(startLine, endLine - startLine + 1, ...updatedLogicLines);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Successfully patched Step 4 & 5 Logic!');
