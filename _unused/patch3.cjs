const fs = require('fs');
const file = 'apps/extension/content_scripts/ebay_lister.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const startLine = 505; // index 505 is line 506
const endLine = 730; // index 730 is line 731

const updatedLogicLines = `  try {
    log('STEP 1', 'Starting Image Upload');
    if (!auctionData.images || !Array.isArray(auctionData.images) || auctionData.images.length === 0) {
      log('STEP 1', 'SKIP: No images provided. Continuing.');
    } else {
      let fileInput = null;
      try {
        fileInput = await waitFor(() => document.querySelector('input[type="file"][accept*="image"]') ||
                        document.querySelector('input[type="file"]') ||
                        document.querySelector('[data-testid*="photo"] input[type="file"]') ||
                        document.querySelector('[aria-label*="photo" i] input[type="file"]') ||
                        document.querySelector('[aria-label*="image" i] input[type="file"]'), 5000);
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
          while (Date.now() - startTime < 30000) {
            const blobImgs = document.querySelectorAll('img[src^="blob:"]');
            const thumbnails = document.querySelectorAll('.thumbnail, [class*="thumbnail"]');
            const countIndicators = Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.match(/\\d+ photo[s]? added/i));
            if (blobImgs.length > 0 || thumbnails.length > 0 || countIndicators) { confirmed = true; break; }
            await wait(500);
          }
          if (!confirmed) log('STEP 1', 'WARNING: Image upload confirmation not detected. Proceeding anyway.');
        } catch (e) { log('STEP 1', 'WARNING: Image upload confirmation not detected. Proceeding anyway.'); }
        await wait(1000);
      }
    }

    log('STEP 2', 'Starting Title Paste');
    if (auctionData.title) {
        let titleElement = null;
        try {
            titleElement = await waitFor(() => findByLabel('title') || document.querySelector('[aria-label*="title" i]') || document.querySelector('[placeholder*="title" i]') || document.querySelector('[name*="title" i]') || document.querySelector('[data-testid*="title" i]'), 15000);
        } catch(e) {}
        
        if (!titleElement) {
            log('STEP 2', 'ERROR: Title field not found. Skipping.');
        } else {
            await fillInput(titleElement, auctionData.title);
            if (titleElement.value !== auctionData.title) await fillInput(titleElement, auctionData.title);
            if (titleElement.value !== auctionData.title) log('STEP 2', 'WARNING: Title field value mismatch.');
            await wait(300);
        }
    }

    log('STEP 3', 'Starting SKU Paste');
    if (auctionData.sku) {
        let skuElement = null;
        try {
            skuElement = await waitFor(() => findByLabel('custom label') || findByLabel('sku') || document.querySelector('[aria-label*="custom label" i]') || document.querySelector('[aria-label*="sku" i]') || document.querySelector('[placeholder*="custom label" i]') || document.querySelector('[placeholder*="sku" i]'), 15000);
        } catch(e) {}
        
        if (!skuElement) log('STEP 3', 'SKIP: SKU field not found. Continuing.');
        else { await fillInput(skuElement, auctionData.sku); await wait(300); }
    }

    log('STEP 4', 'Starting Additional Optional Item Specifics');
    let sectionElement = null;
    try {
        sectionElement = await waitFor(() => Array.from(document.querySelectorAll('h2,h3,h4,legend,label,div,span')).find(el => el.textContent && el.textContent.trim().toLowerCase().includes('additional') && el.textContent.trim().toLowerCase().includes('optional')), 5000);
    } catch(e) {}
    
    if (!sectionElement) log('STEP 4', 'SKIP: Additional optional section not found. Continuing.');
    else {
      let checkboxesClicked = 0;
      const container = sectionElement.parentElement || document.body;
      async function handleCheckboxes(ctx) {
        const unchecked = ctx.querySelectorAll('input[type="checkbox"]:not(:checked)');
        if (unchecked.length > 0) {
          for (let i = 0; i < unchecked.length; i++) {
            if (checkboxesClicked >= 5) break;
            await clickAndWait(unchecked[i], 300);
            checkboxesClicked++;
            log('STEP 4', 'Clicked checkbox ' + checkboxesClicked);
          }
        } else {
          const firstItem = ctx.querySelector('button, [role="option"], li, label');
          if (firstItem && checkboxesClicked < 5) { await clickAndWait(firstItem, 400); checkboxesClicked++; log('STEP 4', 'Clicked first available option'); }
        }
      }
      await handleCheckboxes(container);
      const showMoreBtn = Array.from(document.querySelectorAll('button, a, span')).find(el => el.textContent && (el.textContent.trim().toLowerCase() === 'show more' || el.textContent.trim().toLowerCase().includes('show more')));
      if (showMoreBtn) { await clickAndWait(showMoreBtn, 1000); await wait(800); await handleCheckboxes(container); }
    }

    log('STEP 5', 'Starting Custom Item Specifics');
    const SKIP_LIST = ['asin', 'amazon', 'walmart', 'ebay', 'url', 'link', 'seller rank', 'sales rank', 'upc', 'isbn', 'marketplace', 'fulfilled by', 'sold by', 'brand'];
    if (!auctionData.specs || !Array.isArray(auctionData.specs) || auctionData.specs.length === 0) log('STEP 5', 'SKIP: No custom specs provided. Continuing.');
    else {
      const addedNames = new Set();
      document.querySelectorAll('label, [class*="label"], th, [class*="name"]').forEach(el => { if (el.textContent) addedNames.add(el.textContent.trim().toLowerCase()); });
      
      let addCustomBtn = null;
      try {
        addCustomBtn = await waitFor(() => Array.from(document.querySelectorAll('button, a')).find(el => el.textContent && el.textContent.trim().toLowerCase().includes('add custom item specific')), 5000);
      } catch(e) {}
      
      if (!addCustomBtn) log('STEP 5', 'SKIP: Add custom item specific button not found. Continuing.');
      else {
        for (const spec of auctionData.specs) {
          if (!spec.value) continue;
          const specNameLower = spec.name.toLowerCase();
          if (SKIP_LIST.includes(specNameLower) && !(specNameLower === 'upc' && /^\\d{12}$/.test(spec.value))) {
            if (specNameLower === 'brand') { if (addedNames.has('brand')) continue; } else continue;
          }
          if (addedNames.has(specNameLower)) continue;
          await clickAndWait(addCustomBtn, 600);
          let modal;
          try { modal = await waitFor('[role="dialog"], .modal, [data-testid*="modal"]', 8000); } catch (e) { log('STEP 5', 'ERROR: Modal did not open for spec: ' + spec.name + '. Skipping this spec.'); continue; }
          const nameInput = modal.querySelector('[aria-label*="name" i], [placeholder*="name" i], input[name*="name" i]');
          if (nameInput) await fillInput(nameInput, spec.name);
          await wait(200);
          const valueInput = modal.querySelector('[aria-label*="value" i], [placeholder*="value" i], input[name*="value" i]');
          if (valueInput) await fillInput(valueInput, spec.value);
          await wait(200);
          const saveBtn = modal.querySelector('button[type="submit"], button[aria-label*="save" i], button[aria-label*="done" i]') || Array.from(modal.querySelectorAll('button')).find(b => b.textContent && /save|done|add/i.test(b.textContent));
          if (saveBtn) await clickAndWait(saveBtn, 400);
          try {
            const startCloseTime = Date.now();
            while (Date.now() - startCloseTime < 6000) { if (!document.contains(modal) || modal.style.display === 'none' || modal.hidden === true) break; await wait(200); }
          } catch (e) {}
          addedNames.add(specNameLower);
          await wait(300);
        }
      }
    }

    log('STEP 6', 'Starting Condition');
    let conditionField = null;
    try {
        conditionField = await waitFor(() => findByLabel('condition') || document.querySelector('[aria-label*="condition" i]') || document.querySelector('[data-testid*="condition" i]'), 10000);
    } catch(e) {}
    
    if (!conditionField) {
        log('STEP 6', 'ERROR: Condition field not found. Skipping.');
    } else {
        if (conditionField.tagName.toLowerCase() === 'select') {
          const options = Array.from(conditionField.options);
          const newOption = options.find(o => /new/i.test(o.text));
          if (newOption) { conditionField.value = newOption.value; conditionField.dispatchEvent(new Event('change', { bubbles: true })); }
        } else if (conditionField.getAttribute('role') === 'combobox' || conditionField.getAttribute('role') === 'listbox') {
          await clickAndWait(conditionField, 500);
          const optionList = Array.from(document.querySelectorAll('[role="option"], li, [class*="option"]'));
          const newOption = optionList.find(o => o.textContent && (/^new$/i.test(o.textContent.trim()) || /^brand new$/i.test(o.textContent.trim())));
          if (newOption) await clickAndWait(newOption, 400);
        } else if (conditionField.type === 'radio' || document.querySelector('input[type="radio"][name*="condition" i]')) {
          const radios = document.querySelectorAll('input[type="radio"]');
          for (const radio of radios) {
            const label = document.querySelector('label[for="' + radio.id + '"]') || radio.closest('label');
            if (label && label.textContent && /new/i.test(label.textContent)) { await clickAndWait(radio, 300); break; }
          }
        }
        const currentConditionValue = (conditionField.value || conditionField.textContent || '').toLowerCase();
        if (!/new/i.test(currentConditionValue)) log('STEP 6', 'ERROR: Condition could not be set to New. Current value: ' + currentConditionValue);
        else log('STEP 6', 'Condition confirmed as New.');
    }

    log('STEP 7', 'Starting Description');
    if (auctionData.description) {
        let cleanedDesc = auctionData.description.replace(/amazon\\.com|walmart\\.com|ebay\\.com/gi, '').replace(/ASIN|UPC|ISBN|Seller Rank|Sales Rank|Sold by|Fulfilled by|Available at/gi, '').replace(/https?:\\/\\/[^\\s]+/gi, '').replace(/<img[^>]+src=["']?[^"'>]+["']?[^>]*>/gi, '');
        let typeAHandled = false;
        
        let iframeDesc = null;
        try {
            iframeDesc = await waitFor(() => document.querySelector('iframe[id*="desc"], iframe[title*="description" i], iframe[aria-label*="description" i]'), 15000);
        } catch(e) {}
        
        if (iframeDesc && iframeDesc.contentDocument) { iframeDesc.contentDocument.body.innerHTML = cleanedDesc; iframeDesc.contentDocument.body.dispatchEvent(new Event('input', { bubbles: true })); iframeDesc.contentDocument.body.dispatchEvent(new Event('change', { bubbles: true })); typeAHandled = true; await wait(400); }
        let typeBHandled = false;
        if (!typeAHandled) {
            let contentEditableDesc = document.querySelector('[contenteditable="true"][aria-label*="desc" i], [contenteditable="true"][data-testid*="desc" i], [role="textbox"][aria-label*="desc" i]');
            if (contentEditableDesc) { contentEditableDesc.focus(); contentEditableDesc.innerHTML = cleanedDesc; contentEditableDesc.dispatchEvent(new Event('input', { bubbles: true })); contentEditableDesc.dispatchEvent(new Event('change', { bubbles: true })); typeBHandled = true; await wait(400); }
        }
        if (!typeAHandled && !typeBHandled) {
            let textareaDesc = findByLabel('description') || document.querySelector('textarea[name*="desc" i], textarea[id*="desc" i]');
            if (textareaDesc) { await fillInput(textareaDesc, cleanedDesc); } else log('STEP 7', 'ERROR: Description field not found. Skipping.');
        }
        await wait(400);
        chrome.storage.local.remove(['selectedEbayDescription', 'selectedDescriptionTimestamp']);
    }

    log('STEP 8', 'Starting Item Price');
    if (auctionData.price) {
        let priceField = null;
        try {
            priceField = await waitFor(() => findByLabel('price') || document.querySelector('[aria-label*="price" i]') || document.querySelector('[data-testid*="price" i]') || document.querySelector('[placeholder*="price" i]') || document.querySelector('input[name*="price" i]'), 10000);
        } catch(e) {}
        
        if (!priceField) {
            log('STEP 8', 'ERROR: Price field not found. Skipping.');
        } else {
            const priceNum = parseFloat(auctionData.price);
            if (isNaN(priceNum) || priceNum <= 0) {
                log('STEP 8', 'ERROR: Invalid price value. Skipping.');
            } else {
                const formattedPrice = priceNum.toFixed(2);
                await fillInput(priceField, formattedPrice);
                if (!priceField.value.includes(formattedPrice)) await fillInput(priceField, formattedPrice);
                await wait(300);
            }
        }
    }

    log('STEP 9', 'Starting Country of Origin');
    let countryField = null;
    try {
        countryField = await waitFor(() => findByLabel('country of origin') || document.querySelector('[aria-label*="country of origin" i]') || document.querySelector('[data-testid*="country" i]'), 5000);
    } catch(e) {}
    
    if (!countryField) log('STEP 9', 'SKIP: Country of Origin field not found. Continuing.');
    else {
      if (countryField.tagName.toLowerCase() === 'select') {
        const options = Array.from(countryField.options);
        const usOption = options.find(o => /united states/i.test(o.text));
        if (usOption) { countryField.value = usOption.value; countryField.dispatchEvent(new Event('change', { bubbles: true })); }
      } else if (countryField.getAttribute('role') === 'combobox' || countryField.getAttribute('role') === 'listbox') {
        await clickAndWait(countryField, 500);
        const optionList = Array.from(document.querySelectorAll('[role="option"], li, [class*="option"]'));
        const usOption = optionList.find(o => o.textContent && /united states/i.test(o.textContent.trim()));
        if (usOption) await clickAndWait(usOption, 400);
      }
      const currentCountryValue = (countryField.value || countryField.textContent || '').toLowerCase();
      if (/united states/i.test(currentCountryValue)) log('STEP 9', 'Country of Origin confirmed.'); else log('STEP 9', 'WARNING: Country of Origin could not be confirmed.');
    }

    await wait(500);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const errorElements = document.querySelectorAll('[aria-invalid="true"], .error, [class*="error"]');
    let hasErrors = false;
    errorElements.forEach(el => {
      const textContent = el.textContent || '';
      const hasErrorClass = Array.from(el.classList).some(c => c.toLowerCase().includes('error'));
      if (el.getAttribute('aria-invalid') === 'true' || hasErrorClass) {
           if (el.offsetWidth > 0 && el.offsetHeight > 0) {
               const nameAttr = el.getAttribute('name') || el.id || 'unknown field';
               log('COMPLETION', 'VALIDATION ERROR: ' + nameAttr + ' has an error state.');
               hasErrors = true;
           }
      }
    });
    if (!hasErrors) {
        log('COMPLETION', 'COMPLETE: All steps finished. Form is ready for review.');
        if (typeof UIHelper !== 'undefined') UIHelper.showToast('eBay Automation Completed', 'success');
    }

    if (data.isBulkJob) {
      console.log('🚀 Bulk job detected, attempting to click "Save for later"...');
      await wait(2000);
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes('save for later'));
      if (saveBtn) {
        console.log('✅ Found "Save for later" button, but skipping click for testing as requested.');
        chrome.storage.local.remove(['isBulkJob']);
      } else console.warn('⚠️ Could not find "Save for later" button');
    }

  } catch (error) {
    console.error('[eBay Agent] ERROR: ' + error.message);
    if (typeof UIHelper !== 'undefined') UIHelper.showToast('Automation Error: ' + error.message, 'error');
  }`.split('\\n');

lines.splice(startLine, endLine - startLine + 1, updatedLogicLines);
fs.writeFileSync(file, lines.join('\\n'), 'utf8');
console.log('Successfully patched using splice method');
