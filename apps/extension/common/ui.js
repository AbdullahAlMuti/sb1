// ═══════════════════════════════════════════════════════════
// UI Helper Module - Shared UI Utilities
// ═══════════════════════════════════════════════════════════

const UIHelper = (() => {
  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type: 'success', 'error', 'info', 'warning'
   * @param {number} duration - Duration in ms (default 3000)
   */
  function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');

    // Create container if it doesn't exist
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;

    // Add styles
    toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border-radius: 8px;
      background: ${getToastColor(type)};
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transform: translateX(100px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 10);

    // Auto-dismiss
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  function getToastColor(type) {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8',
      warning: '#ffc107'
    };
    return colors[type] || colors.info;
  }

  /**
   * Show loading overlay
   * @param {string} message - Loading message
   */
  function showLoading(message = 'Processing...') {
    let overlay = document.getElementById('global-loading-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-loading-overlay';
      overlay.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <div class="spinner"></div>
          <div class="loading-text" style="color: white; font-size: 16px; font-weight: 500;">${message}</div>
        </div>
      `;
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483646;
      `;
      document.body.appendChild(overlay);

      // Add spinner styles
      const style = document.createElement('style');
      style.textContent = `
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255,255,255,0.1);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    } else {
      overlay.querySelector('.loading-text').textContent = message;
      overlay.style.display = 'flex';
    }
  }

  /**
   * Hide loading overlay
   */
  function hideLoading() {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  /**
   * Show confirmation dialog
   * @param {string} message - Confirmation message
   * @param {string} confirmText - Confirm button text
   * @param {string} cancelText - Cancel button text
   * @returns {Promise<boolean>} True if confirmed
   */
  function confirm(message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'confirm-modal';
      modal.innerHTML = `
        <div class="confirm-backdrop"></div>
        <div class="confirm-dialog">
          <div class="confirm-message">${message}</div>
          <div class="confirm-actions">
            <button class="btn-cancel">${cancelText}</button>
            <button class="btn-confirm">${confirmText}</button>
          </div>
        </div>
      `;

      modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 2147483645;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const style = document.createElement('style');
      style.textContent = `
        .confirm-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
        }
        .confirm-dialog {
          position: relative;
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .confirm-message {
          font-size: 16px;
          color: #1a1a1a;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .confirm-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .confirm-actions button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel {
          background: #e2e8f0;
          color: #64748b;
        }
        .btn-cancel:hover {
          background: #cbd5e1;
        }
        .btn-confirm {
          background: #1a73e8;
          color: white;
        }
        .btn-confirm:hover {
          background: #1557b0;
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(modal);

      modal.querySelector('.btn-cancel').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(false);
      });

      modal.querySelector('.btn-confirm').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(true);
      });

      modal.querySelector('.confirm-backdrop').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(false);
      });
    });
  }

  /**
   * Create and download a file
   * @param {string} content - File content
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   */
  function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} Success status
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!', 'success');
      return true;
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      showToast('Failed to copy', 'error');
      return false;
    }
  }

  /**
   * Format date to readable string
   * @param {Date|string|number} date - Date to format
   * @returns {string} Formatted date
   */
  function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Public API
  return {
    showToast,
    showLoading,
    hideLoading,
    confirm,
    downloadFile,
    copyToClipboard,
    formatDate,
    debounce,
    showTitleSelectionPopup,
    selectTitle
  };

  // ═══════════════════════════════════════════════════════════
  // 🏷️ TITLE SELECTION POPUP LOGIC
  // ═══════════════════════════════════════════════════════════

  function showTitleSelectionPopup(titles) {
    console.log('[UIHelper] showTitleSelectionPopup called with:', titles);
    const popup = document.getElementById('title-selection-popup');
    const popupList = document.getElementById('title-popup-list');
    const closeBtn = document.getElementById('title-popup-close-btn');
    const overlay = popup?.querySelector('.title-popup-overlay');

    if (!popup || !popupList) {
      console.error('[UIHelper] Popup elements missing:', { popup, popupList });
      return;
    }

    // Build title options HTML
    const rankLabels = ['Best', 'Recommended', 'Alternative'];
    const optionsHtml = titles.map((titleData, index) => {
      const titleValue = typeof titleData === 'object' ? titleData.title : titleData;
      const charCount = titleValue ? titleValue.length : 0;
      const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-default';
      const rankLabel = rankLabels[index] || `Option ${index + 1}`;

      // Escape HTML to prevent XSS
      const safeTitle = titleValue ? titleValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';

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
          <div class="title-option-text">${safeTitle || 'No title generated'}</div>
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

    // Remove old listeners to prevent duplicates (cloning is a simple way)
    const newCloseBtn = closeBtn?.cloneNode(true);
    if (closeBtn && newCloseBtn) {
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener('click', closePopup);
    }

    // For overlay, we assume it's stable, but safe to re-add
    overlay?.removeEventListener('click', closePopup);
    overlay?.addEventListener('click', closePopup);

    // Show popup
    popup.style.display = 'flex';
  }

  function selectTitle(titleValue, optionElement) {
    if (!titleValue) return;

    // Remove selected class from all options
    document.querySelectorAll('.title-option').forEach(opt => {
      opt.classList.remove('selected');
    });

    // Add selected class to clicked option
    optionElement?.classList.add('selected');

    // Update the Single Title Display UI
    const titleDisplay = document.getElementById('ai-generated-title');
    const titleCounter = document.getElementById('ai-title-counter');
    const copyBtn = document.getElementById('copy-title-btn');

    if (titleDisplay) {
      titleDisplay.innerText = titleValue;
      titleDisplay.classList.add('has-title');

      // Animation
      titleDisplay.style.transition = 'none';
      titleDisplay.style.transform = 'scale(1.02)';
      setTimeout(() => {
        titleDisplay.style.transition = 'transform 0.3s ease';
        titleDisplay.style.transform = 'scale(1)';
      }, 100);
    }

    if (titleCounter) {
      titleCounter.textContent = `${titleValue.length} characters`;
    }

    if (copyBtn) {
      copyBtn.style.display = 'inline-flex';
    }

    // Save selected title to Chrome storage
    if (chrome && chrome.storage) {
      chrome.storage.local.set({
        selectedEbayTitle: titleValue,
        selectedTitleTimestamp: Date.now()
      }, () => {
        console.log('[UIHelper] Selected title saved to storage:', titleValue);
      });
    }

    showToast('Title selected! Ready to paste on eBay.', 'success');

    // Close popup after selection
    setTimeout(() => {
      const popup = document.getElementById('title-selection-popup');
      if (popup) popup.style.display = 'none';
    }, 500);

    // Copy to clipboard
    navigator.clipboard.writeText(titleValue).catch(err => {
      console.warn('[UIHelper] Could not copy to clipboard:', err);
    });
  }
})();

// Make it available globally or as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIHelper;
}
