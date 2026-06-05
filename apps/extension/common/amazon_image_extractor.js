// ═══════════════════════════════════════════════════════════
// 🖼️ AMAZON IMAGE EXTRACTOR - HIGH RESOLUTION PRODUCT IMAGES
// Extracts TRUE high-resolution product images from Amazon
// ═══════════════════════════════════════════════════════════

class AmazonImageExtractor {
    constructor() {
        this.images = new Map(); // URL -> metadata
        this.altMap = new Map(); // Store alt text separately
        this.highQualityImages = [];
        this.currentASIN = null;
        this.extractedBaseUrls = new Set(); // For deduplication
    }

    // Safe helper to update status text in UI overlay
    updateStatus(message) {
        console.log(`[Scraper Status] ${message}`);
        if (typeof window !== 'undefined' && typeof window.updateScrapeStatus === 'function') {
            window.updateScrapeStatus(message);
        } else if (typeof updateScrapeStatus === 'function') {
            updateScrapeStatus(message);
        }
    }

    // Get current product ASIN
    getCurrentASIN() {
        if (this.currentASIN) return this.currentASIN;

        this.currentASIN = document.querySelector('input#asin')?.value ||
            document.querySelector('input[name="ASIN"]')?.value ||
            window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ||
            window.location.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/)?.[1] ||
            '';

        console.log('📦 Current product ASIN:', this.currentASIN);
        return this.currentASIN;
    }

    // Sanitize alt text to remove Amazon fingerprints
    sanitizeAltText(text) {
        if (!text) return 'Product Image';
        return text
            .replace(/\b(amazon|prime|alexa|kindle|fire tv|echo|basics)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim() || 'Product Image';
    }

    // Main extraction algorithm with multiple approaches
    async extractAllImages() {
        console.log('🖼️ [AmazonImageExtractor] Starting high-res image extraction...');
        
        // Reset collections
        this.images.clear();
        this.altMap.clear();
        this.highQualityImages = [];
        this.extractedBaseUrls.clear();
        this.currentASIN = null;

        // Wait for page to fully load
        await this.waitForPageLoad();
        await this.safeWait(500);

        // ═══════════════════════════════════════════════════════════
        // PRIORITY 1: Interactive Full-View Modal Extraction
        // This is the MOST RELIABLE method - gets same quality as main image
        // ═══════════════════════════════════════════════════════════
        try {
            console.log('🎯 Attempting interactive full-view modal extraction...');
            this.updateStatus('Opening product image gallery...');
            await this.extractFromFullViewModal();

            // If we got multiple images, we're done!
            if (this.images.size >= 2) {
                console.log(`✅ Interactive extraction successful! Got ${this.images.size} images`);
                this.transformToMaxResolution();
                await this.validateAndFormatOutput();
                return this.highQualityImages;
            }
        } catch (error) {
            console.warn('⚠️ Interactive extraction failed, falling back to passive methods:', error);
        }

        // ═══════════════════════════════════════════════════════════
        // FALLBACK: Passive extraction methods
        // ═══════════════════════════════════════════════════════════
        console.log('📋 Using passive extraction methods...');
        const approaches = [
            { name: 'Standard DOM', method: () => this.extractFromDOM() },
            { name: 'JSON Data', method: () => this.extractFromScriptData() },
            { name: 'Comprehensive', method: () => this.extractFromImageBlock() },
            { name: 'Fallback', method: () => this.extractFallback() }
        ];

        for (const approach of approaches) {
            try {
                this.updateStatus(`Scraping product images (${approach.name})...`);
                await approach.method();
                if (this.images.size > 0) {
                    break;
                }
            } catch (error) {
                console.warn(`❌ ${approach.name} failed: `, error);
            }
        }

        // Transform to maximum resolution
        this.transformToMaxResolution();

        // Validate and filter
        await this.validateAndFormatOutput();

        console.log(`🖼️ Final result: ${this.highQualityImages.length} images extracted`);
        return this.highQualityImages;
    }

    // Safe async wait helper
    safeWait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Wait for condition
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

    async waitForPageLoad() {
        return new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve, { once: true });
                setTimeout(resolve, 5000); // Timeout fallback
            }
        });
    }

    // Wait for Amazon's image gallery to be fully loaded and ready
    async waitForImageGalleryReady() {
        console.log('  ⏳ Waiting for image gallery to be ready...');
        const maxWaitTime = 5000;
        const checkInterval = 200;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            const mainImage = document.querySelector('#landingImage, #imgTagWrapperId img, #imgBlkFront');
            const thumbnailGallery = document.querySelector('#altImages, #imageBlock');
            const hasThumbnails = document.querySelectorAll('#altImages li img, .imageThumbnail').length > 0;

            if (mainImage && thumbnailGallery && hasThumbnails) {
                console.log('  ✓ Image gallery is ready');
                await this.safeWait(300);
                return;
            }
            await this.safeWait(checkInterval);
        }
        console.log('  ⚠️ Gallery readiness timeout - proceeding anyway');
    }

    // ═══════════════════════════════════════════════════════════
    // INTERACTIVE FULL-VIEW MODAL EXTRACTION WITH SMART POLLING
    // ═══════════════════════════════════════════════════════════
    async extractFromFullViewModal() {
        console.log('🖱️ Starting interactive full-view modal extraction...');

        // Step 0: Wait for Amazon's image gallery to be fully ready
        await this.waitForImageGalleryReady();

        // Step 1: Find and click the main image to open modal
        const mainImage = document.querySelector('#landingImage, #imgTagWrapperId img, #imgBlkFront');
        if (!mainImage) {
            throw new Error('Main product image not found');
        }

        console.log('  Clicking main image to open modal...');
        mainImage.click();

        // Wait for modal to appear (smart polling)
        const modalRoot = await this.waitFor(() => {
            return document.querySelector('.a-modal-scroller, #ivLargeImage, [role="dialog"][aria-modal="true"]');
        }, { timeoutMs: 5000 });

        if (!modalRoot) {
            throw new Error('Modal did not open');
        }

        console.log('  ✓ Modal opened successfully');

        // Step 3: Find all thumbnails in the modal
        const thumbnails = Array.from(document.querySelectorAll('.ivThumb, img.imageThumbnail, .imageThumbnail img, #ivThumbs img'));
        if (thumbnails.length === 0) {
            throw new Error('No thumbnails found in modal');
        }

        console.log(`  Found ${thumbnails.length} thumbnails to process`);

        // Step 4: Click each thumbnail sequentially and extract image (SMART DYNAMIC MODE)
        for (let i = 0; i < thumbnails.length; i++) {
            try {
                const thumb = thumbnails[i];

                // Skip if it's a video/360 thumbnail
                const ariaLabel = (thumb.closest('[aria-label]')?.getAttribute('aria-label') || '').toLowerCase();
                const cls = (thumb.className || '').toLowerCase();
                const isVideo = thumb.querySelector('video') ||
                    thumb.classList.contains('video') ||
                    ariaLabel.includes('video') ||
                    cls.includes('video') ||
                    thumb.src?.toLowerCase().includes('video') ||
                    thumb.src?.toLowerCase().includes('play-button');

                if (isVideo) {
                    console.log(`  ⏭️ Skipping thumbnail ${i + 1} (video)`);
                    continue;
                }

                // Click the thumbnail
                this.updateStatus(`Extracting image ${i + 1} of ${thumbnails.length}...`);
                console.log(`  🖱️ Clicking thumbnail ${i + 1}/${thumbnails.length}...`);

                // Capture current modal image signature before click
                const largeImg = document.querySelector('#ivLargeImage img') || this.getModalMainImage(modalRoot);
                const beforeSig = largeImg ? (largeImg.getAttribute('data-old-hires') || largeImg.src) : null;

                // Trigger click on thumbnail
                const clickableThumb = thumb.closest('button, a, [role="button"]') || thumb;
                clickableThumb.click();

                // Wait for the large image signature to update (Smart Polling - 20ms check intervals)
                await this.waitFor(() => {
                    const currentImg = document.querySelector('#ivLargeImage img') || this.getModalMainImage(modalRoot);
                    if (!currentImg) return false;
                    const afterSig = currentImg.getAttribute('data-old-hires') || currentImg.src;
                    return afterSig && afterSig !== beforeSig;
                }, { timeoutMs: 1500, intervalMs: 20 });

                // Extract URL
                const currentImg = document.querySelector('#ivLargeImage img') || this.getModalMainImage(modalRoot);
                if (currentImg) {
                    let imageUrl = currentImg.getAttribute('data-old-hires') || currentImg.src;
                    
                    if (imageUrl && this.isValidProductImageUrl(imageUrl)) {
                        const maxResUrl = this.forceMaxResolution(imageUrl);
                        this.addImageWithDedup(maxResUrl, `Product Image ${this.images.size + 1}`);
                    }
                }
            } catch (error) {
                console.warn(`  ⚠️ Failed to extract from thumbnail ${i + 1}:`, error.message);
            }
        }

        // Step 5: Close the modal immediately
        this.closeModal();
        console.log(`✅ Interactive extraction complete: ${this.images.size} images extracted`);
    }

    getModalMainImage(modalRoot) {
        if (!modalRoot) return null;
        const imgs = Array.from(modalRoot.querySelectorAll('img[src*="media-amazon"], img[data-old-hires], img[data-a-dynamic-image]'));
        if (imgs.length === 0) return null;

        const withMeta = imgs.find(img => img.getAttribute('data-old-hires') || img.getAttribute('data-a-dynamic-image'));
        if (withMeta) return withMeta;

        return imgs.reduce((best, cur) => {
            const a = (best?.clientWidth || 0) * (best?.clientHeight || 0);
            const b = (cur?.clientWidth || 0) * (cur?.clientHeight || 0);
            return b > a ? cur : best;
        }, imgs[0]);
    }

    closeModal() {
        try {
            // Escape key
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
            
            // Close buttons
            const closeBtn = document.querySelector('.a-button-close, [data-action="close"], [aria-label*="Close"]');
            if (closeBtn) {
                closeBtn.click();
            }
            this.safeWait(100);
        } catch (e) {
            console.warn('Could not close modal', e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PASSIVE DOM & JSON EXTRACTION METHODS
    // ═══════════════════════════════════════════════════════════

    // Extract ONLY main product images from DOM elements
    async extractFromDOM() {
        console.log('🔍 Extracting MAIN product images from DOM...');
        const mainProductSelectors = [
            '#landingImage',                    // Main hero image
            '#imgTagWrapperId img',             // Main image wrapper
            '#main-image-container img',        // Main container
            '#imageBlock #altImages li img',    // Product gallery thumbnails
            '.a-dynamic-image[data-old-hires]', // Dynamic images with high-res
            '#imgBlkFront',                     // Front image
        ];

        mainProductSelectors.forEach(selector => {
            const images = document.querySelectorAll(selector);
            console.log(`Checking selector "${selector}": found ${images.length} images`);

            images.forEach(img => {
                const sources = [
                    img.src,
                    img.dataset.oldHires,
                    img.dataset.aDynamicImage,
                    img.dataset.src,
                    img.getAttribute('data-src')
                ];

                const altText = img.alt || '';

                sources.forEach(url => {
                    if (url && this.isValidProductImageUrl(url)) {
                        this.addImageWithDedup(url, altText);
                    }
                });
            });
        });
    }

    // Extract images from JSON data in page script tags
    extractFromScriptData() {
        console.log('🔍 Extracting from script JSON data...');
        const scriptTags = document.querySelectorAll('script:not([src])');

        scriptTags.forEach(script => {
            try {
                const content = script.textContent || script.innerHTML;
                if (content && (content.includes('colorImages') || content.includes('ImageBlockATF'))) {
                    this.parseColorImagesData(content);
                }
            } catch (error) {
                console.warn('Error parsing script content:', error);
            }
        });
    }

    parseColorImagesData(content) {
        const patterns = [
            /'initial'\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
            /"initial"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
            /colorImages.*?'initial'\s*:\s*(\[[\s\S]*?\])/,
            /"colorImages"[\s\S]*?"initial"\s*:\s*(\[[\s\S]*?\])/
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                try {
                    let jsonStr = match[1]
                        .replace(/'/g, '"')
                        .replace(/,\s*]/g, ']')
                        .replace(/,\s*}/g, '}');

                    const images = JSON.parse(jsonStr);

                    if (Array.isArray(images)) {
                        images.forEach(item => {
                            let url = item.hiRes || item.large;

                            if (!url && item.main) {
                                if (typeof item.main === 'string') {
                                    url = item.main;
                                } else if (typeof item.main === 'object') {
                                    url = this.getLargestFromDynamicMap(item.main);
                                }
                            }

                            if (url && this.isValidProductImageUrl(url)) {
                                this.addImageWithDedup(url, item.variant || 'Product Image');
                            }
                        });
                    }
                } catch (e) {
                    this.extractUrlsWithRegex(match[1]);
                }
            }
        }
    }

    extractUrlsWithRegex(text) {
        const urlPattern = /https?:\/\/[a-z0-9.-]*(?:media-amazon|images-amazon|ssl-images-amazon)[^"'\s,\]]+\.(jpg|jpeg|png|webp)/gi;
        let match;
        while ((match = urlPattern.exec(text)) !== null) {
            let url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '');
            if (this.isValidProductImageUrl(url)) {
                this.addImageWithDedup(url, 'Product Image');
            }
        }
    }

    // Extract from main product image data attributes
    extractFromImageBlock() {
        console.log('🔍 Extracting from main product data attributes...');
        const mainImageBlock = document.querySelector('#imageBlock, #dp-container, #main-image-container');
        if (!mainImageBlock) return;

        const productImages = mainImageBlock.querySelectorAll('img[data-old-hires], img[data-a-dynamic-image]');
        productImages.forEach(img => {
            const altText = img.alt || '';

            if (img.dataset.oldHires) {
                this.addImageWithDedup(img.dataset.oldHires, altText);
            }
            if (img.dataset.aDynamicImage) {
                try {
                    const imageData = JSON.parse(img.dataset.aDynamicImage);
                    for (const url of Object.keys(imageData)) {
                        if (url && this.isValidProductImageUrl(url)) {
                            this.addImageWithDedup(url, altText);
                        }
                    }
                } catch (e) {
                    console.warn('Error parsing data-a-dynamic-image:', e);
                }
            }
        });
    }

    // Fallback extraction
    extractFallback() {
        console.log('🔍 Fallback extraction for main product images...');
        const mainContainers = document.querySelectorAll('#altImages, #imageBlock, #main-image-container');

        mainContainers.forEach(container => {
            const images = container.querySelectorAll('img');
            images.forEach(img => {
                if (!this.isExcludedImage(img)) {
                    this.extractHighResFromElement(img);
                }
            });
        });
    }

    extractHighResFromElement(img) {
        let highResUrl = img.dataset?.oldHires || img.getAttribute('data-old-hires');
        const altText = img.alt || '';

        if (!highResUrl) {
            const dynamicData = img.dataset?.aDynamicImage || img.getAttribute('data-a-dynamic-image');
            if (dynamicData) {
                try {
                    const parsed = JSON.parse(dynamicData);
                    highResUrl = this.getLargestFromDynamicMap(parsed);
                } catch (e) {
                    // ignore
                }
            }
        }

        if (!highResUrl && img.src && this.isValidProductImageUrl(img.src)) {
            highResUrl = img.src;
        }

        if (highResUrl) {
            return this.addImageWithDedup(highResUrl, altText);
        }
        return false;
    }

    getLargestFromDynamicMap(imageMap) {
        if (!imageMap || typeof imageMap !== 'object') return null;
        const urls = Object.keys(imageMap);
        if (urls.length === 0) return null;

        return urls.reduce((best, url) => {
            if (!this.isValidProductImageUrl(url)) return best;
            if (!best) return url;
            const sizeA = this.getResolutionScore(imageMap[best]);
            const sizeB = this.getResolutionScore(imageMap[url]);
            return sizeB > sizeA ? url : best;
        }, null);
    }

    getResolutionScore(dimensions) {
        if (Array.isArray(dimensions) && dimensions.length >= 2) {
            return (dimensions[0] || 0) * (dimensions[1] || 0);
        }
        return 0;
    }

    addImageWithDedup(url, altText) {
        const baseUrl = this.getBaseImageUrl(url);
        if (this.extractedBaseUrls.has(baseUrl)) {
            return false;
        }
        this.extractedBaseUrls.add(baseUrl);
        this.images.set(url, { alt: altText });
        this.altMap.set(url, altText);
        return true;
    }

    getBaseImageUrl(url) {
        if (!url) return '';
        const match = url.match(/\/images\/I\/([A-Za-z0-9._+-]+)/);
        if (match) {
            return match[1].split('._')[0];
        }
        return url;
    }

    isExcludedThumbnail(item) {
        if (!item) return true;
        const classList = item.className || '';
        const innerHTML = item.innerHTML || '';
        if (classList.includes('video') || item.querySelector('.videoThumbnail, [class*="video"], .a-video')) {
            return true;
        }
        if (classList.includes('360') || classList.includes('spin') || innerHTML.includes('360') || item.querySelector('[class*="360"], [class*="spin"]')) {
            return true;
        }
        if (classList.includes('aok-hidden') || item.style.display === 'none') {
            return true;
        }
        return false;
    }

    isExcludedImage(img) {
        if (!img) return true;
        const src = (img.src || '').toLowerCase();
        const alt = (img.alt || '').toLowerCase();
        const classList = (img.className || '').toLowerCase();

        if (src.includes('video') || src.includes('play-button') || src.includes('play_icon') || classList.includes('video')) {
            return true;
        }
        if (src.includes('360') || src.includes('spin') || alt.includes('360') || classList.includes('360')) {
            return true;
        }
        if (src.includes('sprite') || src.includes('icon') || src.includes('transparent-pixel') || src.includes('spacer') || src.includes('loading') || src.includes('placeholder')) {
            return true;
        }

        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        if (width > 0 && width < 30 && height > 0 && height < 30) {
            return true;
        }
        return false;
    }

    isValidProductImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        if (url.length < 20) return false;

        const validDomains = [
            'images-na.ssl-images-amazon.com',
            'm.media-amazon.com',
            'images-amazon.com',
            'images-eu.ssl-images-amazon.com',
            'images-fe.ssl-images-amazon.com'
        ];
        const hasValidDomain = validDomains.some(domain => url.includes(domain));
        if (!hasValidDomain) return false;
        if (!url.includes('/images/I/')) return false;

        const excludePatterns = [
            'sprite', 'icon', 'logo', 'banner', 'transparent-pixel',
            'badge', 'button', 'nav', 'header', 'footer',
            'review', 'customer', 'avatar', 'profile', 'spacer', 
            'loading', 'video', 'play-button', 'play_icon', 'play-icon',
            '360', 'spin', 'rotate', 'gif', 'thumb_', '_thumb',
            'prime', 'shipping', 'delivery', 'cart', 'wishlist'
        ];
        const lowerUrl = url.toLowerCase();
        return !excludePatterns.some(pattern => lowerUrl.includes(pattern));
    }

    forceMaxResolution(originalUrl) {
        if (!originalUrl) return originalUrl;
        let url = originalUrl;

        const baseMatch = url.match(/^(.*?\/images\/I\/[A-Za-z0-9._+-]+)\._.*?\.(jpg|jpeg|png|webp)$/i);
        if (baseMatch) {
            url = `${baseMatch[1]}._AC_SL3000_.${baseMatch[2]}`;
        } else {
            const sizePatterns = [
                /_AC_S[XLYS]\d+_/gi,
                /_AC_U[SXYL]\d+_/gi,
                /_S[SXYL]\d+_/gi,
                /_U[SXYL]\d+_/gi,
                /_CR\d+,\d+,\d+,\d+_/gi,
                /_SL\d+_/gi
            ];
            sizePatterns.forEach(pattern => {
                if (pattern.test(url)) {
                    url = url.replace(pattern, '_AC_SL3000_');
                }
            });

            if (!url.includes('_AC_SL3000_') && !url.includes('._')) {
                const extMatch = url.match(/\.(jpg|jpeg|png|webp)$/i);
                if (extMatch) {
                    url = url.replace(extMatch[0], `._AC_SL3000_${extMatch[0]}`);
                }
            }
        }
        return url;
    }

    transformToMaxResolution() {
        const originalUrls = Array.from(this.images.keys());
        const transformed = new Map();

        originalUrls.forEach(url => {
            const maxRes = this.forceMaxResolution(url);
            const metadata = this.images.get(url);
            const baseUrl = this.getBaseImageUrl(maxRes);
            if (!transformed.has(baseUrl)) {
                transformed.set(baseUrl, { url: maxRes, ...metadata });
            }
        });

        this.images.clear();
        transformed.forEach((data) => {
            this.images.set(data.url, data);
        });
        console.log(`  🔄 Transformed ${originalUrls.length} → ${this.images.size} max-resolution URLs`);
    }

    async validateAndFormatOutput() {
        const urls = Array.from(this.images.keys());
        console.log(`  📋 Formatting ${urls.length} images for output...`);
        let index = 0;
        for (const url of urls) {
            if (!this.isValidProductImageUrl(url)) continue;
            const metadata = this.images.get(url) || {};
            this.highQualityImages.push({
                index: index,
                url: url,
                type: 'HIGH_RES_PRODUCT_IMAGE',
                alt: this.sanitizeAltText(metadata.alt)
            });
            index++;
        }
        this.highQualityImages.sort((a, b) => a.index - b.index);
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AmazonImageExtractor;
}
if (typeof self !== 'undefined') {
    self.AmazonImageExtractor = AmazonImageExtractor;
}
if (typeof window !== 'undefined') {
    window.AmazonImageExtractor = AmazonImageExtractor;
}
