// ═══════════════════════════════════════════════════════════
// 🖼️ FULL-VIEW IMAGE EXTRACTOR - INTERACTIVE CLICK-BASED
// Extracts true high-resolution product images by clicking through Amazon's full-view modal
// Preserves the existing workflow: open modal → click thumbnails → extract URLs
// ═══════════════════════════════════════════════════════════

class FullViewImageExtractor {
    constructor() {
        this.results = {
            productTitle: '',
            totalImages: 0,
            images: [],
            timestamp: new Date().toISOString()
        };
        this._seenBaseIds = new Set();
    }

    // ──────────────────────────────────────────────────────────
    // Core extraction flow (preserved)
    // ──────────────────────────────────────────────────────────

    /**
     * Main extraction method - clicks through full-view modal to extract all images
     * @returns {Promise<Object>} Results object with product title, images array, and metadata
     */
    async extractAllProductImagesFromFullView() {
        console.log('🖼️ [FullViewExtractor] Starting interactive image extraction...');

        this._seenBaseIds.clear();
        this.results = {
            productTitle: document.querySelector('h1, #productTitle')?.innerText || 'Unknown Product',
            totalImages: 0,
            images: [],
            timestamp: new Date().toISOString()
        };

        try {
            // Step 1: Click on main image to open full-view modal
            const mainImg = document.querySelector('#landingImage, #imgBlkFront, #main-image, .a-dynamic-image');
            const clickable = mainImg?.closest('a, button, div') || mainImg?.parentElement;

            if (!clickable) {
                throw new Error('Could not find main product image to click');
            }

            clickable.click();
            console.log('✓ Clicked main image, waiting for modal...');

            const modalRoot = await this.waitFor(() => this.getModalRoot(), { timeoutMs: 7000 });
            if (!modalRoot) {
                throw new Error('Modal did not appear');
            }

            // Step 2: Get all image thumbnails in the full-view modal
            const thumbnails = await this.waitFor(
                () => {
                    const list = this.getModalThumbnails(modalRoot);
                    return list.length > 0 ? list : null;
                },
                { timeoutMs: 7000 }
            );

            const thumbList = Array.isArray(thumbnails) ? thumbnails : [];
            console.log(`✓ Found ${thumbList.length} thumbnails to extract`);

            // Step 3: Iterate through each thumbnail and extract high-res URL
            for (let i = 0; i < thumbList.length; i++) {
                try {
                    const thumb = thumbList[i];
                    const clickableThumb = thumb.closest('button, a, [role="button"]') || thumb;

                    const beforeSig = this.getCurrentModalImageSignature(modalRoot);
                    clickableThumb.click();

                    // Wait until the modal main image updates (no hardcoded delays)
                    await this.waitFor(
                        () => {
                            const afterSig = this.getCurrentModalImageSignature(modalRoot);
                            return afterSig && afterSig !== beforeSig;
                        },
                        { timeoutMs: 5000 }
                    );

                    const mainImageElement = this.getModalMainImage(modalRoot);

                    // Extract the high-resolution URL with priority order
                    let imageUrl = this.extractHiResUrlFromImg(mainImageElement);

                    // Fallback to thumbnail URL only if absolutely needed
                    if (!imageUrl) {
                        imageUrl = thumb.src || thumb.getAttribute('data-src') || null;
                    }

                    // Force ABSOLUTE HIGHEST quality
                    if (imageUrl) {
                        imageUrl = this.getMaxResolutionUrl(imageUrl);
                    }

                    if (!imageUrl) {
                        console.log(`  ✗ [${i + 1}/${thumbList.length}] No image URL found`);
                        continue;
                    }

                    // Filter duplicates (by base image id)
                    const baseId = this.getBaseImageId(imageUrl);
                    if (baseId && this._seenBaseIds.has(baseId)) {
                        console.log(`  ⊘ Skipped duplicate image`);
                        continue;
                    }
                    if (baseId) this._seenBaseIds.add(baseId);

                    // Store result
                    this.results.images.push({
                        index: this.results.images.length,
                        url: imageUrl,
                        type: 'HIGH_RES_PRODUCT_IMAGE',
                        alt: mainImageElement?.alt || `Image ${i + 1}`
                    });

                    console.log(`  ✓ [${this.results.images.length}/${thumbList.length}] ${imageUrl.substring(0, 90)}...`);
                } catch (error) {
                    console.warn(`  ✗ Error on image ${i + 1}:`, error.message);
                }
            }

            // Step 4: Close the modal
            this.closeModal();

            this.results.totalImages = this.results.images.length;

            console.log(`🖼️ [FullViewExtractor] Extraction complete: ${this.results.totalImages} images`);
            return this.results;
        } catch (error) {
            console.error('❌ [FullViewExtractor] Error extracting images:', error);
            this.closeModal();
            return this.results;
        }
    }

    // ──────────────────────────────────────────────────────────
    // Modal helpers
    // ──────────────────────────────────────────────────────────

    getModalRoot() {
        return (
            document.querySelector('[role="dialog"][aria-modal="true"]') ||
            document.querySelector('#a-popover-lgtbox') ||
            document.querySelector('.a-modal') ||
            document.querySelector('#ivLargeImage')?.closest('[role="dialog"], .a-modal, #a-popover-lgtbox') ||
            document.querySelector('#ivLargeImage') ||
            null
        );
    }

    getModalThumbnails(modalRoot) {
        const candidates = Array.from(
            modalRoot.querySelectorAll(
                'img.imageThumbnail, .imageThumbnail img, [role="button"][aria-label*="image"] img, img[data-index], #ivThumbs img'
            )
        );

        return candidates.filter(el => {
            const src = (el.src || el.getAttribute('data-src') || '').toLowerCase();
            const aria = (el.closest('[aria-label]')?.getAttribute('aria-label') || '').toLowerCase();
            const cls = (el.className || '').toLowerCase();

            // Must look like a product image
            if (!src.includes('media-amazon') || !src.includes('/images/i/')) return false;

            // Exclude video / 360 / UI
            if (aria.includes('video') || aria.includes('360')) return false;
            if (cls.includes('video') || cls.includes('360') || cls.includes('spin')) return false;
            if (src.includes('play') || src.includes('video')) return false;

            return true;
        });
    }

    getModalMainImage(modalRoot) {
        const imgs = Array.from(modalRoot.querySelectorAll('img[src*="media-amazon"], img[data-old-hires], img[data-a-dynamic-image]'));
        if (imgs.length === 0) return null;

        // Prefer images that have hi-res metadata
        const withMeta = imgs.find(img => img.getAttribute('data-old-hires') || img.getAttribute('data-a-dynamic-image'));
        if (withMeta) return withMeta;

        // Otherwise, pick the largest visible image
        return imgs.reduce((best, cur) => {
            const a = (best?.clientWidth || 0) * (best?.clientHeight || 0);
            const b = (cur?.clientWidth || 0) * (cur?.clientHeight || 0);
            return b > a ? cur : best;
        }, imgs[0]);
    }

    getCurrentModalImageSignature(modalRoot) {
        const img = this.getModalMainImage(modalRoot);
        if (!img) return null;
        return (
            img.getAttribute('data-old-hires') ||
            img.getAttribute('data-a-dynamic-image') ||
            img.getAttribute('src') ||
            null
        );
    }

    extractHiResUrlFromImg(imgEl) {
        if (!imgEl) return null;

        // Priority 1: data-old-hires
        const oldHires = imgEl.getAttribute('data-old-hires');
        if (oldHires) return oldHires;

        // Priority 2: data-a-dynamic-image (largest resolution)
        const dynamicData = imgEl.getAttribute('data-a-dynamic-image');
        if (dynamicData) {
            try {
                const parsed = JSON.parse(dynamicData);
                const urls = Object.keys(parsed);
                if (urls.length > 0) {
                    return urls.reduce((best, url) => {
                        const sizeA = (parsed[best]?.[0] || 0) * (parsed[best]?.[1] || 0);
                        const sizeB = (parsed[url]?.[0] || 0) * (parsed[url]?.[1] || 0);
                        return sizeB > sizeA ? url : best;
                    });
                }
            } catch (e) {
                // ignore
            }
        }

        // Priority 3: src
        return imgEl.getAttribute('src') || null;
    }

    // ──────────────────────────────────────────────────────────
    // URL normalization (max resolution)
    // ──────────────────────────────────────────────────────────

    /**
     * Transform URL to absolute maximum resolution
     * Removes all size qualifiers and upgrades to highest quality (SL3000)
     */
    getMaxResolutionUrl(url) {
        if (!url) return url;

        let maxUrl = url;

        // Remove size qualifiers: ". _AC_SX300_ ." etc.
        if (maxUrl.includes('._')) {
            const parts = maxUrl.split('._');
            const basePart = parts[0];
            const extension = maxUrl.match(/\.(jpg|jpeg|png|webp)$/i)?.[0] || '.jpg';
            maxUrl = basePart + extension;
        }

        // Upgrade any remaining size patterns to SL3000
        const sizePatterns = [
            { pattern: /_AC_S[XY]\d+_/g, replacement: '_AC_SL3000_' },
            { pattern: /_AC_U[SXYL]\d+_/g, replacement: '_AC_SL3000_' },
            { pattern: /_SS\d+_/g, replacement: '_SL3000_' },
            { pattern: /_SX\d+_/g, replacement: '_SL3000_' },
            { pattern: /_SY\d+_/g, replacement: '_SL3000_' },
            { pattern: /_SL\d+_/g, replacement: '_SL3000_' }
        ];

        sizePatterns.forEach(({ pattern, replacement }) => {
            maxUrl = maxUrl.replace(pattern, replacement);
        });

        // If no explicit size is present, append SL3000 modifier before extension.
        if (!maxUrl.includes('_SL3000_') && !maxUrl.includes('_AC_SL3000_')) {
            const ext = maxUrl.match(/\.(jpg|jpeg|png|webp)$/i)?.[0];
            if (ext) {
                maxUrl = maxUrl.replace(ext, `._AC_SL3000_${ext}`);
            }
        }

        return maxUrl;
    }

    getBaseImageId(url) {
        if (!url) return null;
        const match = url.match(/\/images\/I\/([^/]+?)(?:\._|\.(?:jpg|jpeg|png|webp))/i);
        return match?.[1] || null;
    }

    // ──────────────────────────────────────────────────────────
    // Misc helpers
    // ──────────────────────────────────────────────────────────

    /**
     * Helper method to close the full-view modal
     */
    closeModal() {
        try {
            // Try pressing ESC key
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));

            // Also try clicking close button if it exists
            const closeBtn = document.querySelector('[data-action="close"], .a-button-close, [aria-label*="Close"]');
            if (closeBtn) {
                closeBtn.click();
            }

            console.log('✓ Closed full-view modal');
        } catch (error) {
            console.warn('⚠️ Could not close modal:', error.message);
        }
    }

    /**
     * Wait until a condition returns a truthy value
     */
    waitFor(fn, { timeoutMs = 5000, intervalMs = 50 } = {}) {
        const start = Date.now();
        return new Promise(resolve => {
            const tick = () => {
                try {
                    const val = fn();
                    if (val) return resolve(val);
                } catch (_) {
                    // ignore
                }

                if (Date.now() - start >= timeoutMs) {
                    return resolve(null);
                }

                setTimeout(tick, intervalMs);
            };
            tick();
        });
    }

    /**
     * Copy all image URLs to clipboard
     * @returns {Promise<boolean>} Success status
     */
    async copyUrlsToClipboard() {
        try {
            const urls = this.results.images.map(img => img.url).join('\n');
            await navigator.clipboard.writeText(urls);
            console.log('✓ All URLs copied to clipboard!');
            return true;
        } catch (error) {
            console.error('❌ Failed to copy to clipboard:', error);
            return false;
        }
    }

    /**
     * Get results in a format compatible with the existing extractor
     * @returns {Array} Array of image objects with url and alt properties
     */
    getCompatibleResults() {
        return this.results.images.map(img => ({
            url: img.url,
            alt: img.alt
        }));
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.FullViewImageExtractor = FullViewImageExtractor;
}
