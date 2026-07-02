// ═══════════════════════════════════════════════════════════
// Description Generator Module
// Generates eBay descriptions from Amazon product data
// ═══════════════════════════════════════════════════════════

const DescriptionGenerator = (() => {
  const SUPABASE_URL =
    (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.SUPABASE_URL)
      ? ExtensionConfig.URLS.SUPABASE_URL
      : 'https://ojxzssooylmydystjvdo.supabase.co';
  
  let currentDescription = '';
  let isGenerating = false;

  /**
   * Initialize the description generator
   */
  function init() {
    const generateBtn = document.getElementById('generate-description-btn');
    const copyBtn = document.getElementById('copy-description-btn');
    const pasteBtn = document.getElementById('paste-description-btn');

    if (generateBtn) {
      generateBtn.addEventListener('click', handleGenerateDescription);
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', handleCopyDescription);
    }

    if (pasteBtn) {
      pasteBtn.addEventListener('click', handlePasteDescription);
    }

    // Editable Description Character Counter & Storage Sync
    const previewEl = document.getElementById('description-preview');
    const descCounter = document.querySelector('.ss-desc-counter');
    
    const updateDescCounter = () => {
      if (previewEl && descCounter) {
        if (previewEl.querySelector('.description-placeholder') || 
            previewEl.querySelector('.description-empty-state') || 
            previewEl.classList.contains('description-empty-state') ||
            previewEl.querySelector('.ss-desc-empty')) {
          descCounter.innerHTML = `0 / 5000 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width: 12px; height: 12px; color: #22c55e;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          return;
        }
        const text = previewEl.innerText || '';
        descCounter.innerHTML = `${text.length} / 5000 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width: 12px; height: 12px; color: #22c55e;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      }
    };

    if (previewEl) {
      previewEl.addEventListener('input', () => {
        const text = previewEl.innerHTML;
        currentDescription = text;
        updateDescCounter();
        chrome.storage.local.set({ 
          generatedDescription: text,
          selectedEbayDescription: text,
          selectedDescriptionTimestamp: Date.now()
        });
      });
      
      const observer = new MutationObserver(() => {
        updateDescCounter();
      });
      observer.observe(previewEl, { childList: true, characterData: true, subtree: true });
      updateDescCounter();
    }

    console.log('[DescriptionGenerator] Initialized');
  }

  /**
   * Get product data from storage or scrape from current page
   * Note: This runs in the context of the injected panel (content script context)
   */
  async function getProductData() {
    console.log('[DescriptionGenerator] Getting product data...');

    return new Promise((resolve) => {
      // First, try to get from storage
      chrome.storage.local.get(['currentProduct', 'productData', 'snipedData', 'productDataTimestamp'], async (result) => {
        const product = result.currentProduct || result.productData || result.snipedData || {};
        const timestamp = result.productDataTimestamp || 0;
        const isStale = Date.now() - timestamp > 60000; // 1 minute

        // Check if we have valid data
        const hasValidData = product.title && (product.bulletPoints?.length > 0 || product.description);

        console.log('[DescriptionGenerator] Storage check:', {
          hasData: !!product.title,
          hasBullets: product.bulletPoints?.length || 0,
          hasDesc: !!product.description,
          isStale
        });

        if (hasValidData && !isStale) {
          console.log('[DescriptionGenerator] Using stored product data');
          return resolve(formatProductDataMap(product));
        }

        console.log('[DescriptionGenerator] No valid stored data, requesting scrape via message...');

        try {
          // Ask the content script (amazon_injector/walmart_injector) to scrape
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_PRODUCT_DATA' });
            if (response && response.success && response.data) {
              console.log('[DescriptionGenerator] Successfully scraped product data via message');
              // Update storage cache
              chrome.storage.local.set({
                currentProduct: response.data,
                productDataTimestamp: Date.now()
              });
              return resolve(formatProductDataMap(response.data));
            }
          }
        } catch (error) {
           console.warn('[DescriptionGenerator] Message scraping failed or timed out:', error);
        }

        // Fallback to manual dom scrape if message failed
        console.log('[DescriptionGenerator] Falling back to manual DOM scrape...');
        const scrapedData = scrapeProductFromPage();
        if (scrapedData.title) {
            chrome.storage.local.set({
              currentProduct: scrapedData,
              productDataTimestamp: Date.now()
            });
            return resolve(formatProductDataMap(scrapedData));
        }

        // Final Fall back to whatever we have in storage
        console.warn('[DescriptionGenerator] All scraping failed, using stale storage data');
        resolve(formatProductDataMap(product));
      });
    });
  }

  function formatProductDataMap(product) {
      return {
          title: product.title || product.productTitle || '',
          description: product.description || product.productDescription || '',
          bulletPoints: product.bulletPoints || product.features || [],
          category: product.category || '',
          price: product.price || product.productPrice || '',
          brand: product.brand || '',
          features: product.features || [],
          specifications: product.specifications || product.specs || {},
          condition: product.condition || 'New'
      };
  }

  /**
   * Scrape product data directly from the current page
   * Works because panel is injected as content script
   */
  function scrapeProductFromPage() {
    console.log('[DescriptionGenerator] Scraping product data from page...');
    
    const data = {
      title: '',
      description: '',
      bulletPoints: [],
      category: '',
      price: '',
      brand: '',
      features: [],
      specifications: {},
      condition: 'New'
    };
    
    try {
      // 1. TITLE
      const titleEl = document.querySelector('#productTitle');
      if (titleEl) {
        data.title = titleEl.innerText.trim();
      }
      
      // 2. BULLET POINTS
      const bulletSelectors = [
        '#feature-bullets ul li span.a-list-item',
        '#feature-bullets li span',
        '.a-unordered-list.a-vertical li span.a-list-item',
        '#productFactsDesktop_feature_div li'
      ];
      
      for (const selector of bulletSelectors) {
        const bullets = document.querySelectorAll(selector);
        if (bullets.length > 0) {
          bullets.forEach(bullet => {
            const text = bullet.innerText?.trim();
            if (text && text.length > 10 && !data.bulletPoints.includes(text)) {
              data.bulletPoints.push(text);
            }
          });
          if (data.bulletPoints.length > 0) break;
        }
      }
      
      // 3. DESCRIPTION
      const descSelectors = ['#productDescription p', '#productDescription', '#aplus_feature_div'];
      for (const selector of descSelectors) {
        const descEl = document.querySelector(selector);
        if (descEl) {
          const text = descEl.innerText?.trim();
          if (text && text.length > 50) {
            data.description = text.substring(0, 2000);
            break;
          }
        }
      }
      
      // 4. BRAND
      const brandEl = document.querySelector('#bylineInfo, a#bylineInfo, .po-brand .a-span9');
      if (brandEl) {
        let brandText = brandEl.innerText?.trim();
        brandText = brandText.replace(/^(Visit the|Brand:)\s*/i, '').replace(/\s*Store$/i, '');
        if (brandText) data.brand = brandText;
      }
      
      // 5. PRICE
      const priceEl = document.querySelector('.a-price .a-offscreen, .apexPriceToPay .a-offscreen, #priceblock_ourprice');
      if (priceEl) {
        data.price = priceEl.innerText?.trim() || priceEl.textContent?.trim() || '';
      }
      
      // 6. CATEGORY
      const breadcrumbEl = document.querySelector('#wayfinding-breadcrumbs_feature_div ul');
      if (breadcrumbEl) {
        const crumbs = breadcrumbEl.querySelectorAll('li a');
        const categories = [];
        crumbs.forEach(crumb => {
          const text = crumb.innerText?.trim();
          if (text && text.length > 1) categories.push(text);
        });
        if (categories.length > 0) data.category = categories.join(' > ');
      }
      
      // 7. SPECIFICATIONS
      const specRows = document.querySelectorAll('#productDetails_techSpec_section_1 tr, #detailBullets_feature_div li');
      specRows.forEach(row => {
        const labelEl = row.querySelector('th, .a-text-bold');
        const valueEl = row.querySelector('td, span:not(.a-text-bold)');
        if (labelEl && valueEl) {
          const label = labelEl.innerText?.trim().replace(/[:\s]+$/, '');
          const value = valueEl.innerText?.trim();
          if (label && value && label.length < 50) {
            data.specifications[label] = value;
          }
        }
      });
      
      // Copy bullets to features
      data.features = [...data.bulletPoints];
      
      if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('[DescriptionGenerator] Scraped data:', {
        title: data.title?.substring(0, 30) + '...',
        bulletCount: data.bulletPoints.length,
        hasDesc: !!data.description,
        brand: data.brand
      });
      
    } catch (error) {
      console.error('[DescriptionGenerator] Scrape error:', error);
    }
    
    return data;
  }

  /**
   * Generate description using background script (proper auth handling)
   */
  async function generateDescription(productData) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'GENERATE_DESCRIPTION',
        productData: productData
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!response) {
          reject(new Error('No response from background script'));
          return;
        }
        
        if (!response.success) {
          // Handle specific error codes
          const errorMsg = response.error || 'Failed to generate description';
          reject(new Error(errorMsg));
          return;
        }
        
        resolve(response);
      });
    });
  }

  /**
   * Handle generate description button click
   */
  async function handleGenerateDescription() {
    if (isGenerating) return;

    // Client-side auth gate. Guard the reference: if AuthHelper isn't loaded in
    // this context, don't hard-throw "AuthHelper is not defined" — the actual
    // generation goes through the background GENERATE_DESCRIPTION route (see
    // generateDescription → chrome.runtime.sendMessage), which authenticates via
    // saasToken. Skipping the gate degrades gracefully instead of crashing.
    if (typeof AuthHelper !== 'undefined' && AuthHelper) {
      const isAuthenticated = await AuthHelper.isAuthenticated();
      if (!isAuthenticated) {
        AuthHelper.promptLogin();
        return;
      }
    }

    const generateBtn = document.getElementById('generate-description-btn');
    const previewEl = document.getElementById('description-preview');
    const copyBtn = document.getElementById('copy-description-btn');
    const pasteBtn = document.getElementById('paste-description-btn');

    try {
      isGenerating = true;
      
      // Update button state
      if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = `
          <svg class="spin-animation" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122"/>
          </svg>
          Generating...
        `;
      }

      // Show loading state with data collection info
      if (previewEl) {
        previewEl.innerHTML = `
          <div class="description-placeholder">
            <div class="spinner-small"></div>
            <span>Scraping product data & generating description...</span>
          </div>
        `;
      }

      // Get product data
      const productData = await getProductData();
      
      if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('[DescriptionGenerator] Product data retrieved:', {
        title: productData.title?.substring(0, 40),
        bulletCount: productData.bulletPoints?.length,
        hasDescription: !!productData.description,
        brand: productData.brand
      });
      
      // Check if we have minimum required data
      if (!productData.title) {
        throw new Error('No product title found. Make sure you are on an Amazon product page.');
      }
      
      if (!productData.bulletPoints?.length && !productData.description) {
        console.warn('[DescriptionGenerator] No bullet points or description found, continuing with title only');
      }

      // Update loading message
      if (previewEl) {
        previewEl.innerHTML = `
          <div class="description-placeholder">
            <div class="spinner-small"></div>
            <span>Generating eBay description with AI...</span>
          </div>
        `;
      }

      // Call edge function
      const result = await generateDescription(productData);
      
      console.log('[DescriptionGenerator] API response:', {
        success: result.success,
        provider: result.provider,
        length: result.length
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate description');
      }

      currentDescription = result.description;

      // ─── INTEGRATE SELECTED LISTING TEMPLATE ─────────────────────────────────
      // [TEMPLATE INTEGRATION POINT]
      // Retrieve selected listing template and wrap the description if required.
      const activeTemplate = await getSelectedListingTemplate();
      if (activeTemplate) {
        console.log('[DescriptionGenerator] Active template to apply:', activeTemplate.name);
        currentDescription = compileTemplate(activeTemplate, productData, currentDescription);
      } else {
        console.log('[DescriptionGenerator] No active template selected. Using fallback (raw description).');
      }
      // ──────────────────────────────────────────────────────────────────────────

      // Display the description
      if (previewEl) {
        previewEl.innerHTML = currentDescription;
      }

      // Enable action buttons
      if (copyBtn) copyBtn.disabled = false;
      if (pasteBtn) pasteBtn.disabled = false;

      // Store the generated description with timestamp for auto-paste on eBay
      chrome.storage.local.set({ 
        generatedDescription: currentDescription,
        selectedEbayDescription: currentDescription,
        selectedDescriptionTimestamp: Date.now()
      });

      // Populate Title if returned in response (bonus integration)
      if (result.title) {
        console.log('[DescriptionGenerator] Title generated:', result.title);
        const titleDisplay = document.getElementById('ai-generated-title');
        const titleCounter = document.getElementById('ai-title-counter');
        const extTitle = document.getElementById('ext-title');

        if (titleDisplay) {
          titleDisplay.classList.add('has-title');
          titleDisplay.innerText = result.title;
          if (titleCounter) {
            titleCounter.innerHTML = `${result.title.length} / 80 chars <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
          }
        }

        if (extTitle) {
          extTitle.value = result.title;
        }

        // Save generated title to storage
        chrome.storage.local.set({
          selectedEbayTitle: result.title,
          savedTitles: [result.title],
          selectedTitleTimestamp: Date.now(),
          generatedAt: Date.now()
        });

        // Patch draft
        if (typeof window !== 'undefined' && window.SSListingDraft) {
          window.SSListingDraft.patchDraft({
            title: result.title,
            title_source: 'ai'
          }).catch(() => {});
        }
      }

      // Show success toast
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('Listing content generated successfully!', 'success');
      }

      if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('[DescriptionGenerator] Generated:', {
        provider: result.provider,
        model: result.model,
        length: result.length
      });

    } catch (error) {
      console.error('[DescriptionGenerator] Error:', error);
      
      if (previewEl) {
        previewEl.innerHTML = `
          <div class="description-placeholder" style="color: #dc2626;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>${error.message}</span>
          </div>
        `;
      }

      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast(error.message, 'error');
      }
    } finally {
      isGenerating = false;
      
      // Reset button state
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122"/>
          </svg>
          Generate Description
        `;
      }
    }
  }

  /**
   * Handle copy description button click
   */
  async function handleCopyDescription() {
    if (!currentDescription) {
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('No description to copy', 'warning');
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(currentDescription);
      
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('Description copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('[DescriptionGenerator] Copy error:', error);
      
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = currentDescription;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('Description copied!', 'success');
      }
    }
  }

  /**
   * Handle paste description button click
   * Sends message to content script to paste into eBay form
   */
  function handlePasteDescription() {
    if (!currentDescription) {
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('No description to paste', 'warning');
      }
      return;
    }

    // Store description for content script
    chrome.storage.local.set({ 
      descriptionToPaste: currentDescription 
    }, () => {
      // Send message to paste description
      chrome.runtime.sendMessage({
        action: 'PASTE_DESCRIPTION',
        description: currentDescription
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('[DescriptionGenerator] Paste message sent, awaiting content script');
        }
        
        if (response?.success) {
          if (typeof UIHelper !== 'undefined') {
            UIHelper.showToast('Description pasted to eBay!', 'success');
          }
        }
      });

      // Also notify via toast
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('Navigate to eBay listing and description will paste automatically', 'info');
      }
    });
  }

  // ─── Listing Templates ──────────────────────────────────────
  const LISTING_TEMPLATES = [
    {
      id: 'default-professional',
      name: 'Default Professional Template',
      description: 'A clean and professional eBay description layout suitable for most products.',
      isDefault: true,
      status: 'Available',
      htmlContent: `<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1a202c; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <header style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="color: #1e3a8a; font-size: 24px; margin: 0; font-weight: 700; line-height: 1.3;">{title}</h1>
  </header>
  
  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Product Description</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {description}
    </div>
  </section>
  
  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Key Features</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {features}
    </div>
  </section>

  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Specifications</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {specifications}
    </div>
  </section>
  
  <footer style="margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
      <h3 style="color: #1e3a8a; font-size: 14px; margin: 0 0 8px 0; font-weight: 600; display: flex; items-center: center; gap: 6px;">
        <span>📦</span> Shipping & Handling
      </h3>
      <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">Fast and free shipping on all orders. We package professionally and ship within 1 business day.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
      <h3 style="color: #1e3a8a; font-size: 14px; margin: 0 0 8px 0; font-weight: 600; display: flex; items-center: center; gap: 6px;">
        <span>🔄</span> 30-Day Returns Policy
      </h3>
      <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">Shop with confidence. If you're not completely satisfied, return the item within 30 days for a full refund.</p>
    </div>
  </footer>
</div>`
    }
  ];

  function getListingTemplates() {
    return LISTING_TEMPLATES;
  }

  async function getSelectedListingTemplate() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['selectedListingTemplateId'], (result) => {
        const id = result.selectedListingTemplateId;
        if (!id) {
          // Backward compatibility: default to no template (raw description) if never chosen
          resolve(null);
          return;
        }
        const template = LISTING_TEMPLATES.find(t => t.id === id);
        resolve(template || null);
      });
    });
  }

  async function selectListingTemplate(templateId) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ selectedListingTemplateId: templateId }, () => {
        console.log('[DescriptionGenerator] Selected template set:', templateId);
        resolve();
      });
    });
  }

  /**
   * Compiles description using HTML template and product fields
   */
  function compileTemplate(template, productData, coreDescription) {
    if (!template || !template.htmlContent) {
      return coreDescription;
    }

    let html = template.htmlContent;

    const title = productData.title || '';
    const brand = productData.brand || '';
    const condition = productData.condition || 'New';

    let featuresHtml = '';
    const bullets = productData.bulletPoints || productData.features || [];
    if (bullets.length > 0) {
      featuresHtml = '<ul style="margin: 0; padding-left: 20px; line-height: 1.6;">' +
        bullets.map(b => `<li>${b}</li>`).join('') +
        '</ul>';
    }

    let specificationsHtml = '';
    const specs = productData.specifications || {};
    if (specs && Object.keys(specs).length > 0) {
      specificationsHtml = '<table style="width: 100%; border-collapse: collapse; font-size: 14px;">' +
        Object.entries(specs).map(([k, v]) => `<tr><td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>${k}</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${v}</td></tr>`).join('') +
        '</table>';
    }

    const values = {
      title,
      brand,
      condition,
      description: coreDescription,
      features: featuresHtml,
      specifications: specificationsHtml,
      shipping: '',
      returns: ''
    };

    // Auto-remove empty sections: if a placeholder within a <section> is empty, discard that section block
    const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/gi;
    html = html.replace(sectionRegex, (match, content) => {
      const foundPlaceholders = [...content.matchAll(/\{\{?(\w+)\}?\}/g)].map(m => m[1]);
      const shouldRemove = foundPlaceholders.some(key => {
        return values.hasOwnProperty(key) && !values[key];
      });

      if (shouldRemove) {
        console.log('[DescriptionGenerator] Removing empty section containing:', foundPlaceholders);
        return '';
      }
      return match;
    });

    // Replace placeholders
    for (const [key, val] of Object.entries(values)) {
      const regex = new RegExp(`\\{\\{?${key}\\}?\\}`, 'g');
      html = html.replace(regex, val || '');
    }

    // Strip leftovers
    html = html.replace(/\{\{?\w+\}?\}/g, '');

    // Existing sanitization rules
    html = html
      .replace(/https?:\/\/[^\s<"]+/gi, '')
      .replace(/amazon\.com|walmart\.com/gi, '')
      .replace(/\b(ASIN|UPC|ISBN|Seller Rank|Sales Rank|Sold by|Fulfilled by|Available at)\b/gi, '')
      .replace(/<img[^>]*>/gi, '');

    return html;
  }

  // Public API
  return {
    init,
    generateDescription: handleGenerateDescription,
    copyDescription: handleCopyDescription,
    pasteDescription: handlePasteDescription,
    getCurrentDescription: () => currentDescription,
    getListingTemplates,
    getSelectedListingTemplate,
    selectListingTemplate
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DescriptionGenerator.init());
} else {
  DescriptionGenerator.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DescriptionGenerator;
}
