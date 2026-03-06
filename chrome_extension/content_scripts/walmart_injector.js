// ebay-snipping-extension/content_scripts/walmart_injector.js

let uiInjected = false;

// **IMPROVED** Function to inject the main UI panel
const injectUI = async () => {
    if (uiInjected) return;

    // Prevent duplicate injection
    if (document.getElementById('snipe-root-wrapper')) return;

    const response = await fetch(chrome.runtime.getURL('ui/panel.html'));
    const uiHtml = await response.text();

    const wrapper = document.createElement('div');
    wrapper.id = 'snipe-root-wrapper';
    wrapper.innerHTML = uiHtml;

    // Inject the panel as the very first element inside the body tag
    document.body.prepend(wrapper);
    uiInjected = true;
    
    // --- Post-injection logic ---
    scrapeAndDisplayInitialTitle();
    scrapeAndDisplayImages();
    addEventListenersToPanel();
    addCalculatorEventListeners();
    
    // Auto-click DISABLED - User must click "Snipe Title" button manually
    // Title generation now occurs only on user interaction for better UX control
    console.log("🎯 Panel loaded - Snipe Title button ready for user interaction");
    
    // Auto-calculate price when panel loads
    setTimeout(() => {
        console.log('🔄 Auto-calculating price on panel load...');
        quickCalculate();
    }, 1500);

    // URL change watcher for auto-reset
    let lastUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            console.log('🔄 URL changed, auto-resetting price calculation...');
            const sellItForInput = document.getElementById('sell-it-for-input');
            if (sellItForInput) sellItForInput.value = '';
            if (typeof quickCalculate === 'function') {
                quickCalculate();
            }
        }
    }, 1000);
};

// Enhanced product details scraping function for Walmart
const scrapeProductDetails = () => {
    const details = {
        brand: '',
        model: '',
        color: '',
        dimensions: '',
        height: '',
        weight: '',
        description: '',
        rawSpecs: {}
    };

    // --- Scrape Brand from Walmart ---
    const brandSelectors = [
        '[itemprop="brand"]',
        '[data-testid="product-brand"]',
        '.prod-brandName',
        '.brand-name',
        'a[data-automation-id="product-brand"]',
        '[class*="brand"]',
        '.product-brand-link'
    ];
    
    for (const selector of brandSelectors) {
        const brandElement = document.querySelector(selector);
        if (brandElement) {
            details.brand = brandElement.innerText?.trim() || brandElement.textContent?.trim() || '';
            if (details.brand) break;
        }
    }

    // --- Scrape from Walmart Specifications Table ---
    const specSelectors = [
        '.specifications-table',
        '[data-testid="product-specifications"]',
        '.product-specifications',
        '.spec-table',
        '#product-specifications',
        '.wt-specifications',
        '[class*="specification"]',
        '.product-attribute-list'
    ];
    
    specSelectors.forEach(selector => {
        const specTable = document.querySelector(selector);
        if (specTable) {
            const rows = specTable.querySelectorAll('tr, .spec-row, [class*="spec-row"], div[class*="row"], li');
            rows.forEach(row => {
                const labelElement = row.querySelector('th, td:first-child, .spec-label, [class*="label"], dt, span:first-child, h3');
                const valueElement = row.querySelector('td:last-child, .spec-value, [class*="value"], dd, span:last-child, p, div:last-child');
                
                if (labelElement && valueElement && labelElement !== valueElement) {
                    const label = (labelElement.innerText || labelElement.textContent)?.trim() || '';
                    const value = (valueElement.innerText || valueElement.textContent)?.trim() || '';
                    const lowerLabel = label.toLowerCase();
                    
                    if (label && value && label.length < 50 && value.length < 200) {
                        details.rawSpecs[label] = value;
                        
                        if (lowerLabel.includes('brand') || lowerLabel.includes('manufacturer')) {
                            if (!details.brand) details.brand = value;
                        } else if (lowerLabel.includes('model')) {
                            if (!details.model) details.model = value;
                        } else if (lowerLabel.includes('color')) {
                            if (!details.color) details.color = value;
                        } else if (lowerLabel.includes('dimension') || lowerLabel.includes('size')) {
                            if (!details.dimensions) details.dimensions = value;
                        } else if (lowerLabel.includes('weight')) {
                            if (!details.weight) details.weight = value;
                        } else if (lowerLabel.includes('height')) {
                            if (!details.height) details.height = value;
                        }
                    }
                }
            });
        }
    });

    // --- Scrape from Product Highlights section ---
    const highlightSelectors = [
        '.product-short-description',
        '[data-testid="product-highlights"]',
        '.about-product',
        '.product-highlights',
        '[class*="highlight"]',
        '.about-item-list',
        '[data-testid="key-features"]',
        '.key-item-features'
    ];
    
    let combinedDescription = [];
    
    highlightSelectors.forEach(selector => {
        const highlightSection = document.querySelector(selector);
        if (highlightSection) {
            const text = highlightSection.innerText?.trim();
            if (text && !combinedDescription.includes(text)) {
                combinedDescription.push(text);
            }
        }
    });

    // Also look for h3 containing "Key item features" and grab adjacent content
    const h3s = document.querySelectorAll('h3, h2');
    h3s.forEach(heading => {
        if (heading.innerText && (heading.innerText.toLowerCase().includes('key item features') || heading.innerText.toLowerCase().includes('key features') || heading.innerText.toLowerCase().includes('about this item'))) {
            let nextEl = heading.nextElementSibling;
            // Iterate through siblings until the next heading
            while (nextEl && !['H2', 'H3', 'H1', 'DIV'].includes(nextEl.tagName)) {
                if (nextEl.innerText) {
                    const text = nextEl.innerText.trim();
                    if (text && !combinedDescription.includes(text)) {
                        combinedDescription.push(text);
                    }
                }
                nextEl = nextEl.nextElementSibling;
            }
            
            // Sometimes it is nested, so let's just grab the parent container if it's small enough
            const parent = heading.parentElement;
            if (parent && parent.innerText && parent.innerText.length < 2000) {
                 const text = parent.innerText.trim();
                 if (text && !combinedDescription.includes(text)) {
                     combinedDescription.push(text);
                 }
            }
        }
    });

    // --- Extract brand from title if not found ---
    const titleSelectors = [
        'h1[itemprop="name"]',
        '.prod-ProductTitle',
        '[data-testid="product-title"]',
        'h1.prod-Title',
        '.product-title h1',
        'h1[data-automation-id="product-title"]'
    ];
    
    for (const selector of titleSelectors) {
        const titleElement = document.querySelector(selector);
        if (titleElement && !details.brand) {
            const titleText = titleElement.innerText?.trim() || '';
            const brandMatch = titleText.match(/^([A-Za-z\s]+?)(?:\s|$)/);
            if (brandMatch) {
                details.brand = brandMatch[1].trim();
            }
            break;
        }
    }

    // --- Scrape Product Description ---
    const descriptionSelectors = [
        '[data-testid="product-description"]',
        '[data-testid="long-description"]',
        '.dangerous-html',
        '.product-description',
        '.about-desc',
        '#product-description',
        '.prod-ProductDescription',
        '[itemprop="description"]',
        '.about-item-complete'
    ];
    
    for (const selector of descriptionSelectors) {
        // Collect all matching description elements
        const descElements = document.querySelectorAll(selector);
        descElements.forEach(descElement => {
            const text = descElement.innerText?.trim();
            if (text && !combinedDescription.includes(text)) {
                combinedDescription.push(text);
            }
        });
    }
    
    details.description = combinedDescription.join('\n\n');
    
    return details;
};

// Product Details Popup Management
let productDetailsPopup = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

const createProductDetailsPopup = () => {
    if (productDetailsPopup) return;

    productDetailsPopup = document.createElement('div');
    productDetailsPopup.id = 'product-details-popup';
    productDetailsPopup.className = 'product-details-popup';
    
    fetch(chrome.runtime.getURL('ui/product-details-popup.html'))
        .then(response => response.text())
        .then(html => {
            productDetailsPopup.innerHTML = html;
            document.body.appendChild(productDetailsPopup);
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = chrome.runtime.getURL('ui/product-details-popup.css');
            document.head.appendChild(link);
            
            addProductDetailsEventListeners();
            updateProductDetails();
        });
};

const addProductDetailsEventListeners = () => {
    if (!productDetailsPopup) return;

    const closeBtn = productDetailsPopup.querySelector('#close-popup-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            productDetailsPopup.remove();
            productDetailsPopup = null;
        });
    }

    const refreshBtn = productDetailsPopup.querySelector('#refresh-details-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', updateProductDetails);
    }

    const copyAllBtn = productDetailsPopup.querySelector('#copy-all-btn');
    if (copyAllBtn) {
        copyAllBtn.addEventListener('click', copyAllDetails);
    }

    const copyBtns = productDetailsPopup.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const field = e.target.getAttribute('data-field');
            copyDetail(field);
        });
    });

    const header = productDetailsPopup.querySelector('.popup-header');
    if (header) {
        header.addEventListener('mousedown', startDragging);
    }

    document.addEventListener('mousemove', handleDragging);
    document.addEventListener('mouseup', stopDragging);
};

const startDragging = (e) => {
    isDragging = true;
    productDetailsPopup.classList.add('dragging');
    
    const rect = productDetailsPopup.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    e.preventDefault();
};

const handleDragging = (e) => {
    if (!isDragging || !productDetailsPopup) return;
    
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    
    const maxX = window.innerWidth - productDetailsPopup.offsetWidth;
    const maxY = window.innerHeight - productDetailsPopup.offsetHeight;
    
    productDetailsPopup.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    productDetailsPopup.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    productDetailsPopup.style.right = 'auto';
};

const stopDragging = () => {
    if (isDragging) {
        isDragging = false;
        if (productDetailsPopup) {
            productDetailsPopup.classList.remove('dragging');
        }
    }
};

const updateProductDetails = () => {
    if (!productDetailsPopup) return;

    const details = scrapeProductDetails();
    
    Object.keys(details).forEach(field => {
        const valueElement = productDetailsPopup.querySelector(`#${field}-value`);
        if (valueElement) {
            const oldValue = valueElement.textContent;
            const newValue = details[field] || 'Not found';
            
            valueElement.textContent = newValue;
            
            if (oldValue !== newValue && newValue !== 'Not found') {
                valueElement.classList.add('updated');
                setTimeout(() => {
                    valueElement.classList.remove('updated');
                }, 600);
            }
        }
    });
};

const copyDetail = (field) => {
    if (!productDetailsPopup) return;
    
    const valueElement = productDetailsPopup.querySelector(`#${field}-value`);
    if (!valueElement) return;
    
    const value = valueElement.textContent;
    if (value === 'Not found') return;
    
    navigator.clipboard.writeText(value).then(() => {
        const copyBtn = productDetailsPopup.querySelector(`[data-field="${field}"]`);
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
};

const copyAllDetails = () => {
    if (!productDetailsPopup) return;
    
    const details = {};
    const fields = ['brand', 'model', 'color', 'dimensions', 'height', 'weight'];
    
    fields.forEach(field => {
        const valueElement = productDetailsPopup.querySelector(`#${field}-value`);
        if (valueElement) {
            const value = valueElement.textContent;
            if (value !== 'Not found') {
                details[field] = value;
            }
        }
    });
    
    const text = Object.entries(details)
        .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
        .join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
        const copyAllBtn = productDetailsPopup.querySelector('#copy-all-btn');
        if (copyAllBtn) {
            const originalText = copyAllBtn.textContent;
            copyAllBtn.textContent = '✓ Copied!';
            copyAllBtn.classList.add('copied');
            
            setTimeout(() => {
                copyAllBtn.textContent = originalText;
                copyAllBtn.classList.remove('copied');
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy all details:', err);
    });
};

// Comprehensive Walmart image extractor
class WalmartImageExtractor {
    constructor() {
        this.images = new Set();
        this.highQualityImages = [];
        this.attempts = 0;
        this.maxAttempts = 3;
    }

    async extractAllImages() {
        this.images.clear();
        this.highQualityImages = [];
        
        await this.waitForPageLoad();
        
        const approaches = [
            { name: 'Standard DOM', method: () => this.extractFromDOM() },
            { name: 'JSON Data', method: () => this.extractFromJSONData() },
            { name: 'Comprehensive', method: () => this.extractComprehensive() },
            { name: 'Fallback', method: () => this.extractFallback() }
        ];

        for (let i = 0; i < approaches.length; i++) {
            const approach = approaches[i];
            
            try {
                await approach.method();
                if (this.images.size > 0) {
                    break;
                }
            } catch (error) {
                console.warn(`❌ ${approach.name} failed:`, error);
            }
        }
        
        this.transformToHighRes();
        await this.validateImageQuality();
        
        return this.highQualityImages;
    }

    async waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }

    async extractFromDOM() {
        console.log('🔍 Extracting MAIN product images from Walmart DOM...');
        
        // Primary product image selectors only - focus on main gallery
        const mainProductSelectors = [
            '.prod-hero-image img',                 // Main hero image
            '[data-testid="hero-image"] img',       // Hero image
            '[data-testid="media-thumbnail"] img',  // Gallery thumbnails
            '.prod-HeroImage-container img',        // Hero container
            '.hover-zoom-hero-image img',           // Zoom image
        ];

        mainProductSelectors.forEach(selector => {
            const images = document.querySelectorAll(selector);
            console.log(`Checking main selector "${selector}": found ${images.length} images`);
            
            images.forEach(img => {
                const sources = [
                    img.src,
                    img.dataset.src,
                    img.dataset.lazySrc,
                    img.getAttribute('data-src'),
                    img.getAttribute('data-lazy-src'),
                    img.getAttribute('srcset')?.split(',')[0]?.trim()?.split(' ')[0]
                ];
                
                sources.forEach(url => {
                    if (url && this.isValidImageUrl(url)) {
                        this.images.add(url);
                        console.log(`Found main product image: ${url}`);
                    }
                });
            });
        });
    }

    async extractFromJSONData() {
        console.log('🔍 Extracting from Walmart JSON data...');
        
        const scriptTags = document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"], script:not([src])');
        
        scriptTags.forEach(script => {
            try {
                const content = script.textContent || script.innerHTML;
                if (content && (content.includes('walmartimages') || content.includes('productImage') || content.includes('imageUrl'))) {
                    const patterns = [
                        /"imageUrl"\s*:\s*"([^"]+)"/g,
                        /"url"\s*:\s*"([^"]+walmartimages[^"]+)"/g,
                        /"image"\s*:\s*"([^"]+)"/g,
                        /"largeImage"\s*:\s*"([^"]+)"/g,
                        /"thumbnailUrl"\s*:\s*"([^"]+)"/g,
                        /"heroImage"\s*:\s*"([^"]+)"/g,
                        /"zoomImage"\s*:\s*"([^"]+)"/g,
                        /"primaryImage"\s*:\s*"([^"]+)"/g,
                        /"contentUrl"\s*:\s*"([^"]+walmartimages[^"]+)"/g
                    ];

                    patterns.forEach(pattern => {
                        let match;
                        while ((match = pattern.exec(content)) !== null) {
                            let imageUrl = match[1];
                            imageUrl = imageUrl.replace(/\\u002F/g, '/').replace(/\\/g, '').replace(/&amp;/g, '&');
                            
                            if (this.isValidImageUrl(imageUrl)) {
                                this.images.add(imageUrl);
                                console.log(`Found JSON image: ${imageUrl}`);
                            }
                        }
                    });
                }
            } catch (error) {
                console.warn('Error parsing script content:', error);
            }
        });
    }

    async extractComprehensive() {
        console.log('🔍 Extracting from Walmart main product section...');
        
        // Only target the main product image section
        const mainSection = document.querySelector('[data-testid="image-gallery"], .prod-hero-image-area, .prod-ProductImageCarousel');
        if (!mainSection) {
            console.log('No main product section found');
            return;
        }

        const productImages = mainSection.querySelectorAll('img[data-src], img[data-lazy-src], img[srcset]');
        productImages.forEach(img => {
            const sources = [
                img.dataset.src,
                img.dataset.lazySrc,
                img.getAttribute('srcset')?.split(',')[0]?.trim()?.split(' ')[0]
            ];
            
            sources.forEach(url => {
                if (url && this.isValidImageUrl(url)) {
                    this.images.add(url);
                    console.log(`Found main product image: ${url}`);
                }
            });
        });
        // Skip button images outside main product section
    }

    async extractFallback() {
        console.log('🔍 Fallback Walmart extraction for main images only...');
        
        // Only look in main product containers
        const mainContainers = document.querySelectorAll('.prod-hero-image, [data-testid="image-gallery"], .prod-ProductImageCarousel');
        
        mainContainers.forEach(container => {
            const images = container.querySelectorAll('img');
            console.log(`Found ${images.length} images in main container`);
            
            images.forEach((img, index) => {
                try {
                    const sources = [
                        img.src,
                        img.dataset.src,
                        img.dataset.lazySrc,
                        img.getAttribute('data-src')
                    ];
                    
                    sources.forEach(url => {
                        if (url && this.isValidImageUrl(url)) {
                            this.images.add(url);
                            console.log(`Fallback found main image: ${url}`);
                        }
                    });
                } catch (e) {
                    console.warn(`Error processing fallback image ${index}:`, e);
                }
            });
        });
    }

    transformToHighRes() {
        const originalUrls = Array.from(this.images);
        this.images.clear();
        
        originalUrls.forEach(url => {
            const highResUrl = this.getHighResUrl(url);
            this.images.add(highResUrl);
            console.log(`Transformed: ${url} -> ${highResUrl}`);
        });
    }

    getHighResUrl(originalUrl) {
        if (!originalUrl) return originalUrl;
        
        let highResUrl = originalUrl;
        
        // Walmart image URL transformations for high resolution
        const transformations = [
            // Replace size indicators with high resolution (Walmart patterns)
            { pattern: /_\d{2,3}\./g, replacement: '_1200.' },
            { pattern: /_\d{2,3}x\d{2,3}\./g, replacement: '_1200x1200.' },
            { pattern: /\/\d{2,3}x\d{2,3}\//g, replacement: '/1200x1200/' },
            { pattern: /odnWidth=\d+/g, replacement: 'odnWidth=1200' },
            { pattern: /odnHeight=\d+/g, replacement: 'odnHeight=1200' },
            { pattern: /w_\d+/g, replacement: 'w_1200' },
            { pattern: /h_\d+/g, replacement: 'h_1200' },
            { pattern: /\?.*$/, replacement: '' }, // Remove query parameters for clean URL
            { pattern: /_AC_SX\d+/g, replacement: '_AC_SL1500' },
            { pattern: /_AC_SY\d+/g, replacement: '_AC_SL1500' }
        ];

        transformations.forEach(transform => {
            highResUrl = highResUrl.replace(transform.pattern, transform.replacement);
        });

        // Try to upgrade to larger size if URL contains size patterns
        if (highResUrl.includes('i5.walmartimages.com')) {
            // Remove size suffix patterns commonly used by Walmart
            highResUrl = highResUrl.replace(/\?[^?]*$/, '');
        }

        return highResUrl;
    }

    async validateImageQuality() {
        const imageUrls = Array.from(this.images);
        console.log(`Validating ${imageUrls.length} images for quality...`);
        
        const uniqueUrls = [...new Set(imageUrls)].slice(0, 20);
        console.log(`Processing ${uniqueUrls.length} unique images (limited to 20)`);
        
        for (const url of uniqueUrls) {
            try {
                let isHighQuality = false;
                let contentType = 'image/jpeg';
                let contentLength = 'Unknown';
                
                if (this.isHighResUrl(url)) {
                    isHighQuality = true;
                    console.log(`✅ URL pattern indicates high-res: ${url}`);
                } else {
                    try {
                        const response = await fetch(url, { method: 'HEAD' });
                        contentLength = response.headers.get('content-length');
                        contentType = response.headers.get('content-type');
                        
                        isHighQuality = contentLength && parseInt(contentLength) > 50000;
                        
                        if (isHighQuality) {
                            console.log(`✅ HEAD request confirms high-res: ${url} (${contentLength} bytes)`);
                        }
                    } catch (headError) {
                        console.log(`HEAD request failed for ${url}, using URL pattern validation`);
                        isHighQuality = this.isHighResUrl(url);
                    }
                }
                
                const isImage = contentType && contentType.startsWith('image/');
                
                if (isHighQuality && isImage) {
                    this.highQualityImages.push({
                        url: url,
                        size: contentLength,
                        type: contentType,
                        alt: this.getImageAlt(url)
                    });
                    console.log(`✅ Added high-quality image: ${url}`);
                } else {
                    console.log(`❌ Rejected image: ${url} (quality: ${isHighQuality}, isImage: ${isImage})`);
                }
            } catch (error) {
                console.log(`Failed to validate image: ${url}`, error);
            }
        }
        
        console.log(`Validation complete. Found ${this.highQualityImages.length} high-quality images`);
    }

    getImageAlt(url) {
        const img = document.querySelector(`img[src="${url}"]`);
        return img ? img.alt || 'Product Image' : 'Product Image';
    }

    isValidImageUrl(url) {
        if (!url) return false;
        
        // Must be Walmart image URL
        if (!url.includes('walmartimages') && !url.includes('walmart')) {
            return false;
        }
        
        const validFormats = ['.jpg', '.jpeg', '.png', '.webp'];
        const hasValidFormat = validFormats.some(format => url.toLowerCase().includes(format)) || 
                               url.includes('walmartimages');
        
        // Expanded exclusion list for non-product images
        const excludedContent = [
            'sprite', 'icon', 'logo', 'banner', 'data:image', 'pixel', 'tracking',
            'badge', 'button', 'nav', 'header', 'footer', 'review', 'customer',
            'avatar', 'profile', 'spacer', 'loading', 'shipping', 'returns',
            'warranty', 'video-thumb', 'play-button', 'overlay', 'spark',
            'savings', 'promotion', 'ad-', 'advertisement'
        ];
        const hasExcludedContent = excludedContent.some(excluded => url.toLowerCase().includes(excluded));
        
        // Check minimum URL length
        const isLongEnoughUrl = url.length > 50;
        
        return hasValidFormat && !hasExcludedContent && url.startsWith('http') && isLongEnoughUrl;
    }

    isHighResUrl(url) {
        if (!url) return false;
        
        const highResPatterns = [
            /_1200\./,
            /_1200x1200\./,
            /\/1200x1200\//,
            /odnWidth=1200/,
            /odnHeight=1200/,
            /w_1200/,
            /h_1200/,
            /_AC_SL1500/,
            /_AC_SL2000/,
            /large/i,
            /zoom/i
        ];
        
        return highResPatterns.some(pattern => pattern.test(url));
    }
}

// Initialize extractor when page loads
const extractor = new WalmartImageExtractor();

// Function to scrape complete Walmart product data for AI generation
const scrapeCompleteProductData = () => {
    const details = scrapeProductDetails(); // Re-use the existing detailed scraper
    
    // Scrape Main Title
    const titleSelectors = [
        'h1[itemprop="name"]', '.prod-ProductTitle', '[data-testid="product-title"]',
        'h1.prod-Title', '.product-title h1', 'h1[data-automation-id="product-title"]'
    ];
    let title = document.title;
    for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el) {
            title = (el.innerText || el.textContent).trim();
            break;
        }
    }
    
    // Scrape Category from Breadcrumbs
    const categoryList = [];
    document.querySelectorAll('[data-testid="breadcrumb-list"] li a, .breadcrumb-list li a').forEach(el => {
        const text = (el.innerText || el.textContent).trim();
        if (text) categoryList.push(text);
    });
    
    // Scrape Bullet Points (Highlights/Features/Key Features)
    const bulletPoints = [];
    document.querySelectorAll('.about-product-bullets li, .about-item-list li, [data-testid="product-highlights"] li, [data-testid="long-description"] li, [data-testid="key-features"] li, .key-item-features li').forEach(el => {
        const text = (el.innerText || el.textContent).trim();
        if (text && !bulletPoints.includes(text)) bulletPoints.push(text);
    });

    const featureHeadings = document.querySelectorAll('h3, h2, span, font, p');
    featureHeadings.forEach(heading => {
        if (heading.innerText && (heading.innerText.toLowerCase().includes('key item features') || heading.innerText.toLowerCase().includes('key features') || heading.innerText.toLowerCase().includes('about this item'))) {
            const parent = heading.closest('section') || heading.parentElement;
            if (parent) {
                 parent.querySelectorAll('li').forEach(li => {
                     const text = (li.innerText || li.textContent).trim();
                     if (text && !bulletPoints.includes(text)) bulletPoints.push(text);
                 });
            }
        }
    });
    
    // Format Specifications
    const specifications = { ...details.rawSpecs }; // Copy all raw specs first
    
    // Ensure core fields are present if they were scraped directly but not in rawSpecs
    if (details.brand && !specifications.Brand && !specifications.brand) specifications.Brand = details.brand;
    if (details.model && !specifications.Model && !specifications.model) specifications.Model = details.model;
    if (details.color && !specifications.Color && !specifications.color) specifications.Color = details.color;
    if (details.dimensions && !specifications.Dimensions && !specifications.dimensions) specifications.Dimensions = details.dimensions;
    if (details.weight && !specifications.Weight && !specifications.weight) specifications.Weight = details.weight;

    return {
        title: title,
        productTitle: title, // Panel supports both
        brand: details.brand,
        category: categoryList.join(' > '),
        description: details.description,
        features: bulletPoints,
        bulletPoints: bulletPoints, // Panel supports both
        specifications: specifications,
        url: window.location.href
    };
};

// Listen for messages from popup or panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractImages') {
        extractor.extractAllImages().then(images => {
            sendResponse({ success: true, images: images });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
    
    if (request.action === 'SCRAPE_PRODUCT_DATA' || request.action === 'SCRAPE_COMPLETE_PRODUCT') {
        console.log(`[Walmart Injector] Received ${request.action} request`);
        try {
            const productData = scrapeCompleteProductData();
            
            // Store for caching
            chrome.storage.local.set({
                completeProductData: productData,
                currentProduct: productData,
                lastScraped: Date.now()
            });

            sendResponse({
                success: true,
                data: productData
            });
        } catch (error) {
            console.error('[Walmart Injector] Error scraping product data:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }
    
    if (request.action === 'GENERATE_AI_TITLES') {
        console.log('[Walmart Injector] Received GENERATE_AI_TITLES request');
        const generateBtn = document.getElementById('generate-ai-titles-btn');
        if (generateBtn) {
            generateBtn.click();
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: 'UI Button not found' });
        }
        return true;
    }
});

// Scrapes the main product title and displays it in the panel with retry/polling for dynamic content
const scrapeAndDisplayInitialTitle = () => {
    const titleSelectors = [
        'h1[itemprop="name"]',
        '.prod-ProductTitle',
        '[data-testid="product-title"]',
        'h1.prod-Title',
        '.product-title h1',
        'h1[data-automation-id="product-title"]',
        '[class*="ProductTitle"]',
        '.heading_title h1'
    ];
    
    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = 300;
    
    const tryGetTitle = () => {
        attempts++;
        console.log(`🔍 Attempting to scrape title (attempt ${attempts}/${maxAttempts})...`);
        
        let titleElement = null;
        for (const selector of titleSelectors) {
            titleElement = document.querySelector(selector);
            if (titleElement) {
                console.log(`✅ Found title element with selector: ${selector}`);
                break;
            }
        }
        
        let originalTitle = '';
        
        if (titleElement) {
            originalTitle = titleElement.innerText?.trim() || titleElement.textContent?.trim() || '';
        }
        
        if (!originalTitle && attempts < maxAttempts) {
            console.log(`⏳ Title not found yet, retrying in ${pollInterval}ms...`);
            setTimeout(tryGetTitle, pollInterval);
            return;
        }
        
        if (!originalTitle) {
            console.log('🔄 Using document.title as fallback...');
            originalTitle = document.title || '';
            originalTitle = originalTitle.replace(/\s*[-|]\s*Walmart\.com.*$/i, '').trim();
            originalTitle = originalTitle.replace(/^Walmart\.com\s*[-|]\s*/i, '').trim();
            
            if (!originalTitle) {
                const ogTitle = document.querySelector('meta[property="og:title"]');
                if (ogTitle) {
                    originalTitle = ogTitle.getAttribute('content') || '';
                    console.log('✅ Found title from og:title meta tag');
                }
            }
        }
        
        if (!originalTitle) {
            originalTitle = 'Product Title Not Found';
            console.warn('⚠️ Could not find product title, using placeholder');
        }
        
        console.log('✅ Final title:', originalTitle);
        
        // SINGLE TITLE DISPLAY UPDATE
        const titleDisplay = document.getElementById('ai-generated-title');
        const titleCounter = document.getElementById('ai-title-counter');

        if (titleDisplay && originalTitle) {
            titleDisplay.innerText = originalTitle;
            titleDisplay.classList.add('has-title');

            if (titleCounter) {
                titleCounter.textContent = originalTitle.length + ' characters';
            }

            // Sync with storage for the rest of the flow
            if (chrome && chrome.storage) {
                chrome.storage.local.set({ selectedEbayTitle: originalTitle });
            }
        } else {
            // Legacy fallback just in case
            const titleListContainer = document.getElementById('snipe-title-list');
            if (titleListContainer) {
                const titleData = { rank: 1, type: 'Filtered', title: originalTitle, charCount: originalTitle.length };
                titleListContainer.innerHTML = createTitleRow(titleData, true);
            }
        }
    };
    
    tryGetTitle();
};

// Applies a watermark to an image using the Canvas API.
const applyWatermark = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const watermark = new Image();
    const sourceImage = new Image();
    sourceImage.crossOrigin = "Anonymous";
    watermark.src = chrome.runtime.getURL('assets/watermark.png');
    sourceImage.src = imageUrl;

    Promise.all([new Promise(r => watermark.onload=r), new Promise(r => sourceImage.onload=r)]).then(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = sourceImage.naturalWidth;
        canvas.height = sourceImage.naturalHeight;
        ctx.drawImage(sourceImage, 0, 0);
        ctx.globalAlpha = 1.0; 
        const padding = 20;
        const watermarkWidth = canvas.width / 4;
        const watermarkHeight = (watermark.naturalHeight / watermark.naturalWidth) * watermarkWidth;
        const x = canvas.width - watermarkWidth - padding;
        const y = canvas.height - watermarkHeight - padding;
        ctx.drawImage(watermark, x, y, watermarkWidth, watermarkHeight);
        ctx.globalAlpha = 1.0;
        resolve(canvas.toDataURL('image/jpeg'));
    }).catch(reject);
  });
};

// Scrape all high-quality images using the comprehensive extractor
const scrapeAndDisplayImages = async () => {
    const galleryContainer = document.getElementById('snipe-image-gallery');
    if (!galleryContainer) return;
    
    console.log('Starting comprehensive Walmart image extraction...');
    
    const optiListBtn = document.getElementById('opti-list-btn');
    const downloadBtn = document.getElementById('download-images-btn');
    const refreshBtn = document.getElementById('refresh-images-btn');
    
    if (optiListBtn) {
        optiListBtn.disabled = true;
        optiListBtn.textContent = 'Processing Images...';
    }
    if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Processing Images...';
    }
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Processing Images...';
    }
    
    // Inject futuristic sci-fi animation styles
    if (!document.getElementById('sellersuit-scifi-styles')) {
        const scifiStyles = document.createElement('style');
        scifiStyles.id = 'sellersuit-scifi-styles';
        scifiStyles.textContent = `
            @keyframes holographicScan {
                0% { background-position: 0% 0%; }
                100% { background-position: 0% 100%; }
            }
            @keyframes imageFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .scifi-image-container {
                border-radius: 4px;
                opacity: 0;
                animation: imageFadeIn 0.4s ease-out forwards;
            }
            .scifi-loading-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 30px;
                background: linear-gradient(135deg, rgba(0,20,40,0.95) 0%, rgba(0,40,80,0.9) 100%);
                border: 2px solid rgba(0, 255, 255, 0.5);
                border-radius: 8px;
                animation: neonPulse 1.5s ease-in-out infinite;
                position: relative;
                overflow: hidden;
            }
            .scifi-loading-container::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: conic-gradient(from 0deg, transparent, rgba(0, 255, 255, 0.1), transparent 30%);
                animation: spin 3s linear infinite;
            }
            @keyframes spin {
                100% { transform: rotate(360deg); }
            }
            .scifi-loading-text {
                font-family: 'Courier New', monospace;
                font-size: 13px;
                color: #00ffff;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.4);
                letter-spacing: 2px;
                text-transform: uppercase;
                z-index: 2;
            }
            .scifi-progress-bar {
                width: 200px;
                height: 4px;
                background: rgba(0, 255, 255, 0.2);
                border-radius: 2px;
                margin-top: 15px;
                overflow: hidden;
                z-index: 2;
            }
            .scifi-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #00ffff, #00ff88, #00ffff);
                background-size: 200% 100%;
                animation: holographicScan 1s linear infinite;
                box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
            }
            .scifi-hex-grid {
                position: absolute;
                inset: 0;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%2300ffff' fill-opacity='0.05'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                pointer-events: none;
                z-index: 1;
            }
        `;
        document.head.appendChild(scifiStyles);
    }

    // Add futuristic loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'scifi-loading-container';
    loadingIndicator.id = 'image-loading-indicator';
    loadingIndicator.innerHTML = `
        <div class="scifi-hex-grid"></div>
        <div class="scifi-loading-text">⟨ SCANNING PRODUCT DATA ⟩</div>
        <div class="scifi-progress-bar">
            <div class="scifi-progress-fill" style="width: 100%;"></div>
        </div>
    `;
    galleryContainer.appendChild(loadingIndicator);
    
    try {
        const allImages = await extractor.extractAllImages();
    
        const existingLoadingIndicator = document.getElementById('image-loading-indicator');
        if (existingLoadingIndicator) {
            existingLoadingIndicator.remove();
        }
    
        if (allImages.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.textContent = 'No high-quality product images found. Please check if this is a valid Walmart product page.';
            placeholder.style.padding = '20px';
            placeholder.style.textAlign = 'center';
            placeholder.style.color = '#666';
            galleryContainer.appendChild(placeholder);
            return;
        }
    
        console.log(`Processing ${allImages.length} high-quality images with progressive rendering`);

        // Use performant ImageRenderer if available
        if (typeof ImageRenderer !== 'undefined') {
            await ImageRenderer.renderProcessedImages(galleryContainer, allImages, {
                processImage: async (url, index) => {
                    return await processImageTo1600x1600NoWatermark(url);
                },
                onDelete: (index, container, url) => {
                    deleteImageFromStorage(index, container, url);
                },
                onEdit: (index, url) => {
                    window.__SNIPE_OPEN_IMAGE_EDITOR__?.(url, index);
                },
                getMetadata: (imageInfo, index) => {
                    const sizeKB = imageInfo.size ? Math.round(parseInt(imageInfo.size) / 1024) + 'KB' : 'Unknown size';
                    return `Image ${index + 1} | 1600x1600 | ${sizeKB}`;
                },
                onProgress: (current, total) => {
                    console.log(`[Progressive] Rendered ${current}/${total} images`);
                }
            });

            console.log(`Successfully processed ${allImages.length} high-quality images with progressive rendering`);
        } else {
            // Fallback: Progressive batch rendering without ImageRenderer module
            console.log('[Fallback] Using vanilla progressive rendering');

            const BATCH_SIZE = 2;
            const BATCH_DELAY = 50;

            for (let batchStart = 0; batchStart < allImages.length; batchStart += BATCH_SIZE) {
                const batchEnd = Math.min(batchStart + BATCH_SIZE, allImages.length);

                // Process batch
                const batchPromises = [];
                for (let i = batchStart; i < batchEnd; i++) {
                    batchPromises.push((async () => {
                        const imageInfo = allImages[i];
                        try {
                            const processedImageUrl = await processImageTo1600x1600NoWatermark(imageInfo.url);
                            return { imageInfo, processedImageUrl, index: i };
                        } catch (error) {
                            console.error(`Failed to process image ${i + 1}:`, error);
                            return null;
                        }
                    })());
                }

                const results = await Promise.all(batchPromises);

                // Create DOM fragment for batch
                const fragment = document.createDocumentFragment();

                for (const result of results) {
                    if (!result) continue;
                    const { imageInfo, processedImageUrl, index: i } = result;

                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'product-image-container scifi-image-container';
                    imgContainer.style.cssText = 'position:relative;display:inline-block;margin:5px;vertical-align:top;opacity:0;transform:translateY(8px);transition:opacity 0.3s ease, transform 0.3s ease;will-change:opacity,transform;contain:layout paint;';
                    imgContainer.style.transitionDelay = `${(i - batchStart) * 80}ms`;
                    imgContainer.setAttribute('data-image-index', i);

                    const img = document.createElement('img');
                    img.src = processedImageUrl;
                    img.className = 'product-image-1600';
                    img.alt = imageInfo.alt || `Product image ${i + 1}`;
                    img.title = `Product Image ${i + 1} - 1600x1600px`;
                    img.loading = 'lazy';
                    img.decoding = 'async';

                    // Create overlay container for buttons (hover-only visibility)
                    const overlay = document.createElement('div');
                    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 0.15s ease;';
                    imgContainer.addEventListener('mouseenter', () => { overlay.style.opacity = '1'; overlay.style.pointerEvents = 'auto'; });
                    imgContainer.addEventListener('mouseleave', () => { overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; });

                    // Delete button
                    const deleteButton = document.createElement('button');
                    deleteButton.innerHTML = '×';
                    deleteButton.className = 'image-delete-btn';
                    deleteButton.style.cssText = 'position:absolute;top:5px;right:5px;width:24px;height:24px;background:rgba(239,68,68,0.9);color:white;border:none;border-radius:50%;cursor:pointer;font-size:16px;font-weight:bold;display:flex;align-items:center;justify-content:center;z-index:10;transition:background 0.15s ease,transform 0.15s ease;';
                    deleteButton.addEventListener('mouseenter', () => { deleteButton.style.background = 'rgba(220,38,38,1)'; deleteButton.style.transform = 'scale(1.1)'; });
                    deleteButton.addEventListener('mouseleave', () => { deleteButton.style.background = 'rgba(239,68,68,0.9)'; deleteButton.style.transform = 'scale(1)'; });
                    deleteButton.addEventListener('click', (e) => { e.stopPropagation(); deleteImageFromStorage(i, imgContainer, processedImageUrl); });
                    overlay.appendChild(deleteButton);

                    // Edit button
                    const editBtn = document.createElement('button');
                    editBtn.textContent = '✎';
                    editBtn.className = 'image-edit-btn';
                    editBtn.style.cssText = 'position:absolute;top:5px;left:5px;width:24px;height:24px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:4px;cursor:pointer;z-index:10;transition:background 0.15s ease;';
                    editBtn.addEventListener('click', (e) => { e.stopPropagation(); window.__SNIPE_OPEN_IMAGE_EDITOR__?.(img.src, i); });
                    overlay.appendChild(editBtn);

                    // Metadata overlay
                    const metadataOverlay = document.createElement('div');
                    metadataOverlay.className = 'product-image-metadata';
                    metadataOverlay.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.75);color:white;padding:4px;font-size:10px;text-align:center;';
                    metadataOverlay.textContent = `Image ${i + 1} | 1600x1600 | ${imageInfo.size ? Math.round(parseInt(imageInfo.size) / 1024) + 'KB' : 'Unknown size'}`;

                    imgContainer.appendChild(img);
                    imgContainer.appendChild(overlay);
                    imgContainer.appendChild(metadataOverlay);
                    fragment.appendChild(imgContainer);
                }

                // Append batch to DOM
                galleryContainer.appendChild(fragment);

                // Trigger fade-in after paint
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        for (const result of results) {
                            if (!result) continue;
                            const container = galleryContainer.querySelector(`[data-image-index="${result.index}"]`);
                            if (container) {
                                container.style.opacity = '1';
                                container.style.transform = 'translateY(0)';
                            }
                        }
                    });
                });

                // Yield to browser between batches
                if (batchStart + BATCH_SIZE < allImages.length) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                }
            }

            console.log(`Successfully processed ${allImages.length} high-quality images`);
        }

        if (optiListBtn) {
            optiListBtn.disabled = false;
            optiListBtn.textContent = 'Opti-List';
        }
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Download All Images';
        }
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'Refresh Images';
        }
        
    } catch (error) {
        console.error('Error in comprehensive image extraction:', error);
        
        const existingLoadingIndicator = document.getElementById('image-loading-indicator');
        if (existingLoadingIndicator) {
            existingLoadingIndicator.remove();
        }
        
        if (optiListBtn) {
            optiListBtn.disabled = false;
            optiListBtn.textContent = 'Opti-List';
        }
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Download All Images';
        }
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'Refresh Images';
        }
        
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Error extracting images. Please try refreshing the page.';
        errorMessage.style.padding = '20px';
        errorMessage.style.textAlign = 'center';
        errorMessage.style.color = '#ff0000';
        galleryContainer.appendChild(errorMessage);
    }
};


// Process image to 1600x1600 with proper aspect ratio but no watermark
const processImageTo1600x1600NoWatermark = (imageUrl) => {
    return new Promise((resolve, reject) => {
        const sourceImage = new Image();
        sourceImage.crossOrigin = "Anonymous";
        sourceImage.src = imageUrl;

        new Promise(r => sourceImage.onload = r).then(() => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 1600;
            canvas.height = 1600;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 1600, 1600);
            
            const sourceAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
            const targetAspect = 1600 / 1600;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (sourceAspect > targetAspect) {
                drawWidth = 1600;
                drawHeight = 1600 / sourceAspect;
                drawX = 0;
                drawY = (1600 - drawHeight) / 2;
            } else {
                drawHeight = 1600;
                drawWidth = 1600 * sourceAspect;
                drawX = (1600 - drawWidth) / 2;
                drawY = 0;
            }
            
            ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
            
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        }).catch(reject);
    });
};

// Process image to 1600x1600 with proper aspect ratio and watermark
const processImageTo1600x1600 = (imageUrl) => {
    return new Promise((resolve, reject) => {
        console.log(`🔍 processImageTo1600x1600: Processing image with watermark - ${imageUrl.substring(0, 100)}...`);
        
        const watermark = new Image();
        const sourceImage = new Image();
        
        sourceImage.crossOrigin = "Anonymous";
        watermark.src = chrome.runtime.getURL('assets/watermark.png');
        sourceImage.src = imageUrl;

        Promise.all([
            new Promise(r => watermark.onload = r), 
            new Promise(r => sourceImage.onload = r)
        ]).then(() => {
            console.log(`✅ processImageTo1600x1600: Both images loaded successfully`);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 1600;
            canvas.height = 1600;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 1600, 1600);
            
            const sourceAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
            const targetAspect = 1600 / 1600;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (sourceAspect > targetAspect) {
                drawWidth = 1600;
                drawHeight = 1600 / sourceAspect;
                drawX = 0;
                drawY = (1600 - drawHeight) / 2;
            } else {
                drawHeight = 1600;
                drawWidth = 1600 * sourceAspect;
                drawX = (1600 - drawWidth) / 2;
                drawY = 0;
            }
            
            ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
            
            ctx.globalAlpha = 1.0;
            const padding = 20;
            const watermarkWidth = 1600 / 4;
            const watermarkHeight = (watermark.naturalHeight / watermark.naturalWidth) * watermarkWidth;
            const watermarkX = 1600 - watermarkWidth - padding;
            const watermarkY = 1600 - watermarkHeight - padding;
            ctx.drawImage(watermark, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
            ctx.globalAlpha = 1.0;
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            console.log(`✅ processImageTo1600x1600: Generated Data URL (${dataUrl.substring(0, 50)}...)`);
            resolve(dataUrl);
        }).catch(reject);
    });
};


// Store watermarked images in chrome.storage.local
const storeWatermarkedImages = async () => {
    console.log('🔍 storeWatermarkedImages: Starting image storage process...');
    
    const galleryContainer = document.getElementById('snipe-image-gallery');
    if (!galleryContainer) {
        console.error('❌ storeWatermarkedImages: Gallery container not found');
        return;
    }
    
    console.log('✅ storeWatermarkedImages: Gallery container found');
    
    const images = galleryContainer.querySelectorAll('.product-image-1600');
    console.log(`🔍 storeWatermarkedImages: Found ${images.length} images in gallery`);
    
    const watermarkedDataUrls = [];
    
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        console.log(`🔍 storeWatermarkedImages: Processing image ${i + 1}/${images.length}`);
        console.log(`🔍 storeWatermarkedImages: Image src type: ${img.src ? (img.src.startsWith('data:image') ? 'Data URL' : 'URL') : 'No src'}`);
        
        if (img.src && img.src.startsWith('data:image')) {
            if (img.src.length > 10000) {
                watermarkedDataUrls.push(img.src);
                console.log(`✅ storeWatermarkedImages: Added scraped watermarked image ${i + 1} to storage array (${img.src.length} chars)`);
            } else {
                console.log(`⚠️ storeWatermarkedImages: Image ${i + 1} is too small (${img.src.length} chars) - may not be properly watermarked, skipping`);
            }
        } else {
            console.log(`⚠️ storeWatermarkedImages: Image ${i + 1} is not a Data URL, skipping`);
        }
    }
    
    console.log(`🔍 storeWatermarkedImages: Total Data URLs collected: ${watermarkedDataUrls.length}`);
    
    if (watermarkedDataUrls.length > 0) {
        try {
            await chrome.storage.local.set({ watermarkedImages: watermarkedDataUrls });
            console.log(`✅ storeWatermarkedImages: Successfully stored ${watermarkedDataUrls.length} watermarked 1600x1600 images in Chrome storage`);
            
            const verification = await chrome.storage.local.get(['watermarkedImages']);
            console.log(`🔍 storeWatermarkedImages: Storage verification - ${verification.watermarkedImages?.length || 0} images in storage`);
            
            if (verification.watermarkedImages && verification.watermarkedImages.length > 0) {
                console.log("🔍 storeWatermarkedImages: Verifying stored images...");
                verification.watermarkedImages.forEach((imageData, index) => {
                    if (imageData && imageData.startsWith('data:image')) {
                        console.log(`✅ storeWatermarkedImages: Image ${index + 1} is valid Data URL (${imageData.substring(0, 50)}...)`);
                    } else {
                        console.error(`❌ storeWatermarkedImages: Image ${index + 1} is not a valid Data URL`);
                    }
                });
            }
        } catch (error) {
            console.error('❌ storeWatermarkedImages: Failed to store images:', error);
        }
    } else {
        console.warn('⚠️ storeWatermarkedImages: No Data URLs found to store');
    }
};

// Delete specific image from storage and UI
const deleteImageFromStorage = async (imageIndex, imgContainer, imageUrl) => {
    try {
        console.log(`Deleting image ${imageIndex + 1} from storage...`);
        
        const result = await chrome.storage.local.get(['watermarkedImages']);
        const storedImages = result.watermarkedImages || [];
        
        if (storedImages.length > imageIndex) {
            storedImages.splice(imageIndex, 1);
            
            await chrome.storage.local.set({ watermarkedImages: storedImages });
            console.log(`Image ${imageIndex + 1} deleted from storage. ${storedImages.length} images remaining.`);
        }
        
        imgContainer.style.transition = 'all 0.3s ease';
        imgContainer.style.transform = 'scale(0)';
        imgContainer.style.opacity = '0';
        
        setTimeout(() => {
            imgContainer.remove();
            updateImageNumbers();
            console.log(`Image ${imageIndex + 1} removed from UI`);
        }, 300);
        
    } catch (error) {
        console.error('Error deleting image from storage:', error);
        alert('Failed to delete image. Please try again.');
    }
};

// Update image numbers after deletion
const updateImageNumbers = () => {
    const galleryContainer = document.getElementById('snipe-image-gallery');
    if (!galleryContainer) return;
    
    const imageContainers = galleryContainer.querySelectorAll('.product-image-container');
    imageContainers.forEach((container, index) => {
        const metadataOverlay = container.querySelector('.product-image-metadata');
        if (metadataOverlay) {
            const currentText = metadataOverlay.textContent;
            const newText = currentText.replace(/Image \d+/, `Image ${index + 1}`);
            metadataOverlay.textContent = newText;
        }
        
        container.setAttribute('data-image-index', index);
    });
    
    console.log(`Updated image numbers. ${imageContainers.length} images remaining.`);
};


// Generates simple, rule-based title variations with typewriter animation.
const generateTitleVariations = (originalTitle) => {
    const limitTitleLength = (title, maxLength = 80) => {
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength - 3) + '...';
    };
    
    const limitTitleWords = (title, maxWords = 8) => {
        const words = title.split(' ');
        if (words.length <= maxWords) return title;
        return words.slice(0, maxWords).join(' ');
    };
    
    const titles = [
        { rank: 2, type: 'Perfect Title', title: limitTitleLength(limitTitleWords(originalTitle) + ' For Sale'), charCount: limitTitleLength(limitTitleWords(originalTitle) + ' For Sale').length },
        { rank: 3, type: 'Custom', title: '', charCount: 0, isBlankRow: true }
    ];
    
    const titleListContainer = document.getElementById('snipe-title-list');
    const firstRow = titleListContainer.firstChild;
    titleListContainer.innerHTML = '';
    titleListContainer.appendChild(firstRow);
    
    titles.forEach((t, index) => {
        const titleRow = createTitleRowWithAnimation(t, index);
        titleListContainer.appendChild(titleRow);
    });
};

// Adds event listeners to the buttons inside our injected panel.
const addEventListenersToPanel = () => {
    
    // Snipe Title button
    const snipeTitleBtn = document.getElementById('snipe-title-btn');
    if (snipeTitleBtn) {
        snipeTitleBtn.addEventListener('click', async () => {
            // Auto-trigger AI title generation by clicking the Generate AI Titles button
            const generateAITitlesBtn = document.getElementById('generate-ai-titles-btn');
            if (generateAITitlesBtn) {
                generateAITitlesBtn.click();
            } else {
                console.warn('⚠️ Generate AI Titles button not found');
            }
        });
        console.log('✅ Snipe Title button listener added');
    }

    // Generate AI Titles button
    const generateAITitlesBtn = document.getElementById('generate-ai-titles-btn');
    if (generateAITitlesBtn) {
        generateAITitlesBtn.addEventListener('click', async () => {
            const completeData = scrapeCompleteProductData();

            if (!completeData.title) {
                console.error('No product title found on page');
                return;
            }

            const originalContent = generateAITitlesBtn.innerHTML;
            generateAITitlesBtn.disabled = true;
            generateAITitlesBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-animation">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Generating...
            `;

            try {
                const bgResp = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        {
                            action: 'GENERATE_AI_TITLES',
                            productData: completeData
                        },
                        (response) => {
                            const err = chrome.runtime.lastError;
                            if (err) return reject(new Error(err.message || 'Background message failed'));
                            resolve(response);
                        }
                    );
                });

                if (!bgResp?.success) {
                    throw new Error(bgResp?.error || 'Failed to generate titles');
                }

                if (bgResp.titles && bgResp.titles.length > 0) {
                    const titles = bgResp.titles;
                    const titlesToSave = titles.map((t, i) => typeof t === 'object' ? t.title : t);
                    await chrome.storage.local.set({ savedTitles: titlesToSave, selectedEbayTitle: titlesToSave[0] });

                    if (typeof UIHelper !== 'undefined' && typeof UIHelper.showTitleSelectionPopup === 'function') {
                        UIHelper.showTitleSelectionPopup(titles);
                    } else {
                        // Fallback logic
                        const titleDisplay = document.getElementById('ai-generated-title');
                        const titleCounter = document.getElementById('ai-title-counter');
                        if (titleDisplay) {
                            titleDisplay.innerText = titlesToSave[0];
                            titleDisplay.classList.add('has-title');
                            if (titleCounter) titleCounter.textContent = titlesToSave[0].length + ' characters';
                        }
                    }
                } else {
                    throw new Error('No titles returned');
                }
            } catch (error) {
                console.error('❌ Error generating AI titles:', error);
            } finally {
                generateAITitlesBtn.disabled = false;
                generateAITitlesBtn.innerHTML = originalContent;
            }
        });
        console.log('✅ Generate AI Titles button listener added');
    }

    // Generate AI Description button
    const generateDescriptionBtn = document.getElementById('generate-description-btn');
    const descriptionPreviewEl = document.getElementById('description-preview');
    if (generateDescriptionBtn) {
        generateDescriptionBtn.addEventListener('click', async () => {
            const originalContent = generateDescriptionBtn.innerHTML;
            generateDescriptionBtn.disabled = true;

            if (descriptionPreviewEl) {
                descriptionPreviewEl.innerHTML = `
                    <div class="description-placeholder">
                        <div class="spinner-small"></div>
                        <span>Scraping product data & generating description...</span>
                    </div>
                `;
            }

            try {
                const productData = scrapeCompleteProductData();

                if (!productData?.title) {
                    throw new Error('No product title found.');
                }

                const bgResp = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        { action: 'GENERATE_DESCRIPTION', productData },
                        (response) => {
                            const err = chrome.runtime.lastError;
                            if (err) return reject(new Error(err.message || 'Background message failed'));
                            resolve(response);
                        }
                    );
                });

                if (!bgResp?.success) throw new Error(bgResp?.error || 'Failed to generate description');
                if (!bgResp?.description) throw new Error('No description returned');

                if (descriptionPreviewEl) {
                    descriptionPreviewEl.innerHTML = bgResp.description;
                }
                
                await chrome.storage.local.set({ 
                    generatedDescription: bgResp.description,
                    selectedEbayDescription: bgResp.description
                });

            } catch (error) {
                console.error('❌ Error generating AI description:', error);
                if (descriptionPreviewEl) {
                    descriptionPreviewEl.innerHTML = `
                        <div class="description-placeholder" style="color: #dc2626;">
                            <span>Error generating description: ${error.message}</span>
                        </div>
                    `;
                }
            } finally {
                generateDescriptionBtn.disabled = false;
                generateDescriptionBtn.innerHTML = originalContent;
            }
        });
        console.log('✅ Generate AI Description button listener added');
    }

    // Opti-List button
    const optiListBtn = document.getElementById('opti-list-btn');
    if (optiListBtn) {
        optiListBtn.addEventListener('click', async () => {
            const selectedRow = document.querySelector('#snipe-title-list .title-row.selected');
            const aiTitleDisplay = document.getElementById('ai-generated-title');
            const hasAiTitle = aiTitleDisplay && (aiTitleDisplay.classList.contains('has-title') || aiTitleDisplay.innerText.trim().length > 0 && aiTitleDisplay.innerText !== 'Click "Generate" to create optimized eBay title...');

            if (selectedRow || hasAiTitle) {
                const btn = document.getElementById('opti-list-btn');
                btn.disabled = true;
                btn.textContent = 'Processing...';

                // 🛠️ AUTO-SYNC: Ensure storage has fresh data with the NEW title
                try {
                    if (typeof getProductDataForExport === 'function') {
                        const freshData = await getProductDataForExport();

                        // 🔄 Overwrite with AI Title if valid
                        const aiTitleDisplay = document.getElementById('ai-generated-title');
                        const isDefaultText = (text) => text.includes('Click "Generate"');

                        if (aiTitleDisplay && !isDefaultText(aiTitleDisplay.innerText)) {
                            freshData.title = aiTitleDisplay.innerText.trim();
                            console.log('🔄 Opti-List: Auto-updated export data with AI Title:', freshData.title);
                        }

                        // 💾 Save to storage to satisfy legacy checks
                        await chrome.storage.local.set({ copyButtonData: freshData });
                        console.log('✅ Opti-List: Auto-saved fresh data to storage');
                    }
                } catch (syncError) {
                    console.error('⚠️ Opti-List: Auto-sync failed, using existing storage', syncError);
                }

                try {
                    console.log('═══════════════════════════════════════════════════════');
                    console.log('📋 OPTI-LIST: RETRIEVING SAVED COPY BUTTON DATA');
                    console.log('═══════════════════════════════════════════════════════');
                    
                    const storageResult = await chrome.storage.local.get('copyButtonData');
                    const exportData = storageResult.copyButtonData;
                    
                    if (!exportData) {
                        console.warn('⚠️ WARNING: No saved Copy button data found!');
                        alert('⚠️ No saved data found!\n\nPlease click the Copy button first to save the product data.');
                        btn.disabled = false;
                        btn.textContent = 'Opti-List';
                        return;
                    }
                    
                    console.log('═══════════════════════════════════════════════════════');
                    console.log('📊 RETRIEVED COPY BUTTON DATA FROM STORAGE:');
                    console.log('   Timestamp:', exportData.timestamp);
                    console.log('   Title:', exportData.title);
                    console.log('   SKU:', exportData.sku);
                    console.log('   Sell Price (calculated):', exportData.sellPrice);
                    console.log('   Walmart Price:', exportData.walmartPrice || exportData.amazonPrice);
                    console.log('   Walmart Link:', exportData.walmartLink || exportData.amazonLink);
                    console.log('═══════════════════════════════════════════════════════');
                    
                    if (!exportData.title || exportData.title === 'No title selected') {
                        alert('⚠️ No title in saved data!\n\nPlease click Copy button again after selecting a title.');
                        btn.disabled = false;
                        btn.textContent = 'Opti-List';
                        return;
                    }
                    
                    if (!exportData.sku || exportData.sku === 'No SKU') {
                        alert('⚠️ No SKU in saved data!\n\nPlease click Copy button again after generating a SKU.');
                        btn.disabled = false;
                        btn.textContent = 'Opti-List';
                        return;
                    }
                    
                    if (exportData.sellPrice === 'No price' || !exportData.sellPrice) {
                        alert('⚠️ No calculated price in saved data!\n\nPlease click Copy button again after calculating the price.');
                        btn.disabled = false;
                        btn.textContent = 'Opti-List';
                        return;
                    }
                    
                    const selectedTitle = exportData.title;
                    const sku = exportData.sku;
                    const price = exportData.sellPrice;
                    
                    const productDetails = scrapeProductDetails();
                    await storeWatermarkedImages();

                    console.log('═══════════════════════════════════════════════════════');
                    console.log('🔍 Verifying image storage before navigation...');
                    const storageVerification = await chrome.storage.local.get(['watermarkedImages']);
                    const storedImages = storageVerification.watermarkedImages || [];
                    console.log(`📸 Storage verification: Found ${storedImages.length} images in storage`);
                    
                    if (storedImages.length === 0) {
                        console.error('❌ CRITICAL: No images found in storage after storeWatermarkedImages()!');
                        btn.disabled = false;
                        btn.textContent = '❌ No Images - Try Again';
                        alert('⚠️ Error: Images were not stored properly. Please try again.');
                        return;
                    } else {
                        console.log('✅ Image storage verification passed - proceeding to eBay');
                    }

                    const listingData = {
                        productTitle: selectedTitle,
                        ebayTitle: selectedTitle,
                        ebaySku: sku,
                        ebayPrice: price,
                        ...productDetails
                    };

                    await chrome.storage.local.set(listingData);
                    console.log('✅ All listing data saved:', listingData);
                    
                    const finalPrice = exportData.sellPrice === 'No price' ? '0' : String(exportData.sellPrice);
                    const walmartPrice = (exportData.walmartPrice || exportData.amazonPrice) === 'No price found' ? '0' : String(exportData.walmartPrice || exportData.amazonPrice);
                    
                    const messageData = {
                        action: "START_OPTILIST", 
                        title: exportData.title,
                        sku: exportData.sku,
                        finalPrice: finalPrice,
                        amazonPrice: walmartPrice,
                        productURL: exportData.walmartLink || exportData.amazonLink,
                        asin: exportData.sku || exportData.itemId || '',
                        mainImage: storedImages[0] || exportData.walmartImage || exportData.image || exportData.mainImage || document.querySelector('img[data-testid="hero-image"]')?.src || document.querySelector('img[loading="eager"]')?.src || ''
                    };

                    try {
                        chrome.runtime.sendMessage(messageData, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error('❌ ERROR: Message failed to send to background.js');
                                btn.disabled = false;
                                btn.textContent = '❌ Error - Try Again';
                                alert('Failed to send data to Google Sheets. Error: ' + chrome.runtime.lastError.message);
                                return;
                            }
                            
                            if (response && response.success) {
                                console.log('✅ SUCCESS: Data sent to Google Sheets via background.js');
                                btn.textContent = '✅ Sent to Sheets!';
                                setTimeout(() => {
                                    btn.disabled = false;
                                    btn.textContent = 'Opti-List';
                                }, 3000);
                            } else if (response && response.error) {
                                console.error('❌ ERROR FROM BACKGROUND.JS:', response.error);
                                btn.textContent = '⚠️ Error: ' + response.error;
                                btn.disabled = false;
                                alert('Failed to send data to Google Sheets: ' + response.error);
                            } else {
                                btn.textContent = '✅ Sent (no response)';
                                setTimeout(() => {
                                    btn.disabled = false;
                                    btn.textContent = 'Opti-List';
                                }, 2000);
                            }
                        });
                        
                        console.log('✅ Message sent to background.js, waiting for response...');
                    } catch (sendError) {
                        console.error('❌ EXCEPTION: Failed to send message:', sendError);
                        btn.disabled = false;
                        btn.textContent = '❌ Error - Try Again';
                        alert('Failed to send data. Error: ' + sendError.message);
                    }
                } catch (error) {
                    console.error('Error in Opti-List process:', error);
                    btn.disabled = false;
                    btn.textContent = 'Opti-List';
                }
            } else {
                alert("Please select a title first.");
            }
        });
        console.log('✅ Opti-List button listener added');
    }

    // Copy button
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                console.log('═══════════════════════════════════════════════════════');
                console.log('📋 COPY BUTTON CLICKED - STARTING DATA COLLECTION');
                console.log('═══════════════════════════════════════════════════════');
                
                const productData = await getProductDataForExport();
                
                console.log('═══════════════════════════════════════════════════════');
                console.log('📊 PRODUCT DATA COLLECTED:');
                console.log('   Timestamp:', productData.timestamp);
                console.log('   Title:', productData.title);
                console.log('   SKU:', productData.sku);
                console.log('   Sell Price (calculated):', productData.sellPrice);
                console.log('   Walmart Price:', productData.walmartPrice);
                console.log('   Walmart Link:', productData.walmartLink);
                console.log('═══════════════════════════════════════════════════════');
                
                if (productData.sellPrice === 'No price' || !productData.sellPrice) {
                    console.warn('⚠️ WARNING: No calculated price found!');
                    alert('⚠️ No calculated price found!\n\nPlease calculate the price first using the calculator (💰 Calculator or 💲 Quick Calculate button).');
                    return;
                }
                
                const tabSeparatedData = formatDataForCopy(productData);
                console.log('📋 Tab-separated data to copy:');
                console.log(tabSeparatedData);
                
                await navigator.clipboard.writeText(tabSeparatedData);
                
                await chrome.storage.local.set({ 
                    copyButtonData: productData 
                });
                console.log('💾 Copy button data saved to storage for Opti-List');
                
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅ Copied!';
                copyBtn.style.background = '#28a745';
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '';
                }, 2000);
                
                console.log('✅ Data successfully copied to clipboard and saved!');
            } catch (error) {
                console.error('❌ ERROR COPYING DATA:', error);
                alert('Failed to copy data to clipboard. Please check the console for details.');
            }
        });
        console.log('✅ Copy button listener added');
    }

    // Title selection
    const titleList = document.getElementById('snipe-title-list');
    if (titleList) {
        titleList.addEventListener('click', (e) => {
            const row = e.target.closest('.title-row');
            if (row) {
                document.querySelectorAll('#snipe-title-list .title-row').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
            }
        });
        console.log('✅ Title selection listener added');
    }

    // Download images button
    const downloadBtn = document.getElementById('download-images-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            downloadAllImages();
            console.log('✅ Download images button clicked');
        });
        console.log('✅ Download images button listener added');
    }

    // Refresh images button
    const refreshBtn = document.getElementById('refresh-images-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const galleryContainer = document.getElementById('snipe-image-gallery');
            if (galleryContainer) {
                galleryContainer.innerHTML = '';
            }
            scrapeAndDisplayImages();
            console.log('✅ Refresh images button clicked');
        });
        console.log('✅ Refresh images button listener added');
    }

    // Description button
    const descriptionBtn = document.getElementById('new-description-btn');
    if (descriptionBtn) {
        descriptionBtn.addEventListener('click', () => {
            const productURL = window.location.href;
            const targetWebsiteURL = 'https://gemini.google.com/gem/6dced44c5365?usp=sharing'; 

            chrome.runtime.sendMessage({
                action: 'openNewTabForDescription',
                targetURL: targetWebsiteURL,
                walmartURL: productURL
            });
            console.log('✅ Description button clicked');
        });
        console.log('✅ Description button listener added');
    }

    // Product Details button
    const productDetailsBtn = document.getElementById('product-details-btn');
    if (productDetailsBtn) {
        productDetailsBtn.addEventListener('click', () => {
            const titleSelectors = [
                'h1[itemprop="name"]',
                '.prod-ProductTitle',
                '[data-testid="product-title"]',
                'h1.prod-Title',
                '.product-title h1',
                'h1[data-automation-id="product-title"]'
            ];
            
            let productTitle = 'Product Title Not Found';
            for (const selector of titleSelectors) {
                const titleElement = document.querySelector(selector);
                if (titleElement) {
                    productTitle = titleElement.innerText?.trim() || productTitle;
                    break;
                }
            }
            
            const targetWebsiteURL = 'https://gemini.google.com/gem/6dced44c5365?usp=sharing'; 

            chrome.runtime.sendMessage({
                action: 'openNewTabForProductDetails',
                targetURL: targetWebsiteURL,
                walmartTitle: productTitle
            });
            console.log('✅ Product Details button clicked - Title scraped:', productTitle);
        });
        console.log('✅ Product Details button listener added');
    }

    // SKU Generator button
    const generateSkuBtn = document.getElementById('generate-sku-btn');
    if (generateSkuBtn) {
        generateSkuBtn.addEventListener('click', async () => {
            await generateSKU();
        });
        console.log('✅ SKU Generator button listener added');
    }
    
    loadSKUSettings();
    
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && (changes.selectedSKU || changes.autoSkuEnabled)) {
            console.log('🔄 SKU settings changed, reloading...');
            loadSKUSettings();
        }
    });
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "SKU_SETTINGS_UPDATED") {
            console.log('📨 SKU settings update received:', message.data);
            loadSKUSettings();
        }
    });

    // Calculator button
    const calculatorBtn = document.getElementById('calculator-btn');
    if (calculatorBtn) {
        calculatorBtn.addEventListener('click', () => {
            openCalculator();
            console.log('✅ Calculator button clicked');
        });
        console.log('✅ Calculator button listener added');
    }

    // Quick Calculate button
    const quickCalcBtn = document.getElementById('quick-calc-btn');
    if (quickCalcBtn) {
        quickCalcBtn.addEventListener('click', () => {
            quickCalculate();
            console.log('✅ Quick Calculate button clicked');
        });
        console.log('✅ Quick Calculate button listener added');
    }

    // Input validation for price and SKU
    const priceInput = document.querySelector('.price-field input');
    const skuInput = document.getElementById('sku-input');
    
    if (priceInput) {
        priceInput.addEventListener('input', validatePriceInput);
        priceInput.addEventListener('blur', validatePriceInput);
    }
    
    if (skuInput) {
        skuInput.addEventListener('focus', () => {
            if (!skuInput.value) {
                skuInput.style.backgroundColor = '#fff3cd';
                skuInput.style.borderColor = '#ffc107';
            }
        });
    }

    window.checkStoredSku = () => {
        chrome.storage.local.get(['ebaySku'], (result) => {
            console.log('🔍 Checking stored SKU:', result);
            if (result.ebaySku) {
                console.log('✅ SKU found in storage:', result.ebaySku);
                alert(`SKU in storage: ${result.ebaySku}`);
            } else {
                console.log('❌ No SKU found in storage');
                alert('No SKU found in storage');
            }
        });
    };
    
    window.clearStoredSku = () => {
        chrome.storage.local.remove(['ebaySku'], () => {
            console.log('🧹 SKU cleared from storage');
            alert('SKU cleared from storage');
        });
    };
};

// Creates a title row with typewriter animation
const createTitleRowWithAnimation = (data, index) => {
    const row = document.createElement('div');
    row.className = 'title-row';
    row.setAttribute('data-title', data.title);
    
    if (data.isBlankRow) {
        row.innerHTML = `
            <div class="rank">${data.rank}</div>
            <div class="type">${data.type}</div>
            <div class="title-text" contenteditable="true" data-placeholder="Write your custom title here..."></div>
            <div class="char-count">0</div>
            <button class="action-btn">Use</button>
        `;
        
        const titleText = row.querySelector('.title-text');
        const charCount = row.querySelector('.char-count');
        
        const updatePlaceholder = () => {
            if (titleText.textContent.trim() === '') {
                titleText.classList.add('empty');
            } else {
                titleText.classList.remove('empty');
            }
        };
        
        const autoResize = () => {
            titleText.style.height = 'auto';
            
            const scrollHeight = titleText.scrollHeight;
            const maxHeight = 60;
            const minHeight = 24;
            
            const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
            titleText.style.height = newHeight + 'px';
            
            if (scrollHeight > maxHeight) {
                titleText.style.overflowY = 'auto';
            } else {
                titleText.style.overflowY = 'hidden';
            }
        };
        
        titleText.addEventListener('input', () => {
            const text = titleText.textContent.trim();
            charCount.textContent = text.length;
            row.setAttribute('data-title', text);
            updatePlaceholder();
            autoResize();
        });
        
        titleText.addEventListener('keyup', () => {
            const text = titleText.textContent.trim();
            charCount.textContent = text.length;
            row.setAttribute('data-title', text);
            updatePlaceholder();
            autoResize();
        });
        
        titleText.addEventListener('paste', (e) => {
            setTimeout(() => {
                const text = titleText.textContent.trim();
                charCount.textContent = text.length;
                row.setAttribute('data-title', text);
                updatePlaceholder();
                autoResize();
            }, 10);
        });
        
        titleText.addEventListener('focus', () => {
            row.classList.add('custom-title-focus');
            updatePlaceholder();
            autoResize();
        });
        
        titleText.addEventListener('blur', () => {
            row.classList.remove('custom-title-focus');
            updatePlaceholder();
            autoResize();
        });
        
        row.addEventListener('click', (e) => {
            if (e.target !== titleText && e.target !== titleText.parentNode) {
                titleText.focus();
            }
        });
        
        updatePlaceholder();
        autoResize();
        
        return row;
    }
    
    row.innerHTML = `
        <div class="rank">${data.rank}</div>
        <div class="type">${data.type}</div>
        <div class="title-text" contenteditable="true"></div>
        <div class="char-count">0</div>
        <button class="action-btn">Change</button>
    `;
    
    setTimeout(() => {
        typewriterAnimation(row.querySelector('.title-text'), data.title, row.querySelector('.char-count'), data.charCount);
    }, index * 50);
    
    return row;
};

// Typewriter animation function
const typewriterAnimation = (element, text, charCountElement, finalCount) => {
    let i = 0;
    const speed = 5;
    
    element.classList.add('typing');
    
    const typeInterval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            charCountElement.textContent = i + 1;
            i++;
        } else {
            clearInterval(typeInterval);
            
            element.classList.remove('typing');
            element.classList.add('typing-complete');
            
            setTimeout(() => {
                element.classList.remove('typing-complete');
            }, 1000);
        }
    }, speed);
};

// Helper function to create the HTML for a single title row.
const createTitleRow = (data, isSelected = false) => `<div class="title-row ${isSelected ? 'selected' : ''}" data-title="${data.title}"><div class="rank">${data.rank}</div><div class="type">${data.type}</div><div class="title-text" contenteditable="true">${data.title}</div><div class="char-count">${data.charCount}</div><button class="action-btn">Change</button></div>`;


// Download all scraped images
const downloadAllImages = () => {
    console.log('Starting download of all images...');
    
    const galleryContainer = document.getElementById('snipe-image-gallery');
    if (!galleryContainer) {
        console.error('Image gallery not found');
        return;
    }
    
    const images = galleryContainer.querySelectorAll('.product-image-1600');
    if (images.length === 0) {
        alert('No images found to download. Please scrape images first.');
        return;
    }
    
    console.log(`Found ${images.length} images to download`);
    
    if (typeof JSZip !== 'undefined') {
        downloadImagesAsZip(images);
    } else {
        downloadImagesIndividually(images);
    }
};

// Download images as individual files
const downloadImagesIndividually = (images) => {
    images.forEach((img, index) => {
        try {
            const link = document.createElement('a');
            link.download = `product-image-${index + 1}-1600x1600.jpg`;
            link.href = img.src;
            link.click();
            console.log(`Downloaded image ${index + 1}`);
        } catch (error) {
            console.error(`Failed to download image ${index + 1}:`, error);
        }
    });
    
    setTimeout(() => {
        console.log('All images download initiated');
    }, 100);
};

// Download images as a ZIP file (if JSZip is available)
const downloadImagesAsZip = (images) => {
    const zip = new JSZip();
    const folder = zip.folder("product-images");
    
    images.forEach((img, index) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const tempImg = new Image();
            
            tempImg.onload = () => {
                canvas.width = tempImg.width;
                canvas.height = tempImg.height;
                ctx.drawImage(tempImg, 0, 0);
                
                canvas.toBlob((blob) => {
                    folder.file(`product-image-${index + 1}-1600x1600.jpg`, blob);
                    
                    if (index === images.length - 1) {
                        zip.generateAsync({type: "blob"}).then((content) => {
                            const link = document.createElement('a');
                            link.download = 'product-images-1600x1600.zip';
                            link.href = URL.createObjectURL(content);
                            link.click();
                            console.log('ZIP file downloaded');
                        });
                    }
                }, 'image/jpeg', 0.9);
            };
            
            tempImg.src = img.src;
        } catch (error) {
            console.error(`Failed to add image ${index + 1} to ZIP:`, error);
        }
    });
};



// This function contains the original core logic of the extension for Walmart.
const initializeApp = () => {
    console.log('🚀 Initializing Walmart app...');
    console.log('🌐 Current URL:', window.location.href);
    console.log('🏷️ Page title:', document.title);
    
    // Check if we're on a Walmart page
    const isWalmartDomain = window.location.hostname.includes('walmart');
    console.log('🛒 Is Walmart domain:', isWalmartDomain);
    
    if (!isWalmartDomain) {
        console.log('❌ Not on Walmart domain, skipping initialization');
        return;
    }
    
    // Check for Walmart product page URL pattern (/ip/ path)
    const hasWalmartProductPath = window.location.pathname.includes('/ip/');
    console.log('📍 Has Walmart product path (/ip/):', hasWalmartProductPath);
    
    // Check og:type meta tag for product indication
    const ogTypeMeta = document.querySelector('meta[property="og:type"]');
    const ogType = ogTypeMeta?.getAttribute('content') || '';
    const isProductOgType = ogType.toLowerCase().includes('product');
    console.log('🏷️ og:type meta:', ogType, '| Is product:', isProductOgType);
    
    let attempts = 0;
    const maxAttempts = 50;
    
    const interval = setInterval(() => {
        attempts++;
        console.log(`🔍 Attempt ${attempts}/${maxAttempts} - Checking for Walmart product page...`);
        
        const existingButton = document.getElementById('initial-list-button');
        
        // Check for Walmart-specific product page indicators (no Amazon selectors)
        const walmartIndicators = {
            productUrlPath: hasWalmartProductPath,
            ogTypeProduct: isProductOgType,
            productTitle: !!document.querySelector('h1[itemprop="name"], .prod-ProductTitle, [data-testid="product-title"]'),
            productImage: !!document.querySelector('.prod-hero-image, [data-testid="hero-image"], .product-image-container'),
            priceElement: !!document.querySelector('[itemprop="price"], .price-characteristic, [data-testid="price"], .price-group'),
            addToCart: !!document.querySelector('[data-testid="add-to-cart-button"], button[data-automation-id="atc-button"]'),
            productDetails: !!document.querySelector('.specifications-table, [data-testid="product-specifications"]'),
            buyBox: !!document.querySelector('.prod-product-cta-add-to-cart, .add-to-cart-section'),
            itemId: !!document.querySelector('[data-item-id], [data-product-id]')
        };
        
        console.log('🔍 Walmart indicators found:', walmartIndicators);
        
        const isWalmartProductPage = Object.values(walmartIndicators).some(Boolean);
        
        if (isWalmartProductPage && !existingButton) {
            console.log('✅ Walmart product page detected, creating List it button...');
            clearInterval(interval);
            
            const listButton = document.createElement('button');
            listButton.id = 'initial-list-button';
            listButton.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
                <span>List to eBay</span>
            `;
            listButton.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                color: white;
                border: none;
                border-radius: 12px;
                padding: 14px 24px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.4);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 2147483647;
                animation: sellersuit-pulse 2s infinite;
            `;

            // Add keyframe animation for pulse effect
            if (!document.getElementById('sellersuit-button-styles')) {
                const styleSheet = document.createElement('style');
                styleSheet.id = 'sellersuit-button-styles';
                styleSheet.textContent = `
                    @keyframes sellersuit-pulse {
                        0%, 100% { box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.4); }
                        50% { box-shadow: 0 4px 20px rgba(99, 102, 241, 0.6), 0 0 0 8px rgba(99, 102, 241, 0); }
                    }
                `;
                document.head.appendChild(styleSheet);
            }
            
            listButton.addEventListener('mouseenter', () => {
                listButton.style.background = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
                listButton.style.transform = 'translateY(-2px) scale(1.02)';
                listButton.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.5)';
                listButton.style.animation = 'none';
            });
            
            listButton.addEventListener('mouseleave', () => {
                listButton.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
                listButton.style.transform = 'translateY(0) scale(1)';
                listButton.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.4)';
                listButton.style.animation = 'sellersuit-pulse 2s infinite';
            });
            
            document.body.appendChild(listButton);
            
            listButton.addEventListener('click', () => {
                injectUI();
                listButton.remove();
            });
        } else if (attempts >= maxAttempts) {
            console.log('⏰ Timeout reached - stopping attempts to find Walmart product page');
            clearInterval(interval);
        }
    }, 500);
};

// Calculator Functions
function openCalculator() {
    console.log('🔍 Opening calculator...');
    const popup = document.getElementById('calculator-popup');
    if (popup) {
        popup.style.display = 'flex';
        console.log('✅ Calculator popup displayed');
        
        const walmartPriceInput = document.getElementById('amazon-price');
        if (walmartPriceInput) {
            const scrapedPrice = scrapeWalmartPrice();
            if (scrapedPrice !== 'No price found') {
                walmartPriceInput.value = scrapedPrice;
                console.log('💰 Auto-filled Walmart price:', scrapedPrice);
            }
        }
        
        loadCalculatorValues();
        console.log('✅ Calculator opened successfully');
    } else {
        console.error('❌ Calculator popup not found');
    }
}

function closeCalculator() {
    console.log('🔍 Closing calculator...');
    const popup = document.getElementById('calculator-popup');
    if (popup) {
        popup.style.display = 'none';
        console.log('✅ Calculator closed');
    } else {
        console.error('❌ Calculator popup not found for closing');
    }
}

function loadCalculatorValues() {
    const savedValues = JSON.parse(localStorage.getItem('calculatorValues') || '{}');
    
    const fields = [
        'amazon-price',
        'tax-percent',
        'tracking-fee',
        'ebay-fee-percent',
        'promo-fee-percent',
        'desired-profit'
    ];
    
    fields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input && savedValues[fieldId]) {
            input.value = savedValues[fieldId];
        }
    });
}

function saveCalculatorValues() {
    const values = {};
    const fields = [
        'amazon-price',
        'tax-percent',
        'tracking-fee',
        'ebay-fee-percent',
        'promo-fee-percent',
        'desired-profit'
    ];
    
    fields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input && input.value) {
            values[fieldId] = input.value;
        }
    });
    
    localStorage.setItem('calculatorValues', JSON.stringify(values));
}

// Quick Calculate function - instant calculation without popup
function quickCalculate() {
    console.log('⚡ Quick calculating...');
    
    const savedValues = JSON.parse(localStorage.getItem('calculatorValues') || '{}');
    
    let walmartPrice = 0;
    
    const scrapedPrice = scrapeWalmartPrice();
    if (scrapedPrice !== 'No price found') {
        walmartPrice = parseFloat(scrapedPrice);
        console.log('💰 Using scraped Walmart price for quick calc:', walmartPrice);
    } else {
        walmartPrice = parseFloat(savedValues['amazon-price']) || 0;
        console.log('⚠️ Scrape failed, falling back to saved Walmart price:', walmartPrice);
    }
    const taxPercent = parseFloat(savedValues['tax-percent']) || 9;
    const trackingFee = parseFloat(savedValues['tracking-fee']) || 0.20;
    const ebayFeePercent = parseFloat(savedValues['ebay-fee-percent']) || 20;
    const promoFeePercent = parseFloat(savedValues['promo-fee-percent']) || 10;
    const desiredProfit = parseFloat(savedValues['desired-profit']) || 0;
    
    console.log('📊 Quick calc values:', {
        walmartPrice, taxPercent, trackingFee, 
        ebayFeePercent, promoFeePercent, desiredProfit
    });
    
    if (walmartPrice <= 0) {
        console.log('⚠️ No Walmart price available for quick calculation');
        alert('Please set up calculator values first or enter a Walmart price');
        return;
    }
    
    const taxAmount = walmartPrice * (taxPercent / 100);
    const baseCost = walmartPrice + taxAmount + trackingFee;
    const totalPercentage = (ebayFeePercent + promoFeePercent + desiredProfit) / 100;
    const finalPrice = baseCost / (1 - totalPercentage);
    
    const sellItForInput = document.getElementById('sell-it-for-input') || 
                           document.querySelector('input[aria-label*="Sell it for" i]') ||
                           document.querySelector('.price-field input[type="text"]') ||
                           document.querySelector('input[placeholder*="Sell it for" i]');
    if (sellItForInput) {
        sellItForInput.value = finalPrice.toFixed(2);
        sellItForInput.style.backgroundColor = '#e8f5e8';
        sellItForInput.style.borderColor = '#4caf50';
        
        setTimeout(() => {
            sellItForInput.style.backgroundColor = '';
            sellItForInput.style.borderColor = '';
        }, 3000);
        
        console.log('💰 Quick calculated price:', finalPrice.toFixed(2));
    } else {
        console.error('❌ Sell it for input not found');
    }
}

function calculatePrice() {
    console.log('🧮 Starting price calculation...');
    
    const walmartPrice = parseFloat(document.getElementById('amazon-price').value) || 0;
    const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
    const trackingFee = parseFloat(document.getElementById('tracking-fee').value) || 0;
    const ebayFeePercent = parseFloat(document.getElementById('ebay-fee-percent').value) || 0;
    const promoFeePercent = parseFloat(document.getElementById('promo-fee-percent').value) || 0;
    const desiredProfit = parseFloat(document.getElementById('desired-profit').value) || 0;
    
    console.log('📊 Input values:', {
        walmartPrice, taxPercent, trackingFee, 
        ebayFeePercent, promoFeePercent, desiredProfit
    });
    
    if (walmartPrice <= 0) {
        const resultDiv = document.getElementById('calculator-result');
        if (resultDiv) {
            resultDiv.style.display = 'none';
        }
        console.log('⚠️ No valid Walmart price entered yet');
        return;
    }
    
    const taxAmount = walmartPrice * (taxPercent / 100);
    const baseCost = walmartPrice + taxAmount + trackingFee;
    
    const totalPercentage = (ebayFeePercent + promoFeePercent + desiredProfit) / 100;
    
    const finalPrice = baseCost / (1 - totalPercentage);
    
    const ebayFee = finalPrice * (ebayFeePercent / 100);
    const promoFee = finalPrice * (promoFeePercent / 100);
    const netProfit = finalPrice - walmartPrice - taxAmount - trackingFee - ebayFee - promoFee;
    
    const sku = document.getElementById('sku-input')?.value || '';
    let selectedTitle = '';
    const aiTitleDisplay = document.getElementById('ai-generated-title');
    const isDefaultText = (t) => t.includes('Click "Generate"');
    if (aiTitleDisplay && !isDefaultText(aiTitleDisplay.innerText)) {
        selectedTitle = aiTitleDisplay.innerText.trim();
    } else {
        const selectedTitleRow = document.querySelector('#snipe-title-list .title-row.selected');
        selectedTitle = selectedTitleRow ? selectedTitleRow.dataset.title : '';
    }
    const walmartLink = window.location.href;
    
    if (sku && selectedTitle) {
      try {
        chrome.runtime.sendMessage({
          action: "logSheet",
          payload: {
            title: selectedTitle,
            sku: sku,
            ebay_price: finalPrice.toFixed(2),
            source_price: walmartPrice.toFixed(2),
            product_url: walmartLink
          }
        });
      } catch(e) {
        console.error("Sheet logging failed:", e);
      }
    }
    
    const resultDiv = document.getElementById('calculator-result');
    const priceDiv = document.getElementById('final-price');
    
    if (resultDiv && priceDiv) {
        priceDiv.textContent = `$${finalPrice.toFixed(2)}`;
        resultDiv.style.display = 'block';
    }
    
    const sellItForInput = document.getElementById('sell-it-for-input') || 
                           document.querySelector('input[aria-label*="Sell it for" i]') ||
                           document.querySelector('.price-field input[type="text"]') ||
                           document.querySelector('input[placeholder*="Sell it for" i]');
    if (sellItForInput) {
        sellItForInput.value = finalPrice.toFixed(2);
        sellItForInput.style.backgroundColor = '#e8f5e8';
        sellItForInput.style.borderColor = '#4caf50';
        
        setTimeout(() => {
            sellItForInput.style.backgroundColor = '';
            sellItForInput.style.borderColor = '';
        }, 3000);
    }
    
    saveCalculatorValues();
    
    console.log('💰 Price calculated:', finalPrice.toFixed(2));
    console.log('📊 Base cost:', baseCost.toFixed(2));
    console.log('📈 Total fees percentage:', (totalPercentage * 100).toFixed(1) + '%');
}

// Add calculator event listeners
function addCalculatorEventListeners() {
    const closeBtn = document.getElementById('calculator-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCalculator);
        console.log('✅ Calculator close button listener added');
    }
    
    const overlay = document.querySelector('.calculator-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeCalculator);
        console.log('✅ Calculator overlay listener added');
    }
    
    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculatePrice);
        console.log('✅ Calculator calculate button listener added');
    }
    
    let calculateTimeout;
    const calculatorInputs = document.querySelectorAll('#calculator-popup input');
    calculatorInputs.forEach(input => {
        input.addEventListener('input', () => {
            saveCalculatorValues();
            
            clearTimeout(calculateTimeout);
            calculateTimeout = setTimeout(() => {
                calculatePrice();
            }, 300);
        });
    });
    console.log('✅ Calculator input listeners added');
}

// Input validation function
function validatePriceInput(event) {
    const input = event.target;
    const value = parseFloat(input.value);
    
    if (isNaN(value) || value < 0) {
        input.style.backgroundColor = '#f8d7da';
        input.style.borderColor = '#dc3545';
        input.style.color = '#721c24';
    } else {
        input.style.backgroundColor = '#d4edda';
        input.style.borderColor = '#28a745';
        input.style.color = '#155724';
    }
}

// Test function to verify calculator is working
window.testCalculator = function() {
    console.log('🧪 Testing calculator...');
    const popup = document.getElementById('calculator-popup');
    const button = document.getElementById('calculator-btn');
    console.log('Calculator popup exists:', !!popup);
    console.log('Calculator button exists:', !!button);
    
    if (button) {
        console.log('🔍 Calculator button found, testing click...');
        button.click();
    } else {
        console.error('❌ Calculator button not found');
    }
};

// Helper function to get product data for export
async function getProductDataForExport() {
    let title = 'No title selected';
    const aiTitleDisplay = document.getElementById('ai-generated-title');
    const isDefaultText = (text) => text.includes('Click "Generate"');
    
    if (aiTitleDisplay && !isDefaultText(aiTitleDisplay.innerText)) {
        title = aiTitleDisplay.innerText.trim();
    } else {
        const selectedRow = document.querySelector('#snipe-title-list .title-row.selected');
        if (selectedRow) title = selectedRow.dataset.title;
    }
    
    const sku = document.getElementById('sku-input')?.value || 'No SKU';
    
    // Ensure latest calculation
    if (typeof quickCalculate === 'function') {
        quickCalculate();
    }

    const priceInput = document.getElementById('sell-it-for-input') || 
                       document.querySelector('.price-field input[type="text"]') ||
                       document.querySelector('input[aria-label*="Sell it for" i]') ||
                       document.querySelector('.price-field input');
    
    const finalPriceElement = document.getElementById('final-price');
    let sellPrice = 'No price';
    
    if (priceInput && priceInput.value && priceInput.value.trim() !== '') {
        sellPrice = priceInput.value.trim();
        console.log('✅ Found price from input field:', sellPrice);
    } else if (finalPriceElement && finalPriceElement.textContent) {
        const priceText = finalPriceElement.textContent.trim();
        const priceMatch = priceText.match(/[\d.]+/);
        if (priceMatch) {
            sellPrice = priceMatch[0];
            console.log('✅ Found price from final-price element:', sellPrice);
        }
    } else {
        console.warn('⚠️ No calculated price found. Please calculate price first.');
    }
    
    const walmartPrice = scrapeWalmartPrice();
    const walmartLink = window.location.href;
    
    return {
        timestamp: new Date().toLocaleString(),
        title: title,
        sku: sku,
        sellPrice: sellPrice,
        walmartPrice: walmartPrice,
        walmartLink: walmartLink,
        amazonPrice: walmartPrice,
        amazonLink: walmartLink
    };
}

// Helper function to scrape Walmart price from the page
function scrapeWalmartPrice() {
    console.log('🔍 Starting Walmart price scraping...');
    
    const priceSelectors = [
        '[itemprop="price"]',
        '.price-characteristic',
        '[data-testid="price"]',
        '.price-group',
        '.prod-PriceHero',
        '.prod-ProductPrice',
        '.product-price-large',
        '.price',
        '[data-automation-id="product-price"]',
        '.inline-flex .f2',
        '.f1.lh-title',
        '.price-main .visuallyhidden',
        '[class*="price"][class*="display"]',
        '.price-wrapper',
        '.product-offer-price',
        'span[itemprop="price"]',
        '[class*="ProductPrice"]'
    ];
    
    console.log('🎯 Trying', priceSelectors.length, 'price selectors...');
    
    // First, try to find Walmart's split price format (characteristic + mantissa)
    console.log('🔍 Checking for Walmart split price format...');
    const characteristicElement = document.querySelector('.price-characteristic');
    const mantissaElement = document.querySelector('.price-mantissa');
    
    if (characteristicElement) {
        let wholePart = characteristicElement.textContent?.replace(/[^\d]/g, '') || '';
        let decimalPart = mantissaElement?.textContent?.replace(/[^\d]/g, '') || '00';
        
        if (wholePart) {
            const fullPrice = parseFloat(`${wholePart}.${decimalPart}`);
            if (!isNaN(fullPrice) && fullPrice > 0) {
                console.log('✅ Split price format found:', fullPrice);
                return fullPrice.toFixed(2);
            }
        }
    }
    
    for (let i = 0; i < priceSelectors.length; i++) {
        const selector = priceSelectors[i];
        const priceElement = document.querySelector(selector);
        
        console.log(`🔍 Selector ${i + 1}/${priceSelectors.length}: "${selector}"`);
        console.log('   Element found:', !!priceElement);
        
        if (priceElement) {
            let priceText = priceElement.textContent || priceElement.innerText;
            console.log('   Raw text:', priceText);
            
            priceText = priceText.replace(/[^\d.,]/g, '');
            priceText = priceText.replace(/,/g, '');
            console.log('   Cleaned text:', priceText);
            
            const priceMatch = priceText.match(/(\d+\.?\d*)/);
            if (priceMatch) {
                const price = parseFloat(priceMatch[1]);
                console.log('   Extracted price:', price);
                if (!isNaN(price) && price > 0) {
                    console.log('✅ Walmart price scraped successfully:', price);
                    return price.toFixed(2);
                }
            }
        }
        
        const parentContainer = priceElement?.closest('.price-group, .price-wrapper, [class*="price"]');
        if (parentContainer) {
            console.log('   Trying parent container...');
            const fullPriceText = parentContainer.textContent || parentContainer.innerText;
            console.log('   Parent text:', fullPriceText);
            
            const pricePatterns = [
                /\$(\d+\.\d{2})/,
                /(\d+\.\d{2})/,
                /\$(\d+\.\d{1})/,
                /(\d+\.\d{1})/,
                /\$(\d+)/,
                /(\d+)/
            ];
            
            for (const pattern of pricePatterns) {
                const match = fullPriceText.match(pattern);
                if (match) {
                    const price = parseFloat(match[1]);
                    if (!isNaN(price) && price > 0) {
                        console.log('✅ Parent container price found:', price);
                        return price.toFixed(2);
                    }
                }
            }
        }
    }
    
    console.log('⚠️ Could not scrape Walmart price from any selector');
    console.log('🔍 Available price elements on page:');
    const allPriceElements = document.querySelectorAll('[class*="price"], [id*="price"], [class*="cost"], [id*="cost"]');
    allPriceElements.forEach((el, index) => {
        if (index < 5) {
            console.log(`   Element ${index + 1}:`, el.className, el.id, el.textContent?.substring(0, 50));
        }
    });
    
    console.log('🔄 Trying fallback price detection...');
    const allText = document.body.innerText;
    
    const pricePatterns = [
        /\$(\d+\.\d{2})/g,
        /(\d+\.\d{2})/g,
        /\$(\d+\.\d{1})/g,
        /(\d+\.\d{1})/g,
        /\$(\d+)/g,
        /(\d+)/g
    ];
    
    for (const pattern of pricePatterns) {
        const matches = [...allText.matchAll(pattern)];
        console.log(`   Pattern ${pattern} found ${matches.length} matches`);
        
        if (matches.length > 0) {
            for (const match of matches) {
                const price = parseFloat(match[1]);
                if (price > 0.01 && price < 10000) {
                    console.log('✅ Fallback price found:', price);
                    return price.toFixed(2);
                }
            }
        }
    }
    
    return 'No price found';
}

// Helper function to format data for copy (tab-separated)
function formatDataForCopy(data) {
    return `${data.timestamp}\t${data.title}\t${data.sku}\t${data.sellPrice}\t${data.walmartPrice}\t${data.walmartLink}`;
}

// Helper function to send data to Google Sheets
async function sendToGoogleSheets(data) {
    try {
        const defaultUrl = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
        const result = await chrome.storage.local.get('googleAppsScriptUrl');
        const GOOGLE_SCRIPT_URL = result.googleAppsScriptUrl || defaultUrl;
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        console.log('✅ Data sent to Google Sheets:', data);
        return true;
    } catch (error) {
        console.error('❌ Error sending to Google Sheets:', error);
        return false;
    }
}

// Function to log pricing data to Google Sheets
async function logToGoogleSheet(data) {
    try {
        const defaultUrl = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
        const result = await chrome.storage.local.get('googleAppsScriptUrl');
        const GOOGLE_SHEET_WEBHOOK = result.googleAppsScriptUrl || defaultUrl;
        
        fetch(GOOGLE_SHEET_WEBHOOK, {
            method: "POST",
            body: JSON.stringify(data),
            headers: { "Content-Type": "application/json" }
        })
        .then(res => res.text())
        .then(res => console.log("✅ Logged to Google Sheet:", res))
        .catch(err => console.error("❌ Failed to log:", err));
    } catch (error) {
        console.error("❌ Failed to get webhook URL:", error);
    }
}

// SKU Settings Functions
async function loadSKUSettings() {
    try {
        console.log('📥 Loading SKU settings...');
        
        const result = await chrome.storage.sync.get(['selectedSKU', 'autoSkuEnabled']);
        
        const selectedSKU = result.selectedSKU || 'AB';
        const autoSkuEnabled = result.autoSkuEnabled !== undefined ? result.autoSkuEnabled : true;
        
        console.log('📊 SKU settings loaded:', { selectedSKU, autoSkuEnabled });
        
        const skuPrefixSelect = document.getElementById('sku-prefix');
        if (skuPrefixSelect) {
            skuPrefixSelect.value = selectedSKU;
            console.log('✅ SKU prefix updated to:', selectedSKU);
        }
        
        if (autoSkuEnabled) {
            console.log('🔄 Auto-generating SKU...');
            await generateSKU();
        } else {
            console.log('📝 Auto SKU disabled, showing manual input');
            const skuInput = document.getElementById('sku-input');
            if (skuInput) {
                skuInput.value = selectedSKU;
                skuInput.readOnly = false;
                skuInput.placeholder = `Enter SKU (prefix: ${selectedSKU})`;
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading SKU settings:', error);
    }
}

async function generateSKU() {
    try {
        console.log('🏷️ Generating SKU...');
        
        const result = await chrome.storage.sync.get(['selectedSKU', 'autoSkuEnabled']);
        const prefix = result.selectedSKU || 'AB';
        const autoSkuEnabled = result.autoSkuEnabled !== undefined ? result.autoSkuEnabled : true;
        
        console.log('📊 Using prefix:', prefix, 'Auto enabled:', autoSkuEnabled);
        
        const timestamp = Date.now().toString().slice(-6);
        const generatedSku = `${prefix}${timestamp}`;
        
        console.log('✅ Generated SKU:', generatedSku);
        
        const skuInput = document.getElementById('sku-input');
        if (skuInput) {
            skuInput.value = generatedSku;
            skuInput.readOnly = autoSkuEnabled;
        }
        
        const skuPrefixSelect = document.getElementById('sku-prefix');
        if (skuPrefixSelect) {
            skuPrefixSelect.value = prefix;
        }
        
        await chrome.storage.local.set({ ebaySku: generatedSku });
        console.log('🔒 SKU saved to storage:', generatedSku);
        
        let selectedTitle = '';
        const aiTitleDisplay = document.getElementById('ai-generated-title');
        const isDefaultText = (t) => t.includes('Click "Generate"');
        if (aiTitleDisplay && !isDefaultText(aiTitleDisplay.innerText)) {
            selectedTitle = aiTitleDisplay.innerText.trim();
        } else {
            const selectedTitleRow = document.querySelector('#snipe-title-list .title-row.selected');
            selectedTitle = selectedTitleRow ? selectedTitleRow.dataset.title : '';
        }
        const priceInput = document.getElementById('sell-it-for-input');
        const ebayPrice = priceInput ? priceInput.value : '';
        const walmartPriceInput = document.getElementById('amazon-price');
        const walmartPrice = walmartPriceInput ? walmartPriceInput.value : '';
        
        if (selectedTitle && ebayPrice && walmartPrice) {
          try {
            chrome.runtime.sendMessage({
              action: "SAVE_TO_SHEET",
              payload: {
                title: selectedTitle,
                sku: generatedSku,
                ebayPrice: ebayPrice,
                walmartPrice: walmartPrice,
                walmartUrl: window.location.href
              }
            });
          } catch(e) {
            console.error("Sheet logging failed:", e);
          }
        }
        
    } catch (error) {
        console.error('❌ Error generating SKU:', error);
    }
}

// Manual trigger function for debugging
window.forceLoadExtension = function() {
    console.log('🔧 Manually triggering extension load...');
    
    const existingButton = document.getElementById('initial-list-button');
    if (existingButton) {
        existingButton.remove();
    }
    
    const listButton = document.createElement('button');
    listButton.id = 'initial-list-button';
    listButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
            <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>List to eBay</span>
    `;
    listButton.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 14px 24px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.4);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 9998;
        animation: sellersuit-pulse 2s infinite;
    `;

    // Add keyframe animation for pulse effect
    if (!document.getElementById('sellersuit-button-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'sellersuit-button-styles';
        styleSheet.textContent = `
            @keyframes sellersuit-pulse {
                0%, 100% { box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.4); }
                50% { box-shadow: 0 4px 20px rgba(99, 102, 241, 0.6), 0 0 0 8px rgba(99, 102, 241, 0); }
            }
        `;
        document.head.appendChild(styleSheet);
    }
    
    listButton.addEventListener('mouseenter', () => {
        listButton.style.background = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
        listButton.style.transform = 'translateY(-2px) scale(1.02)';
        listButton.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.5)';
        listButton.style.animation = 'none';
    });
    
    listButton.addEventListener('mouseleave', () => {
        listButton.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
        listButton.style.transform = 'translateY(0) scale(1)';
        listButton.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.4)';
        listButton.style.animation = 'sellersuit-pulse 2s infinite';
    });
    
    document.body.appendChild(listButton);
    
    listButton.addEventListener('click', () => {
        console.log('🔧 Manual trigger: Loading extension UI...');
        injectUI();
        listButton.remove();
    });
    
    console.log('✅ Manual List it button created!');
};

// Debug function to check page elements
window.debugWalmartPage = function() {
    console.log('🔍 Debugging Walmart page elements...');
    console.log('🌐 URL:', window.location.href);
    console.log('🏷️ Title:', document.title);
    console.log('🛒 Domain:', window.location.hostname);
    
    const elements = {
        productTitle: document.querySelector('h1[itemprop="name"], .prod-ProductTitle, [data-testid="product-title"]'),
        productImage: document.querySelector('.prod-hero-image, [data-testid="hero-image"]'),
        priceElement: document.querySelector('[itemprop="price"], .price-characteristic, [data-testid="price"]'),
        addToCart: document.querySelector('[data-testid="add-to-cart-button"], button[data-automation-id="atc-button"]'),
        productDetails: document.querySelector('.specifications-table, [data-testid="product-specifications"]'),
        buyBox: document.querySelector('.prod-product-cta-add-to-cart, .add-to-cart-section'),
        itemId: document.querySelector('[data-item-id], [data-product-id]')
    };
    
    Object.entries(elements).forEach(([name, element]) => {
        console.log(`${name}:`, !!element, element ? element.textContent?.substring(0, 50) : '');
    });
    
    return elements;
};

// ═══════════════════════════════════════════════════════════
// ROBUST INITIALIZATION WITH DOM READINESS DETECTION
// ═══════════════════════════════════════════════════════════

function startExtension() {
    console.log('[Walmart Injector] Starting extension initialization...');

    // Try to initialize
    initializeApp();

    // If button wasn't injected, retry after short delay
    setTimeout(() => {
        if (!document.getElementById('initial-list-button') && !document.getElementById('snipe-root-wrapper')) {
            console.log('[Walmart Injector] Button not found, retrying...');
            initializeApp();
        }
    }, 1000);
}

// Multiple initialization strategies for reliability
if (document.readyState === 'complete') {
    startExtension();
} else if (document.readyState === 'interactive') {
    startExtension();
} else {
    document.addEventListener('DOMContentLoaded', startExtension);
}

window.addEventListener('load', () => {
    if (!document.getElementById('initial-list-button') && !document.getElementById('snipe-root-wrapper')) {
        console.log('[Walmart Injector] Load event - attempting initialization');
        startExtension();
    }
});

// URL change detection for SPA navigation
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('[Walmart Injector] URL changed, re-initializing...');
        setTimeout(startExtension, 500);
    }
});

if (document.body) {
    urlObserver.observe(document.body, { childList: true, subtree: true });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        urlObserver.observe(document.body, { childList: true, subtree: true });
    });
}
