/**
 * @fileoverview Standalone eBay Image Upload System
 * @author Advanced Image Upload System
 * @version 2.0.0 - Refactored for robust, single-entry-point execution
 * @description A complete, independent image upload system for eBay listings.
 */

// Utility Functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple Logger class if global logger is not available
class SimpleLogger {
    constructor() {
        this.config = { debug: true, logLevel: 'info' };
    }
    
    _shouldLog(level) {
        if (!this.config.debug && level === 'debug') return false;
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] >= levels[this.config.logLevel];
    }
    
    _log(level, message, data = null) {
        if (!this._shouldLog(level)) return;
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [IMG-UPLOAD]`;
        const formattedMessage = `${prefix} [${level.toUpperCase()}] ${message}`;
        
        switch (level) {
            case 'debug':
                console.debug(formattedMessage, data || '');
                break;
            case 'info':
                console.info(formattedMessage, data || '');
                break;
            case 'warn':
                console.warn(formattedMessage, data || '');
                break;
            case 'error':
                console.error(formattedMessage, data || '');
                break;
        }
    }
    
    debug(message, data) { this._log('debug', message, data); }
    info(message, data) { this._log('info', message, data); }
    warn(message, data) { this._log('warn', message, data); }
    error(message, data) { this._log('error', message, data); }
}

class ImageUploadSystem {
    constructor() {
        this.logger = window.logger || new SimpleLogger();
        this.isUploading = false;
        this.uploadStartTime = null;
        this.logger.info('✅ ImageUploadSystem initialized.');
    }

    async uploadImages() {
        if (this.isUploading) {
            this.logger.warn('⚠️ Upload already in progress, skipping.');
            return false;
        }

        this.isUploading = true;
        this.uploadStartTime = Date.now();
        this.logger.info('🚀 Starting standalone image upload system...');

        try {
            // 1. Get images from storage (with retry logic for delayed storage)
            let images = await this.getStoredImages();
            let retryAttempts = 0;
            const maxRetries = 3;
            const retryDelay = 2000; // 2 seconds
            
            while ((!images || images.length === 0) && retryAttempts < maxRetries) {
                if (retryAttempts > 0) {
                    this.logger.warn(`⚠️ No images found, retrying... (Attempt ${retryAttempts + 1}/${maxRetries})`);
                    this.logger.info(`⏳ Waiting ${retryDelay}ms before retry (storage might be delayed)...`);
                    await sleep(retryDelay);
                }
                
                images = await this.getStoredImages();
                retryAttempts++;
            }
            
            if (!images || images.length === 0) {
                this.logger.error('═══════════════════════════════════════════════════════');
                this.logger.error('❌ No valid images found in Chrome storage after all retries.');
                this.logger.error('═══════════════════════════════════════════════════════');
                this.logger.error('💡 Troubleshooting:');
                this.logger.error('   1. Check if images were stored on Amazon page');
                this.logger.error('   2. Verify storeWatermarkedImages() was called successfully');
                this.logger.error('   3. Check browser console on Amazon page for storage errors');
                this.logger.error('   4. Try clicking "Opti-List" again on Amazon page');
                this.logger.error('═══════════════════════════════════════════════════════');
                return false;
            }
            this.logger.info(`✅ Found ${images.length} valid images in storage (after ${retryAttempts} attempt(s)).`);

            // 2. Wait for the uploader UI to be ready
            const uploaderReady = await this.waitForUploaderReady();
            if (!uploaderReady) {
                this.logger.error('❌ Uploader UI did not become ready within the timeout.');
                return false;
            }
            this.logger.info('✅ Uploader is ready.');

            // 3. Convert images to File objects
            const files = await this.convertImagesToFiles(images);
            if (!files || files.length === 0) {
                this.logger.error('❌ Failed to convert images to File objects.');
                return false;
            }
            this.logger.info(`✅ Converted ${files.length} images to files.`);

            // 4. Execute upload strategies
            const uploadSuccess = await this.executeUploadStrategies(files);
            if (!uploadSuccess) {
                this.logger.error('❌ All upload strategies failed.');
                return false;
            }
            this.logger.info('✅ At least one upload strategy reported success.');

            // 5. Verify the upload was truly successful
            const verified = await this.verifyUploadSuccess(files.length);
            if (verified) {
                this.logger.info('🎉🎉 Upload completed and verified successfully!');
                // Only cleanup storage after verified successful upload
                // This prevents premature cleanup if upload fails
                await this.cleanupStorage();
                return true;
            } else {
                this.logger.warn('⚠️ Upload strategies completed, but verification failed. The upload was not successful.');
                this.logger.warn('⚠️ Images remain in storage for retry.');
                return false;
            }

        } catch (error) {
            this.logger.error('💥 A critical error occurred in the upload system:', error);
            return false;
        } finally {
            this.isUploading = false;
            this.uploadStartTime = null;
        }
    }

    async getStoredImages() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['watermarkedImages', 'imageUrls'], (result) => {
                this.logger.info('═══════════════════════════════════════════════════════');
                this.logger.info('🔍 Checking storage for images...');
                this.logger.info('═══════════════════════════════════════════════════════');
                this.logger.info('📦 Raw storage result keys:', Object.keys(result));
                this.logger.info('📦 watermarkedImages present:', !!result.watermarkedImages);
                this.logger.info('📦 imageUrls present:', !!result.imageUrls);
                
                if (result.watermarkedImages) {
                    this.logger.info(`📸 watermarkedImages array length: ${result.watermarkedImages.length}`);
                    if (result.watermarkedImages.length > 0) {
                        this.logger.info(`📸 First image preview: ${result.watermarkedImages[0].substring(0, 100)}...`);
                        this.logger.info(`📸 First image length: ${result.watermarkedImages[0].length} chars`);
                        this.logger.info(`📸 First image is Data URL: ${result.watermarkedImages[0].startsWith('data:image')}`);
                    }
                }
                
                if (result.imageUrls) {
                    this.logger.info(`🌐 imageUrls array length: ${result.imageUrls.length}`);
                }
                
                // Try watermarkedImages first, then fallback to imageUrls
                let images = result.watermarkedImages || result.imageUrls || [];
                this.logger.info(`📸 Total images array length: ${images.length}`);
                this.logger.info(`📸 Images array type: ${Array.isArray(images) ? 'Array' : typeof images}`);
                
                // Filter and validate images
                const validImages = images.filter((img, index) => {
                    this.logger.info(`🔍 Validating image ${index + 1}/${images.length}...`);
                    
                    if (!img || typeof img !== 'string') {
                        this.logger.warn(`⚠️ Image ${index + 1} validation failed: not a valid string (type: ${typeof img})`);
                        return false;
                    }
                    
                    // Check if it's a data URL
                    if (img.startsWith('data:image/')) {
                        const isValidSize = img.length > 10000; // Match storage validation
                        if (!isValidSize) {
                            this.logger.warn(`⚠️ Image ${index + 1} validation failed: data URL too small (${img.length} chars, required > 10000)`);
                        } else {
                            this.logger.info(`✅ Image ${index + 1} validation passed: Data URL (${img.length} chars)`);
                        }
                        return isValidSize;
                    }
                    
                    // Check if it's a regular URL
                    if (img.startsWith('http')) {
                        this.logger.info(`✅ Image ${index + 1} validation passed: URL (${img.substring(0, 50)}...)`);
                        return true;
                    }
                    
                    this.logger.warn(`⚠️ Image ${index + 1} validation failed: unknown format (${img.substring(0, 50)}...)`);
                    return false;
                });
                
                this.logger.info('═══════════════════════════════════════════════════════');
                this.logger.info(`✅ Validation complete: ${validImages.length}/${images.length} images passed validation`);
                this.logger.info('═══════════════════════════════════════════════════════');
                resolve(validImages);
            });
        });
    }

    async waitForUploaderReady() {
        const maxWaitTime = 20000; // 20 seconds
        const startTime = Date.now();
        this.logger.info('🔍 Waiting for uploader UI to be ready...');
        
        while (Date.now() - startTime < maxWaitTime) {
            // Multiple selectors for eBay upload areas
            const uploadSelectors = [
                'input[type="file"]',
                'input[type="file"][multiple]',
                '[class*="dropzone"]',
                '[class*="upload-area"]',
                '[class*="upload-zone"]',
                '[class*="photo-upload"]',
                '[class*="image-upload"]',
                '[data-testid*="upload"]',
                '[data-testid*="photo"]',
                '[data-testid*="image"]',
                '.photo-upload-area',
                '.image-upload-area',
                '.upload-dropzone'
            ];
            
            for (const selector of uploadSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    this.logger.info(`✅ Found upload element: ${selector}`);
                    return true;
                }
            }
            
            await sleep(500);
        }
        
        this.logger.warn('⚠️ Uploader UI not ready within timeout');
        return false;
    }

    async convertImagesToFiles(images) {
        const files = [];
        this.logger.info(`🔄 Converting ${images.length} images to files...`);
        
        for (let i = 0; i < images.length; i++) {
            try {
                const image = images[i];
                let file;
                
                if (image.startsWith('data:image/')) {
                    // Handle data URL
                    this.logger.info(`📸 Converting data URL image ${i + 1}...`);
                    file = this.dataUrlToFile(image, `product_image_${i + 1}.jpg`);
                } else if (image.startsWith('http')) {
                    // Handle regular URL - fetch and convert
                    this.logger.info(`🌐 Fetching URL image ${i + 1}: ${image.substring(0, 50)}...`);
                    file = await this.urlToFile(image, `product_image_${i + 1}.jpg`);
                } else {
                    this.logger.warn(`⚠️ Unknown image format for image ${i + 1}, skipping`);
                    continue;
                }
                
                if (file) {
                    files.push(file);
                    this.logger.info(`✅ Successfully converted image ${i + 1} (${file.size} bytes)`);
                }
            } catch (error) {
                this.logger.error(`❌ Failed to convert image ${i + 1} to file:`, error);
            }
        }
        
        this.logger.info(`✅ Converted ${files.length}/${images.length} images to files`);
        return files;
    }

    dataUrlToFile(dataUrl, filename) {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    }
    
    async urlToFile(url, filename) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            return new File([blob], filename, { type: blob.type });
        } catch (error) {
            this.logger.error(`❌ Failed to fetch URL ${url}:`, error);
            return null;
        }
    }

    async executeUploadStrategies(files) {
        const strategies = [
            this.strategyDirectFileInput.bind(this),
            this.strategyDragAndDrop.bind(this)
        ];

        for (let i = 0; i < strategies.length; i++) {
            this.logger.info(`🎯 Executing Strategy ${i + 1}/${strategies.length}...`);
            try {
                if (await strategies[i](files)) {
                    this.logger.info(`✅ Strategy ${i + 1} succeeded.`);
                    return true;
                } else {
                    this.logger.warn(`⚠️ Strategy ${i + 1} failed. Trying next strategy.`);
                }
            } catch (error) {
                this.logger.error(`💥 Strategy ${i + 1} threw an error:`, error);
            }
        }
        return false;
    }

    async strategyDirectFileInput(files) {
        this.logger.info('🎯 Executing Direct File Input Strategy...');
        
        // Try multiple file input selectors
        const fileInputSelectors = [
            'input[type="file"][multiple]',
            'input[type="file"]',
            'input[type="file"][accept*="image"]',
            'input[type="file"][name*="photo"]',
            'input[type="file"][name*="image"]'
        ];
        
        let fileInput = null;
        for (const selector of fileInputSelectors) {
            fileInput = document.querySelector(selector);
            if (fileInput) {
                this.logger.info(`✅ Found file input: ${selector}`);
                break;
            }
        }
        
        if (!fileInput) {
            this.logger.warn('⚠️ No file input found for direct strategy');
            return false;
        }

        try {
            const dataTransfer = new DataTransfer();
            files.forEach(file => dataTransfer.items.add(file));

            // Directly assign the files
            fileInput.files = dataTransfer.files;
            this.logger.info(`📁 Assigned ${files.length} files to input`);

            // Dispatch multiple events to ensure compatibility
            const events = ['input', 'change', 'blur'];
            events.forEach(eventType => {
                fileInput.dispatchEvent(new Event(eventType, { bubbles: true }));
            });

            this.logger.info('📡 Dispatched events to file input');
            await sleep(3000); // Give the page time to react
            
            const progress = await this.checkUploadProgress(files.length);
            this.logger.info(`📊 Upload progress check: ${progress} images detected`);
            return progress > 0;
        } catch (error) {
            this.logger.error('❌ Error in direct file input strategy:', error);
            return false;
        }
    }

    async strategyDragAndDrop(files) {
        this.logger.info('🎯 Executing Drag and Drop Strategy...');
        
        // Try multiple drop zone selectors
        const dropZoneSelectors = [
            '[class*="dropzone"]',
            '[class*="upload-area"]',
            '[class*="upload-zone"]',
            '[class*="photo-upload"]',
            '[class*="image-upload"]',
            '[data-testid*="upload"]',
            '[data-testid*="photo"]',
            '[data-testid*="image"]',
            '.photo-upload-area',
            '.image-upload-area',
            '.upload-dropzone',
            'div[role="button"]',
            'button[class*="upload"]'
        ];
        
        let dropZone = null;
        for (const selector of dropZoneSelectors) {
            dropZone = document.querySelector(selector);
            if (dropZone) {
                this.logger.info(`✅ Found drop zone: ${selector}`);
                break;
            }
        }
        
        if (!dropZone) {
            this.logger.warn('⚠️ No drop zone found for drag and drop strategy');
            return false;
        }

        try {
            const dataTransfer = new DataTransfer();
            files.forEach(file => dataTransfer.items.add(file));

            // Dispatch a sequence of events to simulate a real drag-and-drop
            this.logger.info('🖱️ Simulating drag and drop sequence...');
            
            dropZone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer }));
            await sleep(100);
            dropZone.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer }));
            await sleep(100);
            dropZone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));

            this.logger.info('📡 Dispatched drag-and-drop events to drop zone');
            await sleep(3000); // Give the page time to react
            
            const progress = await this.checkUploadProgress(files.length);
            this.logger.info(`📊 Upload progress check: ${progress} images detected`);
            return progress > 0;
        } catch (error) {
            this.logger.error('❌ Error in drag and drop strategy:', error);
            return false;
        }
    }

    async checkUploadProgress(expectedCount) {
        this.logger.info(`🔍 Checking upload progress. Expecting ${expectedCount} images...`);
        
        // Multiple strategies to detect uploaded images
        const thumbnailSelectors = [
            'img[class*="thumbnail"]',
            'img[class*="image-preview"]',
            'img[class*="photo-preview"]',
            'img[class*="upload-preview"]',
            'img[src*="blob:"]',
            'img[src*="data:"]',
            '[class*="photo-item"] img',
            '[class*="image-item"] img',
            '[class*="upload-item"] img'
        ];
        
        let totalThumbnails = 0;
        for (const selector of thumbnailSelectors) {
            const thumbnails = document.querySelectorAll(selector);
            const validThumbnails = Array.from(thumbnails).filter(img => {
                const src = img.src || '';
                return src.startsWith('blob:') || src.startsWith('data:') || src.includes('upload');
            });
            totalThumbnails = Math.max(totalThumbnails, validThumbnails.length);
        }
        
        // Also check for photo counters
        const counterSelectors = [
            '[class*="photo-count"]',
            '[class*="image-count"]',
            '[class*="upload-count"]',
            '[data-testid*="count"]',
            '.photo-counter',
            '.image-counter'
        ];
        
        for (const selector of counterSelectors) {
            const counter = document.querySelector(selector);
            if (counter) {
                const text = counter.textContent || counter.innerText || '';
                const match = text.match(/(\d+)/);
                if (match) {
                    const count = parseInt(match[1], 10);
                    totalThumbnails = Math.max(totalThumbnails, count);
                }
            }
        }
        
        this.logger.info(`📊 Found ${totalThumbnails} uploaded images`);
        return totalThumbnails;
    }

    async verifyUploadSuccess(expectedCount) {
        this.logger.info(`🔍 Verifying upload success. Expecting ${expectedCount} images...`);
        const maxWaitTime = 30000; // 30 seconds for verification
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            const currentCount = await this.checkUploadProgress(expectedCount);
            
            if (currentCount >= expectedCount) {
                this.logger.info(`✅ Verification successful! Found ${currentCount} images (expected ${expectedCount})`);
                return true;
            }
            
            this.logger.info(`⏳ Verification in progress: ${currentCount}/${expectedCount} images found`);
            await sleep(2000); // Check every 2 seconds
        }
        
        const finalCount = await this.checkUploadProgress(expectedCount);
        this.logger.error(`❌ Verification failed. Final count: ${finalCount}/${expectedCount} images`);
        return false;
    }

    async cleanupStorage() {
        // This function is only called after successful upload verification
        // Do not call this unless verifyUploadSuccess() returned true
        this.logger.info('🗑️ Cleaning up images from Chrome storage (upload verified successful)...');
        chrome.storage.local.remove('watermarkedImages', () => {
            if (chrome.runtime.lastError) {
                this.logger.error('Error cleaning up storage:', chrome.runtime.lastError);
            } else {
                this.logger.info('✅ Storage cleanup successful.');
            }
        });
    }
}

// ==============================================================================
//  INITIALIZATION LOGIC
//  This runs automatically when the script is loaded on the correct page.
// ==============================================================================

// This self-executing function ensures that the script only runs once
// and does not conflict with other scripts.
(async function() {
    // Check if the system has already been initialized
    if (window.imageUploadSystemInitialized) {
        console.log('⚠️ Image uploader already initialized, skipping...');
        return;
    }
    window.imageUploadSystemInitialized = true;

    // Use a shared global logger if it exists from `automation-clean.js`
    const logger = window.logger || new SimpleLogger();
    
    logger.info('🚀 Standalone Image Uploader script loaded.');
    logger.info('🔗 Current URL:', window.location.href);
    logger.info('📄 Page title:', document.title);

    // Add manual testing functions to window
    window.testImageUpload = async function() {
        logger.info('🧪 Manual image upload test triggered');
        const uploadSystem = new ImageUploadSystem();
        return await uploadSystem.uploadImages();
    };
    
    window.debugImageStorage = function() {
        chrome.storage.local.get(null, (allData) => {
            logger.info('🔍 All Chrome storage data:', allData);
            logger.info('📸 Watermarked images:', allData.watermarkedImages?.length || 0);
            logger.info('🌐 Image URLs:', allData.imageUrls?.length || 0);
        });
    };
    
    window.debugUploadElements = function() {
        logger.info('🔍 Debugging upload elements on page...');
        
        const fileInputs = document.querySelectorAll('input[type="file"]');
        logger.info(`📁 Found ${fileInputs.length} file inputs:`, Array.from(fileInputs).map(input => ({
            id: input.id,
            name: input.name,
            accept: input.accept,
            multiple: input.multiple,
            className: input.className
        })));
        
        const uploadAreas = document.querySelectorAll('[class*="upload"], [class*="dropzone"], [class*="photo"]');
        logger.info(`📤 Found ${uploadAreas.length} upload areas:`, Array.from(uploadAreas).map(area => ({
            tagName: area.tagName,
            className: area.className,
            id: area.id,
            textContent: area.textContent?.substring(0, 50)
        })));
        
        const thumbnails = document.querySelectorAll('img[class*="thumbnail"], img[class*="preview"]');
        logger.info(`🖼️ Found ${thumbnails.length} thumbnails:`, Array.from(thumbnails).map(img => ({
            src: img.src?.substring(0, 50),
            className: img.className
        })));
    };

    // Check if we're on an eBay listing page
    if (!window.location.href.includes('ebay.com')) {
        logger.warn('⚠️ Not on eBay page, skipping image upload');
        return;
    }

    try {
        const uploadSystem = new ImageUploadSystem();
        await uploadSystem.uploadImages();
    } catch (error) {
        logger.error('💥 A fatal error occurred during image uploader initialization:', error);
    }
})();