// ═══════════════════════════════════════════════════════════
// Panel Main Script
// Coordinates all panel functionality
// ═══════════════════════════════════════════════════════════

console.log('[Panel] Initializing...');

// Registry-based supplier page check. Hardcoded host list is the fallback
// only when the suppliers bundle failed to load — registry is authoritative
// so future suppliers (AliExpress, Temu, …) work without touching this file.
function isSupplierPage(url) {
  if (!url) return false;
  if (window.SSSupplierRegistry) return !!window.SSSupplierRegistry.match(url);
  return url.includes('amazon.com') || url.includes('walmart.com') || url.includes('walmart.ca');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPanel);
} else {
  initPanel();
}

function runPanelInitStep(label, initFn) {
  try {
    const result = initFn();
    if (result && typeof result.catch === 'function') {
      result.catch((error) => {
        console.error(`[Panel] ${label} failed:`, error);
      });
    }
  } catch (error) {
    console.error(`[Panel] ${label} failed:`, error);
  }
}

function initPanel() {
  console.log('[Panel] DOM Ready, initializing components...');

  // Controls first so shell actions still work if feature init fails later.
  runPanelInitStep('panel controls', initPanelControls);
  runPanelInitStep('panel scroll behavior', initPanelScrollBehavior);
  runPanelInitStep('auth status', initAuthStatus);
  runPanelInitStep('image gallery', initImageGallery);
  runPanelInitStep('title generation', initTitleGeneration);
  runPanelInitStep('action buttons', initActionButtons);
  runPanelInitStep('calculator', initCalculator);

  // Universal extended workspace: render currentProduct via the shared
  // common/panel-extended.js module (same logic as the inline Extend path).
  runPanelInitStep('extended editor', () => {
    if (typeof showSidebarExtended === 'function') {
      return showSidebarExtended({ force: true });
    }
    console.warn('[Panel] panel-extended.js not loaded — extended editor not rendered');
  });

  console.log('[Panel] All components initialized');
}

// ═══════════════════════════════════════════════════════════
// Panel Viewport Behavior
// ═══════════════════════════════════════════════════════════
function initPanelScrollBehavior() {
  const rootWrapper = document.getElementById('snipe-root-wrapper');
  if (!rootWrapper || rootWrapper.dataset.scrollBehaviorBound === 'true') return;

  rootWrapper.dataset.scrollBehaviorBound = 'true';

  const maxLift = 88;
  let rafId = 0;

  const updatePanelOffset = () => {
    rafId = 0;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const lift = Math.min(scrollY, maxLift);
    rootWrapper.style.setProperty('--ss-panel-scroll-offset', String(lift));
    rootWrapper.classList.toggle('ss-panel-scrolled', lift > 4);
  };

  const requestOffsetUpdate = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(updatePanelOffset);
  };

  window.addEventListener('scroll', requestOffsetUpdate, { passive: true });
  window.addEventListener('resize', requestOffsetUpdate);
  updatePanelOffset();
}

// ═══════════════════════════════════════════════════════════
// Auth Status Display
// ═══════════════════════════════════════════════════════════

async function initAuthStatus() {
  const statusIcon = document.getElementById('auth-status-icon');
  const statusText = document.getElementById('auth-status-text');
  const actionBtn = document.getElementById('auth-action-btn');

  if (!statusIcon || !statusText) return;

  // Check if AuthHelper is available
  if (typeof AuthHelper === 'undefined') {
    console.warn('[Panel] AuthHelper not available');
    statusText.textContent = 'Auth unavailable';
    return;
  }

  try {
    const user = await AuthHelper.getCurrentUser();
    const isAuthenticated = await AuthHelper.isAuthenticated();

    if (isAuthenticated && user) {
      // Connected
      statusIcon.textContent = '●';
      statusIcon.className = 'auth-status-icon connected';
      statusText.textContent = user.email || 'Connected';
      statusText.className = 'auth-status-text connected';
      if (actionBtn) actionBtn.style.display = 'none';
    } else {
      // Disconnected
      statusIcon.textContent = '●';
      statusIcon.className = 'auth-status-icon disconnected';
      statusText.textContent = 'Not logged in';
      statusText.className = 'auth-status-text disconnected';
      if (actionBtn) {
        actionBtn.style.display = 'block';
        actionBtn.textContent = 'Login';
        actionBtn.onclick = () => {
          // Open web app login page (environment-aware)
          const base = (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.WEB_APP_BASE)
            ? ExtensionConfig.URLS.WEB_APP_BASE
            : ((typeof ExtensionConstants !== 'undefined' && ExtensionConstants.WEB_BASE_URL) || 'https://sellersuit.com');
          const authUrl = `${base}/auth`;
          chrome.tabs.create({ url: authUrl });
        };
      }
    }
  } catch (error) {
    console.error('[Panel] Auth status check failed:', error);
    statusIcon.className = 'auth-status-icon disconnected';
    statusText.textContent = 'Error checking auth';
  }
}

// Refresh auth status periodically
setInterval(initAuthStatus, 60000); // Every minute

// ═══════════════════════════════════════════════════════════
// Image Gallery
// ═══════════════════════════════════════════════════════════

function initImageGallery() {
  const refreshBtn = document.getElementById('refresh-images-btn');
  const downloadBtn = document.getElementById('download-images-btn');
  const modeToggleBtn = document.getElementById('image-mode-toggle');
  const modeLabel = document.getElementById('mode-label');

  // Load saved extraction mode preference
  chrome.storage.local.get(['imageExtractionMode'], (result) => {
    const useFullView = result.imageExtractionMode === 'complete';
    updateModeLabel(useFullView);
  });

  if (modeToggleBtn) {
    modeToggleBtn.addEventListener('click', async () => {
      // Get current mode
      const result = await chrome.storage.local.get(['imageExtractionMode']);
      const currentMode = result.imageExtractionMode || 'fast';
      const newMode = currentMode === 'fast' ? 'complete' : 'fast';

      // Save new mode
      await chrome.storage.local.set({ imageExtractionMode: newMode });

      // Update UI
      updateModeLabel(newMode === 'complete');

      // Show toast notification
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast(
          `Switched to ${newMode === 'complete' ? 'Complete Mode (Interactive)' : 'Fast Mode (Passive)'}`,
          'info'
        );
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshImages);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadAllImages);
  }

  // Load images on init
  loadImages();
}

function updateModeLabel(useFullView) {
  const modeLabel = document.getElementById('mode-label');
  const modeToggleBtn = document.getElementById('image-mode-toggle');

  if (modeLabel) {
    modeLabel.textContent = useFullView ? 'Complete Mode' : 'Fast Mode';
  }

  if (modeToggleBtn) {
    modeToggleBtn.title = useFullView
      ? 'Complete Mode: Interactive clicking through gallery (slower, more comprehensive)'
      : 'Fast Mode: Passive DOM scraping (faster, may miss some images)';

    // Update button style to indicate mode
    if (useFullView) {
      modeToggleBtn.classList.add('mode-complete');
      modeToggleBtn.classList.remove('mode-fast');
    } else {
      modeToggleBtn.classList.add('mode-fast');
      modeToggleBtn.classList.remove('mode-complete');
    }
  }
}

function loadImages() {
  // Primary source: currentProduct.images (written by SCRAPE_SINGLE / SCRAPE_VARIANTS).
  // Fallback: legacy productImages key, then snipedData.
  chrome.storage.local.get(['currentProduct', 'productImages', 'snipedData'], (result) => {
    const images =
      (result.currentProduct && Array.isArray(result.currentProduct.images) && result.currentProduct.images.length
        ? result.currentProduct.images
        : null) ||
      result.productImages ||
      result.snipedData?.images ||
      [];
    displayImages(images);
  });
}

function displayImages(images) {
  const gallery = document.getElementById('snipe-image-gallery');
  if (!gallery) return;

  // Use performant renderer if available
  if (typeof ImageRenderer !== 'undefined') {
    ImageRenderer.displayImagesSimple(gallery, images);
    return;
  }

  // Fallback to optimized vanilla implementation
  if (!images || images.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'gallery-empty';
    const label = document.createElement('span');
    label.textContent = 'No images available';
    empty.appendChild(label);
    gallery.replaceChildren(empty);
    return;
  }

  // Clear and prepare container
  gallery.replaceChildren();
  gallery.style.contain = 'layout style';

  // Create fragment for batch DOM insertion
  const fragment = document.createDocumentFragment();

  images.forEach((url, index) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.style.opacity = '0';
    item.style.transform = 'translateY(8px)';
    item.style.transition = `opacity 0.3s ease ${index * 50}ms, transform 0.3s ease ${index * 50}ms`;

    const img = document.createElement('img');
    img.src = url;
    img.alt = `Product image ${index + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';

    item.appendChild(img);
    fragment.appendChild(item);
  });

  gallery.appendChild(fragment);

  // Trigger fade-in after paint using requestAnimationFrame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const items = gallery.querySelectorAll('.gallery-item');
      items.forEach((item) => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      });

      // Highlight Snipe Title button after images load - show it's ready for user interaction
      const snipeTitleBtn = document.getElementById('snipe-title-btn');
      if (snipeTitleBtn && images.length > 0) {
        snipeTitleBtn.classList.add('snipe-ready');
        console.log('🎯 Images loaded - Snipe Title button highlighted and ready');
      }
    });
  });
}

function showScrapeOverlay(text) {
  const overlay = document.getElementById('ss-scrape-overlay');
  const statusText = document.getElementById('ss-scrape-status-text');
  if (overlay) {
    overlay.classList.add('active');
  }
  if (statusText && text) {
    statusText.textContent = text;
  }
}

function updateScrapeStatus(text) {
  const statusText = document.getElementById('ss-scrape-status-text');
  if (statusText && text) {
    statusText.textContent = text;
  }
}

function hideScrapeOverlay() {
  const overlay = document.getElementById('ss-scrape-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

function refreshImages() {
  // panel.html is the extended view of the side panel — it must NOT re-scrape.
  // Re-read images from currentProduct (already in storage from the side panel scan).
  console.log('[Panel] Refreshing images from storage...');
  chrome.storage.local.get(['currentProduct', 'productImages', 'snipedData'], (result) => {
    const images =
      (result.currentProduct && Array.isArray(result.currentProduct.images) && result.currentProduct.images.length
        ? result.currentProduct.images
        : null) ||
      result.productImages ||
      result.snipedData?.images ||
      [];
    displayImages(images);
    if (typeof UIHelper !== 'undefined') {
      UIHelper.showToast(images.length ? `${images.length} image(s) loaded` : 'No images in product data', images.length ? 'success' : 'warning');
    }
  });
}

function downloadAllImages() {
  chrome.storage.local.get(['currentProduct', 'productImages', 'snipedData'], (result) => {
    const images =
      (result.currentProduct && Array.isArray(result.currentProduct.images) && result.currentProduct.images.length
        ? result.currentProduct.images
        : null) ||
      result.productImages ||
      result.snipedData?.images ||
      [];
    if (images.length === 0) {
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('No images to download', 'warning');
      }
      return;
    }

    // Download directly from the panel context (no extra permissions needed)
    (async () => {
      try {
        let downloaded = 0;
        for (let i = 0; i < images.length; i++) {
          const url = images[i];
          if (!url) continue;

          const res = await fetch(url);
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = `sellersuit-image-${String(i + 1).padStart(2, '0')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          URL.revokeObjectURL(objectUrl);
          downloaded++;

          // Small delay to avoid throttling / UI lock
          await new Promise(r => setTimeout(r, 150));
        }

        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast(`Downloaded ${downloaded} image(s)`, 'success');
        }
      } catch (err) {
        console.error('[Panel] Download images error:', err);
        if (typeof UIHelper !== 'undefined') UIHelper.showToast(err.message || 'Download failed', 'error');
      }
    })();
  });
}

// ═══════════════════════════════════════════════════════════
// Title Generation
// ═══════════════════════════════════════════════════════════

// Init Copy Title Button
const copyBtn = document.getElementById('copy-title-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    const titleText = document.getElementById('ai-generated-title')?.innerText;
    if (titleText && !titleText.includes('Click "Generate"')) {
      navigator.clipboard.writeText(titleText).then(() => {
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast('Title copied!', 'success');
        }
      });
    }
  });
}

// Load saved title if exists
chrome.storage.local.get(['selectedEbayTitle', 'generatedAt'], (result) => {
  if (result.selectedEbayTitle && result.generatedAt) {
    // Only show if less than 24h old
    if (Date.now() - result.generatedAt < 86400000) {
      const titleDisplay = document.getElementById('ai-generated-title');
      const titleCounter = document.getElementById('ai-title-counter');
      const copyBtn = document.getElementById('copy-title-btn');

      if (titleDisplay) {
        titleDisplay.innerText = result.selectedEbayTitle;
        titleDisplay.classList.add('has-title');
        if (titleCounter) titleCounter.textContent = `${result.selectedEbayTitle.length} characters`;
        if (copyBtn) copyBtn.style.display = 'inline-flex';
      }
    }
  }
});

// Inline editable title sync
const editableTitleDisplay = document.getElementById('ai-generated-title');
if (editableTitleDisplay) {
  editableTitleDisplay.addEventListener('input', (e) => {
    const newTitle = e.target.innerText.replace(/\n/g, ' ').trim();
    const titleCounter = document.getElementById('ai-title-counter');
    
    // Update character count
    if (titleCounter) {
      titleCounter.textContent = `${newTitle.length} characters`;
      titleCounter.classList.remove('warning', 'error');
      if (newTitle.length > 200) titleCounter.classList.add('error');
      else if (newTitle.length >= 180) titleCounter.classList.add('warning');
    }
    
    // Sync to storage for Opti-List, Paste to eBay, etc.
    chrome.storage.local.set({
      selectedEbayTitle: newTitle,
      selectedTitleTimestamp: Date.now()
    });
  });
}

// Paste selected title to eBay listing page
async function pasteSelectedTitleToEbay() {
  try {
    // Check if we have a selected title
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['selectedEbayTitle'], resolve);
    });

    if (!result.selectedEbayTitle) {
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('No title selected. Generate and select a title first.', 'warning');
      }
      return;
    }

    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    // Check if on eBay page
    if (!tab.url?.includes('ebay.com')) {
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('Please navigate to an eBay listing page first.', 'warning');
      }
      return;
    }

    // Send message to eBay content script to paste the title
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'PASTE_SELECTED_TITLE'
    });

    if (response?.success) {
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('Title pasted to eBay!', 'success');
      }
    } else {
      throw new Error(response?.error || 'Failed to paste title');
    }

  } catch (error) {
    console.error('[Panel] Paste to eBay error:', error);
    if (typeof UIHelper !== 'undefined') {
      UIHelper.showToast(error.message, 'error');
    }
  }
}

// Obsolete functions removed (renderTitleRows, autoResizeTextarea, selectTitleFromRow, etc)

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function updateCharCounter(id) {
  const textarea = document.getElementById(`ai-title-${id}`);
  const counter = document.getElementById(`title-counter-${id}`);
  if (!textarea || !counter) return;

  const length = textarea.value.length;
  counter.textContent = length;

  // Update counter styling based on length
  counter.classList.remove('warning', 'error');
  if (length > 200) {
    counter.classList.add('error');
  } else if (length >= 180) {
    counter.classList.add('warning');
  }
}

function toggleTitleEditing() {
  const editToggleBtn = document.getElementById('toggle-edit-titles-btn');
  const editToggleLabel = document.getElementById('edit-toggle-label');
  const titleTextareas = document.querySelectorAll('.title-textarea');

  const isCurrentlyEditable = titleTextareas.length > 0 && !titleTextareas[0]?.readOnly;

  titleTextareas.forEach(textarea => {
    if (textarea) {
      textarea.readOnly = isCurrentlyEditable;
    }
  });

  if (editToggleBtn) {
    editToggleBtn.classList.toggle('active', !isCurrentlyEditable);
  }

  if (editToggleLabel) {
    editToggleLabel.textContent = isCurrentlyEditable ? 'Edit' : 'Editing';
  }

  if (typeof UIHelper !== 'undefined') {
    UIHelper.showToast(isCurrentlyEditable ? 'Edit mode disabled' : 'Edit mode enabled', 'info');
  }
}

function clearAllTitles() {
  const titleTextareas = document.querySelectorAll('.title-textarea');

  titleTextareas.forEach((textarea, index) => {
    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
      updateCharCounter(index + 1);
    }
  });

  // Clear from storage
  chrome.storage.local.remove(['savedTitles'], () => {
    if (typeof UIHelper !== 'undefined') {
      UIHelper.showToast('Titles cleared', 'info');
    }
  });
}

function saveTitlesToStorage() {
  const titleTextareas = document.querySelectorAll('.title-textarea');
  const titles = Array.from(titleTextareas).map(textarea => textarea?.value || '');
  chrome.storage.local.set({ savedTitles: titles });
}

function loadTitlesFromStorage() {
  chrome.storage.local.get(['savedTitles'], (result) => {
    const titles = result.savedTitles || [];
    if (titles.length > 0) {
      titles.forEach((title, index) => {
        const textarea = document.getElementById(`ai-title-${index + 1}`);
        if (textarea && title) {
          textarea.value = title;
          autoResizeTextarea(textarea);
          updateCharCounter(index + 1);
        }
      });
    }
  });
}

async function generateAITitles() {
  const generateBtn = document.getElementById('generate-ai-titles-btn');
  const titleCountSelect = document.getElementById('title-count-select');
  const titleCount = titleCountSelect ? parseInt(titleCountSelect.value, 10) : 3;

  try {
    // Check authentication first. Guard the reference so a context missing
    // AuthHelper doesn't crash here (panel.html loads auth-helper.js, but this
    // keeps the generate path resilient to load-order/bundling drift).
    if (typeof AuthHelper !== 'undefined' && AuthHelper) {
      const isAuthenticated = await AuthHelper.isAuthenticated();
      if (!isAuthenticated) {
        AuthHelper.promptLogin();
        return;
      }
    }

    // Update button state
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.classList.remove('snipe-ready');
      generateBtn.innerHTML = `
        <svg class="spin-animation" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122"/>
        </svg>
        Generating...
      `;
    }

    // Show inline loading state
    const titleList = document.getElementById('snipe-title-list');
    if (titleList) {
      titleList.innerHTML = `
        <div class="title-loading-state">
          <svg class="spin-animation" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" stroke-width="2">
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122"/>
          </svg>
          <span>Analyzing product data and generating titles...</span>
        </div>
      `;
    }

    // Add generating state to title rows for visual feedback
    const titleRows = document.querySelectorAll('.title-row');
    titleRows.forEach(row => {
      row.classList.add('title-generating');
      row.classList.remove('title-generated');
    });

    // Get product data from storage first
    let productData = await new Promise((resolve) => {
      chrome.storage.local.get(['currentProduct', 'snipedData'], (result) => {
        resolve(result.currentProduct || result.snipedData || {});
      });
    });

    // Final check for product data
    if (!productData.title && !productData.productTitle) {
      throw new Error('No product data found. Please scan a product from the side panel first.');
    }

    // Call edge function WITH AUTHENTICATION, including title count
    console.log('[Panel] Calling generate-titles with data:', {
      title: productData.title || productData.productTitle,
      brand: productData.brand,
      category: productData.category,
      bulletPointsCount: Math.min(3, (productData.bulletPoints || productData.features || []).length),
      count: titleCount
    });

    if (typeof AuthHelper === 'undefined') throw new Error('AuthHelper not loaded — auth-helper.js must execute before panel.js');
    const { data: result, error } = await AuthHelper.callEdgeFunction('generate-titles', {
      title: productData.title || productData.productTitle,
      category: productData.category || '',
      brand: productData.brand || '',
      bulletPoints: (productData.bulletPoints || productData.features || []).slice(0, 3),
      count: titleCount
    });

    console.log('[Panel] generate-titles response:', { result, error });

    if (error) {
      throw new Error(error);
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate titles');
    }

    // Normalize response shape: { titles } or { data: { titles } }
    const titles = Array.isArray(result.titles)
      ? result.titles
      : (result.data && Array.isArray(result.data.titles) ? result.data.titles : []);
    if (!titles.length) {
      throw new Error('AI returned no titles. Please try again.');
    }

    // Display titles inline using unified global helper
    if (typeof UIHelper !== 'undefined' && typeof UIHelper.renderInlineTitles === 'function') {
      UIHelper.renderInlineTitles(titles);
    } else {
      // Fallback
      renderInlineTitles(titles);
    }

    console.log('[Panel] Titles generated and rendered inline.');

  } catch (error) {
    console.error('[Panel] Title generation error:', error);
    if (typeof UIHelper !== 'undefined') {
      UIHelper.showToast(error.message, 'error');
    }

    const titleList = document.getElementById('snipe-title-list');
    if (titleList) {
      titleList.innerHTML = `
        <div class="title-error-state">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>${error.message || 'Failed to generate titles.'}</span>
        </div>
      `;
    }

    // Clear generating state on error
    const titleRows = document.querySelectorAll('.title-row');
    titleRows.forEach(row => {
      row.classList.remove('title-generating');
    });
  } finally {
    // Reset button state
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.classList.remove('snipe-ready');
      generateBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122"/>
        </svg>
        Generate Titles
      `;
    }

    // Also reset Snipe Title button after generation completes
    const snipeTitleBtn = document.getElementById('snipe-title-btn');
    if (snipeTitleBtn) {
      snipeTitleBtn.classList.remove('snipe-ready');
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Inline Title Rendering
// ═══════════════════════════════════════════════════════════
function renderInlineTitles(titles) {
  const titleList = document.getElementById('snipe-title-list');
  if (!titleList) return;

  if (typeof UIHelper !== 'undefined' && typeof UIHelper.renderInlineTitles === 'function') {
    return UIHelper.renderInlineTitles(titles);
  }

  if (!titles || titles.length === 0) {
    titleList.innerHTML = `
      <div class="title-empty-state">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>No titles generated. Please try again.</span>
      </div>
    `;
    return;
  }

  // Clear container and set to list layout
  titleList.innerHTML = '';
  titleList.classList.add('inline-title-list');

  // Process best title first for storage
  const bestTitleStr = typeof titles[0] === 'object' ? titles[0].title : titles[0];
  chrome.storage.local.set({
    selectedEbayTitle: bestTitleStr,
    generatedAt: Date.now()
  });

  titles.forEach((titleItem, index) => {
    // Handle both string arrays and object arrays {title: "...", score: ...}
    const titleStr = typeof titleItem === 'object' ? titleItem.title : titleItem;
    const escapedTitleStr = escapeHtml(titleStr);
    
    // Determine rank/badge
    let badgeClass = 'alternative';
    let badgeText = 'Alternative';
    if (index === 0) {
      badgeClass = 'best';
      badgeText = 'Best';
    } else if (index === 1 || index === 2) {
      badgeClass = 'recommended';
      badgeText = 'Recommended';
    }

    const card = document.createElement('div');
    card.className = `inline-title-card ${index === 0 ? 'selected' : ''}`;
    card.dataset.title = titleStr;

    card.innerHTML = `
      <div class="inline-title-header">
        <div class="inline-title-badge ${badgeClass}">
          ${index === 0 ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
          ${badgeText}
        </div>
        <div class="inline-title-meta">
          <span class="${titleStr.length > 80 ? 'warning' : ''}">${titleStr.length} chars</span>
        </div>
      </div>
      <div class="inline-title-text">${escapedTitleStr}</div>
      <div class="inline-title-actions">
        <button class="btn btn-sm inline-title-use">${index === 0 ? 'Selected' : 'Use Title'}</button>
        <button class="btn btn-sm inline-title-copy">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
      </div>
    `;

    // Click handler for card selection
    card.addEventListener('click', (e) => {
      // Ignore if clicking copy button
      if (e.target.closest('.inline-title-copy')) return;

      // Update visual selection
      document.querySelectorAll('.inline-title-card').forEach(c => {
        c.classList.remove('selected');
        const btn = c.querySelector('.inline-title-use');
        if(btn) btn.textContent = 'Use Title';
      });
      card.classList.add('selected');
      const useBtn = card.querySelector('.inline-title-use');
      if(useBtn) useBtn.textContent = 'Selected';

      // Update storage
      chrome.storage.local.set({ selectedEbayTitle: titleStr });

      // Trigger standard selection effect
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast('Title selected', 'success');
      }
    });

    // Click handler for copy button
    const copyBtn = card.querySelector('.inline-title-copy');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Don't trigger card selection
      navigator.clipboard.writeText(titleStr).then(() => {
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast('Copied to clipboard!', 'success');
        }
      });
    });

    titleList.appendChild(card);
  });
}

// ═══════════════════════════════════════════════════════════
// Title Selection Popup (DEPRECATED)
// ═══════════════════════════════════════════════════════════
// DEPRECATED: Preserved for rollback safety.
// Inline title rendering now uses renderInlineTitles().
function showTitleSelectionPopup(titles) {
  console.log('[Panel] showTitleSelectionPopup called with:', titles);
  const popup = document.getElementById('title-selection-popup');
  const popupList = document.getElementById('title-popup-list');
  const closeBtn = document.getElementById('title-popup-close-btn');
  const overlay = popup?.querySelector('.title-popup-overlay');

  if (!popup || !popupList) {
    console.error('[Panel] Popup elements missing:', { popup, popupList });
    return;
  }

  // Build title options HTML
  const rankLabels = ['Best', 'Recommended', 'Alternative'];
  const optionsHtml = titles.map((titleData, index) => {
    const titleValue = typeof titleData === 'object' ? titleData.title : titleData;
    const charCount = titleValue ? titleValue.length : 0;
    const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-default';
    const rankLabel = rankLabels[index] || `Option ${index + 1}`;

    return `
      <div class="title-option" data-title-index="${index}" data-title-value="${encodeURIComponent(titleValue || '')}">
        <div class="title-option-select-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="title-option-header">
          <span class="title-option-rank ${rankClass}">${rankLabel}</span>
          <span class="title-option-char-count">${charCount} characters</span>
        </div>
        <div class="title-option-text">${titleValue || 'No title generated'}</div>
      </div>
    `;
  }).join('');

  popupList.innerHTML = optionsHtml;

  // Attach click handlers to title options
  popupList.querySelectorAll('.title-option').forEach(option => {
    option.addEventListener('click', () => {
      const titleValue = decodeURIComponent(option.dataset.titleValue || '');
      selectTitle(titleValue, option);
    });
  });

  // Close handlers
  const closePopup = () => {
    popup.style.display = 'none';
  };

  closeBtn?.addEventListener('click', closePopup);
  overlay?.addEventListener('click', closePopup);

  // Show popup
  popup.style.display = 'flex';
}

// Select title from inline title row (below input field)
function selectTitleFromRow(titleValue, rowElement) {
  if (!titleValue) return;

  // Remove selected class from all title rows
  document.querySelectorAll('.title-row').forEach(row => {
    row.classList.remove('title-selected');
  });

  // Add selected class to clicked row
  rowElement?.classList.add('title-selected');

  // Update the Selected Title Holder
  updateSelectedTitleHolder(titleValue);

  // Save selected title to Chrome storage
  chrome.storage.local.set({
    selectedEbayTitle: titleValue,
    selectedTitleTimestamp: Date.now()
  }, () => {
    console.log('[Panel] Selected title from row saved to storage:', titleValue);
  });

  // Show success toast
  if (typeof UIHelper !== 'undefined') {
    UIHelper.showToast('Title selected! Ready to paste on eBay.', 'success');
  }

  // Copy to clipboard as well
  navigator.clipboard.writeText(titleValue).then(() => {
    console.log('[Panel] Title copied to clipboard');
  }).catch(err => {
    console.warn('[Panel] Could not copy to clipboard:', err);
  });
}

function selectTitle(titleValue, optionElement) {
  if (!titleValue) return;

  // Remove selected class from all options
  document.querySelectorAll('.title-option').forEach(opt => {
    opt.classList.remove('selected');
  });

  // Add selected class to clicked option
  optionElement?.classList.add('selected');

  // Update the Selected Title Holder
  updateSelectedTitleHolder(titleValue);

  // Save selected title to Chrome storage
  chrome.storage.local.set({
    selectedEbayTitle: titleValue,
    selectedTitleTimestamp: Date.now()
  }, () => {
    console.log('[Panel] Selected title saved to storage:', titleValue);
  });

  // Show success toast
  if (typeof UIHelper !== 'undefined') {
    UIHelper.showToast('Title selected! Ready to paste on eBay.', 'success');
  }

  // Close popup after selection
  setTimeout(() => {
    const popup = document.getElementById('title-selection-popup');
    if (popup) popup.style.display = 'none';
  }, 500);

  // Copy to clipboard as well
  navigator.clipboard.writeText(titleValue).then(() => {
    console.log('[Panel] Title copied to clipboard');
  }).catch(err => {
    console.warn('[Panel] Could not copy to clipboard:', err);
  });
}

// Update the Single Title Display UI with smooth animation
function updateSelectedTitleHolder(titleValue) {
  // Target the new single title display
  const titleDisplay = document.getElementById('ai-generated-title');
  const titleCounter = document.getElementById('ai-title-counter');
  const copyBtn = document.getElementById('copy-title-btn');

  if (!titleDisplay) return;

  if (titleValue && titleValue.trim()) {
    titleDisplay.innerText = titleValue;
    titleDisplay.classList.add('has-title');

    if (titleCounter) {
      titleCounter.textContent = `${titleValue.length} characters`;
    }

    if (copyBtn) {
      copyBtn.style.display = 'inline-flex';
    }

    console.log('[Panel] Updated generated title display with:', titleValue.substring(0, 50) + '...');
  }
}

function copyTitle(targetId) {
  const input = document.getElementById(targetId);
  if (!input || !input.value) {
    if (typeof UIHelper !== 'undefined') {
      UIHelper.showToast('No title to copy', 'warning');
    }
    return;
  }

  navigator.clipboard.writeText(input.value).then(() => {
    if (typeof UIHelper !== 'undefined') {
      UIHelper.showToast('Title copied!', 'success');
    }
  }).catch(err => {
    console.error('[Panel] Copy error:', err);
  });
}

// ═══════════════════════════════════════════════════════════
// Action Buttons
// ═══════════════════════════════════════════════════════════

function initActionButtons() {
  const snipeTitleBtn = document.getElementById('snipe-title-btn');
  const optiListBtn = document.getElementById('opti-list-btn');
  const copyBtn = document.getElementById('copy-btn');
  const productDetailsBtn = document.getElementById('product-details-btn');
  const generateSkuBtn = document.getElementById('generate-sku-btn');

  if (snipeTitleBtn) {
    snipeTitleBtn.addEventListener('click', async () => {
      const originalText = snipeTitleBtn.textContent;
      snipeTitleBtn.disabled = true;
      snipeTitleBtn.textContent = 'Generating Titles...';

      try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
          throw new Error('No active tab found');
        }

        if (!isSupplierPage(tab.url)) {
          throw new Error('Please open a supported supplier product page');
        }

        // Send message to content script to trigger AI generation
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'GENERATE_AI_TITLES'
        });

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to generate titles');
        }

        // Success - titles are populated in the content script's UI
        console.log('[Panel] AI titles generated successfully');
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast('AI titles generated!', 'success');
        }

      } catch (error) {
        console.error('[Panel] Snipe Title error:', error);
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast(error.message, 'error');
        } else {
          alert(error.message);
        }
      } finally {
        snipeTitleBtn.disabled = false;
        snipeTitleBtn.textContent = originalText;
      }
    });
  }

  if (optiListBtn) {
    optiListBtn.addEventListener('click', async () => {
      const originalText = optiListBtn.textContent;
      optiListBtn.disabled = true;
      optiListBtn.textContent = 'Processing...';
      try {
        const selected = await chrome.storage.local.get([
          'selectedEbayTitle',
          'selectedEbayDescription',
          'selectedDescriptionTimestamp',
          'currentProduct',
          'snipedData'
        ]);
        const selectedTitle = selected.selectedEbayTitle;
        const storedProduct = selected.currentProduct || selected.snipedData || {};

        const sku = document.getElementById('sku-input')?.value?.trim();
        const finalPrice = document.getElementById('sell-it-for-input')?.value?.trim();

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!selectedTitle) throw new Error('No title selected. Generate & select a title first.');
        if (!sku) throw new Error('Missing SKU. Click Generate SKU first.');

        let scrapedData = null;
        let scrapedDetails = null;

        // Attempt PREPARE_EBAY_LISTING for any supplier tab — non-Amazon injectors won't
        // respond (chrome.runtime.lastError) so we fall through to stored product.
        if (tab?.id) {
          optiListBtn.textContent = 'Loading...';
          const scrapeResp = await new Promise(resolve => {
            chrome.tabs.sendMessage(tab.id, { action: 'PREPARE_EBAY_LISTING', options: { skipScrape: true } }, resp => {
              if (chrome.runtime.lastError) { resolve(null); return; }
              resolve(resp);
            });
          });
          if (scrapeResp?.success) {
            scrapedData = scrapeResp.fullData;
            scrapedDetails = scrapeResp.productDetails;
          } else {
            // Injector updated currentProduct before responding, or supplier has no PREPARE_EBAY_LISTING —
            // either way, read fresh from storage as authoritative source.
            const fresh = await chrome.storage.local.get('currentProduct');
            if (fresh.currentProduct) scrapedData = fresh.currentProduct;
          }
        }

        const productURL = tab?.url || storedProduct.url || storedProduct.sourceUrl || '';
        const supplierPrice = (scrapedData?.price || storedProduct.price || '').toString().trim();
        const sourceId = scrapedData?.sourceId || storedProduct.sourceId ||
                         scrapedData?.asin || storedProduct.asin || storedProduct.ASIN || '';
        const scannedAt = scrapedData?.lastScannedAt || scrapedData?.scrapedAt ||
                          storedProduct.lastScannedAt || storedProduct.scrapedAt || 0;
        const selectedDescFresh = !scannedAt || (selected.selectedDescriptionTimestamp || 0) >= scannedAt;
        const selectedDescription = selectedDescFresh ? (selected.selectedEbayDescription || '') : '';

        let ebayProduct = {
          ...storedProduct,
          ...(scrapedData || {}),
          title: selectedTitle,
          description: selectedDescription || scrapedData?.description || storedProduct.description || '',
          description_source: selectedDescription ? 'ai' : (scrapedData?.description_source || storedProduct.description_source || 'scraped'),
          ebaySku: sku,
          // price = raw supplier price; the eBay sell price goes in finalPrice.
          // Writing the sell price into price corrupted supplier-price tracking
          // and let downstream recalculation override the displayed sell price.
          price: scrapedData?.price || storedProduct.price,
          finalPrice: parseFloat(finalPrice) ||
                      parseFloat(scrapedData?.finalPrice) ||
                      parseFloat(storedProduct.finalPrice) || 0,
          price_source: parseFloat(finalPrice) > 0
            ? 'manual'
            : (scrapedData?.price_source || storedProduct.price_source || 'calculated'),
          supplierPrice,
          url: productURL,
          sourceId,
          asin: sourceId, // backward compat — message-router reads product.asin for DB sync
          quantity: 1,
          useStoredWatermarkedImages: true,
          ...(scrapedDetails ? {
            specs: {
              ...(scrapedDetails.brand      ? { Brand: scrapedDetails.brand }           : {}),
              ...(scrapedDetails.model      ? { 'Model Number': scrapedDetails.model }  : {}),
              ...(scrapedDetails.color      ? { Color: scrapedDetails.color }           : {}),
              ...(scrapedDetails.dimensions ? { Dimensions: scrapedDetails.dimensions } : {}),
              ...(scrapedDetails.weight     ? { Weight: scrapedDetails.weight }         : {}),
            }
          } : {})
        };
        if (window.SSVariationNormalizer) {
          ebayProduct = window.SSVariationNormalizer.normalizeProduct(ebayProduct, {
            dedupe: true,
            dropInvalid: true
          });
        }

        chrome.runtime.sendMessage({
          action: 'import_ebay',
          product: ebayProduct,
          uploadType: 'classic'
        });

        if (typeof UIHelper !== 'undefined') UIHelper.showToast('Listing started', 'success');
      } catch (err) {
        console.error('[Panel] Opti-List error:', err);
        if (typeof UIHelper !== 'undefined') UIHelper.showToast(err.message || 'Opti-List failed', 'error');
      } finally {
        optiListBtn.disabled = false;
        optiListBtn.textContent = originalText;
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'COPY_DATA' });
    });
  }

  if (productDetailsBtn) {
    productDetailsBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'SHOW_PRODUCT_DETAILS' });
    });
  }

  if (generateSkuBtn) {
    generateSkuBtn.addEventListener('click', generateSKU);
  }

  const skuPrefixInput = document.getElementById('sku-prefix');
  if (skuPrefixInput) {
    skuPrefixInput.addEventListener('input', () => {
      generateSKU();
      chrome.storage.local.get(['currentProduct'], (res) => {
        const product = res.currentProduct || {};
        if (product.variants && product.variants.length > 0) {
          if (typeof _renderPanelCombinations === 'function') {
            _renderPanelCombinations(product);
          }
          chrome.storage.local.set({ currentProduct: product });
        }
      });
    });
  }

  // Scrape All Data button
  const scrapeAllDataBtn = document.getElementById('scrape-all-data-btn');
  if (scrapeAllDataBtn) {
    scrapeAllDataBtn.addEventListener('click', async () => {
      const originalText = scrapeAllDataBtn.textContent;
      scrapeAllDataBtn.disabled = true;
      scrapeAllDataBtn.textContent = 'Scraping...';

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
          throw new Error('No active tab found');
        }

        if (!isSupplierPage(tab.url)) {
          throw new Error('Please open a supported supplier product page');
        }

        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'SCRAPE_COMPLETE_PRODUCT'
        });

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to scrape product data');
        }

        if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('[Panel] Complete product data scraped (hidden in prod)', response.data);

        // Show success with data summary
        const message = `Scraped ${response.fieldsCount} fields, ${response.specsCount} specifications!`;
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast(message, 'success');
        } else {
          alert(message);
        }

        // Log the data for inspection
        if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('[Panel] Product Data (hidden in prod)', response.data);
        console.log('[Panel] Title:', response.data.title);
        console.log('[Panel] Price:', response.data.price);
        console.log('[Panel] Images:', response.data.allImages?.length);
        console.log('[Panel] Specifications:', response.data.specifications);

      } catch (error) {
        console.error('[Panel] Scrape All Data error:', error);
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast(error.message, 'error');
        } else {
          alert(error.message);
        }
      } finally {
        scrapeAllDataBtn.disabled = false;
        scrapeAllDataBtn.textContent = originalText;
      }
    });
  }
}

function generateSKU() {
  chrome.storage.local.get(['currentProduct', 'snipedData'], (result) => {
    const product = result.currentProduct || result.snipedData || {};
    // Supplier-neutral id first; legacy Amazon fields as fallback
    const sourceId = product.sourceId || product.asin || product.ASIN || '';
    const prefix = document.getElementById('sku-prefix')?.value
      || (window.SSSkuEngine?.prefixFor ? window.SSSkuEngine.prefixFor(product.supplier) : 'AB');
    const skuInput = document.getElementById('sku-input');

    if (skuInput) {
      skuInput.value = sourceId
        ? (window.SSSkuEngine
          ? window.SSSkuEngine.buildReadable(sourceId, {}, prefix)
          : `${prefix}-${String(sourceId).toUpperCase().replace(/[^A-Z0-9]/g, '')}`)
        : '';
    }
  });
}

// ═══════════════════════════════════════════════════════════
// Calculator
// ═══════════════════════════════════════════════════════════

function initCalculator() {
  const calculatorBtn = document.getElementById('calculator-btn');
  const quickCalcBtn = document.getElementById('quick-calc-btn');
  const closeBtn = document.getElementById('calculator-close-btn');
  const popup = document.getElementById('calculator-popup');

  if (calculatorBtn) {
    calculatorBtn.addEventListener('click', () => {
      if (popup) {
        popup.style.display = 'flex';
        runCalculation();
      }
    });
  }

  if (quickCalcBtn) {
    quickCalcBtn.addEventListener('click', runCalculation);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (popup) popup.style.display = 'none';
    });
  }

  const overlay = popup?.querySelector('.calculator-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      if (popup) popup.style.display = 'none';
    });
  }

  // Auto-calculate on input change
  const inputs = ['supplier-price', 'tax-percent', 'tracking-fee', 'ebay-fee-percent', 'promo-fee-percent', 'desired-profit', 'payment-fixed-fee'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', runCalculation);
    }
  });

  const calculateBtn = document.getElementById('calculate-btn');
  if (calculateBtn) {
    calculateBtn.addEventListener('click', runCalculation);
  }
}

function runCalculation() {
  const sourcePrice = parseFloat(document.getElementById('supplier-price')?.value) || 0;
  const taxPercent = parseFloat(document.getElementById('tax-percent')?.value) || 0;
  const trackingFee = parseFloat(document.getElementById('tracking-fee')?.value) || 0;
  const ebayFeePercent = parseFloat(document.getElementById('ebay-fee-percent')?.value) || 0;
  const promoFeePercent = parseFloat(document.getElementById('promo-fee-percent')?.value) || 0;
  const desiredProfit = parseFloat(document.getElementById('desired-profit')?.value) || 0;
  const paymentFixedFee = parseFloat(document.getElementById('payment-fixed-fee')?.value) || 0;

  // Save values to localStorage
  saveCalculatorValues(sourcePrice, taxPercent, trackingFee, ebayFeePercent, promoFeePercent, desiredProfit, paymentFixedFee);

  if (typeof calculateSellingPrice !== 'function') {
    console.error('calculateSellingPrice is not defined');
    return;
  }

  const result = calculateSellingPrice({
    sourcePrice,
    taxPercent,
    trackingFee,
    ebayFeePercent,
    promoFeePercent,
    desiredProfit,
    paymentFixedFee
  });

  const finalPriceEl = document.getElementById('final-price');
  const sellInput = document.getElementById('sell-it-for-input');

  if (!result) {
    if (finalPriceEl) finalPriceEl.textContent = '$0.00';
    updateBreakdownDisplay(null);
    return;
  }

  if (finalPriceEl) {
    finalPriceEl.textContent = `$${result.finalPrice.toFixed(2)}`;
  }
  if (sellInput) {
    sellInput.value = result.finalPrice.toFixed(2);
    // Add visual feedback
    sellInput.style.backgroundColor = '#e8f5e8';
    sellInput.style.borderColor = '#4caf50';
    setTimeout(() => {
      sellInput.style.backgroundColor = '';
      sellInput.style.borderColor = '';
    }, 1500);
  }

  updateBreakdownDisplay(result);

  // Recalculate variations using new settings
  chrome.storage.local.get(['currentProduct'], (res) => {
    const product = res.currentProduct || {};
    if (product.variants && product.variants.length > 0) {
      if (typeof _renderPanelCombinations === 'function') {
        _renderPanelCombinations(product);
      }
      chrome.storage.local.set({ currentProduct: product });
    }
  });
}

function updateBreakdownDisplay(result) {
  const breakdownDiv = document.getElementById('calculator-breakdown');
  if (!breakdownDiv) return;

  if (!result) {
    breakdownDiv.style.display = 'none';
    return;
  }

  breakdownDiv.style.display = 'flex';

  const setVal = (id, text, color) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = text;
      el.style.color = color || '';
    }
  };

  setVal('bd-source', `$${result.breakdown.sourcePrice.toFixed(2)}`);
  setVal('bd-tax', `$${result.breakdown.taxAmount.toFixed(2)}`);
  setVal('bd-tracking', `$${result.breakdown.trackingFee.toFixed(2)}`);
  setVal('bd-payment', `$${result.breakdown.paymentFixedFee.toFixed(2)}`);
  setVal('bd-ebay', `$${result.breakdown.ebayFee.toFixed(2)}`);
  setVal('bd-promo', `$${result.breakdown.promoFee.toFixed(2)}`);
  
  const profitColor = result.netProfit >= 0 ? '#22c55e' : '#ef4444';
  setVal('bd-profit', `$${result.netProfit.toFixed(2)}`, profitColor);
  setVal('bd-roi', `${result.roi}%`, profitColor);
  setVal('bd-margin', `${result.margin}%`, profitColor);
}

function saveCalculatorValues(sourcePrice, taxPercent, trackingFee, ebayFeePercent, promoFeePercent, desiredProfit, paymentFixedFee) {
  const values = {
    'tax-percent': taxPercent,
    'tracking-fee': trackingFee,
    'ebay-fee-percent': ebayFeePercent,
    'promo-fee-percent': promoFeePercent,
    'desired-profit': desiredProfit,
    'payment-fixed-fee': paymentFixedFee
  };
  localStorage.setItem('calculatorValues', JSON.stringify(values));
}

function loadCalculatorValues() {
  try {
    const savedValues = JSON.parse(localStorage.getItem('calculatorValues') || '{}');
    const fields = ['tax-percent', 'tracking-fee', 'ebay-fee-percent', 'promo-fee-percent', 'desired-profit', 'payment-fixed-fee'];
    fields.forEach(fieldId => {
      const input = document.getElementById(fieldId);
      if (input && savedValues[fieldId] !== undefined) {
        input.value = savedValues[fieldId];
      }
    });
  } catch (e) {
    console.error('Error loading calculator values from localStorage:', e);
  }
}

// ═══════════════════════════════════════════════════════════
// Panel Layout Controls (Header Buttons)
// ═══════════════════════════════════════════════════════════
function initPanelControls() {
  const nightModeBtn = document.getElementById('panel-night-mode-btn');
  const minimizeBtn = document.getElementById('panel-minimize-btn');
  const restoreBtn = document.getElementById('panel-restore-btn');
  const closeBtn = document.getElementById('panel-close-btn');
  const setMinimizedState = (isMinimized) => {
    const rootWrapper = document.getElementById('snipe-root-wrapper');
    if (!rootWrapper) return;
    rootWrapper.classList.toggle('panel-minimized', isMinimized);
  };

  if (nightModeBtn) {
    nightModeBtn.addEventListener('click', () => {
      const rootWrapper = document.getElementById('snipe-root-wrapper');
      if (rootWrapper) {
        rootWrapper.classList.toggle('ss-dark-mode');
      } else {
        document.body.classList.toggle('ss-dark-mode');
      }
    });
  }

  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      setMinimizedState(true);
    });
  }

  if (restoreBtn) {
    restoreBtn.addEventListener('click', () => {
      setMinimizedState(false);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const rootWrapper = document.getElementById('snipe-root-wrapper');
      if (rootWrapper) {
        rootWrapper.remove();
        
        const startBtn = document.getElementById('initial-list-button') || document.querySelector('.floating-snipe-btn');
        if (startBtn) {
          startBtn.style.display = 'flex';
        }
      }
    });
  }
}

// Sidebar Extended Mode is handled by amazon_injector.js showSidebarExtended()
// This IIFE is intentionally removed — logic lives in the content script.

(function initSidebarExtendedMode() {
  return; // no-op: handled by amazon_injector.showSidebarExtended
  const params = new URLSearchParams(
    (typeof location !== 'undefined' ? location.search : '') ||
    (document.currentScript && document.currentScript.ownerDocument &&
      document.currentScript.ownerDocument.location &&
      document.currentScript.ownerDocument.location.search) || ''
  );
  if (params.get('source') !== 'sidebar') return;

  chrome.storage.local.get(['currentProduct'], (result) => {
    const product = result.currentProduct || {};
    _renderExtendedEditor(product);
  });

  function _renderExtendedEditor(product) {
    const wrap = document.getElementById('ss-extended-editor');
    if (!wrap) return;
    wrap.style.display = 'block';

    // Populate fields
    const extTitle = document.getElementById('ext-title');
    const extPrice = document.getElementById('ext-price');
    const extSku   = document.getElementById('ext-sku');
    const extQty   = document.getElementById('ext-qty');

    if (extTitle) extTitle.value = product.title || '';
    if (extPrice) extPrice.value = product.finalPrice || product.price || '';
    if (extSku)   extSku.value   = product.ebaySku || '';
    if (extQty)   extQty.value   = product.quantity || 1;

    // Mirror title into main title display
    const mainTitle = document.getElementById('ai-generated-title');
    if (mainTitle && product.title) {
      mainTitle.textContent = product.title;
      mainTitle.dispatchEvent(new Event('input'));
    }

    // Render variations
    const variations = product.variations || [];
    if (variations.length > 0) {
      const varWrap = document.getElementById('ext-variations-wrap');
      if (varWrap) varWrap.style.display = 'block';
      _renderPanelVariations(variations, product);
      _renderPanelCombinations(product);
    }

    // Render item specifics/specs
    const specs = product.specs || product.specifications || {};
    const specKeys = Object.keys(specs);
    if (specKeys.length > 0) {
      const specWrap = document.getElementById('ext-specs-wrap');
      const specContainer = document.getElementById('ext-specs');
      if (specWrap) specWrap.style.display = 'block';
      if (specContainer) {
        specContainer.innerHTML = '';
        specKeys.forEach(key => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:8px;margin-bottom:4px;align-items:center;';
          const lbl = document.createElement('span');
          lbl.textContent = key;
          lbl.style.cssText = 'flex:0 0 140px;font-size:11px;color:var(--ss-muted,#94a3b8);';
          const inp = document.createElement('input');
          inp.type = 'text';
          inp.value = specs[key] || '';
          inp.dataset.specKey = key;
          inp.style.cssText = 'flex:1;padding:4px 6px;border-radius:4px;border:1px solid var(--ss-border,#334155);background:var(--ss-bg,#0f172a);color:inherit;font-size:12px;';
          inp.addEventListener('input', () => _saveExtendedEdits());
          row.appendChild(lbl);
          row.appendChild(inp);
          specContainer.appendChild(row);
        });
      }
    }

    // Wire edit write-back
    [extTitle, extPrice, extSku, extQty].forEach(el => {
      if (el) el.addEventListener('input', () => _saveExtendedEdits());
    });

    // Mirror ext-title → main title display on input
    if (extTitle) {
      extTitle.addEventListener('input', () => {
        if (mainTitle) mainTitle.textContent = extTitle.value;
      });
    }

    // Wire Upload button to use extended editor state (skip Amazon scrape)
    const uploadBtn = document.getElementById('opti-list-btn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', _handleExtendedUpload, { once: false });
    }
  }

  function _renderPanelVariations(variations, product) {
    const container = document.getElementById('ext-variations');
    if (!container) return;
    container.innerHTML = '';

    variations.forEach((dim, dIdx) => {
      const dimEl = document.createElement('div');
      dimEl.style.cssText = 'margin-bottom:8px;padding:8px;border:1px solid var(--ss-border,#334155);border-radius:6px;';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;';

      const dimLabel = document.createElement('input');
      dimLabel.type = 'text';
      dimLabel.value = dim.label || '';
      dimLabel.placeholder = 'Dimension (e.g. Color)';
      dimLabel.style.cssText = 'flex:1;padding:4px 6px;border-radius:4px;border:1px solid var(--ss-border,#334155);background:var(--ss-bg,#0f172a);color:inherit;font-size:12px;font-weight:600;';
      dimLabel.addEventListener('input', () => {
        variations[dIdx].label = dimLabel.value;
        _saveExtendedEdits();
      });

      header.appendChild(dimLabel);
      dimEl.appendChild(header);

      const valGrid = document.createElement('div');
      valGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
      (dim.values || []).forEach((val, vIdx) => {
        const chip = document.createElement('span');
        chip.textContent = val;
        chip.style.cssText = 'padding:2px 8px;border-radius:12px;background:var(--ss-bg,#0f172a);border:1px solid var(--ss-border,#334155);font-size:11px;color:var(--ss-muted,#94a3b8);';
        valGrid.appendChild(chip);
      });
      dimEl.appendChild(valGrid);
      container.appendChild(dimEl);
    });
  }

  function _renderPanelCombinations(product) {
    const container = document.getElementById('ext-variations');
    if (!container) return;

    // Find or create combinations wrapper
    let comboWrap = document.getElementById('ext-combos-wrap');
    if (!comboWrap) {
      comboWrap = document.createElement('div');
      comboWrap.id = 'ext-combos-wrap';
      comboWrap.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid var(--ss-border,#334155);';
      
      const title = document.createElement('div');
      title.textContent = 'Variation Combinations (Read-only)';
      title.style.cssText = 'font-size:11px;font-weight:600;color:var(--ss-muted,#94a3b8);margin-bottom:8px;';
      comboWrap.appendChild(title);
      container.appendChild(comboWrap);
    } else {
      // Clear all items except title
      const title = comboWrap.firstChild;
      comboWrap.innerHTML = '';
      if (title) comboWrap.appendChild(title);
    }

    const variants = product.variants || [];
    if (!variants.length) return;

    const calcSettings = {
      taxPercent: parseFloat(document.getElementById('tax-percent')?.value) || 9,
      trackingFee: parseFloat(document.getElementById('tracking-fee')?.value) || 0.20,
      ebayFeePercent: parseFloat(document.getElementById('ebay-fee-percent')?.value) || 20,
      promoFeePercent: parseFloat(document.getElementById('promo-fee-percent')?.value) || 10,
      desiredProfit: parseFloat(document.getElementById('desired-profit')?.value) || 0,
      paymentFixedFee: parseFloat(document.getElementById('payment-fixed-fee')?.value) || 0.30
    };

    const skuPrefix = document.getElementById('sku-prefix')?.value || 'AB';
    // Supplier-neutral id first; legacy Amazon fields as fallback
    const parentAsin = product.sourceId || product.asin || product.ASIN || product.parentAsin || '';

    variants.forEach((v) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:6px;background:var(--ss-bg-alt,#1e293b);border-radius:6px;margin-bottom:6px;font-size:11px;border:1px solid var(--ss-border,#334155);';

      // 1. Attributes block
      const attrTexts = Object.entries(v.attrs || {}).map(([k, val]) => {
        const valueName = (val && typeof val === 'object') ? (val.productName || '') : String(val || '');
        return `${k}: ${valueName}`;
      });
      const attrHeader = document.createElement('div');
      attrHeader.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;font-weight:600;';
      attrTexts.forEach(txt => {
        const badge = document.createElement('span');
        badge.textContent = txt;
        badge.style.cssText = 'padding:1px 6px;border-radius:4px;background:var(--ss-border,#334155);color:inherit;';
        attrHeader.appendChild(badge);
      });
      row.appendChild(attrHeader);

      // Calculate marked-up price & build readable SKU
      const markedupPrice = window.SSPricingEngine.calculatePrice(v.price, calcSettings);
      const readableSku = window.SSSkuEngine.buildReadable(parentAsin, v.attrs, skuPrefix);

      // Save fields back into the variant object
      v.ebayPrice = markedupPrice;
      v.sku = readableSku;

      // 2. Info block: SKU and Price side-by-side
      const info = document.createElement('div');
      info.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-top:2px;';
      
      const skuLabel = document.createElement('span');
      skuLabel.textContent = `SKU: ${readableSku}`;
      skuLabel.style.cssText = 'font-family:monospace;color:var(--ss-muted,#94a3b8);flex:1;';
      
      const priceLabel = document.createElement('span');
      priceLabel.textContent = `eBay Price: $${markedupPrice.toFixed(2)}`;
      priceLabel.style.cssText = 'font-weight:600;color:#22c55e;';

      info.appendChild(skuLabel);
      info.appendChild(priceLabel);
      row.appendChild(info);

      comboWrap.appendChild(row);
    });
    chrome.storage.local.set({ currentProduct: product });
  }

  function _saveExtendedEdits() {
    chrome.storage.local.get(['currentProduct'], (result) => {
      const product = result.currentProduct || {};

      const extTitle = document.getElementById('ext-title');
      const extPrice = document.getElementById('ext-price');
      const extSku   = document.getElementById('ext-sku');
      const extQty   = document.getElementById('ext-qty');

      if (extTitle && extTitle.value) product.title = extTitle.value;
      if (extPrice && extPrice.value && parseFloat(extPrice.value) > 0) {
        const newPrice = parseFloat(extPrice.value);
        if (newPrice !== parseFloat(product.finalPrice)) product.price_source = 'manual';
        product.finalPrice = newPrice;
      }
      if (extSku   && extSku.value)   product.ebaySku = extSku.value;
      if (extQty   && extQty.value)   product.quantity = parseInt(extQty.value, 10) || 1;

      // Collect spec edits
      const specInputs = document.querySelectorAll('#ext-specs input[data-spec-key]');
      if (specInputs.length > 0) {
        const specs = product.specs || product.specifications || {};
        specInputs.forEach(inp => { specs[inp.dataset.specKey] = inp.value; });
        product.specs = specs;
      }

      chrome.storage.local.set({ currentProduct: product });
    });
  }

  async function _handleExtendedUpload(e) {
    // This listener is added on top of existing opti-list-btn handler.
    // Existing handler already sends import_ebay. Here we just ensure
    // latest edits are flushed to storage before it fires.
    // Stop propagation so existing handler reads fresh storage data.
    e.stopImmediatePropagation();

    const btn = document.getElementById('opti-list-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }

    try {
      await new Promise(resolve => {
        _saveExtendedEdits();
        setTimeout(resolve, 80); // wait for storage write
      });

      const result = await new Promise(resolve =>
        chrome.storage.local.get(['currentProduct', 'selectedEbayTitle'], resolve)
      );
      const product = result.currentProduct || {};
      const extTitle = document.getElementById('ext-title');
      const extSku   = document.getElementById('ext-sku');
      const extPrice = document.getElementById('ext-price');

      const finalTitle = (extTitle && extTitle.value.trim()) ||
                         result.selectedEbayTitle ||
                         product.title || '';
      const sku = (extSku && extSku.value.trim()) || product.ebaySku || '';

      if (!finalTitle) { alert('No title. Fill title first.'); return; }
      if (!sku) { alert('No SKU. Fill SKU first.'); return; }

      const extPriceVal = extPrice && extPrice.value.trim();
      const finalPrice = parseFloat(extPriceVal) || parseFloat(product.finalPrice) || 0;
      const priceSource = (parseFloat(extPriceVal) > 0 && parseFloat(extPriceVal) !== parseFloat(product.finalPrice)) ? 'manual' : (product.price_source || 'calculated');

      let ebayProduct = {
        ...product,
        title: finalTitle,
        ebaySku: sku,
        price: product.price,
        finalPrice,
        price_source: priceSource,
        quantity: parseInt(document.getElementById('ext-qty')?.value || '1', 10) || 1,
        useStoredWatermarkedImages: false
      };
      if (window.SSVariationNormalizer) {
        ebayProduct = window.SSVariationNormalizer.normalizeProduct(ebayProduct, {
          dedupe: true,
          dropInvalid: true
        });
      }

      chrome.runtime.sendMessage({
        action: 'import_ebay',
        product: ebayProduct,
        uploadType: 'classic'
      });

      if (btn) btn.textContent = '✅ Opened eBay…';
      setTimeout(() => {
        if (btn) { btn.disabled = false; btn.textContent = 'Upload'; }
      }, 3000);
    } catch (err) {
      console.error('[Panel] Extended upload error:', err);
      if (btn) { btn.disabled = false; btn.textContent = 'Upload'; }
    }
  }
})();

// Listen for progress messages in case panel is running in a different context (e.g. popup/sidepanel)
chrome.runtime.onMessage?.addListener((request) => {
  if (request.action === 'SCRAPE_PROGRESS') {
    updateScrapeStatus(request.message);
  }
});
