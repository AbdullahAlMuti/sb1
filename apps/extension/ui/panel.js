// ═══════════════════════════════════════════════════════════
// Panel Main Script
// Coordinates all panel functionality
// ═══════════════════════════════════════════════════════════

console.log('[Panel] Initializing...');

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

function initPanel() {
  console.log('[Panel] DOM Ready, initializing components...');

  // Initialize all components
  initAuthStatus();
  initImageGallery();
  initTitleGeneration();
  initActionButtons();
  initCalculator();
  initPanelControls(); // Added controls initialization

  console.log('[Panel] All components initialized');
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
          const authUrl = (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.WEB_APP_AUTH)
            ? ExtensionConfig.URLS.WEB_APP_AUTH
            : 'https://app.sellersuit.com/auth';
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
  chrome.storage.local.get(['productImages', 'snipedData'], (result) => {
    const images = result.productImages || result.snipedData?.images || [];
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

function refreshImages() {
  console.log('[Panel] Refreshing images...');
  (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found');

      // Prefer content-script extraction (supports Amazon/Walmart via extractImages handler)
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractImages' });
      if (!response?.success) throw new Error(response?.error || 'Failed to extract images');

      const images = Array.isArray(response.images) ? response.images : [];
      await chrome.storage.local.set({ productImages: images });
      displayImages(images);

      if (typeof UIHelper !== 'undefined') UIHelper.showToast('Images refreshed!', 'success');
    } catch (err) {
      console.error('[Panel] Refresh images error:', err);
      if (typeof UIHelper !== 'undefined') UIHelper.showToast(err.message || 'Failed to refresh images', 'error');
    }
  })();
}

function downloadAllImages() {
  chrome.storage.local.get(['productImages'], (result) => {
    const images = result.productImages || [];
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
    // Check authentication first
    const isAuthenticated = await AuthHelper.isAuthenticated();
    if (!isAuthenticated) {
      AuthHelper.promptLogin();
      return;
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

    // If no product data in storage, try to scrape from current page
    if (!productData.title && !productData.productTitle) {
      console.log('[Panel] No product data in storage, attempting to scrape from page...');

      // Get active tab and scrape product data
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        try {
          const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'SCRAPE_PRODUCT_DATA' });
          if (response && response.success && response.data) {
            productData = response.data;
            console.log('[Panel] Successfully scraped product data from page');
          }
        } catch (scrapeError) {
          console.error('[Panel] Failed to scrape from page:', scrapeError);
        }
      }
    }

    // Final check for product data
    if (!productData.title && !productData.productTitle) {
      throw new Error('No product data found. Please open an Amazon or Walmart product page and try again.');
    }

    // Call edge function WITH AUTHENTICATION, including title count
    console.log('[Panel] Calling generate-titles with data:', {
      title: productData.title || productData.productTitle,
      brand: productData.brand,
      category: productData.category,
      bulletPointsCount: Math.min(3, (productData.bulletPoints || productData.features || []).length),
      count: titleCount
    });

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
// NOTE: Now handled centrally by UIHelper.renderInlineTitles in common/ui.js
// This local fallback is kept for safety if UIHelper fails to load.

function renderInlineTitles(titles) {
  const titleList = document.getElementById('snipe-title-list');
  if (!titleList) return;
  // Fallback to minimal implementation or let UIHelper handle it
  if (typeof UIHelper !== 'undefined' && typeof UIHelper.renderInlineTitles === 'function') {
    return UIHelper.renderInlineTitles(titles);
  }
}

function renderInlineTitles(titles) {
  const titleList = document.getElementById('snipe-title-list');
  if (!titleList) return;

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
    card.className = \`inline-title-card \${index === 0 ? 'selected' : ''}\`;
    card.dataset.title = titleStr;

    card.innerHTML = \`
      <div class="inline-title-header">
        <div class="inline-title-badge \${badgeClass}">
          \${index === 0 ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
          \${badgeText}
        </div>
        <div class="inline-title-meta">
          <span class="\${titleStr.length > 80 ? 'warning' : ''}">\${titleStr.length} chars</span>
        </div>
      </div>
      <div class="inline-title-text">\${escapedTitleStr}</div>
      <div class="inline-title-actions">
        <button class="btn btn-sm inline-title-use">\${index === 0 ? 'Selected' : 'Use Title'}</button>
        <button class="btn btn-sm inline-title-copy">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
      </div>
    \`;

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

        // Check if it's an Amazon or Walmart page
        if (!tab.url?.includes('amazon.com') && !tab.url?.includes('walmart.com') && !tab.url?.includes('walmart.ca')) {
          throw new Error('Please open an Amazon or Walmart product page');
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
      try {
        // Gather required payload for background START_OPTILIST
        const selected = await chrome.storage.local.get(['selectedEbayTitle', 'currentProduct', 'snipedData']);
        const selectedTitle = selected.selectedEbayTitle;
        const product = selected.currentProduct || selected.snipedData || {};

        const sku = document.getElementById('sku-input')?.value?.trim();
        const finalPrice = document.getElementById('sell-it-for-input')?.value?.trim();
        const amazonPrice = (product.price || '').toString().trim();

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const productURL = tab?.url || product.url || product.amazonLink || '';

        if (!selectedTitle) throw new Error('No title selected. Generate & select a title first.');
        if (!sku) throw new Error('Missing SKU. Click Generate SKU first.');

        const messageData = {
          action: 'START_OPTILIST',
          title: selectedTitle,
          sku,
          finalPrice,
          amazonPrice,
          productURL,
          asin: product.asin || product.ASIN,
          mainImage: product.image || product.imageUrl || product.mainImage || product.amazonImage || ''
        };

        chrome.runtime.sendMessage(messageData, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Panel] START_OPTILIST send error:', chrome.runtime.lastError);
            if (typeof UIHelper !== 'undefined') UIHelper.showToast(chrome.runtime.lastError.message, 'error');
            return;
          }
          if (response?.success) {
            if (typeof UIHelper !== 'undefined') UIHelper.showToast('Opti-List started', 'success');
          } else {
            if (typeof UIHelper !== 'undefined') UIHelper.showToast(response?.error || 'Failed to start Opti-List', 'error');
          }
        });
      } catch (err) {
        console.error('[Panel] Opti-List error:', err);
        if (typeof UIHelper !== 'undefined') UIHelper.showToast(err.message || 'Opti-List failed', 'error');
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

        if (!tab.url?.includes('amazon.com')) {
          throw new Error('Please open an Amazon product page');
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
    const asin = product.asin || product.ASIN || '';
    const prefix = document.getElementById('sku-prefix')?.value || 'AB';
    const skuInput = document.getElementById('sku-input');

    if (skuInput) {
      skuInput.value = asin ? `${prefix}-${asin}` : '';
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
      if (popup) popup.style.display = 'flex';
    });
  }

  if (quickCalcBtn) {
    quickCalcBtn.addEventListener('click', quickCalculate);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (popup) popup.style.display = 'none';
    });
  }

  // Auto-calculate on input change
  const inputs = ['amazon-price', 'tax-percent', 'tracking-fee', 'ebay-fee-percent', 'promo-fee-percent', 'desired-profit'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', calculatePrice);
    }
  });
}

function calculatePrice() {
  const amazonPrice = parseFloat(document.getElementById('amazon-price')?.value) || 0;
  const taxPercent = parseFloat(document.getElementById('tax-percent')?.value) || 0;
  const trackingFee = parseFloat(document.getElementById('tracking-fee')?.value) || 0;
  const ebayFeePercent = parseFloat(document.getElementById('ebay-fee-percent')?.value) || 0;
  const promoFeePercent = parseFloat(document.getElementById('promo-fee-percent')?.value) || 0;
  const desiredProfitPercent = parseFloat(document.getElementById('desired-profit')?.value) || 0;

  // Calculate total cost
  const tax = amazonPrice * (taxPercent / 100);
  const totalCost = amazonPrice + tax + trackingFee;

  // Calculate eBay price
  const totalFeePercent = ebayFeePercent + promoFeePercent;
  const ebayPrice = totalCost / (1 - (totalFeePercent / 100)) * (1 + (desiredProfitPercent / 100));

  const finalPriceEl = document.getElementById('final-price');
  if (finalPriceEl) {
    finalPriceEl.textContent = `$${ebayPrice.toFixed(2)}`;
  }

  return ebayPrice;
}

function quickCalculate() {
  const price = calculatePrice();
  const sellInput = document.getElementById('sell-it-for-input');
  if (sellInput) {
    sellInput.value = price.toFixed(2);
  }
}

// ═══════════════════════════════════════════════════════════
// Panel Layout Controls (Header Buttons)
// ═══════════════════════════════════════════════════════════
function initPanelControls() {
  const nightModeBtn = document.getElementById('panel-night-mode-btn');
  const minimizeBtn = document.getElementById('panel-minimize-btn');
  const closeBtn = document.getElementById('panel-close-btn');

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
      const rootWrapper = document.getElementById('snipe-root-wrapper');
      if (rootWrapper) {
        rootWrapper.classList.toggle('panel-minimized');
        const isMin = rootWrapper.classList.contains('panel-minimized');
        Array.from(rootWrapper.children).forEach(child => {
          if (!child.classList.contains('ss-header')) {
            child.style.display = isMin ? 'none' : '';
          }
        });
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const rootWrapper = document.getElementById('snipe-root-wrapper');
      if (rootWrapper) {
        rootWrapper.remove();
        
        const startBtn = document.getElementById('initial-list-button');
        if (startBtn) {
          startBtn.style.display = 'flex';
        }
      }
    });
  }
}
