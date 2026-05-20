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
      
      console.log('[DescriptionGenerator] Scraped data:', {
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

    // Check authentication first
    const isAuthenticated = await AuthHelper.isAuthenticated();
    if (!isAuthenticated) {
      AuthHelper.promptLogin();
      return;
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
      
      console.log('[DescriptionGenerator] Product data retrieved:', {
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

      // Show success toast
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('Description generated successfully!', 'success');
      }

      console.log('[DescriptionGenerator] Generated:', {
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

  // Public API
  return {
    init,
    generateDescription: handleGenerateDescription,
    copyDescription: handleCopyDescription,
    pasteDescription: handlePasteDescription,
    getCurrentDescription: () => currentDescription
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
