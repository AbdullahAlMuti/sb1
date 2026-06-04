/**
 * @fileoverview eBay Item Specifics Filler
 * @version 6.0.0
 */

class SimpleItemFillerSystem {
    constructor() {
        this.logger = window.logger || new Logger();
    }

    async run() {
        this.logger.info('🚀 Starting Simple Item Filler System...');
        
        // STEP 1: Smart Wait for "Apply all" button (MOST IMPORTANT)
        await this.smartWaitForApplyAll();

        // STEP 2: Find and click first suggestions
        await this.findAndClickFirstSuggestions();

        // STEP 3: Fill description if available
        await this.fillDescription();

        this.logger.info('🎉 Simple Item Filler System completed!');
        
        // STEP 4: Click AI description button after item filler completes
        // DISABLED: AI description click is no longer needed
        // await this.clickAIDescriptionButton();
    }

    /**
     * Smart Wait for "Apply all" button
     */
    async smartWaitForApplyAll() {
        this.logger.info('🔍 Starting Smart Wait for "Apply all" button...');
        
        const startTime = Date.now();
        let applyButton = null;
        
        // Wait up to 10 seconds for the button to become enabled
        while (Date.now() - startTime < 10000) {
            // Find the "Apply all" button
            const buttons = document.querySelectorAll('button, a');
            
            for (const button of buttons) {
                const buttonText = button.innerText && button.innerText.trim().toLowerCase();
                if (buttonText === 'apply all') {
                    applyButton = button;
                    break;
                }
            }
            
            if (applyButton) {
                // Check if button is enabled (disabled attribute removed)
                const isDisabled = applyButton.hasAttribute('disabled') || 
                                 applyButton.disabled || 
                                 applyButton.classList.contains('disabled');
                
                if (!isDisabled) {
                    this.logger.info('✅ "Apply all" button is now enabled! Clicking...');
                    applyButton.click();
                    await this.sleep(2000); // Wait for page to process
                    return true;
                } else {
                    this.logger.info('⏳ "Apply all" button found but still disabled. Waiting...');
                }
            } else {
                this.logger.info('⏳ "Apply all" button not found yet. Waiting...');
            }
            
            await this.sleep(500); // Check every 500ms
        }
        
        this.logger.warn('⚠️ "Apply all" button did not become enabled within timeout. Continuing...');
        return false;
    }

    /**
     * HIGHLIGHT - Find and Click First Suggestions Algorithm
     */
    async findAndClickFirstSuggestions() {
        this.logger.info('🔍 Starting "Find Keyword and Click First" algorithm...');
        
        // Search the entire page for all <legend> elements
        const legends = document.querySelectorAll('legend');
        this.logger.info(`📋 Found ${legends.length} legend elements on the page`);
        
        let processedCount = 0;
        
        // Loop through each legend
        for (const legend of legends) {
            const legendText = legend.innerText && legend.innerText.trim();
            
            // Check if legend text contains "Frequently selected:" or "Suggested:"
            if (legendText && (legendText.toLowerCase().includes('frequently selected') || 
                             legendText.toLowerCase().includes('suggested'))) {
                
                this.logger.info(`🎯 Found suggestion legend: "${legendText}"`);
                
                try {
                    // Check if the field is already filled
                    const isAlreadyFilled = await this.checkIfFieldFilled(legend);
                    
                    if (isAlreadyFilled) {
                        this.logger.info(`ℹ️ Field already filled, skipping this legend`);
                        continue;
                    }
                    
                    // Click the very next button
                    const clicked = await this.clickNextButton(legend);
                    
                    if (clicked) {
                        processedCount++;
                        this.logger.info(`✅ Successfully clicked suggestion for legend: "${legendText}"`);
                        
                        // Human-like delay before moving to next legend
                        await this.sleep(1000);
                    } else {
                        this.logger.warn(`⚠️ Could not click suggestion for legend: "${legendText}"`);
                    }
                    
                } catch (error) {
                    this.logger.error(`💥 Error processing legend "${legendText}":`, error);
                }
            }
        }
        
        this.logger.info(`🎉 Processed ${processedCount} suggestion legends`);
    }

    /**
     * Check if the field is already filled
     */
    async checkIfFieldFilled(legend) {
        try {
            // Find the parent fieldset
            const fieldset = legend.closest('fieldset');
            if (!fieldset) return false;
            
            // Look for the main dropdown button in this fieldset
            const dropdownButton = fieldset.querySelector('button[name*="attributes"]');
            
            if (dropdownButton) {
                const buttonText = dropdownButton.innerText.trim();
                const placeholderTexts = ['–', 'Select', 'Choose', '', 'None', 'N/A', 'Please select'];
                
                const isFilled = buttonText && !placeholderTexts.includes(buttonText);
                if (isFilled) {
                    this.logger.info(`ℹ️ Field already filled with: "${buttonText}"`);
                }
                return isFilled;
            }
            
            // Also check for input fields
            const inputField = fieldset.querySelector('input, textarea');
            if (inputField) {
                const isFilled = inputField.value && inputField.value.trim() !== '';
                if (isFilled) {
                    this.logger.info(`ℹ️ Input field already filled with: "${inputField.value}"`);
                }
                return isFilled;
            }
            
            return false;
            
        } catch (error) {
            this.logger.error('💥 Error checking if field is filled:', error);
            return false;
        }
    }

    /**
     * Click the very next button after the legend
     */
    async clickNextButton(legend) {
        try {
            // Get the element that comes immediately after the legend
            const nextElement = legend.nextElementSibling;
            
            if (!nextElement) {
                this.logger.warn('⚠️ No element found after legend');
                return false;
            }
            
            // Check if the next element is a button with class "fake-link"
            if (nextElement.tagName === 'BUTTON' && nextElement.classList.contains('fake-link')) {
                const buttonText = nextElement.innerText && nextElement.innerText.trim();
                this.logger.info(`🎯 Clicking next button: "${buttonText}"`);
                nextElement.click();
                return true;
            }
            
            // If next element is not a button, look for the first button.fake-link in the parent fieldset
            const fieldset = legend.closest('fieldset');
            if (fieldset) {
                const firstButton = fieldset.querySelector('button.fake-link');
                if (firstButton) {
                    const buttonText = firstButton.innerText && firstButton.innerText.trim();
                    this.logger.info(`🎯 Clicking first fake-link button in fieldset: "${buttonText}"`);
                    firstButton.click();
                    return true;
                }
            }
            
            this.logger.warn('⚠️ No suitable button found to click');
            return false;
            
        } catch (error) {
            this.logger.error('💥 Error clicking next button:', error);
            return false;
        }
    }

    /**
     * Fill product description if available
     */
    async fillDescription() {
        try {
            // Get description from storage
            const result = await new Promise(resolve => {
                chrome.storage.local.get(['description'], resolve);
            });
            
            if (!result.description) {
                this.logger.info('ℹ️ No description found in storage, skipping description fill');
                return;
            }
            
            this.logger.info('📝 Filling product description...');
            
            const descriptionEditor = document.querySelector('.rte-editor > iframe');
            
            if (descriptionEditor && descriptionEditor.contentDocument) {
                const editorBody = descriptionEditor.contentDocument.body;
                if (!editorBody.innerText || editorBody.innerText.trim() === '') {
                    editorBody.replaceChildren();
                    String(result.description).split(/\n{2,}/).forEach((paragraphText) => {
                        const paragraph = descriptionEditor.contentDocument.createElement('p');
                        paragraphText.split('\n').forEach((line, index) => {
                            if (index > 0) paragraph.appendChild(descriptionEditor.contentDocument.createElement('br'));
                            paragraph.appendChild(descriptionEditor.contentDocument.createTextNode(line));
                        });
                        editorBody.appendChild(paragraph);
                    });
                    this.logger.info('✅ Description filled in iframe editor.');
                } else {
                    this.logger.info('ℹ️ Description field already contains text. Skipping.');
                }
            } else {
                this.logger.warn('⚠️ Could not find the description editor iframe.');
            }
            
        } catch (error) {
            this.logger.error('💥 Error filling description:', error);
        }
    }

    /**
     * Click AI description button after item filler completes
     */
    async clickAIDescriptionButton() {
        this.logger.info('🤖 Looking for "Use AI description" button after item filler completion...');
        
        const maxWaitTime = 10000; // 10 seconds
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            // Look for the AI description button
            const aiButton = document.querySelector('button.se-rte__ai-description-button.ai-icon.btn');
            
            if (aiButton) {
                this.logger.info('✅ Found "Use AI description" button');
                
                // Check if button is clickable
                if (!aiButton.disabled && aiButton.offsetParent !== null) {
                    this.logger.info('🤖 Clicking "Use AI description" button...');
                    aiButton.click();
                    this.logger.info('✅ Successfully clicked "Use AI description" button');
                    return true;
                } else {
                    this.logger.info('⏳ AI description button found but not clickable yet, waiting...');
                }
            } else {
                this.logger.info('⏳ AI description button not found yet, waiting...');
            }
            
            // Wait before next check
            await this.sleep(500);
        }
        
        this.logger.warn('⚠️ "Use AI description" button not found within timeout');
        return false;
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ==============================================================================
//  SIMPLE INITIALIZATION LOGIC
//  Implements conflict prevention and smart timing
// ==============================================================================

(async function() {
    // Prevent double initialization
    if (window.simpleItemFillerSystemInitialized) {
        return;
    }
    window.simpleItemFillerSystemInitialized = true;

    const logger = window.logger || new Logger();
    logger.info('🚀 Simple Item Filler script loaded with "Find Keyword and Click First" algorithm.');

    // Smart timing: Wait for page to be fully interactive
    await new Promise(resolve => setTimeout(resolve, 4000));

    try {
        const fillerSystem = new SimpleItemFillerSystem();
        await fillerSystem.run();
    } catch (error) {
        logger.error('💥 A fatal error occurred during the simple item filling process:', error);
    }
})();
