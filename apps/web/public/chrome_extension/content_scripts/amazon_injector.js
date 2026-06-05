// ═══════════════════════════════════════════════════════════
// 📦 AMAZON INJECTOR - OPTIMIZED
// Content script for Amazon product pages
// Uses centralized config and performance utilities
// ═══════════════════════════════════════════════════════════

// State management
let uiInjected = false;
let isProcessing = false;

// ═══════════════════════════════════════════════════════════
// 🛠️ UTILITY FUNCTIONS (with performance optimizations)
// ═══════════════════════════════════════════════════════════

// Debounce utility for rate limiting
const createDebounce = (fn, delay = 300) => {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn.apply(this, args);
        }, delay);
    };
};

// Throttle utility for limiting call frequency
const createThrottle = (fn, limit = 1000) => {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            return fn.apply(this, args);
        }
    };
};

// Memory cache for frequently accessed data
const cache = {
    data: new Map(),
    timestamps: new Map(),

    get(key, ttl = 60000) {
        if (!this.data.has(key)) return null;
        const timestamp = this.timestamps.get(key) || 0;
        if (Date.now() - timestamp > ttl) {
            this.data.delete(key);
            this.timestamps.delete(key);
            return null;
        }
        return this.data.get(key);
    },

    set(key, value) {
        this.data.set(key, value);
        this.timestamps.set(key, Date.now());
    },

    clear() {
        this.data.clear();
        this.timestamps.clear();
    }
};

// Helper to wait for element presence with caching
const waitForElement = (selector, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        // Check cache first
        const cached = cache.get(`element_${selector}`);
        if (cached && document.contains(cached)) {
            return resolve(cached);
        }

        const existing = document.querySelector(selector);
        if (existing) {
            cache.set(`element_${selector}`, existing);
            return resolve(existing);
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                cache.set(`element_${selector}`, element);
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
};

// ═══════════════════════════════════════════════════════════
// 📊 COMPREHENSIVE PRODUCT DATA SCRAPER
// ═══════════════════════════════════════════════════════════

const scrapeCompleteProductData = () => {
    console.log('[Scraper] Starting comprehensive product data extraction...');

    // Helper functions for safe DOM access
    const getElText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.innerText.trim() : '';
    };

    const getElAttr = (selector, attr) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute(attr) : '';
    };

    const getAllElText = (selector) => {
        return Array.from(document.querySelectorAll(selector))
            .map(el => el.innerText.trim())
            .filter(text => text);
    };

    // Extract basic info
    const productData = {
        // Basic Information
        asin: document.querySelector('input#asin')?.value ||
            window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || '',
        title: getElText('#productTitle'),
        brand: getElText('#bylineInfo')?.replace(/^(Brand:|Visit the|Store)/, '').trim(),

        // Pricing
        price: getElText('.a-price .a-offscreen') || getElText('#corePrice_feature_div .a-price'),
        listPrice: getElText('.a-text-price .a-offscreen'),
        savings: getElText('.savingsPercentage'),

        // Images
        mainImage: getElAttr('#landingImage', 'src') || getElAttr('#imgBlkFront', 'src'),
        allImages: Array.from(document.querySelectorAll('#altImages li img, #imageBlock img'))
            .map(img => {
                let src = img.getAttribute('data-old-hires') ||
                    img.getAttribute('data-a-dynamic-image') ||
                    img.src;
                // Try to get highest resolution
                if (src && src.includes('._')) {
                    src = src.replace(/\._[A-Z0-9,]+_\./, '.');
                }
                return src;
            })
            .filter(src => src && !src.includes('base64') && !src.includes('transparent-pixel'))
            .filter((src, index, self) => self.indexOf(src) === index), // Remove duplicates

        // Features & Description
        bulletPoints: getAllElText('#feature-bullets li span.a-list-item'),
        description: getElText('#productDescription') || getElText('#feature-bullets + div'),

        // Category & Breadcrumbs
        category: getAllElText('#wayfinding-breadcrumbs_container li span a, .a-breadcrumb a'),

        // Ratings & Reviews
        rating: getElText('#acrPopover')?.match(/[\d.]+/)?.[0] ||
            getElText('.a-icon-star')?.match(/[\d.]+/)?.[0] || '',
        reviewCount: getElText('#acrCustomerReviewText')?.match(/[\d,]+/)?.[0] || '',

        // Availability
        availability: getElText('#availability span') || getElText('#availability'),

        // Shipping
        shipping: getElText('#mir-layout-DELIVERY_BLOCK'),

        // Specifications
        specifications: {},

        // A+ Content (Enhanced Description)
        aplusContent: null,

        // Metadata
        scrapedAt: new Date().toISOString(),
        url: window.location.href
    };

    // Extract specifications from technical details table
    const techSpecTable = document.querySelector('#productDetails_techSpec_section_1');
    if (techSpecTable) {
        const rows = techSpecTable.querySelectorAll('tr');
        rows.forEach(row => {
            const key = row.querySelector('th')?.innerText.trim();
            const value = row.querySelector('td')?.innerText.trim();
            if (key && value) {
                productData.specifications[key] = value;
            }
        });
    }

    // Extract from detail bullets (alternative format)
    const detailBullets = document.querySelector('#detailBullets_feature_div');
    if (detailBullets) {
        const items = detailBullets.querySelectorAll('li span.a-list-item');
        items.forEach(item => {
            const text = item.innerText;
            const colonIndex = text.indexOf(':');
            if (colonIndex > 0) {
                const key = text.substring(0, colonIndex).replace(/[\n\t]/g, '').trim();
                const value = text.substring(colonIndex + 1).trim();
                if (key && value) {
                    productData.specifications[key] = value;
                }
            }
        });
    }

    // Extract from product details section (another format)
    const prodDetails = document.querySelector('#prodDetails');
    if (prodDetails) {
        const rows = prodDetails.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('th, td');
            if (cells.length >= 2) {
                const key = cells[0].innerText.trim();
                const value = cells[1].innerText.trim();
                if (key && value && !productData.specifications[key]) {
                    productData.specifications[key] = value;
                }
            }
        });
    }

    // Extract A+ Content (Enhanced Description)
    const aplusDiv = document.querySelector('#aplus_feature_div') ||
        document.querySelector('#aplus') ||
        document.querySelector('#aplusBrandStory_feature_div');
    if (aplusDiv) {
        productData.aplusContent = {
            text: aplusDiv.innerText.trim().substring(0, 5000), // Limit to 5000 chars
            images: Array.from(aplusDiv.querySelectorAll('img'))
                .map(img => img.src)
                .filter(src => src && !src.includes('transparent-pixel')),
            hasContent: true
        };
    }

    // Extract variant information if available
    const variantSelectors = document.querySelectorAll('#variation_size_name li, #variation_color_name li');
    if (variantSelectors.length > 0) {
        productData.variants = Array.from(variantSelectors).map(li => ({
            name: li.getAttribute('title') || li.innerText.trim(),
            selected: li.classList.contains('selected') || li.classList.contains('swatchSelect')
        }));
    }

    // Data validation
    const requiredFields = ['asin', 'title'];
    const missingFields = requiredFields.filter(field => !productData[field]);

    if (missingFields.length > 0) {
        console.warn('[Scraper] Missing required fields:', missingFields);
    }

    console.log('[Scraper] Extraction complete. Fields captured:', Object.keys(productData).length);
    if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('[Scraper] Product data (hidden in prod)', productData);

    return productData;
}

// Helper function to select a title row with visual highlighting
const selectTitleRow = (row) => {
    if (!row) return;

    // Remove selection from all rows
    const allRows = document.querySelectorAll('#snipe-title-list .title-row');
    allRows.forEach(r => r.classList.remove('selected'));

    // Add selection to clicked row
    row.classList.add('selected');

    // Store the selected title in the row's dataset
    const titleInput = row.querySelector('.title-input');
    if (titleInput && titleInput.value) {
        row.dataset.title = titleInput.value;
        console.log('✅ Selected title:', titleInput.value);
    }
};

// ═══════════════════════════════════════════════════════════
// 🎯 TITLE DISPLAY - Titles are now shown ONLY in the panel's .titles-panel
// The inline injection code has been removed to keep titles within the panel
// ═══════════════════════════════════════════════════════════

// **IMPROVED** Function to inject the main UI panel
const injectUI = async () => {
    if (uiInjected) return;

    // 🔒 AUTH GUARD: Removed to allow UI to show up.
    // The "Action" (clicking list) will be blocked by background.js if not logged in,
    // which will then trigger the redirect to login page.
    const storage = await chrome.storage.local.get('saasToken');
    // if (!storage.saasToken) { ... } // Removed

    // Prevent duplicate injection
    if (document.getElementById('snipe-root-wrapper')) return;

    try {
        // Add cache busting timestamp to force reload of new HTML structure
        const panelUrl = chrome.runtime.getURL('ui/panel.html') + '?t=' + Date.now();
        console.log(`🔍 Injecting panel from: ${panelUrl}`);

        const response = await fetch(panelUrl);
        const uiHtml = await response.text();

        // Parse the HTML and extract just the body content (the snipe-root-wrapper div)
        const parser = new DOMParser();
        const doc = parser.parseFromString(uiHtml, 'text/html');
        const panelContent = doc.getElementById('snipe-root-wrapper');

        if (!panelContent) {
            console.error('❌ Could not find snipe-root-wrapper in panel.html');
            return;
        }

        // VERIFY POPUP EXISTENCE IN PARSED HTML
        const popupCheck = panelContent.querySelector('#title-selection-popup');
        console.log('🔍 Pre-injection check for #title-selection-popup:', popupCheck ? 'FOUND ✅' : 'MISSING ❌');

        // Clone the panel content and inject it directly (preserving the ID)
        const clonedPanel = panelContent.cloneNode(true);

        // Also inject the CSS if not already present
        if (!document.getElementById('sellersuit-panel-css')) {
            const cssLink = document.createElement('link');
            cssLink.id = 'sellersuit-panel-css';
            cssLink.rel = 'stylesheet';
            cssLink.href = chrome.runtime.getURL('ui/panel.css');
            document.head.appendChild(cssLink);
        }

        // Inject the panel as the very first element inside the body tag
        document.body.prepend(clonedPanel);
        uiInjected = true;

        console.log('✅ Panel injected successfully');

        // --- Post-injection logic ---
        scrapeAndDisplayInitialTitle();
        scrapeAndDisplayImages();
        addEventListenersToPanel();
        addCalculatorEventListeners();

        // 📦 SCRAPE AND STORE PRODUCT DATA FOR DESCRIPTION GENERATOR
        scrapeAndStoreProductData();

        // Safe auto-click with wait
        waitForElement('#snipe-title-btn', 2000)
            .then(btn => {
                console.log('✅ Auto-clicking title button...');
                btn.click();
            })
            .catch(err => console.warn('⚠️ Auto-click skipped:', err.message));

        // Safe auto-calculate
        // Wait for panel to settle, then calculate
        setTimeout(() => {
            console.log('🔄 Auto-calculating price on panel load...');
            if (typeof quickCalculate === 'function') {
                quickCalculate();
            }
        }, 1000);

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

    } catch (e) {
        console.error('❌ Failed to inject UI:', e);
    }
};

// ═══════════════════════════════════════════════════════════
// 📦 COMPREHENSIVE PRODUCT DATA SCRAPING FOR DESCRIPTION
// ═══════════════════════════════════════════════════════════

const scrapeAndStoreProductData = async () => {
    console.log('📦 [ProductScraper] Starting comprehensive product data scrape...');

    try {
        // Scrape all available product data
        const productData = scrapeFullProductData();

        // Store in chrome.storage.local for description generator
        await chrome.storage.local.set({
            currentProduct: productData,
            productDataTimestamp: Date.now()
        });

        if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('✅ [ProductScraper] Product data saved to storage:', {
            title: productData.title?.substring(0, 50) + '...',
            bulletPoints: productData.bulletPoints?.length || 0,
            hasDescription: !!productData.description,
            brand: productData.brand
        });

    } catch (error) {
        console.error('❌ [ProductScraper] Failed to scrape/store product data:', error);
    }
};

// Comprehensive product data scraping function
const scrapeFullProductData = () => {
    const data = {
        title: '',
        description: '',
        bulletPoints: [],
        category: '',
        price: '',
        brand: '',
        features: [],
        specifications: {},
        condition: 'New',
        asin: '',
        url: window.location.href
    };

    // 1. SCRAPE TITLE
    const titleEl = document.querySelector('#productTitle');
    if (titleEl) {
        data.title = titleEl.innerText.trim();
        console.log('📝 Title scraped:', data.title.substring(0, 50) + '...');
    }

    // 2. SCRAPE BULLET POINTS / FEATURES
    const bulletSelectors = [
        '#feature-bullets ul li span.a-list-item',
        '#feature-bullets li span',
        '.a-unordered-list.a-vertical li span.a-list-item',
        '#productFactsDesktop_feature_div li',
        '#featurebullets_feature_div li span'
    ];

    for (const selector of bulletSelectors) {
        const bullets = document.querySelectorAll(selector);
        if (bullets.length > 0) {
            bullets.forEach(bullet => {
                const text = bullet.innerText?.trim();
                if (text && text.length > 10 && !data.bulletPoints.includes(text)) {
                    data.bulletPoints.push(text);
                }
            });
            if (data.bulletPoints.length > 0) {
                console.log('📝 Bullet points scraped:', data.bulletPoints.length);
                break;
            }
        }
    }

    // 3. SCRAPE PRODUCT DESCRIPTION
    const descriptionSelectors = [
        '#productDescription p',
        '#productDescription',
        '#aplus_feature_div',
        '.aplus-v2',
        '#dpx-aplus-product-description_feature_div'
    ];

    for (const selector of descriptionSelectors) {
        const descEl = document.querySelector(selector);
        if (descEl) {
            const text = descEl.innerText?.trim();
            if (text && text.length > 50) {
                data.description = text.substring(0, 2000); // Limit to 2000 chars
                console.log('📝 Description scraped:', data.description.length, 'chars');
                break;
            }
        }
    }

    // 4. SCRAPE BRAND
    const brandSelectors = [
        '#bylineInfo',
        'a#bylineInfo',
        '.po-brand .a-span9',
        'tr.po-brand td.a-span9',
        '[data-csa-c-type="brand"]'
    ];

    for (const selector of brandSelectors) {
        const brandEl = document.querySelector(selector);
        if (brandEl) {
            let brandText = brandEl.innerText?.trim();
            // Clean up "Visit the X Store" or "Brand: X"
            brandText = brandText.replace(/^(Visit the|Brand:)\s*/i, '').replace(/\s*Store$/i, '');
            if (brandText && brandText.length > 1) {
                data.brand = brandText;
                console.log('📝 Brand scraped:', data.brand);
                break;
            }
        }
    }

    // 5. SCRAPE PRICE
    const priceSelectors = [
        '.a-price .a-offscreen',
        '.apexPriceToPay .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price-whole'
    ];

    for (const selector of priceSelectors) {
        const priceEl = document.querySelector(selector);
        if (priceEl) {
            const priceText = priceEl.innerText?.trim() || priceEl.textContent?.trim();
            if (priceText) {
                data.price = priceText;
                console.log('📝 Price scraped:', data.price);
                break;
            }
        }
    }

    // 6. SCRAPE CATEGORY / BREADCRUMB
    const breadcrumbEl = document.querySelector('#wayfinding-breadcrumbs_feature_div ul, .a-breadcrumb');
    if (breadcrumbEl) {
        const crumbs = breadcrumbEl.querySelectorAll('li a, li span.a-list-item');
        const categories = [];
        crumbs.forEach(crumb => {
            const text = crumb.innerText?.trim();
            if (text && text !== '›' && text.length > 1) {
                categories.push(text);
            }
        });
        if (categories.length > 0) {
            data.category = categories.join(' > ');
            console.log('📝 Category scraped:', data.category);
        }
    }

    // 7. SCRAPE SPECIFICATIONS FROM PRODUCT DETAILS TABLE
    const specTables = document.querySelectorAll(
        '#productDetails_techSpec_section_1 tr, ' +
        '#productDetails_detailBullets_sections1 tr, ' +
        '#detailBullets_feature_div li, ' +
        '.prodDetTable tr'
    );

    specTables.forEach(row => {
        const labelEl = row.querySelector('th, .a-text-bold, .prodDetSectionEntry');
        const valueEl = row.querySelector('td, span:not(.a-text-bold)');

        if (labelEl && valueEl) {
            const label = labelEl.innerText?.trim().replace(/[:\s]+$/, '');
            const value = valueEl.innerText?.trim();

            if (label && value && label.length < 50 && value.length < 200) {
                data.specifications[label] = value;
            }
        }
    });

    if (Object.keys(data.specifications).length > 0) {
        console.log('📝 Specifications scraped:', Object.keys(data.specifications).length, 'items');
    }

    // 8. SCRAPE ASIN
    const asinMatch = window.location.href.match(/\/dp\/([A-Z0-9]{10})/i) ||
        window.location.href.match(/\/product\/([A-Z0-9]{10})/i);
    if (asinMatch) {
        data.asin = asinMatch[1];
        console.log('📝 ASIN scraped:', data.asin);
    }

    // Also copy bullet points to features for compatibility
    data.features = [...data.bulletPoints];

    return data;
};

// Enhanced product details scraping function
const scrapeProductDetails = () => {
    const details = {
        brand: '',
        model: '',
        color: '',
        dimensions: '',
        height: '',
        weight: '',
        description: ''
    };

    // --- Scrape Item Specifics from Amazon Product Details ---
    // Target the main product details section
    const detailBullets = document.querySelector('#detailBullets_feature_div ul, #detail-bullets_feature_div ul');
    if (detailBullets) {
        const listItems = detailBullets.querySelectorAll('li');
        listItems.forEach(item => {
            const labelElement = item.querySelector('.a-text-bold');
            const valueElement = item.querySelector('span:not(.a-text-bold)');

            if (labelElement && valueElement) {
                const label = labelElement.innerText?.trim()?.toLowerCase() || '';
                const value = valueElement.innerText?.trim() || '';

                // Map Amazon fields to our details
                if (label.includes('product dimensions')) {
                    details.dimensions = value;
                } else if (label.includes('item model number')) {
                    details.model = value;
                } else if (label.includes('manufacturer')) {
                    details.brand = value;
                } else if (label.includes('color')) {
                    details.color = value;
                } else if (label.includes('weight')) {
                    details.weight = value;
                } else if (label.includes('height')) {
                    details.height = value;
                }
            }
        });
    }

    // --- Also check technical specifications tables ---
    const techSpecTables = document.querySelectorAll('table[id*="productDetails"], #productDetails_techSpec_section_1, #productDetails_techSpec_section_2');
    techSpecTables.forEach(table => {
        const rows = table?.querySelectorAll('tr') || [];
        rows.forEach(row => {
            const labelElement = row.querySelector('th, .a-text-bold');
            const valueElement = row.querySelector('td, span:not(.a-text-bold)');

            if (labelElement && valueElement) {
                const label = labelElement.innerText?.trim()?.toLowerCase() || '';
                const value = valueElement.innerText?.trim() || '';

                if (label.includes('brand') || label.includes('manufacturer')) {
                    if (!details.brand) details.brand = value;
                } else if (label.includes('model')) {
                    if (!details.model) details.model = value;
                } else if (label.includes('color')) {
                    if (!details.color) details.color = value;
                } else if (label.includes('dimension')) {
                    if (!details.dimensions) details.dimensions = value;
                } else if (label.includes('weight')) {
                    if (!details.weight) details.weight = value;
                } else if (label.includes('height')) {
                    if (!details.height) details.height = value;
                }
            }
        });
    });

    // --- Additional scraping from product title and other sources ---
    const productTitle = document.querySelector('#productTitle');
    if (productTitle) {
        const titleText = productTitle.innerText.trim();
        // Extract brand from title (usually first word)
        if (!details.brand) {
            const brandMatch = titleText.match(/^([A-Za-z\s]+?)(?:\s|$)/);
            if (brandMatch) {
                details.brand = brandMatch[1].trim();
            }
        }
    }

    // --- Scrape from additional sections ---
    const additionalSections = document.querySelectorAll('[data-feature-name*="dimension"], [data-feature-name*="weight"], [data-feature-name*="color"]');
    additionalSections.forEach(section => {
        const label = section.getAttribute('data-feature-name')?.toLowerCase() || '';
        const value = section.innerText.trim();

        if (label.includes('dimension')) details.dimensions = value;
        else if (label.includes('weight')) details.weight = value;
        else if (label.includes('color')) details.color = value;
    });

    // --- Scrape Product Description ---
    const descriptionElement = document.querySelector('#productDescription');
    if (descriptionElement) {
        details.description = descriptionElement.innerText.trim();
    }

    return details;
};

// Product Details Popup Management
let productDetailsPopup = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

const createProductDetailsPopup = () => {
    if (productDetailsPopup) return;

    // Create popup container
    productDetailsPopup = document.createElement('div');
    productDetailsPopup.id = 'product-details-popup';
    productDetailsPopup.className = 'product-details-popup';

    // Load popup HTML
    fetch(chrome.runtime.getURL('ui/product-details-popup.html'))
        .then(response => response.text())
        .then(html => {
            productDetailsPopup.innerHTML = html;
            document.body.appendChild(productDetailsPopup);

            // Load CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = chrome.runtime.getURL('ui/product-details-popup.css');
            document.head.appendChild(link);

            // Add event listeners
            addProductDetailsEventListeners();

            // Initial data load
            updateProductDetails();
        });
};

const addProductDetailsEventListeners = () => {
    if (!productDetailsPopup) return;

    // Close button
    const closeBtn = productDetailsPopup.querySelector('#close-popup-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            productDetailsPopup.remove();
            productDetailsPopup = null;
        });
    }

    // Refresh button
    const refreshBtn = productDetailsPopup.querySelector('#refresh-details-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', updateProductDetails);
    }

    // Copy all button
    const copyAllBtn = productDetailsPopup.querySelector('#copy-all-btn');
    if (copyAllBtn) {
        copyAllBtn.addEventListener('click', copyAllDetails);
    }

    // Individual copy buttons
    const copyBtns = productDetailsPopup.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const field = e.target.getAttribute('data-field');
            copyDetail(field);
        });
    });

    // Dragging functionality
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

    // Keep popup within viewport
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

    // Update each field
    Object.keys(details).forEach(field => {
        const valueElement = productDetailsPopup.querySelector(`#${field} - value`);
        if (valueElement) {
            const oldValue = valueElement.textContent;
            const newValue = details[field] || 'Not found';

            valueElement.textContent = newValue;

            // Add highlight animation if value changed
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

    const valueElement = productDetailsPopup.querySelector(`#${field} - value`);
    if (!valueElement) return;

    const value = valueElement.textContent;
    if (value === 'Not found') return;

    // Copy to clipboard
    navigator.clipboard.writeText(value).then(() => {
        // Show feedback
        const copyBtn = productDetailsPopup.querySelector(`[data - field="${field}"]`);
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
        const valueElement = productDetailsPopup.querySelector(`#${field} - value`);
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

// Comprehensive Amazon image extractor with advanced anti-bot measures
class AmazonImageExtractor {
    constructor() {
        this.images = new Set();
        this.altMap = new Map(); // Store alt text separately to preserve it without changing Set algorithm
        this.highQualityImages = [];
        this.attempts = 0;
        this.maxAttempts = 3;
    }

    // Sanitize alt text to remove Amazon fingerprints
    sanitizeAltText(text) {
        if (!text) return 'Product Image';

        // Remove Amazon-specific terms and other fingerprints
        let sanitized = text
            .replace(/\b(amazon|prime|alexa|kindle|fire tv|echo|basics)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        return sanitized || 'Product Image';
    }

    // Main extraction algorithm with multiple approaches
    async extractAllImages() {

        // Reset collections
        this.images.clear();
        this.altMap.clear();
        this.highQualityImages = [];

        // Wait for page to fully load
        await this.waitForPageLoad();

        // ═══════════════════════════════════════════════════════════
        // Passive extraction methods
        // ═══════════════════════════════════════════════════════════
        console.log('📋 Using passive extraction methods...');
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
                // If we found images, break early
                if (this.images.size > 0) {
                    break;
                }
            } catch (error) {
                console.warn(`❌ ${approach.name} failed: `, error);
            }
        }

        // Transform to high resolution
        this.transformToHighRes();

        // Validate and filter
        await this.validateImageQuality();

        return this.highQualityImages;
    }

    // ═══════════════════════════════════════════════════════════
    // INTERACTIVE FULL-VIEW MODAL EXTRACTION
    // Clicks through Amazon's image gallery modal to get max quality
    // ═══════════════════════════════════════════════════════════
    async extractFromFullViewModal() {
        console.log('🖱️ Starting interactive full-view modal extraction...');

        try {
            // Step 0: Wait for Amazon's image gallery to be fully ready
            await this.waitForImageGalleryReady();

            // Step 1: Find and click the main image to open modal
            const mainImage = document.querySelector('#landingImage, #imgTagWrapperId img, #imgBlkFront');
            if (!mainImage) {
                throw new Error('Main product image not found');
            }

            console.log('  Clicking main image to open modal...');
            mainImage.click();

            // Wait for modal to appear (reduced for speed)
            await this.wait(500);

            // Step 2: Verify modal opened
            const modal = document.querySelector('.a-modal-scroller, #ivLargeImage');
            if (!modal) {
                throw new Error('Modal did not open');
            }

            console.log('  ✓ Modal opened successfully');

            // Step 3: Find all thumbnails in the modal
            const thumbnails = Array.from(document.querySelectorAll('.ivThumb'));

            if (thumbnails.length === 0) {
                throw new Error('No thumbnails found in modal');
            }

            console.log(`  Found ${thumbnails.length} thumbnails to process`);

            // Step 4: Click each thumbnail sequentially and extract image (FAST MODE)
            for (let i = 0; i < thumbnails.length; i++) {
                try {
                    const thumb = thumbnails[i];

                    // Skip if it's a video thumbnail
                    const isVideo = thumb.querySelector('video') ||
                        thumb.classList.contains('video') ||
                        thumb.getAttribute('aria-label')?.toLowerCase().includes('video');

                    if (isVideo) {
                        console.log(`  ⏭️ Skipping thumbnail ${i + 1} (video)`);
                        continue;
                    }

                    // Click the thumbnail
                    console.log(`  🖱️ Clicking thumbnail ${i + 1}/${thumbnails.length}...`);
                    thumb.click();

                    // Wait for the large image to update (reduced for speed)
                    await this.wait(300);

                    // Extract the high-res URL from the large image
                    const largeImage = document.querySelector('#ivLargeImage img');
                    if (largeImage) {
                        let imageUrl = largeImage.src;

                        // Try to get even higher resolution
                        const dataOldHires = largeImage.getAttribute('data-old-hires');
                        if (dataOldHires) {
                            imageUrl = dataOldHires;
                        }

                        if (imageUrl && this.isValidImageUrl(imageUrl)) {
                            // Force maximum resolution
                            const maxResUrl = this.getHighResUrl(imageUrl);

                            if (!this.images.has(maxResUrl)) {
                                this.images.add(maxResUrl);
                                this.altMap.set(maxResUrl, `Product Image ${this.images.size}`);
                                console.log(`  ✅ Extracted: ${maxResUrl.substring(0, 70)}...`);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`  ⚠️ Failed to extract from thumbnail ${i + 1}:`, error.message);
                }
            }
        } finally {
            // Step 5: Close the modal immediately
            console.log('  Closing modal...');
            try {
                // First attempt: simulate ESC key
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
                
                // Second attempt: Try clicking the close button specifically within the modal container
                const modalRoot = document.querySelector('[role="dialog"][aria-modal="true"], #a-popover-lgtbox, .a-popover-modal');
                const closeButton = modalRoot ? modalRoot.querySelector('.a-button-close, [data-action="a-popover-close"]') : document.querySelector('.a-button-close[data-action="a-popover-close"]');
                
                if (closeButton) {
                    closeButton.click();
                }
                await this.wait(300);

                // Third attempt: Aggressively NUKE all possible modal and popover overlays from the DOM
                const selectors = [
                    '.a-popover-modal',
                    '#a-popover-lgtbox',
                    '.a-popover-wrapper',
                    '#ivLargeImage',
                    '.a-modal-scroller',
                    '.a-backdrop',
                    '.a-popover-backdrop',
                    '.a-popover-lightbox-backdrop',
                    '.a-popover-container',
                    '[id^="a-popover-"]',
                    '[role="dialog"][aria-modal="true"]'
                ];
                const amazonOverlays = document.querySelectorAll(selectors.join(', '));
                amazonOverlays.forEach(el => {
                    if (el) {
                        try {
                            el.remove();
                        } catch (e) {
                            console.warn('  ⚠️ Failed to remove element:', e.message);
                        }
                    }
                });
                
                // Restore body and documentElement scroll and classes unconditionally
                const resetScroll = (el) => {
                    if (el) {
                        el.style.setProperty('overflow', '', 'important');
                        el.style.overflow = '';
                        el.classList.remove('a-m-us', 'a-modal-open', 'a-m-overlay-active');
                    }
                };
                resetScroll(document.body);
                resetScroll(document.documentElement);
                console.log('  💥 Force-removed Amazon modal overlays and restored scrolling.');
            } catch (e) {
                console.warn('  ⚠️ Error while trying to close modal:', e.message);
            }
        }

        console.log(`✅ Interactive extraction complete: ${this.images.size} images extracted`);
    }

    // Helper method for delays
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Wait for Amazon's image gallery to be fully loaded and ready
    async waitForImageGalleryReady() {
        console.log('  ⏳ Waiting for image gallery to be ready...');

        const maxWaitTime = 5000; // 5 seconds max
        const checkInterval = 200; // Check every 200ms
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            // Check if main image and thumbnail gallery are present
            const mainImage = document.querySelector('#landingImage, #imgTagWrapperId img, #imgBlkFront');
            const thumbnailGallery = document.querySelector('#altImages, #imageBlock');
            const hasThumbnails = document.querySelectorAll('#altImages li img, .imageThumbnail').length > 0;

            if (mainImage && thumbnailGallery && hasThumbnails) {
                console.log('  ✓ Image gallery is ready');
                // Extra small delay to ensure everything is settled
                await this.wait(300);
                return;
            }

            await this.wait(checkInterval);
        }

        console.log('  ⚠️ Gallery readiness timeout - proceeding anyway');
    }

    // Wait for page to fully load
    async waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }

    // Extract ONLY main product images from DOM elements
    async extractFromDOM() {
        console.log('🔍 Extracting MAIN product images from DOM...');

        // Primary product image selectors - focus on main product gallery only
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
                    if (url && this.isValidImageUrl(url)) {
                        this.images.add(url);
                        if (altText) this.altMap.set(url, altText);
                        console.log(`Found DOM image: ${url}`);
                    }
                });
            });
        });
    }

    // Extract images from JSON data in page
    async extractFromJSONData() {
        console.log('🔍 Extracting from JSON data...');

        // Look for JSON data in script tags
        const scriptTags = document.querySelectorAll('script[type="application/json"], script:not([src])');

        scriptTags.forEach(script => {
            try {
                const content = script.textContent || script.innerHTML;
                if (content && content.includes('amazon') && content.includes('images')) {
                    // Extract image URLs using regex patterns
                    const patterns = [
                        /"hiRes":"([^"]+)"/g,
                        /"large":"([^"]+)"/g,
                        /"mainImage":"([^"]+)"/g,
                        /"displayImage":"([^"]+)"/g,
                        /"mainUrl":"([^"]+)"/g,
                        /"thumb":"([^"]+)"/g,
                        /"thumbnail":"([^"]+)"/g,
                        /"gallery":"([^"]+)"/g,
                        /"data-a-dynamic-image":"([^"]+)"/g
                    ];

                    patterns.forEach(pattern => {
                        let match;
                        while ((match = pattern.exec(content)) !== null) {
                            let imageUrl = match[1];

                            // Handle escaped URLs
                            imageUrl = imageUrl.replace(/\\u002F/g, '/').replace(/\\/g, '').replace(/&amp;/g, '&');

                            if (this.isValidImageUrl(imageUrl)) {
                                this.images.add(imageUrl);
                                // JSON usually doesn't have alt text easily associated, skip mapping
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

    // Extract from main product image data attributes only
    async extractComprehensive() {
        console.log('🔍 Extracting from main product data attributes...');

        // Only target images within the main product image block
        const mainImageBlock = document.querySelector('#imageBlock, #dp-container, #main-image-container');
        if (!mainImageBlock) {
            console.log('No main image block found');
            return;
        }

        const productImages = mainImageBlock.querySelectorAll('img[data-old-hires], img[data-a-dynamic-image]');
        productImages.forEach(img => {
            const altText = img.alt || '';

            if (img.dataset.oldHires) {
                this.images.add(img.dataset.oldHires);
                if (altText) this.altMap.set(img.dataset.oldHires, altText);
                console.log(`Found main product image: ${img.dataset.oldHires}`);
            }
            if (img.dataset.aDynamicImage) {
                try {
                    const imageData = JSON.parse(img.dataset.aDynamicImage);
                    for (const [url, dimensions] of Object.entries(imageData)) {
                        if (url && this.isValidImageUrl(url)) {
                            this.images.add(url);
                            if (altText) this.altMap.set(url, altText);
                            console.log(`Found main dynamic image: ${url}`);
                        }
                    }
                } catch (e) {
                    console.warn('Error parsing data-a-dynamic-image JSON:', e);
                }
            }
        });
        // Skip review images - they are not main product images
    }

    // Fallback extraction - ONLY main product images
    async extractFallback() {
        console.log('🔍 Fallback extraction for main product images only...');

        // Only look within the main product image containers
        const mainContainers = document.querySelectorAll('#altImages, #imageBlock, #main-image-container');

        mainContainers.forEach(container => {
            const images = container.querySelectorAll('img');
            console.log(`Found ${images.length} images in main container`);

            images.forEach((img, index) => {
                try {
                    const sources = [
                        img.src,
                        img.dataset.oldHires,
                        img.dataset.aDynamicImage,
                        img.dataset.src,
                        img.getAttribute('data-src')
                    ];

                    const altText = img.alt || '';

                    sources.forEach(url => {
                        if (url && this.isValidImageUrl(url)) {
                            this.images.add(url);
                            if (altText) this.altMap.set(url, altText);
                            console.log(`Fallback found main image: ${url}`);
                        }
                    });
                } catch (e) {
                    console.warn(`Error processing fallback image ${index}: `, e);
                }
            });
        });
    }


    // Transform URLs to high resolution using comprehensive algorithm
    transformToHighRes() {
        const originalUrls = Array.from(this.images);
        this.images.clear(); // Clear and rebuild with high-res URLs

        originalUrls.forEach(url => {
            const highResUrl = this.getHighResUrl(url);
            this.images.add(highResUrl);

            // Map the new high-res URL to the original alt text if available
            if (this.altMap.has(url)) {
                this.altMap.set(highResUrl, this.altMap.get(url));
            }

            console.log(`Transformed: ${url} -> ${highResUrl}`);
        });
    }

    // Get high-resolution URL using comprehensive algorithm
    getHighResUrl(originalUrl) {
        if (!originalUrl) return originalUrl;

        let highResUrl = originalUrl;

        // Try to get highest resolution version using comprehensive patterns
        if (highResUrl.includes('._')) {
            // Extract base URL and extension
            const baseUrl = highResUrl.split('._')[0];
            const extension = highResUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[0] || '.jpg';
            highResUrl = `${baseUrl}${extension}`;
        }

        // Amazon image URL transformations for high resolution
        const transformations = [
            // Replace size indicators with high resolution
            { pattern: /\._[A-Z0-9]+_\./g, replacement: '_AC_SL1500_.' },
            { pattern: /_AC_SX90_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SX300_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SX500_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SX1000_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SY90_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SY300_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SY500_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SY1000_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_US\d+_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_U\d+_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_UL\d+_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_UX\d+_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_UY\d+_/g, replacement: '_AC_SL1500_' }
        ];

        transformations.forEach(transform => {
            highResUrl = highResUrl.replace(transform.pattern, transform.replacement);
        });

        return highResUrl;
    }

    // Validate image quality using comprehensive algorithm
    async validateImageQuality() {
        const imageUrls = Array.from(this.images);
        console.log(`Validating ${imageUrls.length} images for quality...`);

        // Remove duplicates and limit results (like the server algorithm)
        const uniqueUrls = [...new Set(imageUrls)].slice(0, 20);
        console.log(`Processing ${uniqueUrls.length} unique images(limited to 20)`);

        for (const url of uniqueUrls) {
            try {
                let isHighQuality = false;
                let contentType = 'image/jpeg'; // Default for Amazon images
                let contentLength = 'Unknown';

                // First, check URL patterns for high-res indicators
                if (this.isHighResUrl(url)) {
                    isHighQuality = true;
                    console.log(`✅ URL pattern indicates high - res: ${url}`);
                } else {
                    // Try HEAD request as fallback
                    try {
                        const response = await fetch(url, { method: 'HEAD' });
                        contentLength = response.headers.get('content-length');
                        contentType = response.headers.get('content-type');

                        // Check if image is high quality (larger than 50KB)
                        isHighQuality = contentLength && parseInt(contentLength) > 50000;

                        if (isHighQuality) {
                            console.log(`✅ HEAD request confirms high - res: ${url}(${contentLength} bytes)`);
                        }
                    } catch (headError) {
                        console.log(`HEAD request failed for ${url}, using URL pattern validation`);
                        // Use URL pattern as fallback
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
                    console.log(`✅ Added high - quality image: ${url} `);
                } else {
                    console.log(`❌ Rejected image: ${url} (quality: ${isHighQuality}, isImage: ${isImage})`);
                }
            } catch (error) {
                console.log(`Failed to validate image: ${url} `, error);
            }
        }

        console.log(`Validation complete.Found ${this.highQualityImages.length} high - quality images`);
    }

    // Get image alt text
    getImageAlt(url) {
        // Try to get from map first (fastest and most accurate for high-res transformed URLs)
        if (this.altMap.has(url)) {
            return this.sanitizeAltText(this.altMap.get(url));
        }

        const img = document.querySelector(`img[src = "${url}"]`);
        const rawAlt = img ? img.alt || 'Product Image' : 'Product Image';
        return this.sanitizeAltText(rawAlt);
    }

    // Check if URL is valid MAIN product image
    isValidImageUrl(url) {
        if (!url) return false;

        // Must be Amazon image URL
        if (!url.includes('amazon') || !url.includes('images')) {
            return false;
        }

        // Must be valid image format
        const validFormats = ['.jpg', '.jpeg', '.png', '.webp'];
        const hasValidFormat = validFormats.some(format => url.toLowerCase().includes(format));

        // Exclude non-product content (expanded list)
        const excludedContent = [
            'sprite', 'icon', 'logo', 'banner', 'data:image',
            'badge', 'button', 'nav', 'header', 'footer',
            'review', 'customer', 'avatar', 'profile',
            'transparent-pixel', 'spacer', 'loading',
            'prime', 'shipping', 'returns', 'warranty',
            'video-thumb', 'play-button', 'overlay'
        ];
        const hasExcludedContent = excludedContent.some(excluded => url.toLowerCase().includes(excluded));

        // Check minimum URL length (tiny images are usually icons)
        const isLongEnoughUrl = url.length > 50;

        return hasValidFormat && !hasExcludedContent && url.startsWith('http') && isLongEnoughUrl;
    }

    // Check if URL appears to be high resolution based on comprehensive patterns
    isHighResUrl(url) {
        if (!url) return false;

        // Check for high-resolution indicators in Amazon URLs
        const highResPatterns = [
            /_AC_SL\d+_/,  // Amazon's high-res pattern
            /_AC_SX\d+_/,  // Amazon's high-res pattern
            /_AC_SY\d+_/,  // Amazon's high-res pattern
            /_AC_U\d+_/,   // Amazon's high-res pattern
            /_AC_UL\d+_/,  // Amazon's high-res pattern
            /_AC_UX\d+_/,  // Amazon's high-res pattern
            /_AC_UY\d+_/,  // Amazon's high-res pattern
            /\._[A-Z0-9]+_\./,  // Generic high-res pattern
            /_AC_SL1500_/, // Specific high-res pattern
            /_AC_SL2000_/, // Specific high-res pattern
            /_AC_SL3000_/, // Specific high-res pattern
        ];

        return highResPatterns.some(pattern => pattern.test(url));
    }

}

// Initialize extractor when page loads
const extractor = new AmazonImageExtractor();

// Listen for messages from popup and other extension components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractImages') {
        extractor.extractAllImages().then(images => {
            sendResponse({ success: true, images: images });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
    }

    // Handle request to scrape product data for description generator
    if (request.action === 'SCRAPE_PRODUCT_DATA') {
        console.log('📦 [ProductScraper] Received SCRAPE_PRODUCT_DATA request');
        try {
            const productData = scrapeFullProductData();

            // Also store it for future use
            chrome.storage.local.set({
                currentProduct: productData,
                productDataTimestamp: Date.now()
            });

            sendResponse({ success: true, data: productData });
        } catch (error) {
            console.error('❌ [ProductScraper] Scrape error:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }
});

// Scrapes the main product title and displays it in the panel.
const scrapeAndDisplayInitialTitle = () => {
    const titleElement = document.getElementById('productTitle');
    if (!titleElement) return;
    const originalTitle = titleElement.innerText.trim();

    // SAFE UPDATE: Target the specific elements instead of wiping the container
    const titleDisplay = document.getElementById('ai-generated-title');
    const titleCounter = document.getElementById('ai-title-counter');

    if (titleDisplay) {
        titleDisplay.innerText = originalTitle; // Show original title as initial state
        // titleDisplay.classList.add('original-title-placeholder'); // Optional styling
    }

    if (titleCounter) {
        titleCounter.textContent = `${originalTitle.length} characters`;
    }

    console.log('✅ Initial title scraped and set safely:', originalTitle.substring(0, 30) + '...');
};

// Applies a watermark to an image using the Canvas API.
const applyWatermark = (imageUrl) => {
    return new Promise((resolve, reject) => {
        const watermark = new Image();
        const sourceImage = new Image();
        sourceImage.crossOrigin = "Anonymous";
        watermark.src = chrome.runtime.getURL('assets/watermark.png');
        sourceImage.src = imageUrl;

        Promise.all([new Promise(r => watermark.onload = r), new Promise(r => sourceImage.onload = r)]).then(() => {
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
            resolve(canvas.toDataURL('image/jpeg', 1.0)); // Ultra/High Quality

        }).catch(reject);
    });
};

// Scrape all high-quality images using the comprehensive extractor
const scrapeAndDisplayImages = async () => {
    const galleryContainer = document.getElementById('snipe-image-gallery');
    if (!galleryContainer) return;

    console.log('Starting comprehensive image extraction...');

    // Disable buttons during image processing
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
        // Use the comprehensive extractor
        const allImages = await extractor.extractAllImages();

        // Remove loading indicator
        const existingLoadingIndicator = document.getElementById('image-loading-indicator');
        if (existingLoadingIndicator) {
            existingLoadingIndicator.remove();
        }

        // Remove the initial "No images available" placeholder
        const galleryEmpty = galleryContainer.querySelector('.gallery-empty');
        if (galleryEmpty) {
            galleryEmpty.remove();
        }

        if (allImages.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.textContent = 'No high-quality product images found. Please check if this is a valid Amazon product page.';
            placeholder.style.padding = '20px';
            placeholder.style.textAlign = 'center';
            placeholder.style.color = '#666';
            galleryContainer.appendChild(placeholder);
            return;
        }

        console.log(`Processing ${allImages.length} high-quality images with progressive rendering`);

        // Check for Auto Watermark setting
        const settings = await chrome.storage.local.get(['autoWatermarkEnabled']);
        const autoWatermarkEnabled = settings.autoWatermarkEnabled || false;
        console.log(`💧 Auto Watermark Enabled: ${autoWatermarkEnabled}`);

        // Use performant ImageRenderer if available
        if (typeof ImageRenderer !== 'undefined') {
            await ImageRenderer.renderProcessedImages(galleryContainer, allImages, {
                processImage: async (url, index) => {
                    // Apply watermark to first image ONLY if setting is enabled
                    if (index === 0 && autoWatermarkEnabled) {
                        console.log('💧 Applying watermark to first image (Auto Watermark ON)');
                        return await processImageTo1600x1600(url);
                    }
                    // Default behavior: Original quality, no watermark
                    return await processImageOriginal(url);
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
                            let processedImageUrl;
                            if (i === 0 && autoWatermarkEnabled) {
                                processedImageUrl = await processImageTo1600x1600(imageInfo.url);
                            } else {
                                processedImageUrl = await processImageOriginal(imageInfo.url);
                            }
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

        // Re-enable buttons after successful processing
        if (optiListBtn) {
            optiListBtn.disabled = false;
            optiListBtn.textContent = 'List on eBay';
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

        // Remove loading indicator on error
        const existingLoadingIndicator = document.getElementById('image-loading-indicator');
        if (existingLoadingIndicator) {
            existingLoadingIndicator.remove();
        }

        // Re-enable buttons on error
        if (optiListBtn) {
            optiListBtn.disabled = false;
            optiListBtn.textContent = 'List on eBay';
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


// Process image preserving original quality (fetch as Blob -> Base64)
const processImageOriginal = (imageUrl) => {
    return new Promise((resolve, reject) => {
        console.log(`🔍 processImageOriginal: Fetching original image - ${imageUrl.substring(0, 100)}...`);

        fetch(imageUrl)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    console.log(`✅ processImageOriginal: Converted to Base64 (${reader.result.length} chars)`);
                    resolve(reader.result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.error('❌ processImageOriginal failed:', error);
                // Fallback to canvas method if fetch fails (e.g. CORS issues handled differently by img tag)
                processImageTo1600x1600NoWatermark(imageUrl).then(resolve).catch(reject);
            });
    });
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

            // Set canvas to fixed 1600x1600 dimensions
            canvas.width = 1600;
            canvas.height = 1600;

            // Fill canvas with white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 1600, 1600);

            // Calculate aspect ratio to fit image within 1600x1600 without distortion
            const sourceAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
            const targetAspect = 1600 / 1600; // 1:1 square

            let drawWidth, drawHeight, drawX, drawY;

            if (sourceAspect > targetAspect) {
                // Source is wider - fit to width
                drawWidth = 1600;
                drawHeight = 1600 / sourceAspect;
                drawX = 0;
                drawY = (1600 - drawHeight) / 2;
            } else {
                // Source is taller - fit to height
                drawHeight = 1600;
                drawWidth = 1600 * sourceAspect;
                drawX = (1600 - drawWidth) / 2;
                drawY = 0;
            }

            // Draw the resized image centered on white background
            ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);

            // Export as high-quality JPEG (no watermark)
            resolve(canvas.toDataURL('image/jpeg', 1.0));
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

            // Set canvas to fixed 1600x1600 dimensions
            canvas.width = 1600;
            canvas.height = 1600;

            // Fill canvas with white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 1600, 1600);

            // Calculate aspect ratio to fit image within 1600x1600 without distortion
            const sourceAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
            const targetAspect = 1600 / 1600; // 1:1 square

            let drawWidth, drawHeight, drawX, drawY;

            if (sourceAspect > targetAspect) {
                // Source is wider - fit to width
                drawWidth = 1600;
                drawHeight = 1600 / sourceAspect;
                drawX = 0;
                drawY = (1600 - drawHeight) / 2;
            } else {
                // Source is taller - fit to height
                drawHeight = 1600;
                drawWidth = 1600 * sourceAspect;
                drawX = (1600 - drawWidth) / 2;
                drawY = 0;
            }

            // Draw the resized image centered on white background
            ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);

            // Apply watermark
            ctx.globalAlpha = 1.0;
            const padding = 20;
            const watermarkWidth = 1600 / 4;
            const watermarkHeight = (watermark.naturalHeight / watermark.naturalWidth) * watermarkWidth;
            const watermarkX = 1600 - watermarkWidth - padding;
            const watermarkY = 1600 - watermarkHeight - padding;
            ctx.drawImage(watermark, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
            ctx.globalAlpha = 1.0;

            // Export as high-quality JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
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
            // CRITICAL: Only store images that are watermarked and processed (match uploader validation)
            if (img.src.length > 10000) { // Match image-uploader.js validation requirement
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

            // Verify storage
            const verification = await chrome.storage.local.get(['watermarkedImages']);
            console.log(`🔍 storeWatermarkedImages: Storage verification - ${verification.watermarkedImages?.length || 0} images in storage`);

            // Additional verification - check if images are valid Data URLs
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

        // Get current stored images
        const result = await chrome.storage.local.get(['watermarkedImages']);
        const storedImages = result.watermarkedImages || [];

        // Remove the specific image from storage
        if (storedImages.length > imageIndex) {
            storedImages.splice(imageIndex, 1);

            // Update storage with remaining images
            await chrome.storage.local.set({ watermarkedImages: storedImages });
            console.log(`Image ${imageIndex + 1} deleted from storage. ${storedImages.length} images remaining.`);
        }

        // Remove from UI with animation
        imgContainer.style.transition = 'all 0.3s ease';
        imgContainer.style.transform = 'scale(0)';
        imgContainer.style.opacity = '0';

        setTimeout(() => {
            imgContainer.remove();

            // Update image numbers for remaining images
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

        // Update data attribute
        container.setAttribute('data-image-index', index);
    });

    console.log(`Updated image numbers. ${imageContainers.length} images remaining.`);
};


// Generates simple, rule-based title variations with typewriter animation.
const generateTitleVariations = (originalTitle) => {
    // Legacy function disabled to prevent overwriting the new Single Title Display UI
    console.log('generateTitleVariations disabled (Legacy)');
    return;
};

// Adds event listeners to the buttons inside our injected panel.
const addEventListenersToPanel = () => {

    // ═══════════════════════════════════════════════════════════
    // Editable Title (Live Character Count)
    // ═══════════════════════════════════════════════════════════
    const titleDisplay = document.getElementById('ai-generated-title');
    const titleCounter = document.getElementById('ai-title-counter');
    if (titleDisplay && titleCounter) {
        titleDisplay.addEventListener('input', () => {
            const currentText = titleDisplay.innerText || '';
            titleCounter.textContent = `${currentText.length} / 80 chars`;
        });
    }

    // ═══════════════════════════════════════════════════════════
    // Panel Controls (Header)
    // ═══════════════════════════════════════════════════════════
    const nightModeBtn = document.getElementById('panel-night-mode-btn');
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

    const minimizeBtn = document.getElementById('panel-minimize-btn');
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

    const closeBtn = document.getElementById('panel-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const rootWrapper = document.getElementById('snipe-root-wrapper');
            if (rootWrapper) {
                rootWrapper.remove();
                uiInjected = false;
                const startBtn = document.getElementById('initial-list-button') || document.querySelector('.floating-snipe-btn');
                if (startBtn) {
                    startBtn.style.display = 'flex';
                }
            }
        });
    }
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
                window.UIHelper?.showToast?.('AI title generation not available', 'warning');
            }
        });
        console.log('✅ Snipe Title button listener added (auto-triggers AI generation)');
    }

    // Generate AI Titles button
    const generateAITitlesBtn = document.getElementById('generate-ai-titles-btn');
    if (generateAITitlesBtn) {
        generateAITitlesBtn.addEventListener('click', async () => {
            // Get comprehensive product data
            const completeData = scrapeCompleteProductData();

            if (!completeData.title) {
                window.UIHelper?.showToast?.('No product title found on page', 'error');
                return;
            }

            // Update button state
            const originalContent = generateAITitlesBtn.innerHTML;
            generateAITitlesBtn.disabled = true;
            generateAITitlesBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-animation">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Generating...
            `;

            try {
                // FIXED: Route through background script to use correct auth token (like description does)
                const bgResp = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        {
                            action: 'GENERATE_AI_TITLES',
                            productData: {
                                title: completeData.title,
                                description: completeData.description,
                                category: Array.isArray(completeData.category) ? completeData.category.join(' > ') : completeData.category,
                                brand: completeData.brand,
                                price: completeData.price,
                                specifications: completeData.specifications,
                                bulletPoints: completeData.bulletPoints
                            }
                        },
                        (response) => {
                            const err = chrome.runtime.lastError;
                            if (err) return reject(new Error(err.message || 'Background message failed'));
                            resolve(response);
                        }
                    );
                });

                console.log('📥 BG RESPONSE (GENERATE_AI_TITLES):', bgResp);

                if (!bgResp?.success) {
                    throw new Error(bgResp?.error || 'Failed to generate titles');
                }

                if (bgResp.titles && bgResp.titles.length > 0) {
                    // Populate the title inputs
                    const titles = bgResp.titles;
                    console.log('🎯 AI Titles generated:', titles);

                    // Save titles to storage
                    const titlesToSave = titles.map((t, i) => typeof t === 'object' ? t.title : t);
                    await chrome.storage.local.set({ savedTitles: titlesToSave });

                    // TRIGGER INLINE UI safely
                    if (typeof window !== 'undefined' && window.UIHelper && typeof window.UIHelper.renderInlineTitles === 'function') {
                        window.UIHelper.renderInlineTitles(titles);
                    } else if (typeof UIHelper !== 'undefined' && typeof UIHelper.renderInlineTitles === 'function') {
                        UIHelper.renderInlineTitles(titles);
                    } else {
                        console.error('❌ UIHelper.renderInlineTitles is not available globally');
                    }

                    // Keep legacy update just in case, but popup is primary now
                    // Update title textareas inside the panel
                    titlesToSave.forEach((titleValue, index) => {
                        const textarea = document.getElementById(`ai-title-${index + 1}`);
                        if (textarea) {
                            textarea.value = titleValue || '';
                            textarea.style.height = 'auto';
                            textarea.style.height = textarea.scrollHeight + 'px';

                            // Update character counter
                            const counter = document.getElementById(`title-counter-${index + 1}`);
                            if (counter) {
                                counter.textContent = (titleValue || '').length;
                            }

                            // Add animation class to parent row
                            const row = textarea.closest('.title-row');
                            if (row) {
                                row.classList.remove('title-generating', 'title-row-empty');
                                row.classList.add('title-generated');
                            }
                        }
                    });

                    window.UIHelper?.showToast?.(`AI titles generated using ${bgResp.provider || 'Lovable AI'}!`, 'success');
                } else {
                    throw new Error('No titles returned');
                }
            } catch (error) {
                console.error('❌ Error generating AI titles:', error);
                window.UIHelper?.showToast?.(error.message || 'Failed to generate AI titles', 'error');
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
    const copyDescriptionBtn = document.getElementById('copy-description-btn');
    const pasteDescriptionBtn = document.getElementById('paste-description-btn');

    let lastGeneratedDescription = '';

    if (generateDescriptionBtn) {
        generateDescriptionBtn.addEventListener('click', async () => {
            const originalContent = generateDescriptionBtn.innerHTML;
            generateDescriptionBtn.disabled = true;

            if (descriptionPreviewEl) {
                descriptionPreviewEl.innerHTML = `
                    <div class="description-placeholder">
                        <div class="spinner-small"></div>
                        <span>Scraping product data (see console) ...</span>
                    </div>
                `;
            }

            try {
                // DEBUG: Log ExtensionConfig to verify it's loaded
                console.log('═══════════════════════════════════════════════════════');
                console.log('🔍 DEBUG: ExtensionConfig Check');
                console.log('═══════════════════════════════════════════════════════');
                console.log('ExtensionConfig exists:', typeof ExtensionConfig !== 'undefined');
                console.log('SUPABASE_FUNCTIONS URL:', ExtensionConfig?.URLS?.SUPABASE_FUNCTIONS);
                console.log('SUPABASE_ANON Key (first 20 chars):', ExtensionConfig?.API_KEYS?.SUPABASE_ANON?.substring(0, 20) + '...');
                console.log('═══════════════════════════════════════════════════════');

                // 1) Scrape ALL product data and print it to the console (what you asked for)
                const productData = scrapeFullProductData();
                console.log('═══════════════════════════════════════════════════════');
                if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) {
                    console.log('📦 DESCRIPTION [PROD GUARDED]: FULL SCRAPED PRODUCT DATA');
                    console.log('DATA:', productData);
                }
                console.log('═══════════════════════════════════════════════════════');

                if (!productData?.title) {
                    throw new Error('No product title found. Open an Amazon product page (not search results).');
                }

                if (descriptionPreviewEl) {
                    descriptionPreviewEl.innerHTML = `
                        <div class="description-placeholder">
                            <div class="spinner-small"></div>
                            <span>Refining with AI prompt...</span>
                        </div>
                    `;
                }

                // 2) Send scraped data to backend for refinement + template generation
                // IMPORTANT: Do this request via the background service worker to avoid
                // page-level CORS/CSP/network restrictions from Amazon pages.
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

                console.log('═══════════════════════════════════════════════════════');
                console.log('📥 BG RESPONSE (GENERATE_DESCRIPTION)');
                console.log('═══════════════════════════════════════════════════════');
                console.log(bgResp);
                console.log('═══════════════════════════════════════════════════════');

                if (!bgResp?.success) {
                    throw new Error(bgResp?.error || 'Failed to generate description');
                }

                if (!bgResp?.description) {
                    throw new Error('No description returned');
                }

                lastGeneratedDescription = bgResp.description;

                if (descriptionPreviewEl) {
                    descriptionPreviewEl.innerHTML = lastGeneratedDescription;
                }

                if (copyDescriptionBtn) copyDescriptionBtn.disabled = false;
                // Paste is not wired yet anywhere else in the extension, keep disabled for now.
                if (pasteDescriptionBtn) pasteDescriptionBtn.disabled = true;

                chrome.storage.local.set({ generatedDescription: lastGeneratedDescription });

                window.UIHelper?.showToast?.(`Description generated using ${bgResp.provider || 'AI'}!`, 'success');
                console.log('✅ AI Description generated:', { provider: bgResp.provider, model: bgResp.model, length: bgResp.length });
            } catch (err) {
                console.error('═══════════════════════════════════════════════════════');
                console.error('❌ ERROR GENERATING AI DESCRIPTION');
                console.error('═══════════════════════════════════════════════════════');
                console.error('Error type:', err.name);
                console.error('Error message:', err.message);
                console.error('Error stack:', err.stack);
                console.error('Full error object:', err);
                console.error('═══════════════════════════════════════════════════════');

                // Check error type and provide helpful message
                let errorMessage = err?.message || 'Failed to generate description';
                let isNetworkError = err.name === 'TypeError' && err.message === 'Failed to fetch';
                let isRateLimitError = errorMessage.includes('Rate limit') || errorMessage.includes('429');
                let isCreditsError = errorMessage.includes('credits') || errorMessage.includes('402');

                let displayHtml = '';

                if (isNetworkError) {
                    displayHtml = `
                        <div style="text-align: left; padding: 15px;">
                            <strong style="color: #dc2626; font-size: 14px;">⚠️ Network Error</strong>
                            <p style="margin: 10px 0; font-size: 13px; color: #374151;">
                                Could not connect to the AI service. Please check your internet connection and try again.
                            </p>
                            <p style="font-size: 11px; color: #6b7280; margin: 5px 0 0 0;">
                                💡 If the problem persists, the service may be temporarily unavailable.
                            </p>
                        </div>
                    `;
                } else if (isRateLimitError) {
                    displayHtml = `
                        <div style="text-align: left; padding: 15px;">
                            <strong style="color: #f59e0b; font-size: 14px;">⏳ Rate Limit Exceeded</strong>
                            <p style="margin: 10px 0; font-size: 13px; color: #374151;">
                                Too many requests. Please wait a moment and try again.
                            </p>
                        </div>
                    `;
                } else if (isCreditsError) {
                    displayHtml = `
                        <div style="text-align: left; padding: 15px;">
                            <strong style="color: #dc2626; font-size: 14px;">💳 AI Credits Exhausted</strong>
                            <p style="margin: 10px 0; font-size: 13px; color: #374151;">
                                Your AI credits have been used up. Please add more credits to continue.
                            </p>
                        </div>
                    `;
                } else {
                    displayHtml = `
                        <div class="description-placeholder" style="color: #dc2626;">
                            <span>${errorMessage}</span>
                        </div>
                    `;
                }

                if (descriptionPreviewEl) {
                    descriptionPreviewEl.innerHTML = displayHtml;
                }

                window.UIHelper?.showToast?.(errorMessage, 'error');
            } finally {
                generateDescriptionBtn.disabled = false;
                generateDescriptionBtn.innerHTML = originalContent;
            }
        });
        console.log('✅ Generate AI Description button listener added');
    }

    if (copyDescriptionBtn) {
        copyDescriptionBtn.addEventListener('click', async () => {
            const text = lastGeneratedDescription || (await chrome.storage.local.get('generatedDescription'))?.generatedDescription || '';
            if (!text) {
                window.UIHelper?.showToast?.('No description to copy', 'warning');
                return;
            }
            try {
                await navigator.clipboard.writeText(text);
                window.UIHelper?.showToast?.('Description copied (HTML)!', 'success');
            } catch (e) {
                console.error('❌ Copy description failed:', e);
                window.UIHelper?.showToast?.('Copy failed', 'error');
            }
        });
        console.log('✅ Copy Description button listener added');
    }

    // ═══════════════════════════════════════════════════════════
    // 📋 SCRAPE PREVIEW DRAWER
    // ═══════════════════════════════════════════════════════════
    const scrapePreviewBtn = document.getElementById('scrape-preview-btn');
    const scrapeDrawer = document.getElementById('scrape-preview-drawer');
    const scrapeDrawerCloseBtn = document.getElementById('scrape-drawer-close-btn');
    const scrapeDrawerOverlay = scrapeDrawer?.querySelector('.scrape-drawer-overlay');
    const scrapeRefreshBtn = document.getElementById('scrape-refresh-btn');
    const scrapeCopyJsonBtn = document.getElementById('scrape-copy-json-btn');
    const scrapeSummaryEl = document.getElementById('scrape-summary');
    const scrapeJsonEl = document.getElementById('scrape-json-preview');

    let lastScrapedData = null;

    const syntaxHighlightJSON = (json) => {
        if (typeof json !== 'string') {
            json = JSON.stringify(json, null, 2);
        }
        return json
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
                let cls = 'json-string';
                if (/:$/.test(match)) {
                    cls = 'json-key';
                    match = match.replace(/:$/, '') + ':';
                }
                return `<span class="${cls}">${match}</span>`;
            })
            .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
            .replace(/\bnull\b/g, '<span class="json-null">null</span>')
            .replace(/\b(\d+)\b/g, '<span class="json-number">$1</span>');
    };

    const updateScrapeSummary = (data) => {
        if (!scrapeSummaryEl) return;
        const cards = [
            { label: 'Title', value: data.title ? (data.title.substring(0, 40) + (data.title.length > 40 ? '...' : '')) : 'Not found', status: data.title ? 'success' : 'error' },
            { label: 'Brand', value: data.brand || 'Not found', status: data.brand ? 'success' : 'warning' },
            { label: 'Price', value: data.price || 'Not found', status: data.price ? 'success' : 'warning' },
            { label: 'Bullet Points', value: `${data.bulletPoints?.length || 0} items`, status: data.bulletPoints?.length > 0 ? 'success' : 'warning' },
            { label: 'Description', value: data.description ? `${data.description.length} chars` : 'Not found', status: data.description ? 'success' : 'warning' },
            { label: 'Specifications', value: `${Object.keys(data.specifications || {}).length} items`, status: Object.keys(data.specifications || {}).length > 0 ? 'success' : 'warning' },
        ];
        scrapeSummaryEl.innerHTML = cards.map(c => `
            <div class="scrape-summary-card">
                <div class="label">${c.label}</div>
                <div class="value ${c.status}">${c.value}</div>
            </div>
        `).join('');
    };

    const doScrapePreview = () => {
        const data = scrapeFullProductData();
        lastScrapedData = data;
        updateScrapeSummary(data);
        if (scrapeJsonEl) {
            scrapeJsonEl.innerHTML = syntaxHighlightJSON(data);
        }
        console.log('═══════════════════════════════════════════════════════');
        if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) {
            console.log('📋 SCRAPE PREVIEW [PROD GUARDED]: Full scraped data');
            console.log('SCRAPE_DATA:', data);
        }
        console.log('═══════════════════════════════════════════════════════');
    };

    const openScrapeDrawer = () => {
        if (scrapeDrawer) {
            scrapeDrawer.style.display = 'flex';
            doScrapePreview();
        }
    };

    const closeScrapeDrawer = () => {
        if (scrapeDrawer) {
            scrapeDrawer.style.display = 'none';
        }
    };

    if (scrapePreviewBtn) {
        scrapePreviewBtn.addEventListener('click', openScrapeDrawer);
        console.log('✅ Scrape Preview button listener added');
    }

    if (scrapeDrawerCloseBtn) {
        scrapeDrawerCloseBtn.addEventListener('click', closeScrapeDrawer);
    }

    if (scrapeDrawerOverlay) {
        scrapeDrawerOverlay.addEventListener('click', closeScrapeDrawer);
    }

    if (scrapeRefreshBtn) {
        scrapeRefreshBtn.addEventListener('click', doScrapePreview);
    }

    if (scrapeCopyJsonBtn) {
        scrapeCopyJsonBtn.addEventListener('click', async () => {
            if (!lastScrapedData) {
                window.UIHelper?.showToast?.('No data to copy', 'warning');
                return;
            }
            try {
                await navigator.clipboard.writeText(JSON.stringify(lastScrapedData, null, 2));
                window.UIHelper?.showToast?.('JSON copied to clipboard!', 'success');
            } catch (e) {
                console.error('❌ Copy JSON failed:', e);
                window.UIHelper?.showToast?.('Copy failed', 'error');
            }
        });
    }


    const titleRows = document.querySelectorAll('#snipe-title-list .title-row');
    titleRows.forEach(row => {
        row.addEventListener('click', (e) => {
            // Don't select if clicking on input or copy button
            if (e.target.closest('.btn-copy-title') || e.target.closest('.title-input')) {
                return;
            }
            selectTitleRow(row);
        });
    });
    console.log('✅ Title row selection listeners added');

    // Copy title buttons
    document.querySelectorAll('.btn-copy-title').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (input && input.value) {
                UIHelper?.copyToClipboard?.(input.value);
            } else {
                window.UIHelper?.showToast?.('No title to copy', 'warning');
            }
        });
    });
    const optiListBtn = document.getElementById('opti-list-btn');
    if (optiListBtn) {
        optiListBtn.addEventListener('click', async () => {
            // 🔒 AUTH PRE-FLIGHT
            // We ask background to check status. If locked, background redirects and returns error.
            chrome.runtime.sendMessage({ action: "CHECK_AUTH" }, async (authResponse) => {
                if (!authResponse || !authResponse.success) {
                    console.warn("🔐 Auth Check Failed or Redirected by Background");
                    return;
                }

                // ✅ Auth OK - Proceed with Logic
                // ✅ Auth OK - Proceed with Logic
                // Check for EITHER legacy selected row OR new Single Title Display
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
                            // Helper check for default text (simplified)
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
                        // ═══════════════════════════════════════════════════════════
                        // 📊 RETRIEVE SAVED COPY BUTTON DATA
                        // ═══════════════════════════════════════════════════════════
                        console.log('═══════════════════════════════════════════════════════');
                        console.log('📋 OPTI-LIST: RETRIEVING SAVED COPY BUTTON DATA');
                        console.log('═══════════════════════════════════════════════════════');

                        // Retrieve saved Copy button data from storage
                        const storageResult = await chrome.storage.local.get('copyButtonData');
                        const exportData = storageResult.copyButtonData;

                        if (!exportData) {
                            console.warn('⚠️ WARNING: No saved Copy button data found!');
                            console.warn('   Please click Copy button first to save the data.');
                            alert('⚠️ No saved data found!\n\nPlease click the Copy button first to save the product data.');
                            btn.disabled = false;
                            btn.textContent = 'List on eBay';
                            return;
                        }

                        console.log('═══════════════════════════════════════════════════════');
                        console.log('📊 RETRIEVED COPY BUTTON DATA FROM STORAGE:');
                        console.log('═══════════════════════════════════════════════════════');
                        console.log('   Timestamp:', exportData.timestamp);
                        console.log('   Title:', exportData.title);
                        console.log('   SKU:', exportData.sku);
                        console.log('   Sell Price (calculated):', exportData.sellPrice);
                        console.log('   Amazon Price:', exportData.amazonPrice);
                        console.log('   Amazon Link:', exportData.amazonLink);
                        console.log('═══════════════════════════════════════════════════════');

                        // Validate saved data
                        if (!exportData.title || exportData.title === 'No title selected') {
                            console.warn('⚠️ WARNING: No title in saved data!');
                            alert('⚠️ No title in saved data!\n\nPlease click Copy button again after selecting a title.');
                            btn.disabled = false;
                            btn.textContent = 'List on eBay';
                            return;
                        }

                        if (!exportData.sku || exportData.sku === 'No SKU') {
                            console.warn('⚠️ WARNING: No SKU in saved data!');
                            alert('⚠️ No SKU in saved data!\n\nPlease click Copy button again after generating a SKU.');
                            btn.disabled = false;
                            btn.textContent = 'List on eBay';
                            return;
                        }

                        // Check if price is missing
                        if (exportData.sellPrice === 'No price' || !exportData.sellPrice) {
                            console.warn('⚠️ WARNING: No calculated price in saved data!');
                            alert('⚠️ No calculated price in saved data!\n\nPlease click Copy button again after calculating the price.');
                            btn.disabled = false;
                            btn.textContent = 'List on eBay';
                            return;
                        }

                        // Also save to Chrome storage for eBay listing
                        // Check for recently selected AI title from popup FIRST
                        const titleStorage = await chrome.storage.local.get(['selectedEbayTitle', 'selectedTitleTimestamp']);
                        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
                        const useSelectedTitle = titleStorage.selectedTitleTimestamp &&
                            titleStorage.selectedTitleTimestamp >= thirtyMinutesAgo &&
                            titleStorage.selectedEbayTitle &&
                            titleStorage.selectedEbayTitle.trim() !== '';

                        let selectedTitle;
                        if (useSelectedTitle) {
                            selectedTitle = titleStorage.selectedEbayTitle;
                            console.log('📋 [Opti-List] Using selected AI title from popup:', selectedTitle);
                        } else {
                            selectedTitle = exportData.title;
                            console.log('📋 [Opti-List] Using title from Copy button data:', selectedTitle);
                        }

                        const sku = exportData.sku;
                        const price = exportData.sellPrice;

                        const productDetails = scrapeProductDetails();
                        await storeWatermarkedImages();

                        // Verify images were stored successfully before proceeding
                        console.log('═══════════════════════════════════════════════════════');
                        console.log('🔍 Verifying image storage before navigation...');
                        console.log('═══════════════════════════════════════════════════════');
                        const storageVerification = await chrome.storage.local.get(['watermarkedImages']);
                        const storedImages = storageVerification.watermarkedImages || [];
                        console.log(`📸 Storage verification: Found ${storedImages.length} images in storage`);

                        if (storedImages.length === 0) {
                            console.error('═══════════════════════════════════════════════════════');
                            console.error('❌ CRITICAL: No images found in storage after storeWatermarkedImages()!');
                            console.error('═══════════════════════════════════════════════════════');
                            btn.disabled = false;
                            btn.textContent = '❌ No Images - Try Again';
                            alert('⚠️ Error: Images were not stored properly. Please try again or check console for details.');
                            return;
                        } else {
                            console.log('✅ Image storage verification passed - proceeding to eBay');
                            // Log first image details for debugging
                            if (storedImages[0]) {
                                const firstImageSize = storedImages[0].length;
                                console.log(`📊 First image: ${firstImageSize} chars, is Data URL: ${storedImages[0].startsWith('data:image')}`);
                            }
                        }
                        console.log('═══════════════════════════════════════════════════════');

                        const listingData = {
                            productTitle: selectedTitle,
                            ebayTitle: selectedTitle,
                            ebaySku: sku,
                            ebayPrice: price,
                            ...productDetails
                        };

                        // Save to Chrome storage with explicit keys
                        await chrome.storage.local.set(listingData);
                        if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('✅ All listing data saved (hidden in prod)', listingData);

                        // Convert Copy button data format to format expected by START_OPTILIST
                        // Parse prices - handle both string and number formats
                        const finalPrice = exportData.sellPrice === 'No price' ? '0' : String(exportData.sellPrice);
                        const amazonPrice = exportData.amazonPrice === 'No price found' ? '0' : String(exportData.amazonPrice);

                        console.log('═══════════════════════════════════════════════════════');
                        console.log('📤 CONVERTED DATA FOR GOOGLE SHEETS:');
                        console.log('═══════════════════════════════════════════════════════');
                        console.log('   Title:', exportData.title);
                        console.log('   SKU:', exportData.sku);
                        console.log('   eBay Price (finalPrice):', finalPrice, '(type:', typeof finalPrice, ')');
                        console.log('   Amazon Price (amazonPrice):', amazonPrice, '(type:', typeof amazonPrice, ')');
                        console.log('   Amazon Link (productURL):', exportData.amazonLink);
                        console.log('═══════════════════════════════════════════════════════');

                        // Get the main product image URL
                        const mainImageEl = document.querySelector('#landingImage') || document.querySelector('#imgBlkFront');
                        const mainImage = mainImageEl?.getAttribute('data-old-hires') ||
                            mainImageEl?.getAttribute('src') ||
                            exportData.amazonImage ||
                            '';

                        // Prepare message data - use selectedTitle (which prioritizes AI-selected title)
                        const messageData = {
                            action: "START_OPTILIST",
                            title: selectedTitle,  // Use the prioritized title (AI-selected or fallback)
                            sku: exportData.sku,
                            finalPrice: finalPrice,
                            amazonPrice: amazonPrice,
                            productURL: exportData.amazonLink,
                            asin: exportData.asin || exportData.sku,
                            mainImage: mainImage
                        };

                        console.log('📋 [Opti-List] Final title being sent to background:', selectedTitle);

                        console.log('═══════════════════════════════════════════════════════');
                        console.log('📨 SENDING MESSAGE TO BACKGROUND.JS:');
                        console.log('═══════════════════════════════════════════════════════');
                        console.log('Message data:', JSON.stringify(messageData, null, 2));
                        console.log('═══════════════════════════════════════════════════════');

                        try {
                            chrome.runtime.sendMessage(messageData, (response) => {
                                // Check for errors first
                                if (chrome.runtime.lastError) {
                                    console.error('═══════════════════════════════════════════════════════');
                                    console.error('❌ ERROR: Message failed to send to background.js');
                                    console.error('═══════════════════════════════════════════════════════');
                                    console.error('Error:', chrome.runtime.lastError.message);
                                    console.error('Error details:', chrome.runtime.lastError);
                                    console.error('═══════════════════════════════════════════════════════');
                                    btn.disabled = false;
                                    btn.textContent = '❌ Error - Try Again';
                                    alert('Failed to send data to Google Sheets. Error: ' + chrome.runtime.lastError.message);
                                    return;
                                }

                                // Handle response
                                console.log('═══════════════════════════════════════════════════════');
                                console.log('📥 RESPONSE RECEIVED FROM BACKGROUND.JS:');
                                console.log('═══════════════════════════════════════════════════════');
                                console.log('Response:', response);
                                console.log('Response type:', typeof response);
                                console.log('Response success:', response?.success);
                                console.log('Response error:', response?.error);
                                console.log('═══════════════════════════════════════════════════════');

                                if (response && response.success) {
                                    console.log('✅ SUCCESS: Data sent to Google Sheets via background.js');
                                    btn.textContent = '✅ Sent to Sheets!';
                                    setTimeout(() => {
                                        btn.disabled = false;
                                        btn.textContent = 'List on eBay';
                                    }, 3000);
                                } else if (response && response.error) {
                                    console.error('❌ ERROR FROM BACKGROUND.JS:', response.error);
                                    btn.textContent = '⚠️ Error: ' + response.error;
                                    btn.disabled = false;
                                    alert('Failed to send data to Google Sheets: ' + response.error);
                                } else {
                                    console.warn('⚠️ No response or unexpected response format');
                                    console.warn('Response received:', response);
                                    // Still show success if message was sent (background.js might not send response)
                                    btn.textContent = '✅ Sent (no response)';
                                    setTimeout(() => {
                                        btn.disabled = false;
                                        btn.textContent = 'List on eBay';
                                    }, 2000);
                                }
                            });

                            console.log('✅ Message sent to background.js, waiting for response...');
                        } catch (sendError) {
                            console.error('═══════════════════════════════════════════════════════');
                            console.error('❌ EXCEPTION: Failed to send message');
                            console.error('═══════════════════════════════════════════════════════');
                            console.error('Error:', sendError);
                            console.error('Error message:', sendError.message);
                            console.error('Error stack:', sendError.stack);
                            console.error('═══════════════════════════════════════════════════════');
                            btn.disabled = false;
                            btn.textContent = '❌ Error - Try Again';
                            alert('Failed to send data. Error: ' + sendError.message);
                        }
                    } catch (error) {
                        console.error('Error in Opti-List process:', error);
                        btn.disabled = false;
                        btn.textContent = 'List on eBay';
                    }
                } else {
                    alert("Please select a title first.");
                }
            }); // End sendMessage
        }); // End addEventListener
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
                console.log('═══════════════════════════════════════════════════════');
                console.log('   Timestamp:', productData.timestamp);
                console.log('   Title:', productData.title);
                console.log('   SKU:', productData.sku);
                console.log('   Sell Price (calculated):', productData.sellPrice);
                console.log('   Amazon Price:', productData.amazonPrice);
                console.log('   Amazon Link:', productData.amazonLink);
                console.log('═══════════════════════════════════════════════════════');

                // Check if price is missing
                if (productData.sellPrice === 'No price' || !productData.sellPrice) {
                    console.warn('⚠️ WARNING: No calculated price found!');
                    console.warn('   Please calculate the price first using the calculator.');
                    alert('⚠️ No calculated price found!\n\nPlease calculate the price first using the calculator (💰 Calculator or 💲 Quick Calculate button).');
                    return;
                }

                const tabSeparatedData = formatDataForCopy(productData);
                console.log('📋 Tab-separated data to copy:');
                if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log(tabSeparatedData);
                console.log('═══════════════════════════════════════════════════════');

                // Copy to clipboard
                await navigator.clipboard.writeText(tabSeparatedData);

                // Save data to storage for Opti-List to use later
                await chrome.storage.local.set({
                    copyButtonData: productData
                });
                console.log('💾 Copy button data saved to storage for Opti-List');

                // Visual feedback
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅ Copied!';
                copyBtn.style.background = '#28a745';

                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '';
                }, 2000);

                console.log('✅ Data successfully copied to clipboard and saved!');
            } catch (error) {
                console.error('═══════════════════════════════════════════════════════');
                console.error('❌ ERROR COPYING DATA:');
                console.error('═══════════════════════════════════════════════════════');
                console.error('Error:', error);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                console.error('═══════════════════════════════════════════════════════');
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
                amazonURL: productURL
            });
            console.log('✅ Description button clicked');
        });
        console.log('✅ Description button listener added');
    }

    // Product Details button
    const productDetailsBtn = document.getElementById('product-details-btn');
    if (productDetailsBtn) {
        productDetailsBtn.addEventListener('click', () => {
            // Scrape the product title instead of URL
            const productTitle = document.querySelector('#productTitle')?.innerText?.trim() || 'Product Title Not Found';
            const targetWebsiteURL = 'https://gemini.google.com/gem/6dced44c5365?usp=sharing';

            chrome.runtime.sendMessage({
                action: 'openNewTabForProductDetails',
                targetURL: targetWebsiteURL,
                amazonTitle: productTitle
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

    // Load SKU settings on page load
    loadSKUSettings();

    // Listen for SKU settings updates
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && (changes.selectedSKU || changes.autoSkuEnabled)) {
            console.log('🔄 SKU settings changed, reloading...');
            loadSKUSettings();
        }
    });

    // Listen for runtime messages
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

    // Add a function to check stored SKU (for debugging)
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

    // Add a function to clear stored SKU (for testing)
    window.clearStoredSku = () => {
        chrome.storage.local.remove(['ebaySku'], () => {
            console.log('🧹 SKU cleared from storage');
            alert('SKU cleared from storage');
        });
    };
};

// Helper function to handle AI Title Generation
const generateAiTitle = async (inputElement, rowElement, generateBtn, useBtn) => {
    // Robust title scraping
    const getProductTitle = () => {
        const output = document.getElementById('productTitle')?.innerText.trim() ||
            document.querySelector('#productTitle')?.innerText.trim() ||
            document.querySelector('h1')?.innerText.trim() ||
            document.title.replace(/[:|].*$/, '').trim(); // Fallback to page title
        return output;
    };

    const productTitle = getProductTitle();
    // Simple extraction of price
    const price = document.querySelector('.a-price-whole')?.innerText.replace(/[^\d.]/g, '') ||
        document.querySelector('.a-price .a-offscreen')?.innerText.replace(/[^\d.]/g, '') || '0.00';

    if (!productTitle) {
        console.warn('❌ Could not find product title');
        inputElement.value = "Error: Could not find product title on page.";
        generateBtn.textContent = 'Failed';
        setTimeout(() => { generateBtn.textContent = 'Generate'; generateBtn.disabled = false; }, 2000);
        return;
    }

    // Get full product details
    const details = scrapeProductDetails();

    // Extract keywords (basic implementation)
    const keywords = [];
    const featureBullets = document.querySelectorAll('#feature-bullets li span.a-list-item');
    featureBullets.forEach(bullet => {
        keywords.push(bullet.innerText.trim());
    });

    const productData = {
        title: productTitle,
        price: price,
        keywords: keywords.slice(0, 5), // Limit to top 5 bullets
        ...details // Spread the scraped details (brand, model, description, etc.)
    };

    if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('🤖 AI Title Request Data (hidden in prod)', productData);

    // Get API Key and Prompt from storage
    const settings = await chrome.storage.local.get(['geminiApiKey', 'titleGenerationPrompt', 'geminiModel']);
    const apiKey = settings.geminiApiKey;
    const promptTemplate = settings.titleGenerationPrompt || 'Create an optimized eBay listing title for: {{title}}. Max 60 characters. No quotes.';
    const model = settings.geminiModel || 'gemini-1.5-flash'; // Default model

    console.log('📝 Using Prompt Template:', promptTemplate);

    if (!apiKey) {
        inputElement.value = "Error: Missing API Key. Check Admin settings.";
        generateBtn.textContent = 'No Key';
        setTimeout(() => {
            generateBtn.textContent = 'Generate';
            generateBtn.disabled = false;
        }, 2000);
        return;
    }

    chrome.runtime.sendMessage({
        action: "GENERATE_TITLE",
        apiKey: apiKey,
        prompt: promptTemplate,
        productData: productData,
        model: model
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError);
            inputElement.value = "Error: " + chrome.runtime.lastError.message;
            generateBtn.textContent = 'Error';
            generateBtn.disabled = false;
            return;
        }

        if (response && response.success) {
            let processedTitle = response.title.replace(/^"|"$/g, '').trim();

            // Check for suspicious "Oops" or short responses
            if (processedTitle.length < 5 || processedTitle.toLowerCase().includes('oops')) {
                console.warn('⚠️ Suspicious AI response:', processedTitle);
                inputElement.value = processedTitle + " (Please check prompt)";
            } else {
                // Context smart truncation: Try to cut at the last complete word near 60 chars
                if (processedTitle.length > 60) {
                    const truncated = processedTitle.substring(0, 60);
                    const lastSpace = truncated.lastIndexOf(' ');
                    if (lastSpace > 40) { // Only cut at space if it's not too early
                        processedTitle = truncated.substring(0, lastSpace);
                    } else {
                        processedTitle = truncated;
                    }
                }
                inputElement.value = processedTitle;
            }

            // Update char count and data-title
            // Manually trigger input event to update char count and internal state
            const event = new Event('input');
            inputElement.dispatchEvent(event);

            generateBtn.style.display = 'none';
            useBtn.style.display = 'inline-block';

            // Auto-select this row
            document.querySelectorAll('#snipe-title-list .title-row').forEach(r => r.classList.remove('selected'));
            rowElement.classList.add('selected');

        } else {
            console.error("Error generating title:", response.error);
            // Display error in the input field instead of alert
            inputElement.value = "AI Error: " + (response.error || "Unknown error");
            generateBtn.textContent = 'Failed';
            setTimeout(() => {
                generateBtn.textContent = 'Generate';
                generateBtn.disabled = false;
            }, 2000);
        }
    });
};

// Creates a title row with typewriter animation
const createTitleRowWithAnimation = (data, index) => {
    const row = document.createElement('div');
    row.className = 'title-row';
    row.setAttribute('data-title', data.title);

    // Handle AI Title Row
    if (data.isAiRow) {
        row.innerHTML = `
            <div class="rank">${data.rank}</div>
            <div class="type">${data.type}</div>
            <div class="title-text-container" style="flex-grow: 1; display: flex; gap: 5px; align-items: center;">
                <input type="text" class="title-text ai-title-input" placeholder="Generating AI Title..." style="width: 100%; border: 1px solid #ddd; padding: 4px; border-radius: 4px; font-family: inherit; font-size: inherit;">
            </div>
            <div class="char-count">0</div>
            <button class="action-btn generate-ai-btn" style="background-color: #673ab7; color: white; min-width: 80px;">Generate</button>
            <button class="action-btn use-btn" style="display: none;">Use</button>
        `;

        const input = row.querySelector('.ai-title-input');
        const generateBtn = row.querySelector('.generate-ai-btn');
        const useBtn = row.querySelector('.use-btn');
        const charCount = row.querySelector('.char-count');
        const titleTextContainer = row.querySelector('.title-text-container');

        // Input listener for char count
        input.addEventListener('input', () => {
            charCount.textContent = input.value.length;
            row.setAttribute('data-title', input.value);
            if (input.value.length > 0) {
                useBtn.style.display = 'inline-block';
                generateBtn.style.display = 'none';
            } else {
                useBtn.style.display = 'none';
                // Only show generate button if there is no text manually entered
                generateBtn.style.display = 'inline-block';
            }
        });

        // Prevent row selection when clicking input to allow typing
        input.addEventListener('click', (e) => {
            // e.stopPropagation(); 
            // We actually want row selection, but maybe focus priority
        });

        // Generate button listener
        generateBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent row selection logic interfering
            e.preventDefault();
            generateBtn.textContent = 'Thinking...';
            generateBtn.disabled = true;

            try {
                await generateAiTitle(input, row, generateBtn, useBtn);
            } catch (err) {
                console.error("AI Generation failed", err);
                generateBtn.textContent = 'Error';
                setTimeout(() => {
                    generateBtn.textContent = 'Generate';
                    generateBtn.disabled = false;
                }, 2000);
            }
        });

        // Auto-trigger DISABLED - User must click "Snipe Title" button manually
        // Title generation now occurs only on user interaction for better UX control
        console.log("🎯 Title generation ready - awaiting user click on 'Snipe Title' button");

        return row;
    }

    // Handle blank row specially
    if (data.isBlankRow) {
        row.innerHTML = `
            <div class="rank">${data.rank}</div>
            <div class="type">${data.type}</div>
            <div class="title-text" contenteditable="true" data-placeholder="Write your custom title here..."></div>
            <div class="char-count">0</div>
            <button class="action-btn">Use</button>
        `;

        // Add event listener for real-time character counting
        const titleText = row.querySelector('.title-text');
        const charCount = row.querySelector('.char-count');

        // Set up placeholder functionality
        const updatePlaceholder = () => {
            if (titleText.textContent.trim() === '') {
                titleText.classList.add('empty');
            } else {
                titleText.classList.remove('empty');
            }
        };

        // Auto-resize function for responsive height
        const autoResize = () => {
            // Reset height to auto to get natural height
            titleText.style.height = 'auto';

            // Get the scroll height (natural content height)
            const scrollHeight = titleText.scrollHeight;
            const maxHeight = 60; // Max height from CSS
            const minHeight = 24; // Min height from CSS

            // Calculate the appropriate height
            const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
            titleText.style.height = newHeight + 'px';

            // If content exceeds max height, show scrollbar
            if (scrollHeight > maxHeight) {
                titleText.style.overflowY = 'auto';
            } else {
                titleText.style.overflowY = 'hidden';
            }
        };

        // Multiple event listeners for better responsiveness
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
            // Handle paste events
            setTimeout(() => {
                const text = titleText.textContent.trim();
                charCount.textContent = text.length;
                row.setAttribute('data-title', text);
                updatePlaceholder();
                autoResize();
            }, 10);
        });

        // Add focus styling
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

        // Auto-focus when row is clicked
        row.addEventListener('click', (e) => {
            if (e.target !== titleText && e.target !== titleText.parentNode) {
                titleText.focus();
            }
        });

        // Initialize placeholder and resize
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

    // Start typewriter animation with delay
    setTimeout(() => {
        typewriterAnimation(row.querySelector('.title-text'), data.title, row.querySelector('.char-count'), data.charCount);
    }, index * 50); // Stagger animations by 50ms (very fast)

    return row;
};

// Typewriter animation function
const typewriterAnimation = (element, text, charCountElement, finalCount) => {
    let i = 0;
    const speed = 5; // Typing speed in milliseconds (very fast)

    // Add typing class for cursor effect
    element.classList.add('typing');

    const typeInterval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            charCountElement.textContent = i + 1;
            i++;
        } else {
            clearInterval(typeInterval);

            // Remove typing class and add completion class
            element.classList.remove('typing');
            element.classList.add('typing-complete');

            // Remove completion class after animation
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

    // Create a zip file with all images
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

    // Add a small delay between downloads
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
            // Convert data URL to blob
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
                        // Generate and download ZIP
                        zip.generateAsync({ type: "blob" }).then((content) => {
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



// This function contains the original core logic of the extension.
// [Deleted old initializeApp]

// Calculator Functions
function openCalculator() {
    console.log('🔍 Opening calculator...');
    const popup = document.getElementById('calculator-popup');
    if (popup) {
        popup.style.display = 'flex';
        console.log('✅ Calculator popup displayed');

        // Try to auto-fill Amazon price if available
        const amazonPriceInput = document.getElementById('amazon-price');
        if (amazonPriceInput) {
            const scrapedPrice = scrapeAmazonPrice();
            if (scrapedPrice !== 'No price found') {
                amazonPriceInput.value = scrapedPrice;
                console.log('💰 Auto-filled Amazon price:', scrapedPrice);
            }
        }

        // Load saved values from localStorage
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

    // Get saved values from localStorage or use defaults
    const savedValues = JSON.parse(localStorage.getItem('calculatorValues') || '{}');

    let amazonPrice = 0;

    // Always scrape Amazon price first to ensure it's current
    const scrapedPrice = scrapeAmazonPrice();
    if (scrapedPrice !== 'No price found') {
        amazonPrice = parseFloat(scrapedPrice);
        console.log('💰 Using scraped Amazon price for quick calc:', amazonPrice);
    } else {
        // Fallback to saved price
        amazonPrice = parseFloat(savedValues['amazon-price']) || 0;
        console.log('⚠️ Scrape failed, falling back to saved Amazon price:', amazonPrice);
    }
    const taxPercent = parseFloat(savedValues['tax-percent']) || 9;
    const trackingFee = parseFloat(savedValues['tracking-fee']) || 0.20;
    const ebayFeePercent = parseFloat(savedValues['ebay-fee-percent']) || 20;
    const promoFeePercent = parseFloat(savedValues['promo-fee-percent']) || 10;
    const desiredProfit = parseFloat(savedValues['desired-profit']) || 0;

    console.log('📊 Quick calc values:', {
        amazonPrice, taxPercent, trackingFee,
        ebayFeePercent, promoFeePercent, desiredProfit
    });

    if (amazonPrice <= 0) {
        console.log('⚠️ No Amazon price available for quick calculation');
        alert('Please set up calculator values first or enter an Amazon price');
        return;
    }

    // Calculate using same logic as main calculator
    const taxAmount = amazonPrice * (taxPercent / 100);
    const baseCost = amazonPrice + taxAmount + trackingFee;
    const totalPercentage = (ebayFeePercent + promoFeePercent + desiredProfit) / 100;
    const finalPrice = baseCost / (1 - totalPercentage);

    // Auto-fill "Sell it for" field
    const sellItForInput = document.getElementById('sell-it-for-input') ||
        document.querySelector('input[aria-label*="Sell it for" i]') ||
        document.querySelector('.price-field input[type="text"]') ||
        document.querySelector('input[placeholder*="Sell it for" i]');
    if (sellItForInput) {
        sellItForInput.value = finalPrice.toFixed(2);
        sellItForInput.style.backgroundColor = '#e8f5e8';
        sellItForInput.style.borderColor = '#4caf50';

        // Reset styling after 3 seconds
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

    const amazonPrice = parseFloat(document.getElementById('amazon-price').value) || 0;
    const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
    const trackingFee = parseFloat(document.getElementById('tracking-fee').value) || 0;
    const ebayFeePercent = parseFloat(document.getElementById('ebay-fee-percent').value) || 0;
    const promoFeePercent = parseFloat(document.getElementById('promo-fee-percent').value) || 0;
    const desiredProfit = parseFloat(document.getElementById('desired-profit').value) || 0;

    console.log('📊 Input values:', {
        amazonPrice, taxPercent, trackingFee,
        ebayFeePercent, promoFeePercent, desiredProfit
    });

    if (amazonPrice <= 0) {
        // Hide result if no valid Amazon price
        const resultDiv = document.getElementById('calculator-result');
        if (resultDiv) {
            resultDiv.style.display = 'none';
        }
        console.log('⚠️ No valid Amazon price entered yet');
        return;
    }

    // Calculate base cost: amazonPrice + tax + trackingFee
    const taxAmount = amazonPrice * (taxPercent / 100);
    const baseCost = amazonPrice + taxAmount + trackingFee;

    // Calculate total percentage of fees: ebayFee + promoFee + profit
    const totalPercentage = (ebayFeePercent + promoFeePercent + desiredProfit) / 100;

    // Calculate final eBay selling price using reverse formula
    const finalPrice = baseCost / (1 - totalPercentage);

    // Calculate fees and net profit for logging
    const ebayFee = finalPrice * (ebayFeePercent / 100);
    const promoFee = finalPrice * (promoFeePercent / 100);
    const netProfit = finalPrice - amazonPrice - taxAmount - trackingFee - ebayFee - promoFee;

    // Get SKU and selected title for logging
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
    const amazonLink = window.location.href;

    // Log to Google Sheets after price calculation
    if (sku && selectedTitle) {
        try {
            chrome.runtime.sendMessage({
                action: "logSheet",
                payload: {
                    title: selectedTitle,
                    sku: sku,
                    ebay_price: finalPrice.toFixed(2),
                    amazon_price: amazonPrice.toFixed(2),
                    amazon_url: amazonLink
                }
            });
        } catch (e) {
            console.error("Sheet logging failed:", e);
        }
    }

    // Display result in popup
    const resultDiv = document.getElementById('calculator-result');
    const priceDiv = document.getElementById('final-price');

    if (resultDiv && priceDiv) {
        priceDiv.textContent = `$${finalPrice.toFixed(2)}`;
        resultDiv.style.display = 'block';
    }

    // Auto-fill "Sell it for" field outside the popup
    const sellItForInput = document.getElementById('sell-it-for-input') ||
        document.querySelector('input[aria-label*="Sell it for" i]') ||
        document.querySelector('.price-field input[type="text"]') ||
        document.querySelector('input[placeholder*="Sell it for" i]');
    if (sellItForInput) {
        sellItForInput.value = finalPrice.toFixed(2);
        sellItForInput.style.backgroundColor = '#e8f5e8';
        sellItForInput.style.borderColor = '#4caf50';

        // Reset styling after 3 seconds
        setTimeout(() => {
            sellItForInput.style.backgroundColor = '';
            sellItForInput.style.borderColor = '';
        }, 3000);
    }

    // Save values
    saveCalculatorValues();

    console.log('💰 Price calculated:', finalPrice.toFixed(2));
    console.log('📊 Base cost:', baseCost.toFixed(2));
    console.log('📈 Total fees percentage:', (totalPercentage * 100).toFixed(1) + '%');
}

// Add calculator event listeners
function addCalculatorEventListeners() {
    // Calculator close button
    const closeBtn = document.getElementById('calculator-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCalculator);
        console.log('✅ Calculator close button listener added');
    }

    // Calculator overlay click to close
    const overlay = document.querySelector('.calculator-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeCalculator);
        console.log('✅ Calculator overlay listener added');
    }

    // Calculate button
    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculatePrice);
        console.log('✅ Calculator calculate button listener added');
    }

    // Auto-save and auto-calculate on input change with debouncing
    let calculateTimeout;
    const calculatorInputs = document.querySelectorAll('#calculator-popup input');
    calculatorInputs.forEach(input => {
        input.addEventListener('input', () => {
            saveCalculatorValues();

            // Debounce calculation to avoid too many calculations while typing
            clearTimeout(calculateTimeout);
            calculateTimeout = setTimeout(() => {
                calculatePrice();
            }, 300); // 300ms delay
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
window.testCalculator = function () {
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
    // FIRST: Check if user selected an AI-generated title from popup
    const storageData = await chrome.storage.local.get(['selectedEbayTitle', 'selectedTitleTimestamp']);
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    const selectedTitleIsRecent = storageData.selectedTitleTimestamp &&
        storageData.selectedTitleTimestamp >= thirtyMinutesAgo;

    let title = '';
    if (selectedTitleIsRecent && storageData.selectedEbayTitle && storageData.selectedEbayTitle.trim() !== '') {
        title = storageData.selectedEbayTitle;
        console.log('📋 [getProductDataForExport] Using selected AI title from popup:', title);
    } else {
        // FALLBACK: Use the selected row's title from panel
        const selectedRow = document.querySelector('#snipe-title-list .title-row.selected');
        title = selectedRow ? selectedRow.dataset.title : 'No title selected';
        console.log('📋 [getProductDataForExport] Using title from panel row:', title);
    }

    const sku = document.getElementById('sku-input')?.value || 'No SKU';

    // Try multiple selectors to find the calculated price (same as Opti-List button)

    const priceInput = document.getElementById('sell-it-for-input') ||
                       document.querySelector('.price-field input[type="text"]') ||
                       document.querySelector('input[aria-label*="Sell it for" i]') ||
                       document.querySelector('.price-field input');

    // Also check the final-price display element as fallback
    const finalPriceElement = document.getElementById('final-price');
    let sellPrice = 'No price';

    if (priceInput && priceInput.value && priceInput.value.trim() !== '') {
        sellPrice = priceInput.value.trim();
        console.log('✅ Found price from input field:', sellPrice);
    } else if (finalPriceElement && finalPriceElement.textContent) {
        // Extract price from text like "$123.45"
        const priceText = finalPriceElement.textContent.trim();
        const priceMatch = priceText.match(/[\d.]+/);
        if (priceMatch) {
            sellPrice = priceMatch[0];
            console.log('✅ Found price from final-price element:', sellPrice);
        }
    } else {
        console.warn('⚠️ No calculated price found. Please calculate price first.');
    }

    // Scrape Amazon price from the page
    const amazonPrice = scrapeAmazonPrice();
    const amazonLink = window.location.href;

    return {
        timestamp: new Date().toLocaleString(),
        title: title,
        sku: sku,
        sellPrice: sellPrice,
        amazonPrice: amazonPrice,
        amazonLink: amazonLink
    };
}

// Helper function to scrape Amazon price from the page
function scrapeAmazonPrice() {
    console.log('🔍 Starting Amazon price scraping...');

    // Try multiple selectors for Amazon price
    const priceSelectors = [
        '.a-price-whole',
        '.a-price .a-offscreen',
        '.a-price-range .a-offscreen',
        '#priceblock_dealprice',
        '#priceblock_ourprice',
        '.a-price-range .a-price-whole',
        '.a-price .a-price-whole',
        '[data-asin-price]',
        '.apexPriceToPay .a-offscreen',
        '.a-price .a-price-whole',
        '.a-price-range .a-price-whole',
        // Additional selectors for newer Amazon layouts
        '.a-price .a-price-whole',
        '.a-price-range .a-price-whole',
        '.a-price .a-offscreen',
        '.a-price-range .a-offscreen',
        '.apexPriceToPay .a-offscreen',
        '.apexPriceToPay .a-price-whole',
        '.apexPriceToPay .a-price-range',
        '.a-price .a-price-range',
        '.a-price-range .a-price-range',
        // Try to find any element with price in class or id
        '[class*="price"][class*="whole"]',
        '[class*="price"][class*="range"]',
        '[id*="price"][class*="whole"]',
        '[id*="price"][class*="range"]'
    ];

    console.log('🎯 Trying', priceSelectors.length, 'price selectors...');

    // First, try to find Amazon's split price format (whole number + decimal in separate elements)
    console.log('🔍 Checking for Amazon split price format...');
    const wholePriceElement = document.querySelector('.a-price-whole');
    const decimalPriceElement = document.querySelector('.a-price-fraction');

    if (wholePriceElement && decimalPriceElement) {
        const wholePart = wholePriceElement.textContent?.replace(/[^\d]/g, '') || '';
        const decimalPart = decimalPriceElement.textContent?.replace(/[^\d]/g, '') || '';

        if (wholePart && decimalPart) {
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

            // Clean up the price text
            priceText = priceText.replace(/[^\d.,]/g, ''); // Remove everything except digits, dots, and commas
            priceText = priceText.replace(/,/g, ''); // Remove commas
            console.log('   Cleaned text:', priceText);

            // Try to extract the price with better decimal handling
            const priceMatch = priceText.match(/(\d+\.?\d*)/);
            if (priceMatch) {
                const price = parseFloat(priceMatch[1]);
                console.log('   Extracted price:', price);
                if (!isNaN(price) && price > 0) {
                    console.log('✅ Amazon price scraped successfully:', price);
                    return price.toFixed(2);
                }
            }
        }

        // Try to find the parent container and get the full price
        const parentContainer = priceElement?.closest('.a-price, .a-price-range, .apexPriceToPay, [class*="price"]');
        if (parentContainer) {
            console.log('   Trying parent container...');
            const fullPriceText = parentContainer.textContent || parentContainer.innerText;
            console.log('   Parent text:', fullPriceText);

            // Look for price patterns like $35.99, 35.99, etc.
            const pricePatterns = [
                /\$(\d+\.\d{2})/,  // $35.99
                /(\d+\.\d{2})/,    // 35.99
                /\$(\d+\.\d{1})/,  // $35.9
                /(\d+\.\d{1})/,    // 35.9
                /\$(\d+)/,         // $35
                /(\d+)/            // 35
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

    console.log('⚠️ Could not scrape Amazon price from any selector');
    console.log('🔍 Available price elements on page:');
    const allPriceElements = document.querySelectorAll('[class*="price"], [id*="price"], [class*="cost"], [id*="cost"]');
    allPriceElements.forEach((el, index) => {
        if (index < 5) { // Limit to first 5 for debugging
            console.log(`   Element ${index + 1}:`, el.className, el.id, el.textContent?.substring(0, 50));
        }
    });

    // Fallback: Try to find any text that looks like a price
    console.log('🔄 Trying fallback price detection...');
    const allText = document.body.innerText;

    // Try multiple price patterns with better decimal handling
    const pricePatterns = [
        /\$(\d+\.\d{2})/g,  // $35.99
        /(\d+\.\d{2})/g,    // 35.99
        /\$(\d+\.\d{1})/g,  // $35.9
        /(\d+\.\d{1})/g,    // 35.9
        /\$(\d+)/g,         // $35
        /(\d+)/g            // 35
    ];

    for (const pattern of pricePatterns) {
        const matches = [...allText.matchAll(pattern)];
        console.log(`   Pattern ${pattern} found ${matches.length} matches`);

        if (matches.length > 0) {
            // Get the first reasonable price (not too high, not too low)
            for (const match of matches) {
                const price = parseFloat(match[1]);
                if (price > 0.01 && price < 10000) { // Reasonable price range
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
    return `${data.timestamp}\t${data.title}\t${data.sku}\t${data.sellPrice}\t${data.amazonPrice}\t${data.amazonLink}`;
}

// Helper function to send data to Google Sheets
async function sendToGoogleSheets(data) {
    try {
        // Get Google Apps Script URL from storage with fallback
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
        // Get Google Apps Script URL from storage with fallback
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
        console.log('📥 Loading SKU settings (Admin Config)...');

        // Read from LOCAL storage (where background.js syncs to)
        chrome.storage.local.get(['sku_mode', 'sku_prefix', 'sku_random_suffix'], async (result) => {
            const mode = result.sku_mode || 'asin';
            const prefix = result.sku_prefix || '';
            const useSuffix = result.sku_random_suffix === 'true';

            console.log('📊 SKU settings loaded:', { mode, prefix, useSuffix });

            // Generate SKU based on mode
            let generatedSku = '';

            if (mode === 'asin') {
                const asin = getASIN();
                generatedSku = asin || 'NO-ASIN';
            } else if (mode === 'title') {
                const title = document.getElementById('productTitle')?.innerText.trim() || '';
                const words = title.replace(/[^a-zA-Z0-9 ]/g, '').split(' ');
                generatedSku = (words[0]?.substring(0, 4) || '') + (words[1]?.substring(0, 4) || '');
                if (generatedSku.length < 3) generatedSku = 'ITEM';
                generatedSku = generatedSku.toUpperCase();
            } else if (mode === 'custom') {
                generatedSku = prefix;
            }

            // Append Random Suffix if enabled
            if (useSuffix) {
                const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                generatedSku += `-${random}`;
            }

            // Update UI
            const skuInput = document.getElementById('sku-input');
            if (skuInput) {
                skuInput.value = generatedSku;
                // Save to storage for later use (Opti-List)
                chrome.storage.local.set({ ebaySku: generatedSku });
                console.log('✅ Generated SKU:', generatedSku);
            }
        });

    } catch (error) {
        console.error('❌ Error loading SKU settings:', error);
    }
}
// Helper to get ASIN
function getASIN() {
    const url = window.location.href;
    const match = url.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
}

async function generateSKU() {
    try {
        console.log('🏷️ Generating SKU...');

        // Get current settings
        const result = await chrome.storage.sync.get(['selectedSKU', 'autoSkuEnabled']);
        const prefix = result.selectedSKU || 'AB';
        const autoSkuEnabled = result.autoSkuEnabled !== undefined ? result.autoSkuEnabled : true;

        console.log('📊 Using prefix:', prefix, 'Auto enabled:', autoSkuEnabled);

        // Generate SKU using timestamp method
        const timestamp = Date.now().toString().slice(-6); // e.g., 239010
        const generatedSku = `${prefix}${timestamp}`;

        console.log('✅ Generated SKU:', generatedSku);

        // Update SKU input
        const skuInput = document.getElementById('sku-input');
        if (skuInput) {
            skuInput.value = generatedSku;
            skuInput.readOnly = autoSkuEnabled; // Read-only if auto-enabled
        }

        // Update prefix dropdown
        const skuPrefixSelect = document.getElementById('sku-prefix');
        if (skuPrefixSelect) {
            skuPrefixSelect.value = prefix;
        }

        // Save to storage
        await chrome.storage.local.set({ ebaySku: generatedSku });
        console.log('🔒 SKU saved to storage:', generatedSku);

        // Log to Google Sheets after SKU generation
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
        const amazonPriceInput = document.getElementById('amazon-price');
        const amazonPrice = amazonPriceInput ? amazonPriceInput.value : '';

        if (selectedTitle && ebayPrice && amazonPrice) {
            try {
                chrome.runtime.sendMessage({
                    action: "SAVE_TO_SHEET",
                    payload: {
                        title: selectedTitle,
                        sku: generatedSku,
                        ebayPrice: ebayPrice,
                        amazonPrice: amazonPrice,
                        amazonUrl: window.location.href
                    }
                });
            } catch (e) {
                console.error("Sheet logging failed:", e);
            }
        }

    } catch (error) {
        console.error('❌ Error generating SKU:', error);
    }
}

// Manual trigger function for debugging
window.forceLoadExtension = function () {
    console.log('🔧 Manually triggering extension load...');

    // Remove existing button/container if any
    const existingContainer = document.getElementById('initial-list-button-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    const existingButton = document.getElementById('initial-list-button');
    if (existingButton) {
        existingButton.remove();
    }

    // Find the product title element to insert button below it
    const productTitle = document.getElementById('productTitle');

    // Create the List it button container with modern SaaS styling
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'initial-list-button-container';
    buttonContainer.style.cssText = `
        margin: 12px 0 16px 0;
        display: flex;
        align-items: center;
    `;

    const listButton = document.createElement('button');
    listButton.id = 'initial-list-button';
    listButton.innerHTML = `
        <svg viewBox="0 0 120 120" width="20" height="20" style="margin-right: 10px; flex-shrink: 0;">
            <rect fill="#E53238" x="0" y="0" width="30" height="100" rx="4"/>
            <rect fill="#0064D2" x="30" y="20" width="30" height="100" rx="4"/>
            <rect fill="#F5AF02" x="60" y="0" width="30" height="100" rx="4"/>
            <rect fill="#86B817" x="90" y="20" width="30" height="100" rx="4"/>
        </svg>
        <span style="font-weight: 600;">List to eBay</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px; opacity: 0.8;">
            <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
    `;
    listButton.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        color: #1a1a2e;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        padding: 10px 20px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    // Add hover styles (shared with the normal initializer)
    {
        const styleId = 'sellersuit-list-button-styles';
        const styleSheet = document.getElementById(styleId) || document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = `
            #initial-list-button:hover {
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.10) 0%, rgba(139, 92, 246, 0.10) 100%) !important;
                border-color: rgba(99, 102, 241, 0.45) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 12px 28px rgba(2, 6, 23, 0.12) !important;
            }
            #initial-list-button:active {
                transform: translateY(0) !important;
            }
        `;
        if (!styleSheet.parentElement) document.head.appendChild(styleSheet);
    }

    buttonContainer.appendChild(listButton);

    // Insert button below product title if found, otherwise append to body as fallback
    if (productTitle && productTitle.parentElement) {
        productTitle.parentElement.insertBefore(buttonContainer, productTitle.nextSibling);
    } else {
        // Fallback: fixed position if title not found
        buttonContainer.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9998;
        `;
        document.body.appendChild(buttonContainer);
    }

    listButton.addEventListener('click', () => {
        console.log('🔧 Manual trigger: Loading extension UI...');
        injectUI();
        buttonContainer.style.display = 'none';
    });

    console.log('✅ List to eBay button created below product title!');
};

// Debug function to check page elements
window.debugAmazonPage = function () {
    console.log('🔍 Debugging Amazon page elements...');
    console.log('🌐 URL:', window.location.href);
    console.log('🏷️ Title:', document.title);
    console.log('🛒 Domain:', window.location.hostname);

    const elements = {
        productTitle: document.getElementById('productTitle'),
        dpContainer: document.querySelector('#dp-container'),
        dataAsin: document.querySelector('[data-asin]'),
        priceWhole: document.querySelector('.a-price-whole'),
        priceDeal: document.querySelector('#priceblock_dealprice'),
        priceOur: document.querySelector('#priceblock_ourprice'),
        buyBox: document.querySelector('#buybox'),
        addToCart: document.querySelector('#add-to-cart-button'),
        productDetails: document.querySelector('#productDetails')
    };

    Object.entries(elements).forEach(([name, element]) => {
        console.log(`${name}:`, !!element, element ? element.textContent?.substring(0, 50) : '');
    });

    return elements;
};

// Main initialization function
const initializeApp = async () => {
    // Check if we are on a valid product page
    const productTitle = document.getElementById('productTitle');
    if (!productTitle) {
        // Not a product page, checking for specific listing types or just exit
        const dpContainer = document.getElementById('dp-container');
        if (!dpContainer) return;
    }

    // Check if already injected
    if (document.getElementById('initial-list-button') || document.getElementById('snipe-root-wrapper')) return;

    // Create the List it button (SaaS-style) and place it directly below the product title
    const existingContainer = document.getElementById('initial-list-button-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'initial-list-button-container';
    buttonContainer.style.cssText = `
        margin: 10px 0 14px 0;
        display: flex;
        align-items: center;
    `;

    const listButton = document.createElement('button');
    listButton.id = 'initial-list-button';
    listButton.setAttribute('type', 'button');
    listButton.setAttribute('aria-label', 'List this product to eBay');
    listButton.innerHTML = `
        <span aria-hidden="true" style="display:inline-flex;align-items:baseline;margin-right:10px;font-weight:900;font-size:18px;line-height:1;letter-spacing:-0.02em;">
            <span class="ss-ebay-e">e</span><span class="ss-ebay-b">b</span><span class="ss-ebay-a">a</span><span class="ss-ebay-y">y</span>
        </span>
        <span style="font-weight:600;">List it</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:8px;opacity:0.75;">
            <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
    `;
    listButton.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        color: #0f172a;
        border: 1px solid rgba(15, 23, 42, 0.16);
        border-radius: 12px;
        padding: 10px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 8px 22px rgba(2, 6, 23, 0.08);
        transition: transform 160ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1), background 160ms cubic-bezier(0.4, 0, 0.2, 1), border-color 160ms cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
        -webkit-user-select: none;
        z-index: 9998;
    `;

    // Ensure shared styles exist (hover + ebay logo colors)
    {
        const styleId = 'sellersuit-list-button-styles';
        const styleSheet = document.getElementById(styleId) || document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = `
            #initial-list-button .ss-ebay-e { color: #E53238; }
            #initial-list-button .ss-ebay-b { color: #0064D2; }
            #initial-list-button .ss-ebay-a { color: #F5AF02; }
            #initial-list-button .ss-ebay-y { color: #86B817; }

            #initial-list-button:hover {
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.10) 0%, rgba(139, 92, 246, 0.10) 100%) !important;
                border-color: rgba(99, 102, 241, 0.45) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 12px 28px rgba(2, 6, 23, 0.12) !important;
            }
            #initial-list-button:active {
                transform: translateY(0) !important;
            }
        `;
        if (!styleSheet.parentElement) document.head.appendChild(styleSheet);
    }

    buttonContainer.appendChild(listButton);

    // Insert right after the title section (immediately below the product title)
    const titleEl = document.getElementById('productTitle');
    const anchor = titleEl?.closest('#titleSection') || titleEl?.closest('#title_feature_div') || titleEl?.parentElement;

    if (anchor && anchor.parentElement) {
        anchor.insertAdjacentElement('afterend', buttonContainer);
    } else {
        // Fallback: fixed position if title isn't found
        buttonContainer.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9998;
        `;
        document.body.appendChild(buttonContainer);
    }

    listButton.addEventListener('click', () => {
        injectUI();
        buttonContainer.remove();
    });

    console.log('✅ eBay Lister extension initialized on product page.');
};

// ═══════════════════════════════════════════════════════════
// MESSAGE LISTENER - Handle requests from panel
// ═══════════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCRAPE_PRODUCT_DATA') {
        console.log('[Amazon Injector] Received SCRAPE_PRODUCT_DATA request');

        try {
            // Scrape product data from the current page
            const productData = {
                title: document.querySelector('#productTitle')?.textContent?.trim() || '',
                productTitle: document.querySelector('#productTitle')?.textContent?.trim() || '',
                description: document.querySelector('#productDescription')?.textContent?.trim() || '',
                productDescription: document.querySelector('#productDescription')?.textContent?.trim() || '',
                category: document.querySelector('#wayfinding-breadcrumbs_feature_div')?.textContent?.trim() || '',
                brand: document.querySelector('#bylineInfo')?.textContent?.replace(/^(Brand:|Visit the|Store)/, '').trim() || '',
                price: document.querySelector('.a-price .a-offscreen')?.textContent?.trim() || '',
                asin: window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || '',
                ASIN: window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || ''
            };

            if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log('[Amazon Injector] Scraped product data (hidden in prod)', productData);

            sendResponse({
                success: true,
                data: productData
            });
        } catch (error) {
            console.error('[Amazon Injector] Error scraping product data:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }

        return true; // Keep message channel open for async response
    }

    // Handle SCRAPE_COMPLETE_PRODUCT request from panel
    if (request.action === 'SCRAPE_COMPLETE_PRODUCT') {
        console.log('[Amazon Injector] Received SCRAPE_COMPLETE_PRODUCT request');

        try {
            // Call the comprehensive scraper function
            const productData = scrapeCompleteProductData();

            // Store in chrome.storage for later use and caching
            chrome.storage.local.set({
                completeProductData: productData,
                lastScraped: Date.now()
            }, () => {
                console.log('[Amazon Injector] Product data stored in chrome.storage');
            });

            sendResponse({
                success: true,
                data: productData,
                fieldsCount: Object.keys(productData).length,
                specsCount: Object.keys(productData.specifications || {}).length
            });
        } catch (error) {
            console.error('[Amazon Injector] Error scraping complete product data:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }

        return true; // Keep message channel open for async response
    }

    // Handle GENERATE_AI_TITLES request from panel
    if (request.action === 'GENERATE_AI_TITLES') {
        console.log('[Amazon Injector] Received GENERATE_AI_TITLES request');

        // Find the Generate AI Titles button
        const generateBtn = document.getElementById('generate-ai-titles-btn');

        if (generateBtn) {
            // Programmatically click the button to trigger AI generation
            generateBtn.click();
            console.log('[Amazon Injector] Clicked Generate AI Titles button');
            sendResponse({ success: true });
        } else {
            console.error('[Amazon Injector] Generate AI Titles button not found');
            sendResponse({
                success: false,
                error: 'Please click the "List it" button first to open the extension panel on the page.'
            });
        }

        return true;
    }
});

// ═══════════════════════════════════════════════════════════
// ROBUST INITIALIZATION WITH DOM READINESS DETECTION
// ═══════════════════════════════════════════════════════════

function startExtension() {
    console.log('[Amazon Injector] Starting extension initialization...');

    // Try to initialize
    initializeApp();

    // If button wasn't injected, retry after short delay
    setTimeout(() => {
        if (!document.getElementById('initial-list-button') && !document.getElementById('snipe-root-wrapper')) {
            console.log('[Amazon Injector] Button not found, retrying...');
            initializeApp();
        }
    }, 1000);
}

// Multiple initialization strategies for reliability
if (document.readyState === 'complete') {
    // Page fully loaded
    startExtension();
} else if (document.readyState === 'interactive') {
    // DOM ready but resources still loading
    startExtension();
} else {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', startExtension);
}

// Fallback: also try on load event
window.addEventListener('load', () => {
    if (!document.getElementById('initial-list-button') && !document.getElementById('snipe-root-wrapper')) {
        console.log('[Amazon Injector] Load event - attempting initialization');
        startExtension();
    }
});

// URL change detection for SPA navigation
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('[Amazon Injector] URL changed, re-initializing...');
        // Small delay to let page content update
        setTimeout(startExtension, 500);
    }
});

// Start observing when body is available
if (document.body) {
    urlObserver.observe(document.body, { childList: true, subtree: true });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        urlObserver.observe(document.body, { childList: true, subtree: true });
    });
}