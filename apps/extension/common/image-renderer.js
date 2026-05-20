// ═══════════════════════════════════════════════════════════
// 🖼️ PERFORMANT IMAGE RENDERER
// GPU-friendly, progressive, lag-free image gallery rendering
// Only modifies UI/rendering - NO changes to scraping logic
// ═══════════════════════════════════════════════════════════

const ImageRenderer = (() => {
  'use strict';

  // ─────────────────────────────────────────────────────────
  // Configuration
  // ─────────────────────────────────────────────────────────
  const CONFIG = {
    BATCH_SIZE: 2,           // Images per batch (reduces DOM churn)
    BATCH_DELAY: 50,         // ms between batches (allows paint)
    STAGGER_DELAY: 80,       // ms stagger between items in batch
    FADE_DURATION: 300,      // ms for fade-in animation
    SKELETON_MIN_TIME: 150,  // minimum skeleton display time
    INTERSECTION_THRESHOLD: 0.1,
    INTERSECTION_MARGIN: '50px'
  };

  // ─────────────────────────────────────────────────────────
  // Performance-optimized CSS (GPU-only animations)
  // ─────────────────────────────────────────────────────────
  const PERFORMANCE_STYLES = `
    /* GPU-accelerated fade-in animation */
    @keyframes ssImageFadeIn {
      from {
        opacity: 0;
        transform: translate3d(0, 8px, 0);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    /* Skeleton shimmer animation - GPU friendly */
    @keyframes ssSkeletonShimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }

    /* Base container - uses contain for paint isolation */
    .ss-gallery-container {
      contain: layout style;
      will-change: contents;
    }

    /* Skeleton placeholder */
    .ss-image-skeleton {
      position: relative;
      width: 140px;
      height: 120px;
      background: #f0f4f8;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      margin: 5px;
      display: inline-block;
      vertical-align: top;
    }

    .ss-image-skeleton::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.6) 50%,
        transparent 100%
      );
      animation: ssSkeletonShimmer 1.2s ease-in-out infinite;
      will-change: transform;
    }

    /* Image container - optimized for GPU compositing */
    .ss-image-item {
      position: relative;
      display: inline-block;
      margin: 5px;
      vertical-align: top;
      border-radius: 6px;
      overflow: hidden;
      opacity: 0;
      transform: translate3d(0, 8px, 0);
      will-change: opacity, transform;
      contain: layout paint style;
      backface-visibility: hidden;
    }

    .ss-image-item.ss-visible {
      animation: ssImageFadeIn ${CONFIG.FADE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .ss-image-item.ss-instant {
      opacity: 1;
      transform: none;
    }

    /* Image element - hardware accelerated */
    .ss-image-item img {
      display: block;
      width: 140px;
      height: 100px;
      object-fit: contain;
      background: #fafafa;
      border-radius: 4px;
      transform: translateZ(0);
    }

    /* Overlay elements - use opacity only for transitions */
    .ss-image-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 150ms ease;
      will-change: opacity;
    }

    .ss-image-item:hover .ss-image-overlay {
      opacity: 1;
      pointer-events: auto;
    }

    /* Button overlays - minimal paint impact */
    .ss-overlay-btn {
      position: absolute;
      width: 24px;
      height: 24px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      transition: background-color 150ms ease, transform 150ms ease;
      transform: translateZ(0);
    }

    .ss-overlay-btn:hover {
      background: rgba(0, 0, 0, 0.9);
      transform: translateZ(0) scale(1.05);
    }

    .ss-overlay-btn.ss-delete {
      top: 5px;
      right: 5px;
      background: rgba(239, 68, 68, 0.9);
    }

    .ss-overlay-btn.ss-delete:hover {
      background: rgba(220, 38, 38, 1);
    }

    .ss-overlay-btn.ss-edit {
      top: 5px;
      left: 5px;
    }

    /* Metadata overlay */
    .ss-image-meta {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      padding: 4px 6px;
      font-size: 10px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Loading state indicator */
    .ss-gallery-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #64748b;
      font-size: 13px;
    }

    .ss-gallery-loading::before {
      content: '';
      width: 16px;
      height: 16px;
      border: 2px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      margin-right: 8px;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  // ─────────────────────────────────────────────────────────
  // Style Injection (once per document)
  // ─────────────────────────────────────────────────────────
  let stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    if (document.getElementById('ss-perf-image-styles')) {
      stylesInjected = true;
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = 'ss-perf-image-styles';
    styleEl.textContent = PERFORMANCE_STYLES;
    document.head.appendChild(styleEl);
    stylesInjected = true;
  }

  // ─────────────────────────────────────────────────────────
  // Intersection Observer for lazy fade-in
  // ─────────────────────────────────────────────────────────
  let observer = null;

  function getIntersectionObserver() {
    if (observer) return observer;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            // Use requestAnimationFrame for smooth timing
            requestAnimationFrame(() => {
              el.classList.add('ss-visible');
            });
            observer.unobserve(el);
          }
        });
      },
      {
        threshold: CONFIG.INTERSECTION_THRESHOLD,
        rootMargin: CONFIG.INTERSECTION_MARGIN
      }
    );

    return observer;
  }

  // ─────────────────────────────────────────────────────────
  // Skeleton Placeholder Factory
  // ─────────────────────────────────────────────────────────
  function createSkeletons(container, count) {
    const fragment = document.createDocumentFragment();
    const skeletons = [];

    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'ss-image-skeleton';
      skeleton.dataset.index = i;
      fragment.appendChild(skeleton);
      skeletons.push(skeleton);
    }

    container.appendChild(fragment);
    return skeletons;
  }

  // ─────────────────────────────────────────────────────────
  // Image Item Factory (pre-built DOM structure)
  // ─────────────────────────────────────────────────────────
  function createImageItem(imageUrl, index, options = {}) {
    const { onDelete, onEdit, metadata } = options;

    const container = document.createElement('div');
    container.className = 'ss-image-item product-image-container scifi-image-container';
    container.dataset.imageIndex = index;

    // Main image
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `Product image ${index + 1}`;
    img.title = `Product Image ${index + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.className = 'product-image-1600';
    container.appendChild(img);

    // Overlay container (for hover elements)
    const overlay = document.createElement('div');
    overlay.className = 'ss-image-overlay';

    // Delete button
    if (onDelete) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'ss-overlay-btn ss-delete image-delete-btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onDelete(index, container, imageUrl);
      });
      overlay.appendChild(deleteBtn);
    }

    // Edit button
    if (onEdit) {
      const editBtn = document.createElement('button');
      editBtn.className = 'ss-overlay-btn ss-edit image-edit-btn';
      editBtn.textContent = '✎';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onEdit(index, imageUrl);
      });
      overlay.appendChild(editBtn);
    }

    container.appendChild(overlay);

    // Metadata overlay
    if (metadata !== false) {
      const meta = document.createElement('div');
      meta.className = 'ss-image-meta product-image-metadata';
      meta.textContent = metadata || `Image ${index + 1} | 1600x1600`;
      container.appendChild(meta);
    }

    return container;
  }

  // ─────────────────────────────────────────────────────────
  // Progressive Batch Renderer
  // ─────────────────────────────────────────────────────────
  async function renderProgressively(container, items, createItemFn, options = {}) {
    const {
      batchSize = CONFIG.BATCH_SIZE,
      batchDelay = CONFIG.BATCH_DELAY,
      staggerDelay = CONFIG.STAGGER_DELAY,
      showSkeletons = true,
      onProgress,
      onComplete
    } = options;

    injectStyles();
    container.classList.add('ss-gallery-container');

    // Create skeleton placeholders
    let skeletons = [];
    if (showSkeletons && items.length > 0) {
      skeletons = createSkeletons(container, Math.min(items.length, 8));
    }

    const io = getIntersectionObserver();
    let rendered = 0;

    // Process in batches
    for (let batchStart = 0; batchStart < items.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, items.length);
      const batchItems = items.slice(batchStart, batchEnd);

      // Allow browser to paint between batches
      if (batchStart > 0) {
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            setTimeout(resolve, batchDelay);
          });
        });
      }

      // Create batch fragment
      const fragment = document.createDocumentFragment();

      for (let i = 0; i < batchItems.length; i++) {
        const globalIndex = batchStart + i;
        const item = batchItems[i];

        // Create the item element
        let element;
        try {
          element = await createItemFn(item, globalIndex);
        } catch (err) {
          console.error(`[ImageRenderer] Failed to create item ${globalIndex}:`, err);
          continue;
        }

        if (!element) continue;

        // Apply stagger delay via custom property
        element.style.setProperty('--stagger-delay', `${i * staggerDelay}ms`);

        fragment.appendChild(element);

        // Remove corresponding skeleton
        if (skeletons[globalIndex]) {
          skeletons[globalIndex].remove();
        }

        rendered++;
      }

      // Append batch to DOM
      container.appendChild(fragment);

      // Observe new items for intersection-based fade-in
      const newItems = container.querySelectorAll('.ss-image-item:not(.ss-visible):not(.ss-observed)');
      newItems.forEach((el) => {
        el.classList.add('ss-observed');
        io.observe(el);
      });

      // Progress callback
      if (onProgress) {
        onProgress(rendered, items.length);
      }
    }

    // Clean up remaining skeletons
    skeletons.forEach((s) => s.remove());

    // Completion callback
    if (onComplete) {
      onComplete(rendered);
    }

    return rendered;
  }

  // ─────────────────────────────────────────────────────────
  // Simple Image Display (for panel.js displayImages)
  // ─────────────────────────────────────────────────────────
  function displayImagesSimple(container, images, options = {}) {
    if (!container) return;

    injectStyles();

    if (!images || images.length === 0) {
      container.innerHTML = '<div class="gallery-empty"><span>No images available</span></div>';
      return;
    }

    // Clear existing content
    container.innerHTML = '';
    container.classList.add('ss-gallery-container');

    const io = getIntersectionObserver();
    const fragment = document.createDocumentFragment();

    images.forEach((url, index) => {
      const item = document.createElement('div');
      item.className = 'ss-image-item gallery-item';
      item.style.setProperty('--stagger-delay', `${index * 50}ms`);

      const img = document.createElement('img');
      img.src = url;
      img.alt = `Product image ${index + 1}`;
      img.loading = 'lazy';
      img.decoding = 'async';

      item.appendChild(img);
      fragment.appendChild(item);
    });

    container.appendChild(fragment);

    // Observe all items
    requestAnimationFrame(() => {
      container.querySelectorAll('.ss-image-item').forEach((el) => {
        io.observe(el);
      });
    });
  }

  // ─────────────────────────────────────────────────────────
  // Batch Process Images with Progressive Display
  // For amazon_injector.js and walmart_injector.js
  // ─────────────────────────────────────────────────────────
  async function renderProcessedImages(galleryContainer, allImages, options = {}) {
    const {
      processImage,        // async function(imageUrl, index) => processedUrl
      onDelete,            // function(index, container, url)
      onEdit,              // function(index, url)
      getMetadata,         // function(imageInfo, index) => string
      onProgress,          // function(current, total)
      onComplete,          // function(count)
      batchSize = CONFIG.BATCH_SIZE
    } = options;

    if (!galleryContainer) return 0;

    injectStyles();
    galleryContainer.classList.add('ss-gallery-container');

    // Remove loading indicators and empty states
    const loadingIndicator = galleryContainer.querySelector('#image-loading-indicator, .scifi-loading-container');
    if (loadingIndicator) loadingIndicator.remove();

    const galleryEmpty = galleryContainer.querySelector('.gallery-empty');
    if (galleryEmpty) galleryEmpty.remove();

    if (!allImages || allImages.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'gallery-empty';
      placeholder.textContent = 'No high-quality product images found.';
      placeholder.style.cssText = 'padding:20px;text-align:center;color:#666;';
      galleryContainer.appendChild(placeholder);
      return 0;
    }

    console.log(`[ImageRenderer] Processing ${allImages.length} images progressively`);

    // Create skeletons first
    const skeletons = createSkeletons(galleryContainer, Math.min(allImages.length, 6));

    const io = getIntersectionObserver();
    let rendered = 0;
    let processingQueue = [...allImages.map((img, i) => ({ img, index: i }))];

    // Process in non-blocking batches
    while (processingQueue.length > 0) {
      const batch = processingQueue.splice(0, batchSize);

      // Process batch items in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async ({ img, index }) => {
          const imageInfo = typeof img === 'string' ? { url: img } : img;
          let processedUrl = imageInfo.url;

          if (processImage) {
            try {
              processedUrl = await processImage(imageInfo.url, index);
            } catch (err) {
              console.warn(`[ImageRenderer] Process failed for image ${index}:`, err);
              processedUrl = imageInfo.url; // Fallback to original
            }
          }

          return { imageInfo, processedUrl, index };
        })
      );

      // Create DOM elements for successful items
      const fragment = document.createDocumentFragment();

      for (const result of batchResults) {
        if (result.status === 'rejected') continue;

        const { imageInfo, processedUrl, index } = result.value;

        const metadata = getMetadata
          ? getMetadata(imageInfo, index)
          : `Image ${index + 1} | 1600x1600`;

        const element = createImageItem(processedUrl, index, {
          onDelete,
          onEdit,
          metadata
        });

        // Apply stagger delay
        element.style.setProperty('--stagger-delay', `${(rendered % batchSize) * CONFIG.STAGGER_DELAY}ms`);

        fragment.appendChild(element);

        // Remove skeleton
        if (skeletons[index]) {
          skeletons[index].remove();
        }

        rendered++;
      }

      // Append to DOM
      galleryContainer.appendChild(fragment);

      // Observe new elements
      requestAnimationFrame(() => {
        galleryContainer.querySelectorAll('.ss-image-item:not(.ss-observed)').forEach((el) => {
          el.classList.add('ss-observed');
          io.observe(el);
        });
      });

      // Progress callback
      if (onProgress) {
        onProgress(rendered, allImages.length);
      }

      // Yield to browser for paint
      if (processingQueue.length > 0) {
        await new Promise((resolve) => {
          requestAnimationFrame(() => setTimeout(resolve, CONFIG.BATCH_DELAY));
        });
      }
    }

    // Clean up remaining skeletons
    skeletons.forEach((s) => s.remove());

    console.log(`[ImageRenderer] Completed: ${rendered} images rendered`);

    if (onComplete) {
      onComplete(rendered);
    }

    return rendered;
  }

  // ─────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────
  return Object.freeze({
    injectStyles,
    createSkeletons,
    createImageItem,
    renderProgressively,
    displayImagesSimple,
    renderProcessedImages,
    CONFIG
  });
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageRenderer;
}
if (typeof self !== 'undefined') {
  self.ImageRenderer = ImageRenderer;
}
if (typeof window !== 'undefined') {
  window.ImageRenderer = ImageRenderer;
}
