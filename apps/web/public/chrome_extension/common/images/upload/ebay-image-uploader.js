// eBay image uploader backed by image-cache.
// Same image (by id) uploads once; eBay URL reused for variations.

class EbayImageUploader {
  constructor() {
    this.isUploading  = false;
    this._uploadedMap = new Map(); // imageId → eBay-hosted URL (session memory)
  }

  // Main entry. Pass marketplace + productId; reads images from SSImageCache.
  // Returns { success, uploadedCount, failedCount, imageMap }
  async uploadFromCache(marketplace, productId, options = {}) {
    if (this.isUploading) {
      console.warn('[EbayImageUploader] Upload already in progress');
      return { success: false, reason: 'already_uploading' };
    }

    this.isUploading = true;
    try {
      const cache = window.SSImageCache;
      const entry = await cache.get(marketplace, productId);
      if (!entry || !entry.images?.length) {
        console.error('[EbayImageUploader] No cached images for', marketplace, productId);
        return { success: false, reason: 'no_images' };
      }

      return await this._uploadImages(entry.images, marketplace, productId, options);
    } finally {
      this.isUploading = false;
    }
  }

  // Direct upload from ExtractedImage[]. Deduplicates by image.id.
  async uploadImages(images, marketplace, productId, options = {}) {
    if (this.isUploading) return { success: false, reason: 'already_uploading' };
    this.isUploading = true;
    try {
      return await this._uploadImages(images, marketplace, productId, options);
    } finally {
      this.isUploading = false;
    }
  }

  async _uploadImages(images, marketplace, productId, options = {}) {
    const {
      applyWatermark  = true,
      maxImages       = 12,
      targetSize      = 1600
    } = options;

    // Deduplicate by stable id
    const seen  = new Set();
    const unique = images.filter(img => {
      const key = img.id || img.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, maxImages);

    console.log(`[EbayImageUploader] Uploading ${unique.length} unique images`);

    const uploaderReady = await this._waitForUploader();
    if (!uploaderReady) return { success: false, reason: 'uploader_not_ready' };

    const files         = [];
    const imageMap      = {}; // imageId → { processedUrl, file }

    for (let i = 0; i < unique.length; i++) {
      const img = unique[i];
      const id  = img.id || img.url;

      // Check session cache first
      if (this._uploadedMap.has(id)) {
        imageMap[id] = { reused: true, ebayUrl: this._uploadedMap.get(id) };
        continue;
      }

      // Get or generate processed image
      let processedUrl = await window.SSImageCache?.getProcessed(marketplace, productId, id);

      if (!processedUrl) {
        try {
          processedUrl = await this._processImage(img.url, targetSize, applyWatermark);
          await window.SSImageCache?.setProcessed(marketplace, productId, id, processedUrl);
        } catch (err) {
          console.warn(`[EbayImageUploader] Process failed for image ${i + 1}:`, err?.message);
          continue;
        }
      }

      const file = await window.prepareImageForEbayUpload(processedUrl, i);
      if (file) {
        files.push({ id, file });
        imageMap[id] = { processedUrl };
      }
    }

    if (!files.length) return { success: false, reason: 'no_files' };

    const fileList = files.map(f => f.file);
    const uploadOk = await this._executeUpload(fileList);

    if (!uploadOk) return { success: false, reason: 'upload_failed', imageMap };

    const verified = await this._verifyUpload(fileList.length);
    if (!verified) return { success: false, reason: 'verify_failed', imageMap };

    // Clean legacy watermarkedImages storage
    chrome.storage.local.remove(['watermarkedImages', 'imageUrls']);
    if (chrome.storage && chrome.storage.session) {
      chrome.storage.session.remove(['watermarkedImages']);
    }

    return {
      success:      true,
      uploadedCount: fileList.length,
      failedCount:  unique.length - fileList.length,
      imageMap
    };
  }

  async _processImage(url, targetSize, applyWatermark) {
    return new Promise((resolve, reject) => {
      const src  = new Image();
      src.crossOrigin = 'Anonymous';
      src.onerror = () => reject(new Error(`Load failed: ${url}`));
      src.onload  = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetSize, targetSize);

        const aspect = src.naturalWidth / src.naturalHeight;
        let dw, dh, dx, dy;
        if (aspect >= 1) {
          dw = targetSize; dh = targetSize / aspect;
          dx = 0;          dy = (targetSize - dh) / 2;
        } else {
          dh = targetSize; dw = targetSize * aspect;
          dy = 0;          dx = (targetSize - dw) / 2;
        }
        ctx.drawImage(src, dx, dy, dw, dh);

        if (applyWatermark && typeof window.applyWatermarkToCanvas === 'function') {
          window.applyWatermarkToCanvas(ctx, canvas.width, canvas.height);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      src.src = url;
    });
  }

  async _executeUpload(files) {
    // Strategy 1: direct file input
    const fileInput = document.querySelector('input[type="file"][multiple], input[type="file"]');
    if (fileInput) {
      try {
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;
        ['input', 'change'].forEach(ev => fileInput.dispatchEvent(new Event(ev, { bubbles: true })));
        await this._sleep(2000);
        const count = await this._checkProgress(files.length);
        if (count > 0) return true;
      } catch {}
    }

    // Strategy 2: drag-and-drop
    const dropZone = document.querySelector(
      '[class*="dropzone"], [class*="upload-area"], [class*="photo-upload"], [data-testid*="upload"]'
    );
    if (dropZone) {
      try {
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        dropZone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: dt }));
        await this._sleep(100);
        dropZone.dispatchEvent(new DragEvent('dragover',  { bubbles: true, dataTransfer: dt }));
        await this._sleep(100);
        dropZone.dispatchEvent(new DragEvent('drop',      { bubbles: true, dataTransfer: dt }));
        await this._sleep(2000);
        const count = await this._checkProgress(files.length);
        if (count > 0) return true;
      } catch {}
    }

    return false;
  }

  async _waitForUploader(timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = document.querySelector('input[type="file"], [class*="dropzone"], [class*="upload-area"]');
      if (el) return true;
      await this._sleep(500);
    }
    return false;
  }

  async _checkProgress(expected) {
    const sels = ['img[src*="blob:"]', 'img[src*="data:"]', '[class*="photo-item"] img', '[class*="upload-item"] img'];
    let count = 0;
    for (const sel of sels) {
      count = Math.max(count, document.querySelectorAll(sel).length);
    }
    return count;
  }

  async _verifyUpload(expected, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const count = await this._checkProgress(expected);
      if (count >= expected) return true;
      await this._sleep(2000);
    }
    return false;
  }



  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

if (typeof window !== 'undefined') {
  window.SSEbayImageUploader = EbayImageUploader;
}
