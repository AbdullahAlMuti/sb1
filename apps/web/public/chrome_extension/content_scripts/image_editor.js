(() => {
  // ─────────────────────────────────────────────
  // 🖼️ Helper: Host Bridge for Image Editor
  // ─────────────────────────────────────────────
  // This script runs on the content page (Amazon/eBay).
  // It spawns an Iframe to isolate the Editor UI and logic.

  const EDITOR_FRAME_ID = 'snipe-editor-iframe';
  let activeEditorFrame = null;
  let activeImageIndex = -1;
  let activeImageSrc = null;

  // ─────────────────────────────────────────────
  // 🚀 Open Editor Panel
  // ─────────────────────────────────────────────
  window.openImageEditor = function (src, index) {
    if (activeEditorFrame) {
      console.warn('Editor already open');
      return;
    }

    console.log('🚀 Opening Image Editor (Iframe Mode)...', { src, index });
    activeImageIndex = index;
    activeImageSrc = src;

    // 1. Create Iframe
    const frame = document.createElement('iframe');
    frame.id = EDITOR_FRAME_ID;
    frame.src = chrome.runtime.getURL('ui/editor_frame.html');

    // Style: Full fixed overlay, high z-index
    Object.assign(frame.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      border: 'none',
      zIndex: '2147483647', // Max safe integer
      backgroundColor: 'transparent',
      display: 'block'
    });

    // 2. Mount
    document.body.appendChild(frame);
    activeEditorFrame = frame;

    // 3. Disable page scroll
    document.body.style.overflow = 'hidden';

    // 4. Setup Message Listener (One-time)
    window.addEventListener('message', handleEditorMessage);
  };

  // ─────────────────────────────────────────────
  // 📨 Message Handler
  // ─────────────────────────────────────────────
  function handleEditorMessage(event) {
    // Security: In a real extension, verify event.origin or source
    // But content scripts and extension pages share trust boundaries usually.

    const { type, payload } = event.data;
    if (!type) return;

    console.log('[Host Bridge] Received:', type);

    switch (type) {
      case 'EDITOR_READY':
        // Editor loaded, send image
        if (activeEditorFrame && activeEditorFrame.contentWindow) {
          activeEditorFrame.contentWindow.postMessage({
            type: 'INIT_IMAGE',
            payload: { src: activeImageSrc, index: activeImageIndex }
          }, '*');
        }
        break;

      case 'SAVE_IMAGE':
        handleSaveImage(payload.dataUrl);
        // Don't close immediately, wait for user or implicit close?
        // Usually Editor sends Close after Save.
        break;

      case 'CLOSE_EDITOR':
        closeEditorFrame();
        break;
    }
  }

  // ─────────────────────────────────────────────
  // 💾 Save Logic (Content Page Side)
  // ─────────────────────────────────────────────
  async function handleSaveImage(dataUrl) {
    if (activeImageIndex === -1) return;

    console.log('💾 Saving image to page DOM...');

    // 1. Update UI (Specific to Amazon/eBay DOM structure)
    // Try multiple selector patterns common in this tool
    const container = document.querySelector(`.product-image-container[data-image-index="${activeImageIndex}"]`);
    if (container) {
      const img = container.querySelector('img.product-image-1600') || container.querySelector('img');
      if (img) {
        img.src = dataUrl;
        console.log('✅ Page Image Updated');
      }
    }

    // 2. Persist to Storage (so it remembers across reloads)
    // Logic from original: chrome.storage.session(watermarkedImages)
    try {
      const STORAGE_KEY = 'watermarkedImages';
      const result = await chrome.storage.session.get(STORAGE_KEY);
      const arr = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];

      // Ensure array is big enough
      if (arr.length <= activeImageIndex) {
        // Fill gaps
        for (let i = arr.length; i <= activeImageIndex; i++) arr[i] = null;
      }
      arr[activeImageIndex] = dataUrl;

      // Quota safety limit: session storage limit is ~10MB.
      const totalCharCount = arr.reduce((sum, item) => sum + (item ? item.length : 0), 0);
      console.log(`📊 image_editor: Estimated storage payload size: ${(totalCharCount / 1024 / 1024).toFixed(2)} MB`);
      if (totalCharCount > 9.5 * 1024 * 1024) {
        console.error(`❌ image_editor: Payload size of ${(totalCharCount / 1024 / 1024).toFixed(2)} MB exceeds session storage quota.`);
        alert(`⚠️ Error: Storing this edited image would exceed the session storage quota (~10MB limit). Please use a smaller image or reduce quality.`);
        return;
      }

      await new Promise((resolve, reject) => {
        chrome.storage.session.set({ [STORAGE_KEY]: arr }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      console.log('✅ Saved to Session Storage');
    } catch (e) {
      console.error('Failed to save to session storage', e);
      alert(`⚠️ Error saving edited image to session storage: ${e.message || e}`);
    }

    // 3. Persist into currentProduct.images — the canonical image list that the
    // upload payload reads (adaptProduct → prod_images). Without this the edit
    // lived only in watermarkedImages and the ORIGINAL image got uploaded.
    // EPS uploader accepts data URLs directly (Strategy 0).
    try {
      const d = await chrome.storage.local.get('currentProduct');
      const p = d.currentProduct;
      if (p && Array.isArray(p.images) && activeImageIndex >= 0 && activeImageIndex < p.images.length) {
        const originalUrl = p.images[activeImageIndex];
        p.images[activeImageIndex] = dataUrl;

        // Propagate to matching variants
        if (Array.isArray(p.variants)) {
          let propagatedCount = 0;
          p.variants.forEach(v => {
            if (v.img === originalUrl || v.image === originalUrl) {
              v.img = dataUrl;
              v.image = dataUrl;
              propagatedCount++;
            }
          });
          if (propagatedCount > 0) {
            console.log(`✅ Propagated edited image to ${propagatedCount} matching variants`);
          }
        }

        await chrome.storage.local.set({ currentProduct: p });
        console.log('✅ Edited image persisted to currentProduct.images[' + activeImageIndex + ']');
      }
    } catch (e) {
      console.error('Failed to persist edited image to currentProduct', e);
    }

    // 4. Remove Iframe
    closeEditorFrame();
  }

  // ─────────────────────────────────────────────
  // 🚪 Cleanup
  // ─────────────────────────────────────────────
  function closeEditorFrame() {
    if (!activeEditorFrame) return;

    console.log('🚪 Closing Editor Frame');

    // Remove listener
    window.removeEventListener('message', handleEditorMessage);

    // Remove DOM
    activeEditorFrame.remove();
    activeEditorFrame = null;
    activeImageIndex = -1;
    activeImageSrc = null;

    // Restore Scroll
    document.body.style.overflow = '';
  }

  // Restore legacy API for compatibility with injector
  window.__SNIPE_OPEN_IMAGE_EDITOR__ = window.openImageEditor;

})();