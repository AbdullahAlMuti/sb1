// ═══════════════════════════════════════════════════════════
// 🖼️ AMAZON IMAGE EXTRACTOR - HIGH RESOLUTION PRODUCT IMAGES
// Extracts TRUE high-resolution product images from Amazon
// ═══════════════════════════════════════════════════════════

class ComprehensiveAmazonImageExtractor {
    constructor() {
        this.images = new Map(); // URL -> metadata
        this.altMap = new Map();
        this.highQualityImages = [];
        this.currentASIN = null;
        this.extractedBaseUrls = new Set(); // For deduplication
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

    // Sanitize alt text
    sanitizeAltText(text) {
        if (!text) return 'Product Image';
        return text
            .replace(/\b(amazon|prime|alexa|kindle|fire tv|echo|basics)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim() || 'Product Image';
    }

    // Main extraction algorithm
    async extractAllImages() {
        console.log('🖼️ [ComprehensiveExtractor] Starting high-res image extraction...');
        
        this.images.clear();
        this.altMap.clear();
        this.highQualityImages = [];
        this.extractedBaseUrls.clear();
        this.currentASIN = null;

        const asin = this.getCurrentASIN();
        console.log('📦 ASIN:', asin || 'not found');

        // Wait for page load with timeout
        await this.waitForPageLoad();

        // Additional wait for dynamic content
        await this.safeWait(500);

        // Try multiple extraction methods (preserving original flow)
        const methods = [
            { name: 'Modal Extraction', fn: () => this.extractFromImageModal() },
            { name: 'altImages Gallery', fn: () => this.extractFromAltImages() },
            { name: 'ImageBlock Data', fn: () => this.extractFromImageBlock() },
            { name: 'Script JSON Data', fn: () => this.extractFromScriptData() },
            { name: 'Fallback Selectors', fn: () => this.extractFallback() }
        ];

        for (const method of methods) {
            try {
                await method.fn();
                console.log(`  ✓ ${method.name}: found ${this.images.size} images so far`);
            } catch (error) {
                console.warn(`  ✗ ${method.name} error:`, error.message);
            }
        }

        // Transform to maximum high-res URLs
        this.transformToMaxResolution();

        // Validate and format output
        await this.validateAndFormatOutput();

        console.log(`🖼️ Final result: ${this.highQualityImages.length} HIGH_RES_PRODUCT_IMAGES`);
        return this.highQualityImages;
    }

    // Safe async wait helper
    safeWait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async waitForPageLoad() {
        return new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve, { once: true });
                // Timeout fallback
                setTimeout(resolve, 5000);
            }
        });
    }

    // NEW: Extract from Amazon Image Modal (highest quality source)
    async extractFromImageModal() {
        // Try to open the image modal by clicking the main image
        const mainImage = document.querySelector('#landingImage, #imgBlkFront, #main-image');
        if (!mainImage) return;

        // Check if modal already exists
        let modal = document.querySelector('#ivLargeImage, .iv-large-image, #imageBlockContainer');
        
        // Get high-res data from main image first
        this.extractHighResFromElement(mainImage);

        // Try to get images from image viewer if available
        const imageViewer = document.querySelector('#imageBlock_feature_div, #imageBlockContainer');
        if (imageViewer) {
            const allImgs = imageViewer.querySelectorAll('img[data-old-hires], img[data-a-dynamic-image]');
            for (const img of allImgs) {
                if (!this.isExcludedImage(img)) {
                    this.extractHighResFromElement(img);
                }
            }
        }
    }

    // METHOD 1: Extract from #altImages - the thumbnail strip
    async extractFromAltImages() {
        const altImages = document.querySelector('#altImages');
        if (!altImages) {
            console.log('  #altImages not found');
            return;
        }

        // Get ALL thumbnail items
        const allItems = altImages.querySelectorAll('li.a-spacing-small, li.item, li[class*="image"]');
        console.log(`  Found ${allItems.length} thumbnail items in #altImages`);

        let imageCount = 0;
        for (const item of allItems) {
            // Skip excluded items
            if (this.isExcludedThumbnail(item)) {
                continue;
            }

            const img = item.querySelector('img');
            if (!img) continue;

            // Skip excluded images
            if (this.isExcludedImage(img)) continue;

            if (this.extractHighResFromElement(img)) {
                imageCount++;
            }

            // Small delay to avoid race conditions
            await this.safeWait(50);
        }

        console.log(`  Extracted ${imageCount} high-res images from #altImages`);
    }

    // METHOD 2: Extract from #imageBlock
    extractFromImageBlock() {
        const imageBlock = document.querySelector('#imageBlock, #imageBlock_feature_div');
        if (!imageBlock) return;

        // Priority: landing image with data attributes
        const landingSelectors = [
            '#landingImage',
            '#imgBlkFront', 
            '#main-image',
            '.a-dynamic-image[data-old-hires]',
            '.a-dynamic-image[data-a-dynamic-image]'
        ];
        
        for (const sel of landingSelectors) {
            const img = document.querySelector(sel);
            if (img && !this.isExcludedImage(img)) {
                this.extractHighResFromElement(img);
            }
        }

        // Get all images with hi-res data in imageBlock
        const imagesWithData = imageBlock.querySelectorAll('img[data-old-hires], img[data-a-dynamic-image]');
        imagesWithData.forEach(img => {
            if (!this.isExcludedImage(img)) {
                this.extractHighResFromElement(img);
            }
        });
    }

    // METHOD 3: Extract from inline script JSON data
    extractFromScriptData() {
        const scripts = document.querySelectorAll('script:not([src])');
        
        for (const script of scripts) {
            const content = script.textContent || '';
            
            // Look for colorImages data (contains all product images)
            if (content.includes('colorImages') || content.includes('ImageBlockATF')) {
                this.parseColorImagesData(content);
            }
        }
    }

    parseColorImagesData(content) {
        // Pattern to extract image arrays
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
                    // Clean up JSON string
                    let jsonStr = match[1]
                        .replace(/'/g, '"')
                        .replace(/,\s*]/g, ']')
                        .replace(/,\s*}/g, '}');
                    
                    const images = JSON.parse(jsonStr);
                    
                    if (Array.isArray(images)) {
                        images.forEach(item => {
                            // Priority: hiRes > large > main (highest resolution first)
                            let url = item.hiRes || item.large;
                            
                            // Handle main as object with resolution keys
                            if (!url && item.main) {
                                if (typeof item.main === 'string') {
                                    url = item.main;
                                } else if (typeof item.main === 'object') {
                                    // Pick largest from main object
                                    url = this.getLargestFromDynamicMap(item.main);
                                }
                            }
                            
                            if (url && this.isValidProductImageUrl(url)) {
                                this.addImageWithDedup(url, item.variant || 'Product Image');
                                console.log(`    ✓ JSON hiRes: ${url.substring(0, 60)}...`);
                            }
                        });
                    }
                } catch (e) {
                    // Fallback: extract URLs with regex
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

    // METHOD 4: Fallback extraction
    extractFallback() {
        const selectors = [
            '#imgTagWrapperId img',
            '#main-image-container img',
            '.a-dynamic-image-container img',
            '#ivLargeImage img',
            '.imgTagWrapper img',
            '[data-action="thumb-action"] img'
        ];

        for (const sel of selectors) {
            const imgs = document.querySelectorAll(sel);
            imgs.forEach(img => {
                if (!this.isExcludedImage(img)) {
                    this.extractHighResFromElement(img);
                }
            });
        }
    }

    // CORE: Extract high-res URL from an img element
    // Priority: data-old-hires FIRST, then data-a-dynamic-image
    extractHighResFromElement(img) {
        let highResUrl = null;
        let altText = img.alt || 'Product Image';

        // ═══════════════════════════════════════════════════════════
        // PRIORITY 1: data-old-hires (Amazon's true high-res URL)
        // ═══════════════════════════════════════════════════════════
        const oldHires = img.dataset?.oldHires || img.getAttribute('data-old-hires');
        if (oldHires && this.isValidProductImageUrl(oldHires)) {
            highResUrl = oldHires;
            console.log(`    ✓ Found data-old-hires: ${highResUrl.substring(0, 60)}...`);
        }

        // ═══════════════════════════════════════════════════════════
        // PRIORITY 2: data-a-dynamic-image (pick largest resolution)
        // ═══════════════════════════════════════════════════════════
        if (!highResUrl) {
            const dynamicData = img.dataset?.aDynamicImage || img.getAttribute('data-a-dynamic-image');
            if (dynamicData) {
                try {
                    const parsed = JSON.parse(dynamicData);
                    highResUrl = this.getLargestFromDynamicMap(parsed);
                    if (highResUrl) {
                        console.log(`    ✓ Found from dynamic-image: ${highResUrl.substring(0, 60)}...`);
                    }
                } catch (e) {
                    console.warn('    Failed to parse data-a-dynamic-image');
                }
            }
        }

        // ═══════════════════════════════════════════════════════════
        // PRIORITY 3: src attribute (last resort)
        // ═══════════════════════════════════════════════════════════
        if (!highResUrl && img.src && this.isValidProductImageUrl(img.src)) {
            highResUrl = img.src;
        }

        // Add to collection with deduplication
        if (highResUrl) {
            return this.addImageWithDedup(highResUrl, altText);
        }
        
        return false;
    }

    // Get largest resolution URL from data-a-dynamic-image map
    getLargestFromDynamicMap(imageMap) {
        if (!imageMap || typeof imageMap !== 'object') return null;
        
        const urls = Object.keys(imageMap);
        if (urls.length === 0) return null;

        // Sort by resolution (width * height) descending
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

    // Add image with deduplication by base URL
    addImageWithDedup(url, altText) {
        const baseUrl = this.getBaseImageUrl(url);
        
        // Check for duplicates using base URL
        if (this.extractedBaseUrls.has(baseUrl)) {
            return false;
        }
        
        this.extractedBaseUrls.add(baseUrl);
        this.images.set(url, { alt: altText });
        this.altMap.set(url, altText);
        
        return true;
    }

    // Get base image URL (without size modifiers) for deduplication
    getBaseImageUrl(url) {
        if (!url) return '';
        
        // Extract the image ID (e.g., "71abc123XYZ" from the URL)
        const match = url.match(/\/images\/I\/([A-Za-z0-9._+-]+)/);
        if (match) {
            // Return just the base identifier without size modifiers
            return match[1].split('._')[0];
        }
        return url;
    }

    // ═══════════════════════════════════════════════════════════
    // EXCLUSION FILTERS - Comprehensive filtering
    // ═══════════════════════════════════════════════════════════

    // Check if thumbnail item should be excluded
    isExcludedThumbnail(item) {
        if (!item) return true;
        
        const classList = item.className || '';
        const innerHTML = item.innerHTML || '';
        
        // Video thumbnails
        if (classList.includes('video') || 
            item.querySelector('.videoThumbnail, [class*="video"], .a-video')) {
            return true;
        }
        
        // 360° view
        if (classList.includes('360') || 
            classList.includes('spin') ||
            innerHTML.includes('360') ||
            item.querySelector('[class*="360"], [class*="spin"]')) {
            return true;
        }
        
        // Non-visible items
        if (classList.includes('aok-hidden') || 
            item.style.display === 'none') {
            return true;
        }
        
        return false;
    }

    // Check if image element should be excluded
    isExcludedImage(img) {
        if (!img) return true;
        
        const src = (img.src || '').toLowerCase();
        const alt = (img.alt || '').toLowerCase();
        const classList = (img.className || '').toLowerCase();
        
        // Video-related
        if (src.includes('video') || 
            src.includes('play-button') || 
            src.includes('play_icon') ||
            src.includes('play-icon') ||
            classList.includes('video')) {
            return true;
        }
        
        // 360° view
        if (src.includes('360') || 
            src.includes('spin') ||
            alt.includes('360') ||
            classList.includes('360')) {
            return true;
        }
        
        // UI elements
        if (src.includes('sprite') ||
            src.includes('icon') ||
            src.includes('transparent-pixel') ||
            src.includes('spacer') ||
            src.includes('loading') ||
            src.includes('placeholder')) {
            return true;
        }
        
        // Too small (likely thumbnail or icon)
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        if (width > 0 && width < 30 && height > 0 && height < 30) {
            return true;
        }
        
        return false;
    }

    // Validate if URL is a legitimate product image
    isValidProductImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        if (url.length < 20) return false;

        // Must be from Amazon image CDN
        const validDomains = [
            'images-na.ssl-images-amazon.com',
            'm.media-amazon.com',
            'images-amazon.com',
            'images-eu.ssl-images-amazon.com',
            'images-fe.ssl-images-amazon.com'
        ];

        const hasValidDomain = validDomains.some(domain => url.includes(domain));
        if (!hasValidDomain) return false;

        // Must contain product image path
        if (!url.includes('/images/I/')) return false;

        // Exclude patterns (comprehensive list)
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

    // ═══════════════════════════════════════════════════════════
    // RESOLUTION TRANSFORMATION - Force maximum quality
    // ═══════════════════════════════════════════════════════════

    // Transform URL to MAXIMUM resolution (SL3000)
    forceMaxResolution(originalUrl) {
        if (!originalUrl) return originalUrl;

        let url = originalUrl;

        // Remove ALL size qualifiers to get base URL
        // Pattern: anything between ._ and .jpg/.png/.webp
        const baseMatch = url.match(/^(.*?\/images\/I\/[A-Za-z0-9._+-]+)\._.*?\.(jpg|jpeg|png|webp)$/i);
        if (baseMatch) {
            // Reconstruct with maximum resolution
            url = `${baseMatch[1]}._AC_SL3000_.${baseMatch[2]}`;
        } else {
            // Fallback: replace known size patterns with SL3000
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

            // If no size modifier found, try to add one
            if (!url.includes('_AC_SL3000_') && !url.includes('._')) {
                const extMatch = url.match(/\.(jpg|jpeg|png|webp)$/i);
                if (extMatch) {
                    url = url.replace(extMatch[0], `._AC_SL3000_${extMatch[0]}`);
                }
            }
        }

        return url;
    }

    // Transform all images to maximum resolution
    transformToMaxResolution() {
        const originalUrls = Array.from(this.images.keys());
        const transformed = new Map();

        originalUrls.forEach(url => {
            const maxRes = this.forceMaxResolution(url);
            const metadata = this.images.get(url);
            
            // Only keep if not duplicate after transformation
            const baseUrl = this.getBaseImageUrl(maxRes);
            if (!transformed.has(baseUrl)) {
                transformed.set(baseUrl, { url: maxRes, ...metadata });
            }
        });

        // Replace images map
        this.images.clear();
        transformed.forEach((data, baseUrl) => {
            this.images.set(data.url, data);
        });

        console.log(`  🔄 Transformed ${originalUrls.length} → ${this.images.size} max-resolution URLs`);
    }

    // ═══════════════════════════════════════════════════════════
    // OUTPUT FORMATTING - Clean production-ready format
    // ═══════════════════════════════════════════════════════════

    async validateAndFormatOutput() {
        const urls = Array.from(this.images.keys());
        console.log(`  📋 Formatting ${urls.length} images for output...`);

        let index = 0;
        for (const url of urls) {
            // Final validation
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

        // Sort by index for consistent ordering
        this.highQualityImages.sort((a, b) => a.index - b.index);
    }
}

// Export for use in Chrome extension
if (typeof window !== 'undefined') {
    window.ComprehensiveAmazonImageExtractor = ComprehensiveAmazonImageExtractor;
}
