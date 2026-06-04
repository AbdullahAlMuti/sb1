console.log("eBay Lister script loaded: Awaiting data...");

// ─────────────────────────────────────────────
// 🎯 Scenario Manager - Handles eBay Listing Workflows
// ─────────────────────────────────────────────
class ScenarioManager {
  constructor() {
    this.currentScenario = null;
    this.currentStep = 0;
    this.isRunning = false;
  }

  // Detect which scenario based on page state or explicit request
  detectScenario(scenarioType = null) {
    if (scenarioType) {
      this.currentScenario = scenarioType;
      console.log(`🎯 Scenario ${scenarioType} selected`);
      return scenarioType;
    }
    
    // Auto-detect based on URL or page elements
    const url = window.location.href;
    if (url.includes('prelist/home')) {
      this.currentScenario = 1;
    } else if (url.includes('/sl/')) {
      this.currentScenario = 2;
    } else {
      this.currentScenario = 3;
    }
    
    console.log(`🎯 Auto-detected Scenario ${this.currentScenario}`);
    return this.currentScenario;
  }

  // Execute scenario step by step
  async executeScenario(title, scenarioType = null) {
    if (this.isRunning) {
      console.log("⚠️ Scenario already running, please wait...");
      return;
    }

    this.isRunning = true;
    this.currentStep = 0;
    this.detectScenario(scenarioType);

    console.log(`🚀 Starting Scenario ${this.currentScenario} with title: "${title}"`);

    try {
      switch (this.currentScenario) {
        case 1:
          await this.runScenario1(title);
          break;
        case 2:
          await this.runScenario2(title);
          break;
        case 3:
          await this.runScenario3(title);
          break;
        default:
          console.error("❌ Unknown scenario");
      }
    } catch (err) {
      console.error(`❌ Scenario ${this.currentScenario} failed at step ${this.currentStep}:`, err);
    } finally {
      this.isRunning = false;
    }
  }

  // Scenario 1: Full flow with special "New" radio selector
  async runScenario1(title) {
    console.log("📋 Scenario 1: Full prelist flow with special New selector");

    // Step 1: Paste title into search bar
    this.currentStep = 1;
    console.log(`[Step ${this.currentStep}] Pasting title into search bar...`);
    await this.pasteTitle(title);

    // Step 2: Click through suggestions until list runs out
    this.currentStep = 2;
    console.log(`[Step ${this.currentStep}] Clicking through suggestions...`);
    await this.clickThroughSuggestions();

    // Step 3: Click "Continue without match"
    this.currentStep = 3;
    console.log(`[Step ${this.currentStep}] Clicking 'Continue without match'...`);
    await this.clickContinueWithoutMatch();

    // Step 4: Click the special "New" radio input
    this.currentStep = 4;
    console.log(`[Step ${this.currentStep}] Clicking special 'New' condition selector...`);
    await this.clickNewConditionSpecial();

    // Step 5: Continue to listing page
    this.currentStep = 5;
    console.log(`[Step ${this.currentStep}] Continuing to listing page...`);
    await this.clickContinueToListing();

    console.log("✅ Scenario 1 completed!");
  }

  // Scenario 2: Standard flow with "New" option click
  async runScenario2(title) {
    console.log("📋 Scenario 2: Standard prelist flow with New option");

    // Step 1: Paste title into search bar
    this.currentStep = 1;
    console.log(`[Step ${this.currentStep}] Pasting title into search bar...`);
    await this.pasteTitle(title);

    // Step 2: Click through suggestions until list runs out
    this.currentStep = 2;
    console.log(`[Step ${this.currentStep}] Clicking through suggestions...`);
    await this.clickThroughSuggestions();

    // Step 3: Click "Continue without match"
    this.currentStep = 3;
    console.log(`[Step ${this.currentStep}] Clicking 'Continue without match'...`);
    await this.clickContinueWithoutMatch();

    // Step 4: Click "New" option
    this.currentStep = 4;
    console.log(`[Step ${this.currentStep}] Clicking 'New' option...`);
    await this.clickNewOption();

    // Step 5: Continue to listing
    this.currentStep = 5;
    console.log(`[Step ${this.currentStep}] Continuing to listing...`);
    await this.clickContinueToListing();

    console.log("✅ Scenario 2 completed!");
  }

  // Scenario 3: Conditional "New" option (if it appears)
  async runScenario3(title) {
    console.log("📋 Scenario 3: Conditional New option flow");

    // Step 1: Paste title into search bar
    this.currentStep = 1;
    console.log(`[Step ${this.currentStep}] Pasting title into search bar...`);
    await this.pasteTitle(title);

    // Step 2: Click through suggestions until list runs out
    this.currentStep = 2;
    console.log(`[Step ${this.currentStep}] Clicking through suggestions...`);
    await this.clickThroughSuggestions();

    // Step 3: Click "Continue without match"
    this.currentStep = 3;
    console.log(`[Step ${this.currentStep}] Clicking 'Continue without match'...`);
    await this.clickContinueWithoutMatch();

    // Step 4: If "New" option appears, click it
    this.currentStep = 4;
    console.log(`[Step ${this.currentStep}] Checking for 'New' option...`);
    const newOptionClicked = await this.tryClickNewOption();
    
    if (newOptionClicked) {
      console.log(`[Step ${this.currentStep}] 'New' option clicked successfully`);
    } else {
      console.log(`[Step ${this.currentStep}] 'New' option not found, continuing...`);
    }

    // Step 5: Continue to listing
    this.currentStep = 5;
    console.log(`[Step ${this.currentStep}] Continuing to listing...`);
    await this.clickContinueToListing();

    console.log("✅ Scenario 3 completed!");
  }

  // ─────────────────────────────────────────────
  // 🔧 Scenario Step Helpers
  // ─────────────────────────────────────────────

  async pasteTitle(title) {
    console.log(`[pasteTitle] 🔍 Starting title paste with: "${title?.substring(0, 50)}..."`);
    
    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="search" i]',
      'input[placeholder*="title" i]',
      'input[placeholder*="item" i]',
      'input[name="query"]',
      'input[id*="search" i]',
      'input.search-input',
      'input[data-testid*="search" i]',
      '#s0-1-1-24-7-@keyword-@search-input-textbox',
      'input[role="combobox"]'
    ];

    const searchInput = await findElementWithSelectors(searchSelectors, 10000);
    console.log(`[pasteTitle] Found search input:`, !!searchInput, searchInput?.tagName, searchInput?.id);
    
    if (searchInput) {
      searchInput.focus();
      searchInput.value = '';
      
      // React-safe input
      const lastValue = searchInput.value;
      searchInput.value = title;
      const event = new Event('input', { bubbles: true });
      const tracker = searchInput._valueTracker;
      if (tracker) tracker.setValue(lastValue);
      searchInput.dispatchEvent(event);
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      await wait(500);
      console.log(`[pasteTitle] ✅ Title pasted successfully: "${title.substring(0, 50)}..."`);
    } else {
      console.error('[pasteTitle] ❌ Search input not found with any selector');
      throw new Error("Search input not found");
    }
  }

  async clickThroughSuggestions() {
    const maxSuggestions = 10;
    let clickCount = 0;

    for (let i = 0; i < maxSuggestions; i++) {
      await wait(800);
      
      const suggestionSelectors = [
        'li[role="option"]',
        'div[role="option"]',
        '.suggestion-item',
        '.search-suggestion',
        '[data-testid*="suggestion"]',
        '.listbox__item',
        'button[data-marko-key*="suggestion"]'
      ];

      let suggestionFound = false;
      for (const selector of suggestionSelectors) {
        const suggestions = document.querySelectorAll(selector);
        if (suggestions.length > 0) {
          const visibleSuggestion = Array.from(suggestions).find(s => s.offsetParent !== null);
          if (visibleSuggestion) {
            visibleSuggestion.click();
            clickCount++;
            console.log(`📌 Clicked suggestion ${clickCount}`);
            suggestionFound = true;
            break;
          }
        }
      }

      if (!suggestionFound) {
        console.log(`📋 No more suggestions found after ${clickCount} clicks`);
        break;
      }
    }
  }

  async clickContinueWithoutMatch() {
    const continueSelectors = [
      'button[data-marko-key*="continue-without-match"]',
      'button:contains("Continue without match")',
      '[data-testid*="continue-without-match"]',
      'button[id*="continue-without"]',
      'a:contains("Continue without match")',
      'span:contains("Continue without match")'
    ];

    // Try standard selectors first
    try {
      const btn = await findElementWithSelectors(continueSelectors, 5000);
      if (btn) {
        btn.click();
        console.log("✅ Clicked 'Continue without match'");
        await wait(1000);
        return;
      }
    } catch (e) {
      // Fallback: search by text content
    }

    // Fallback: find by text
    const allButtons = document.querySelectorAll('button, a, span');
    for (const el of allButtons) {
      const text = (el.textContent || '').toLowerCase();
      if (text.includes('continue without match') || text.includes('without match')) {
        el.click();
        console.log("✅ Clicked 'Continue without match' (fallback)");
        await wait(1000);
        return;
      }
    }

    console.log("⚠️ 'Continue without match' button not found, may already be past this step");
  }

  async clickNewConditionSpecial() {
    // Special selector for the "New" condition radio button
    const specialSelector = 'input.radio_control#s0-1-1-24-10-7-0\\@condition-side-pane-1\\@dialog-16-1-5-1-9-condition-1000';
    
    const radioSelectors = [
      specialSelector,
      'input[type="radio"][value="1000"]',
      'input[type="radio"][id*="condition-1000"]',
      'input[type="radio"][id*="NEW" i]',
      'input.radio_control[id*="condition"]',
      'label:contains("New") input[type="radio"]'
    ];

    try {
      const radio = await findElementWithSelectors(radioSelectors, 8000);
      if (radio) {
        radio.click();
        console.log("✅ Clicked 'New' condition (special selector)");
        await wait(500);
        return;
      }
    } catch (e) {
      // Try label click fallback
    }

    // Fallback: find label with "New" and click its associated radio
    const labels = document.querySelectorAll('label, span, div');
    for (const label of labels) {
      const text = (label.textContent || '').trim().toLowerCase();
      if (text === 'new' || text.startsWith('new ')) {
        const radio = label.querySelector('input[type="radio"]') || 
                     document.getElementById(label.getAttribute('for'));
        if (radio) {
          radio.click();
          console.log("✅ Clicked 'New' condition via label");
          await wait(500);
          return;
        }
        // Click the label itself
        label.click();
        console.log("✅ Clicked 'New' label directly");
        await wait(500);
        return;
      }
    }

    console.log("⚠️ 'New' condition selector not found");
  }

  async clickNewOption() {
    return this.clickNewConditionSpecial();
  }

  async tryClickNewOption() {
    try {
      await this.clickNewConditionSpecial();
      return true;
    } catch (e) {
      return false;
    }
  }

  async clickContinueToListing() {
    const continueSelectors = [
      'button[data-marko-key*="continue"]',
      'button:contains("Continue to listing")',
      'button:contains("Continue")',
      '[data-testid*="continue-to-listing"]',
      'button[id*="continue"]',
      'a:contains("Continue")'
    ];

    try {
      const btn = await findElementWithSelectors(continueSelectors, 5000);
      if (btn) {
        btn.click();
        console.log("✅ Clicked 'Continue to listing'");
        await wait(1000);
        return;
      }
    } catch (e) {
      // Fallback
    }

    // Fallback: find by text
    const allButtons = document.querySelectorAll('button, a');
    for (const el of allButtons) {
      const text = (el.textContent || '').toLowerCase();
      if (text.includes('continue to listing') || text === 'continue') {
        if (el.offsetParent !== null && !el.disabled) {
          el.click();
          console.log("✅ Clicked 'Continue' button (fallback)");
          await wait(1000);
          return;
        }
      }
    }

    console.log("⚠️ 'Continue' button not found");
  }

  // Update workflow dynamically
  updateWorkflow(scenarioType, updates) {
    console.log(`🔄 Updating Scenario ${scenarioType} with:`, updates);
    // Store updates for future runs
    this.workflowUpdates = this.workflowUpdates || {};
    this.workflowUpdates[scenarioType] = { ...this.workflowUpdates[scenarioType], ...updates };
  }
}

// Global scenario manager instance
const scenarioManager = new ScenarioManager();

// Expose for external use
window.scenarioManager = scenarioManager;
window.runScenario = (title, scenarioType) => scenarioManager.executeScenario(title, scenarioType);

// ─────────────────────────────────────────────
// 🔧 Helper Functions
// ─────────────────────────────────────────────
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForElement(selector, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const el = document.querySelector(selector);
    if (el && el.offsetParent !== null) return el; // Also check if element is visible
    await wait(250);
  }
  throw new Error(`Element with selector "${selector}" not found`);
}

// Helper to try multiple selectors with waiting
async function findElementWithSelectors(selectors, timeout = 15000) {
  const startTime = Date.now();
  let lastError = null;

  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null && !el.disabled) {
          console.log(`✅ Found element with selector: ${selector}`);
          return el;
        }
      } catch (e) {
        lastError = e;
      }
    }
    await wait(300);
  }

  throw lastError || new Error(`None of the selectors matched: ${selectors.join(', ')}`);
}

// ─────────────────────────────────────────────
// 🚀 Main Automation
// ─────────────────────────────────────────────
async function runEbayAutomation(data) {
  if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log("🚀 Starting eBay automation with data (hidden in prod)", data);

  // Utility: React-safe setter
  const reactInput = (el, value) => {
    const lastValue = el.value;
    el.value = value;
    const event = new Event('input', { bubbles: true });
    const tracker = el._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    el.dispatchEvent(event);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  // 1️⃣ Fill SKU (FIRST - ensures proper field initialization)
  if (data.ebaySku) {
    try {
      console.log(`🏷️ [STEP 1] Attempting to fill SKU: ${data.ebaySku}`);
      const skuSelectors = [
        // Exact match patterns from eBay listing page
        'input[name="customLabel"].textbox__control',
        'input.textbox__control[name="customLabel"]',
        'input[name="customLabel"][aria-describedby*="@TITLE"]',
        'input[name="customLabel"][aria-describedby*="counter"]',
        'input[aria-describedby*="@TITLE"][aria-describedby*="counter"]',
        'input[id*="@TITLE"].textbox__control[aria-describedby*="counter"]',
        // Fallback patterns
        'input[name="customLabel"]',
        'input[type="text"][name="customLabel"]',
        'input[name="customLabel"][maxlength="50"]',
        'input[id*="CUSTOMLABEL" i]',
        'input[id*="customLabel" i]',
        'input[id*="custom-label" i]',
        'input[id*="@TITLE"]',
        'input[aria-describedby*="counter"]',
        'input[aria-label*="custom" i]',
        'input[aria-label*="sku" i]',
        'input[aria-label*="label" i]',
        'input[placeholder*="custom" i]',
        'input[placeholder*="sku" i]',
        'input[placeholder*="label" i]',
        'input[type="text"][name*="label" i]',
        'input[type="text"][id*="label" i]',
        'input[type="text"][class*="label" i]',
        'input[data-testid*="sku" i]',
        'input[data-testid*="label" i]',
        'input[class*="custom" i]',
        '[name="customLabel"]',
        // Try to find by maxlength and textbox class
        'input.textbox__control[maxlength="50"]',
        'input[maxlength="50"][aria-describedby*="@TITLE"]'
      ];

      let skuInput = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!skuInput && attempts < maxAttempts) {
        attempts++;
        console.log(`🔍 SKU field search attempt ${attempts}/${maxAttempts}...`);

        try {
          skuInput = await findElementWithSelectors(skuSelectors, 5000);
        } catch (err) {
          console.log(`⏳ SKU field not found yet, attempt ${attempts}/${maxAttempts}...`);
          if (attempts < maxAttempts) {
            await wait(1000 * attempts); // Exponential backoff
          }
        }
      }

      // Fallback: Search by label text or nearby text content
      if (!skuInput) {
        console.log("🔍 Trying fallback method: searching by label/text for SKU...");

        // Method 1: Search by labels
        const labels = document.querySelectorAll('label, span, div, p, h3, h4');
        for (const element of labels) {
          const text = (element.textContent || '').toLowerCase();
          if (text.includes('custom label') || text.includes('custom label (sku)') ||
            text.includes('sku') || text.includes('identifier') ||
            text.includes('item number') || text.includes('custom identifier')) {
            console.log(`🔍 Found SKU-related text: "${text.substring(0, 50)}"`);

            // Check for attribute
            const forAttr = element.getAttribute('for');
            if (forAttr) {
              const found = document.getElementById(forAttr);
              if (found && found.tagName === 'INPUT' && found.offsetParent !== null) {
                skuInput = found;
                console.log(`✅ Found SKU input via 'for' attribute`);
                break;
              }
            }

            // Check next sibling
            let sibling = element.nextElementSibling;
            for (let i = 0; i < 3 && sibling; i++) {
              if (sibling.tagName === 'INPUT' && sibling.type === 'text' && sibling.offsetParent !== null) {
                skuInput = sibling;
                console.log(`✅ Found SKU input as sibling (${i + 1} levels down)`);
                break;
              }
              sibling = sibling.nextElementSibling;
            }
            if (skuInput) break;

            // Check parent container and its siblings
            const parent = element.closest('div, fieldset, form, section, li');
            if (parent) {
              const inputs = parent.querySelectorAll('input[type="text"]');
              for (const input of inputs) {
                // Check if input has maxlength="50" (common for SKU)
                const maxLength = input.getAttribute('maxlength');
                if (input.offsetParent !== null && (maxLength === '50' || maxLength === '40')) {
                  skuInput = input;
                  console.log(`✅ Found SKU input in parent (maxlength=${maxLength})`);
                  break;
                }
              }
              if (!skuInput && inputs.length > 0) {
                // Try any visible text input in parent
                for (const input of inputs) {
                  if (input.offsetParent !== null) {
                    skuInput = input;
                    console.log(`✅ Found SKU input in parent (first visible)`);
                    break;
                  }
                }
              }
            }
            if (skuInput) break;
          }
        }

        // Method 2: Look for inputs with maxlength="50" near "Custom label" text
        if (!skuInput) {
          console.log("🔍 Trying method 2: searching for inputs with maxlength 50...");
          const allTextInputs = document.querySelectorAll('input[type="text"]');
          for (const input of allTextInputs) {
            if (input.offsetParent !== null) {
              const maxLength = input.getAttribute('maxlength');
              const name = (input.name || '').toLowerCase();
              const id = (input.id || '').toLowerCase();
              const placeholder = (input.placeholder || '').toLowerCase();

              // Check if it's likely a SKU field
              if (maxLength === '50' ||
                name.includes('label') || name.includes('sku') ||
                id.includes('label') || id.includes('sku') ||
                placeholder.includes('label') || placeholder.includes('sku')) {
                // Verify it's near "Custom label" text
                const parent = input.closest('div, fieldset, form, section');
                if (parent) {
                  const parentText = (parent.textContent || '').toLowerCase();
                  if (parentText.includes('custom label') || parentText.includes('sku')) {
                    skuInput = input;
                    console.log(`✅ Found SKU input by maxlength and nearby text`);
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // Last resort: Find any input with maxlength 50 that's empty
      if (!skuInput) {
        console.log("🔍 Last resort: searching for empty input with maxlength 50...");
        const allInputs = document.querySelectorAll('input[type="text"]');
        for (const input of allInputs) {
          if (input.offsetParent !== null && !input.disabled) {
            const maxLength = input.getAttribute('maxlength');
            const value = (input.value || '').trim();
            const name = (input.name || '').toLowerCase();

            // If it has maxlength 50 and is empty, check if it's in a section with "Custom label"
            if (maxLength === '50' && value === '' && name.includes('label')) {
              const container = input.closest('div, section, fieldset, form');
              if (container) {
                const containerText = (container.textContent || '').toLowerCase();
                if (containerText.includes('custom') || containerText.includes('sku')) {
                  skuInput = input;
                  console.log(`✅ Found SKU input via maxlength 50 and container text`);
                  break;
                }
              }
            }
          }
        }
      }

      if (skuInput) {
        // Scroll into view if needed
        if (skuInput.getBoundingClientRect().top < 0 || skuInput.getBoundingClientRect().bottom > window.innerHeight) {
          skuInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await wait(500);
        }

        reactInput(skuInput, data.ebaySku);
        await wait(300); // Small delay after fill

        // Verify the value was set
        if (skuInput.value === data.ebaySku) {
          console.log(`✅ [STEP 1] SKU filled successfully: ${data.ebaySku}`);
        } else {
          console.warn(`⚠️ SKU input value mismatch. Expected: ${data.ebaySku}, Got: ${skuInput.value}`);
          // Try one more time with direct value assignment
          skuInput.value = data.ebaySku;
          skuInput.dispatchEvent(new Event('input', { bubbles: true }));
          skuInput.dispatchEvent(new Event('change', { bubbles: true }));
          await wait(200);
          console.log(`🔄 Retried filling SKU. Current value: ${skuInput.value}`);
        }
      } else {
        console.warn("⚠️ SKU input not found after all attempts");
        console.log("🔍 Debugging: All text inputs on page:", Array.from(document.querySelectorAll('input[type="text"]')).map(inp => ({
          name: inp.name,
          id: inp.id,
          placeholder: inp.placeholder,
          ariaLabel: inp.getAttribute('aria-label'),
          maxlength: inp.getAttribute('maxlength'),
          value: inp.value,
          visible: inp.offsetParent !== null,
          parentText: (inp.closest('div, section')?.textContent || '').substring(0, 100)
        })));
      }
    } catch (err) {
      console.error("❌ SKU fill failed:", err);
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast(`Failed to fill SKU: ${err.message}`, 'error');
      }
    }
  } else {
    console.warn("⚠️ No SKU data available to fill");
  }

  // Delay between SKU and Price fills
  await wait(500);

  // 2️⃣ Fill Price (LAST - ensures all other fields are set first)
  if (data.ebayPrice) {
    try {
      console.log(`💰 [STEP 2] Attempting to fill price: ${data.ebayPrice}`);
      // ... (selector definitions omitted for brevity, they are unchanged) ...
      const priceSelectors = [
        'input[name="price"].textbox__control',
        'input.textbox__control[name="price"]',
        'input[name="price"][aria-label*="price" i]',
        'input[name="price"][aria-describedby*="@PRICE"]',
        'input[aria-describedby*="@PRICE"][aria-describedby*="prefix"]',
        'input[id*="@PRICE"].textbox__control',
        'input[name="price"]',
        'input[type="text"][name="price"]',
        'input[type="number"][name="price"]',
        'input[aria-describedby*="price"]',
        'input[aria-describedby*="prefix"]',
        'input[id*="@PRICE"]',
        'input[id*="price"]',
        'input[aria-label*="price" i]',
        'input[placeholder*="price" i]',
        'input[data-testid*="price" i]',
        '[name="price"]'
      ];

      // ... (rest of logic unchanged until catch) ...
      let priceInput = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!priceInput && attempts < maxAttempts) {
        attempts++;
        try {
          priceInput = await findElementWithSelectors(priceSelectors, 5000);
        } catch (err) {
          if (attempts < maxAttempts) await wait(1000 * attempts);
        }
      }

      // Fallback: Try to find by label text
      if (!priceInput) {
        console.log("🔍 Trying fallback: searching by label text for price...");
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
          const labelText = (label.textContent || '').toLowerCase();
          if (labelText.includes('price') || labelText.includes('starting price') || labelText.includes('buy it now')) {
            const forAttr = label.getAttribute('for');
            if (forAttr) {
              const found = document.getElementById(forAttr);
              if (found && (found.type === 'text' || found.type === 'number') && found.offsetParent !== null) {
                priceInput = found;
                break;
              }
            }
            // Also check next sibling
            const nextInput = label.nextElementSibling;
            if (nextInput && (nextInput.tagName === 'INPUT') && nextInput.offsetParent !== null) {
              priceInput = nextInput;
              break;
            }
          }
        }
      }

      if (priceInput) {
        reactInput(priceInput, data.ebayPrice);
        await wait(300); // Small delay after fill
        console.log(`✅ [STEP 2] Price filled successfully: ${data.ebayPrice}`);
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast(`Price filled: ${data.ebayPrice}`, 'success');
        }
      } else {
        console.warn("⚠️ Price input not found after all attempts");
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast('Could not find Price field', 'warning');
        }
      }
    } catch (err) {
      console.error("❌ Price fill failed:", err);
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast(`Failed to fill Price: ${err.message}`, 'error');
      }
    }
  } else {
    console.warn("⚠️ No price data available to fill");
  }

  console.log("✅ SKU and Price automation completed");

  // Delay before description fill
  await wait(500);

  // 3️⃣ Fill Description (after SKU and Price)
  if (data.ebayDescription) {
    try {
      console.log(`📝 [STEP 3] Attempting to fill description...`);
      
      const success = await pasteDescriptionToEbay(data.ebayDescription);
      
      if (success) {
        console.log(`✅ [STEP 3] Description filled successfully`);
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast('Description filled', 'success');
        }
        
        // Clear the description from storage after successful paste
        chrome.storage.local.remove(['selectedEbayDescription', 'selectedDescriptionTimestamp'], () => {
          console.log('[eBay Lister] Cleared description from storage after paste');
        });
      } else {
        console.warn("⚠️ Description paste failed");
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast('Could not fill description field', 'warning');
        }
      }
    } catch (err) {
      console.error("❌ Description fill failed:", err);
      if (typeof UIHelper !== 'undefined') {
        UIHelper.showToast(`Failed to fill description: ${err.message}`, 'error');
      }
    }
  } else {
    console.warn("⚠️ No description data available to fill");
  }

  console.log("✅ eBay automation completed");
  if (typeof UIHelper !== 'undefined') {
    UIHelper.showToast('eBay Automation Completed', 'success');
  }

  // If this is a bulk job, auto-click "Save for later"
  if (data.isBulkJob) {
    console.log("🚀 Bulk job detected, attempting to click 'Save for later'...");
    await wait(2000); // Let React state settle
    
    // Find Save for later button
    const buttons = Array.from(document.querySelectorAll('button'));
    const saveBtn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes('save for later'));
    
    if (saveBtn) {
      console.log("✅ Found 'Save for later' button, but skipping click for testing as requested.");
      // saveBtn.click();
      chrome.storage.local.remove(['isBulkJob']);
    } else {
      console.warn("⚠️ Could not find 'Save for later' button");
    }
  }
}

// ─────────────────────────────────────────────
// 🔍 Page Readiness Check
// ─────────────────────────────────────────────
async function waitForPageReady() {
  console.log("⏳ Waiting for eBay listing page to be ready...");
  const maxWait = 15000; // 15 seconds max
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    // Check for key eBay listing page indicators
    const hasForm = document.querySelector('form') !== null;
    const hasInputs = document.querySelectorAll('input[type="text"], input[type="number"]').length > 0;
    const hasBody = document.body !== null;
    const hasInteractiveElements = document.querySelectorAll('button, input, select').length > 5;

    if (hasForm && hasInputs && hasBody && hasInteractiveElements) {
      const waitTime = Date.now() - startTime;
      console.log(`✅ Page ready detected after ${waitTime}ms`);
      return true;
    }

    await wait(500);
  }

  console.warn("⚠️ Page readiness timeout, continuing anyway...");
  return false;
}

// ─────────────────────────────────────────────
// 🏁 Message Listener
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  // Handle scenario-based execution
  if (request.action === "RUN_SCENARIO") {
    console.log("🎯 RUN_SCENARIO received:", request);
    const { scenarioType, title } = request;
    
    // Get title from request or storage
    let scenarioTitle = title;
    if (!scenarioTitle) {
      const data = await chrome.storage.local.get(["ebayTitle", "productTitle"]);
      scenarioTitle = data.ebayTitle || data.productTitle;
    }
    
    if (!scenarioTitle) {
      console.error("❌ No title provided for scenario execution");
      return;
    }
    
    await scenarioManager.executeScenario(scenarioTitle, scenarioType);
    return;
  }

  // Original RUN_EBAY_LISTER handler (preserved)
  if (request.action === "RUN_EBAY_LISTER") {
    console.log("🎯 RUN_EBAY_LISTER received, starting automation...");

    // Wait for page to be ready
    await waitForPageReady();
    await wait(2000); // Additional buffer

    const data = await chrome.storage.local.get([
      "ebayTitle", "ebayPrice", "ebaySku", "watermarkedImages", "imageUrls", "itemSpecifics",
      "productTitle", "pricingConfig", "amazonPrice", "selectedEbayDescription", "generatedDescription"
    ]);

    if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log("📦 Retrieved data from storage:", {
      hasTitle: !!(data.ebayTitle || data.productTitle),
      hasPrice: !!data.ebayPrice,
      hasSku: !!data.ebaySku,
      hasDescription: !!(data.selectedEbayDescription || data.generatedDescription),
      price: data.ebayPrice,
      sku: data.ebaySku,
      title: data.ebayTitle || data.productTitle
    });

    // Verify we have at least title
    if (!data.ebayTitle && !data.productTitle) {
      console.error("❌ No stored product title. Need to run List-It first.");
      return;
    }

    // Fallback price calculation if ebayPrice is missing
    let finalPrice = data.ebayPrice;
    if (!finalPrice && data.pricingConfig && data.amazonPrice) {
      console.log("💰 Calculating price from pricing config...");
      const { tax, trackingCost, ebayFee, promo, profit } = data.pricingConfig;
      finalPrice = (data.amazonPrice + trackingCost) * (1 + tax + ebayFee + profit - promo);
      finalPrice = finalPrice.toFixed(2);
      console.log(`💰 Calculated price: ${finalPrice}`);
    }

    if (!finalPrice) {
      console.warn("⚠️ No price available - price will not be filled");
    }

    if (!data.ebaySku) {
      console.warn("⚠️ No SKU available - SKU will not be filled");
    }

    // Get description from storage
    const ebayDescription = data.selectedEbayDescription || data.generatedDescription;
    if (!ebayDescription) {
      console.warn("⚠️ No description available - description will not be filled");
    }

    const title = data.ebayTitle || data.productTitle;

    await runEbayAutomation({
      ebayTitle: title,
      ebayPrice: finalPrice,
      ebaySku: data.ebaySku,
      ebayDescription: ebayDescription
    });

    console.log("✅ eBay automation completed");

    // Sync listing to dashboard database
    try {
      const syncData = await chrome.storage.local.get([
        "ebayTitle",
        "amazonPrice",
        "ebayPrice",
        "amazonURL",
        "sku",
        "productTitle",
        "amazonAsin",
        "ebaySku",
        // Full Amazon scrape payload (includes mainImage/allImages)
        "completeProductData",
        // Optional: some flows store images here
        "productImages",
      ]);
      
      const scraped = syncData?.completeProductData;
      const mainImage = scraped?.mainImage || (Array.isArray(scraped?.allImages) ? scraped.allImages[0] : null) || (Array.isArray(syncData?.productImages) ? syncData.productImages[0] : null);
      const allImages = Array.isArray(scraped?.allImages) ? scraped.allImages : (Array.isArray(syncData?.productImages) ? syncData.productImages : undefined);

      const listingData = {
        title: syncData.ebayTitle || syncData.productTitle || title,
        sku: syncData.sku || syncData.ebaySku || data.ebaySku,
        ebay_price: parseFloat(syncData.ebayPrice || finalPrice) || null,
        amazon_price: parseFloat(syncData.amazonPrice) || null,
        amazon_url: syncData.amazonURL || null,
        amazon_asin: syncData.amazonAsin || null,
        status: 'active',
        // Pass through existing scraped Amazon data (no business-logic changes)
        ...(mainImage || allImages ? {
          amazon_data: {
            ...(scraped && typeof scraped === 'object' ? scraped : {}),
            ...(mainImage ? { mainImage, imageUrl: mainImage } : {}),
            ...(allImages ? { allImages } : {}),
            source: 'extension',
          }
        } : {})
      };

      if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log("📤 Syncing listing to dashboard (hidden in prod)", listingData);

      const syncViaBackground = () => new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "SYNC_LISTING",
          payload: listingData
        }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              source: 'background',
              error: chrome.runtime.lastError.message || 'Background sync failed'
            });
            return;
          }
          resolve(response || { success: false, source: 'background', error: 'No background response' });
        });
      });

      let syncResult = null;

      // Use SyncUtils if available
      if (typeof window.SyncUtils !== 'undefined' && window.SyncUtils.syncListing) {
        try {
          syncResult = await window.SyncUtils.syncListing(listingData);
        } catch (syncUtilsErr) {
          syncResult = {
            success: false,
            source: 'sync_utils',
            error: syncUtilsErr?.message || 'SyncUtils threw an error'
          };
        }

        if (!syncResult?.success) {
          console.warn("⚠️ SyncUtils failed, trying background fallback:", syncResult?.error);
          syncResult = await syncViaBackground();
        }
      } else {
        syncResult = await syncViaBackground();
        console.log("📤 Sent SYNC_LISTING message to background script");
      }

      if (syncResult?.success) {
        console.log("✅ Listing synced to dashboard successfully:", syncResult);
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast('Listing synced to dashboard', 'success');
        }
      } else {
        const errorMessage = syncResult?.error || 'Unknown listing sync error';
        console.error("❌ Failed to sync listing after fallback:", syncResult);
        if (typeof UIHelper !== 'undefined') {
          UIHelper.showToast(`Sync failed: ${errorMessage}`, 'error');
        }
        if (window.SyncUtils?.recordListingSyncError) {
          await window.SyncUtils.recordListingSyncError({
            source: syncResult?.source || 'ebay_lister',
            status: syncResult?.status || null,
            error: errorMessage,
            details: syncResult?.details || null,
            listingData
          });
        }
        if (window.SyncUtils?.syncQueue) {
          await window.SyncUtils.syncQueue.add({ type: 'listing', data: listingData });
        }
      }
    } catch (syncErr) {
      console.error("❌ Error syncing listing:", syncErr);
      if (window.SyncUtils?.recordListingSyncError) {
        await window.SyncUtils.recordListingSyncError({
          source: 'ebay_lister',
          error: syncErr?.message || 'Unexpected listing sync error'
        });
      }
    }

    // Log to Google Sheets after automation completes
    chrome.storage.local.get(["ebayTitle", "amazonPrice", "ebayPrice", "amazonURL", "sku"], (sheetData) => {
      chrome.runtime.sendMessage({
        action: "LOG_TO_SHEET",
        payload: {
          sku: sheetData.sku || "",
          title: sheetData.ebayTitle || "",
          amazon_price: sheetData.amazonPrice || "",
          ebay_price: sheetData.ebayPrice || "",
          amazon_url: sheetData.amazonURL || ""
        }
      });
    });
  }
});

// ─────────────────────────────────────────────
// 🧪 Manual Testing Functions
// ─────────────────────────────────────────────
window.testSkuFill = function (sku = "TEST-SKU-123") {
  console.log("🧪 Manual SKU fill test...");

  const reactInput = (el, value) => {
    const lastValue = el.value;
    el.value = value;
    const event = new Event('input', { bubbles: true });
    const tracker = el._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    el.dispatchEvent(event);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  const skuSelectors = [
    'input[name="customLabel"]',
    'input[id*="CUSTOMLABEL"]',
    'input[id*="@TITLE"]',
    'input[aria-describedby*="counter"]',
    'input[aria-label*="custom"]',
    'input[aria-label*="sku"]',
    'input[placeholder*="custom"]',
    'input[placeholder*="sku"]',
    'input[type="text"][name*="label"]',
    'input[type="text"][id*="label"]',
    'input[type="text"][class*="label"]'
  ];

  let skuInput = null;
  for (const selector of skuSelectors) {
    const found = document.querySelector(selector);
    if (found && found.type === 'text') {
      skuInput = found;
      console.log(`✅ Found SKU input with selector: ${selector}`);
      break;
    }
  }

  if (skuInput) {
    reactInput(skuInput, sku);
    console.log("✅ SKU filled manually:", sku);
    return true;
  } else {
    console.warn("⚠️ SKU input not found for manual test");
    return false;
  }
};

window.debugSkuFields = function () {
  console.log("🔍 Debugging SKU fields...");

  const allTextInputs = document.querySelectorAll('input[type="text"]');
  console.log(`📝 Found ${allTextInputs.length} text inputs:`,
    Array.from(allTextInputs).map(input => ({
      name: input.name,
      id: input.id,
      placeholder: input.placeholder,
      ariaLabel: input.getAttribute('aria-label'),
      className: input.className,
      value: input.value
    }))
  );

  const allLabels = document.querySelectorAll('label');
  console.log(`🏷️ Found ${allLabels.length} labels:`,
    Array.from(allLabels).map(label => ({
      text: label.textContent?.trim(),
      for: label.getAttribute('for'),
      id: label.id
    }))
  );
};

// ─────────────────────────────────────────────
// 🔧 Fallback Condition Handler for Listing Pages
// ─────────────────────────────────────────────
async function handleListingPageCondition() {
  console.log("🔍 Checking for condition button on listing page...");
  
  // Look for the specific condition recommendation button
  const conditionBtn = document.querySelector('button.condition-recommendation-value.btn');
  
  if (conditionBtn) {
    console.log("✅ Found condition recommendation button, clicking...");
    conditionBtn.click();
    await wait(1000);
    
    // After clicking, look for the "New" option (condition-1000)
    await selectNewConditionFallback();
    return true;
  }
  
  // Also check for any condition-related elements that need attention
  const conditionWarning = document.querySelector(
    '[class*="condition-warning"], ' +
    '[class*="condition-required"], ' +
    '[data-test*="condition"]'
  );
  
  if (conditionWarning) {
    console.log("⚠️ Condition warning found, attempting to set condition...");
    conditionWarning.click();
    await wait(800);
    await selectNewConditionFallback();
    return true;
  }
  
  return false;
}

async function selectNewConditionFallback() {
  console.log("🎯 Selecting 'New' condition (condition-1000) as fallback...");
  
  // Try multiple selectors for condition-1000 (New)
  const selectors = [
    'input[value="1000"]',
    'input[id*="condition-1000"]',
    'input.radio_control[id*="condition-1000"]',
    '[data-value="1000"]',
    'input[name*="condition"][value="1000"]',
    'label[for*="condition-1000"]',
    '[id*="condition-side-pane"] input[value="1000"]',
    '[id*="condition-dialog"] input[value="1000"]',
    'input[type="radio"][value="1000"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      element.click();
      console.log(`✅ Selected 'New' condition using: ${selector}`);
      await wait(500);
      
      // Look for confirm/apply button
      await clickConditionConfirmButton();
      return true;
    }
  }
  
  // Fallback: text-based search for "New" option
  const allLabels = document.querySelectorAll('label, span, div[role="radio"], div[role="option"]');
  for (const label of allLabels) {
    const text = label.textContent?.trim().toLowerCase();
    if (text === 'new' || text === 'new with tags' || text === 'brand new') {
      const input = label.querySelector('input') || 
                    document.querySelector(`input[id="${label.getAttribute('for')}"]`) ||
                    label.closest('[role="radio"]');
      if (input) {
        input.click();
        console.log("✅ Selected 'New' condition via label text match");
        await wait(500);
        await clickConditionConfirmButton();
        return true;
      }
      label.click();
      console.log("✅ Clicked 'New' label directly");
      await wait(500);
      await clickConditionConfirmButton();
      return true;
    }
  }
  
  console.log("⚠️ Could not find 'New' condition option in fallback");
  return false;
}

async function clickConditionConfirmButton() {
  await wait(300);
  
  const confirmSelectors = [
    'button[class*="confirm"]',
    'button[class*="apply"]',
    'button[class*="save"]',
    'button[class*="done"]',
    '[data-test*="confirm"]',
    '[data-test*="apply"]'
  ];
  
  for (const selector of confirmSelectors) {
    const btn = document.querySelector(selector);
    if (btn) {
      btn.click();
      console.log(`✅ Clicked confirm button: ${selector}`);
      return;
    }
  }
  
  // Text-based fallback
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const text = btn.textContent?.toLowerCase();
    if (text?.includes('confirm') || text?.includes('apply') || text?.includes('done') || text?.includes('save')) {
      btn.click();
      console.log("✅ Clicked confirm button (text match)");
      return;
    }
  }
}

// ─────────────────────────────────────────────
// 🔄 Continuous Condition Monitor for Listing Pages
// ─────────────────────────────────────────────
let conditionCheckInterval = null;

function startConditionMonitor() {
  if (conditionCheckInterval) return;
  
  const url = window.location.href;
  if (url.includes('/lstng') || url.includes('draftId=') || url.includes('mode=AddItem')) {
    console.log("👁️ Starting condition monitor for listing page...");
    
    conditionCheckInterval = setInterval(async () => {
      const conditionBtn = document.querySelector('button.condition-recommendation-value.btn');
      if (conditionBtn) {
        console.log("🎯 Condition button detected by monitor, clicking...");
        clearInterval(conditionCheckInterval);
        conditionCheckInterval = null;
        conditionBtn.click();
        await wait(800);
        await selectNewConditionFallback();
      }
    }, 2000);
    
    // Stop monitoring after 30 seconds
    setTimeout(() => {
      if (conditionCheckInterval) {
        clearInterval(conditionCheckInterval);
        conditionCheckInterval = null;
        console.log("⏱️ Condition monitor timeout - stopped watching");
      }
    }, 30000);
  }
}

function stopConditionMonitor() {
  if (conditionCheckInterval) {
    clearInterval(conditionCheckInterval);
    conditionCheckInterval = null;
  }
}

// ─────────────────────────────────────────────
// 🔁 Auto Start - Automatic Scenario Detection & Execution
// ─────────────────────────────────────────────
async function attemptAutoFill() {
  console.log("🔄 Attempting auto-detection on page load...");

  // Wait a bit for page to be ready
  await wait(2000);
  await waitForPageReady();

  const url = window.location.href;
  console.log("🔍 [attemptAutoFill] Fetching storage data...");
  
  const data = await chrome.storage.local.get([
    "ebayTitle", "ebayPrice", "ebaySku", "productTitle", 
    "selectedEbayDescription", "generatedDescription",
    "selectedEbayTitle", "selectedTitleTimestamp", "isBulkJob"
  ]);

  if (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.FEATURES.DEBUG_MODE) console.log("📦 [attemptAutoFill] Raw storage data:", {
    selectedEbayTitle: data.selectedEbayTitle ? data.selectedEbayTitle.substring(0, 50) + '...' : null,
    selectedTitleTimestamp: data.selectedTitleTimestamp,
    ebayTitle: data.ebayTitle ? data.ebayTitle.substring(0, 50) + '...' : null,
    productTitle: data.productTitle ? data.productTitle.substring(0, 50) + '...' : null,
    hasDescription: !!(data.selectedEbayDescription || data.generatedDescription)
  });

  const ebayDescription = data.selectedEbayDescription || data.generatedDescription;

  // Prioritize selectedEbayTitle (from popup) if it's recent (within 30 minutes)
  const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
  const selectedTitleIsRecent = data.selectedTitleTimestamp && 
                                 data.selectedTitleTimestamp >= thirtyMinutesAgo;
  
  const title = (selectedTitleIsRecent && data.selectedEbayTitle) || 
                data.ebayTitle || 
                data.productTitle;
  
  console.log("📋 [attemptAutoFill] Title selection:", {
    selectedEbayTitle: data.selectedEbayTitle ? data.selectedEbayTitle.substring(0, 50) + '...' : null,
    timestamp: data.selectedTitleTimestamp,
    isRecent: selectedTitleIsRecent,
    timeSinceSelection: data.selectedTitleTimestamp ? Math.round((Date.now() - data.selectedTitleTimestamp) / 1000) + 's ago' : 'N/A',
    fallbackTitle: (data.ebayTitle || data.productTitle) ? (data.ebayTitle || data.productTitle).substring(0, 50) + '...' : null,
    usingTitle: title ? title.substring(0, 50) + '...' : null
  });

  // Detect page type and auto-execute appropriate scenario
  // Prelist pages: /prelist/home, /prelist, sr=shListingsTopNav, s=rshListingsCTA
  const isPrelistPage = url.includes('prelist/home') || 
                        url.includes('prelist') || 
                        url.includes('sr=shListingsTopNav') || 
                        url.includes('s=rshListingsCTA');
  
  // Listing/Draft pages: /lstng, draftId=, mode=AddItem
  const isListingPage = url.includes('/lstng') || 
                        url.includes('draftId=') || 
                        url.includes('mode=AddItem');
  
  // General sell pages
  const isSellPage = url.includes('/sl/') || url.includes('/sell');

  if (isPrelistPage) {
    // Prelist page - run scenario workflow
    console.log("🎯 Detected eBay Prelist page - auto-starting scenario...");
    
    if (title) {
      // Auto-detect which scenario based on page elements
      await wait(1000);
      
      // Check for specific page indicators to determine scenario
      const hasConditionDialog = document.querySelector('[id*="condition-side-pane"]') ||
                                  document.querySelector('[id*="condition-dialog"]');
      const hasSpecialRadio = document.querySelector('input.radio_control[id*="condition-1000"]');
      
      let scenarioType = 3; // Default to Scenario 3 (conditional)
      
      if (hasSpecialRadio) {
        scenarioType = 1; // Special radio selector present
        console.log("🎯 Auto-detected Scenario 1 (special radio selector)");
      } else if (hasConditionDialog) {
        scenarioType = 2; // Standard condition dialog
        console.log("🎯 Auto-detected Scenario 2 (standard condition)");
      } else {
        console.log("🎯 Auto-detected Scenario 3 (conditional flow)");
      }
      
      await scenarioManager.executeScenario(title, scenarioType);
      
      // Clear selected title from storage after successful prelist scenario
      if (data.selectedEbayTitle) {
        chrome.storage.local.remove(['selectedEbayTitle', 'selectedTitleTimestamp']);
        console.log('[eBay Lister] ✅ Cleared selected title after prelist scenario');
      }
    } else {
      console.log("ℹ️ No title found in storage, waiting for manual trigger...");
    }
  } else if (isListingPage) {
    // Listing/Draft page - check condition first, then fill fields
    console.log("🎯 Detected eBay Listing/Draft page - checking condition and auto-filling...");
    
    // Start condition monitor for this page
    startConditionMonitor();
    
    // First, check and handle condition selection
    await handleListingPageCondition();
    
    // Then fill SKU/Price if available
    if (data.ebaySku || data.ebayPrice || ebayDescription) {
      console.log("✅ Found stored data, attempting auto-fill...", {
        hasSku: !!data.ebaySku,
        hasPrice: !!data.ebayPrice,
        hasDescription: !!ebayDescription
      });

      await runEbayAutomation({
        ebayTitle: title,
        ebayPrice: data.ebayPrice,
        ebaySku: data.ebaySku,
        ebayDescription: ebayDescription,
        isBulkJob: data.isBulkJob
      });
    } else {
      console.log("ℹ️ No SKU/Price/Description data found, skipping field auto-fill");
    }
  } else if (isSellPage) {
    // General sell page
    console.log("🎯 Detected eBay Sell page - checking condition and auto-filling...");
    
    // Check for condition button
    await handleListingPageCondition();
    
    if (data.ebaySku || data.ebayPrice || ebayDescription) {
      await runEbayAutomation({
        ebayTitle: title,
        ebayPrice: data.ebayPrice,
        ebaySku: data.ebaySku,
        ebayDescription: ebayDescription
      });
    }
  } else {
    console.log("ℹ️ Not on a recognized eBay page, waiting for manual trigger...");
  }
}

// URL change observer for SPA navigation
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log("🔄 URL changed, re-checking page type...");
    stopConditionMonitor(); // Stop old monitor
    setTimeout(attemptAutoFill, 1500);
    setTimeout(startConditionMonitor, 2000); // Start new monitor if needed
  }
});

// Start observing URL changes
urlObserver.observe(document.body, { childList: true, subtree: true });

// Auto-fill attempt after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(attemptAutoFill, 1000);
    setTimeout(startConditionMonitor, 1500);
    setTimeout(autoPasteSelectedTitle, 2000);
    setTimeout(autoPasteSelectedDescription, 3000);
  });
} else {
  setTimeout(attemptAutoFill, 2000);
  setTimeout(startConditionMonitor, 2500);
  setTimeout(autoPasteSelectedTitle, 3000);
  setTimeout(autoPasteSelectedDescription, 4000);
}

console.log("🚀 eBay Lister script initialized with auto-detection and condition fallback");

// ─────────────────────────────────────────────
// 🎯 Auto-Paste Selected Title on Page Load
// ─────────────────────────────────────────────
async function autoPasteSelectedTitle() {
  try {
    console.log('[autoPasteSelectedTitle] 🔍 Checking for selected title in storage...');
    
    // Check if we have a selected title in storage
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['selectedEbayTitle', 'selectedTitleTimestamp'], resolve);
    });

    console.log('[autoPasteSelectedTitle] 📦 Storage result:', {
      hasTitle: !!result.selectedEbayTitle,
      title: result.selectedEbayTitle ? result.selectedEbayTitle.substring(0, 50) + '...' : null,
      timestamp: result.selectedTitleTimestamp
    });

    const selectedTitle = result.selectedEbayTitle;
    const timestamp = result.selectedTitleTimestamp;

    if (!selectedTitle) {
      console.log('[autoPasteSelectedTitle] ℹ️ No selected title found for auto-paste');
      return;
    }

    // Check if the title is recent (within last 30 minutes)
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    if (timestamp && timestamp < thirtyMinutesAgo) {
      console.log('[autoPasteSelectedTitle] ⏰ Selected title is too old, skipping auto-paste');
      return;
    }

    console.log('[eBay Lister] Auto-pasting selected title:', selectedTitle);

    // Try to find and fill the eBay title input field
    const titleSelectors = [
      'input.textbox__control#s0-1-1-19-7-\\@keyword-\\@keywords-search-box-\\@keywords-box-\\@input-textbox',
      'input[id*="keyword"][id*="input-textbox"]',
      'input.textbox__control[maxlength="80"]',
      'input[name="title"]',
      'input[id*="title" i]',
      '#editpane-title input',
      '[data-testid="title-input"] input'
    ];

    // Wait for title input with retries
    let titleInput = null;
    let retries = 0;
    const maxRetries = 10;

    while (!titleInput && retries < maxRetries) {
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) {
          titleInput = el;
          console.log('[eBay Lister] Found title input with selector:', selector);
          break;
        }
      }

      if (!titleInput) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (titleInput) {
      // Only paste if the field is empty
      if (titleInput.value && titleInput.value.trim() !== '') {
        console.log('[eBay Lister] Title field already has content, skipping auto-paste');
        return;
      }

      // React-safe input
      const lastValue = titleInput.value;
      titleInput.focus();
      titleInput.value = selectedTitle;

      const inputEvent = new Event('input', { bubbles: true });
      const tracker = titleInput._valueTracker;
      if (tracker) tracker.setValue(lastValue);
      titleInput.dispatchEvent(inputEvent);
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      titleInput.dispatchEvent(new Event('blur', { bubbles: true }));

      console.log('[eBay Lister] ✅ Title auto-pasted successfully!');

      // Clear the selected title from storage after pasting
      chrome.storage.local.remove(['selectedEbayTitle', 'selectedTitleTimestamp'], () => {
        console.log('[eBay Lister] Cleared selected title from storage after auto-paste');
      });

    } else {
      console.warn('[eBay Lister] Could not find title input field for auto-paste');
    }
  } catch (error) {
    console.error('[eBay Lister] Auto-paste error:', error);
  }
}
// ─────────────────────────────────────────────
// 🎯 Message Handler: Paste Selected Title from Storage
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PASTE_SELECTED_TITLE') {
    console.log('[eBay Lister] Received PASTE_SELECTED_TITLE request');
    
    // Get selected title from storage
    chrome.storage.local.get(['selectedEbayTitle'], async (result) => {
      const selectedTitle = result.selectedEbayTitle;
      
      if (!selectedTitle) {
        console.warn('[eBay Lister] No selected title found in storage');
        sendResponse({ success: false, error: 'No title selected. Please generate and select a title first.' });
        return;
      }
      
      console.log('[eBay Lister] Pasting selected title:', selectedTitle);
      
      try {
        // Try to find and fill the eBay title input field
        const titleSelectors = [
          'input.textbox__control#s0-1-1-19-7-\\@keyword-\\@keywords-search-box-\\@keywords-box-\\@input-textbox',
          'input[id*="keyword"][id*="input-textbox"]',
          'input.textbox__control[maxlength="80"]',
          'input[name="title"]',
          'input[id*="title" i]',
          '#editpane-title input',
          '[data-testid="title-input"] input'
        ];
        
        let titleInput = null;
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.offsetParent !== null) {
            titleInput = el;
            console.log('[eBay Lister] Found title input with selector:', selector);
            break;
          }
        }
        
        if (titleInput) {
          // React-safe input
          const lastValue = titleInput.value;
          titleInput.focus();
          titleInput.value = selectedTitle;
          
          const inputEvent = new Event('input', { bubbles: true });
          const tracker = titleInput._valueTracker;
          if (tracker) tracker.setValue(lastValue);
          titleInput.dispatchEvent(inputEvent);
          titleInput.dispatchEvent(new Event('change', { bubbles: true }));
          titleInput.dispatchEvent(new Event('blur', { bubbles: true }));
          
          console.log('[eBay Lister] Title pasted successfully!');
          sendResponse({ success: true, title: selectedTitle });
        } else {
          console.warn('[eBay Lister] Could not find title input field');
          sendResponse({ success: false, error: 'Could not find title input field on this page.' });
        }
      } catch (error) {
        console.error('[eBay Lister] Error pasting title:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
    
    return true; // Keep message channel open for async response
  }
  
  // Handle GET_SELECTED_TITLE for checking if a title is selected
  if (request.action === 'GET_SELECTED_TITLE') {
    chrome.storage.local.get(['selectedEbayTitle', 'selectedTitleTimestamp'], (result) => {
      sendResponse({
        success: true,
        title: result.selectedEbayTitle || null,
        timestamp: result.selectedTitleTimestamp || null
      });
    });
    return true;
  }
  
  // Handle PASTE_DESCRIPTION for manual description paste
  if (request.action === 'PASTE_DESCRIPTION') {
    console.log('[eBay Lister] Received PASTE_DESCRIPTION request');
    
    chrome.storage.local.get(['selectedEbayDescription'], async (result) => {
      const description = result.selectedEbayDescription || request.description;
      
      if (!description) {
        console.warn('[eBay Lister] No description found');
        sendResponse({ success: false, error: 'No description available. Please generate a description first.' });
        return;
      }
      
      try {
        const success = await pasteDescriptionToEbay(description);
        sendResponse({ success });
      } catch (error) {
        console.error('[eBay Lister] Error pasting description:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
    
    return true;
  }
});

// ─────────────────────────────────────────────
// 🎯 Auto-Paste Selected Description on Page Load
// ─────────────────────────────────────────────
async function autoPasteSelectedDescription() {
  try {
    // Check if we have a selected description in storage
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['selectedEbayDescription', 'selectedDescriptionTimestamp'], resolve);
    });

    const selectedDescription = result.selectedEbayDescription;
    const timestamp = result.selectedDescriptionTimestamp;

    if (!selectedDescription) {
      console.log('[eBay Lister] No selected description found for auto-paste');
      return;
    }

    // Check if the description is recent (within last 30 minutes)
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    if (timestamp && timestamp < thirtyMinutesAgo) {
      console.log('[eBay Lister] Selected description is too old, skipping auto-paste');
      return;
    }

    console.log('[eBay Lister] Auto-pasting selected description...');
    
    const success = await pasteDescriptionToEbay(selectedDescription);
    
    if (success) {
      // Clear the selected description from storage after pasting
      chrome.storage.local.remove(['selectedEbayDescription', 'selectedDescriptionTimestamp'], () => {
        console.log('[eBay Lister] Cleared selected description from storage after auto-paste');
      });
    }
  } catch (error) {
    console.error('[eBay Lister] Description auto-paste error:', error);
  }
}

// ─────────────────────────────────────────────
// 🎯 Paste Description to eBay Editor
// Workflow: Check "Show HTML code" → Paste HTML into textarea → Uncheck
// ─────────────────────────────────────────────
async function pasteDescriptionToEbay(description) {
  console.log('[eBay Lister] 📝 Starting description paste workflow...');
  console.log('[eBay Lister] Description length:', description?.length || 0);
  
  // Selectors for the "Show HTML code" checkbox
  const checkboxSelectors = [
    'input.checkbox__control#s0-1-0-24-6-\\@DESCRIPTION-1-33-\\@rich-text-editor-1-36-9-2-descriptionEditorMode',
    'input[id*="descriptionEditorMode"]',
    'input[id*="EditorMode"]',
    'input[id*="rich-text-editor"][type="checkbox"]',
    'input[type="checkbox"][id*="DESCRIPTION"]',
    'input[type="checkbox"][id*="description"]',
    'input.checkbox__control[id*="editor"]',
    'input.checkbox__control[id*="Editor"]'
  ];
  
  // Selectors for the HTML textarea (appears when checkbox is checked)
  const htmlTextareaSelectors = [
    'textarea#se-rte-frame__summary',
    'textarea[id*="rte-frame"]',
    'textarea[id*="se-rte"]',
    'textarea[id*="description"]',
    'textarea[id*="DESCRIPTION"]',
    'textarea[name*="description"]',
    'textarea.rte-textarea',
    '.description-editor textarea',
    '[data-testid*="description"] textarea'
  ];
  
  let checkbox = null;
  let attempts = 0;
  const maxAttempts = 5;
  
  // ─────────────────────────────────────────────
  // STEP 1: Find the "Show HTML code" checkbox
  // ─────────────────────────────────────────────
  console.log('[eBay Lister] 🔍 [STEP 1] Searching for "Show HTML code" checkbox...');
  
  while (!checkbox && attempts < maxAttempts) {
    attempts++;
    console.log(`[eBay Lister] Checkbox search attempt ${attempts}/${maxAttempts}...`);
    
    // Method 1: Direct selectors
    for (const selector of checkboxSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          checkbox = el;
          console.log('[eBay Lister] ✅ Found checkbox with selector:', selector);
          break;
        }
      } catch (e) {
        // Selector might have special characters, continue
      }
    }
    
    // Method 2: Search by label text
    if (!checkbox) {
      const labels = document.querySelectorAll('label, span');
      for (const element of labels) {
        const text = (element.textContent || '').toLowerCase().trim();
        if (text === 'show html code' || text.includes('html code') || text.includes('show html')) {
          console.log(`[eBay Lister] 🔍 Found "Show HTML code" label: "${text}"`);
          
          // Check for associated checkbox via 'for' attribute
          const forAttr = element.getAttribute('for');
          if (forAttr) {
            const found = document.getElementById(forAttr);
            if (found && found.type === 'checkbox') {
              checkbox = found;
              console.log('[eBay Lister] ✅ Found checkbox via label for attribute');
              break;
            }
          }
          
          // Check parent for checkbox
          const parent = element.closest('label, div, span');
          if (parent) {
            const nearbyCheckbox = parent.querySelector('input[type="checkbox"]');
            if (nearbyCheckbox) {
              checkbox = nearbyCheckbox;
              console.log('[eBay Lister] ✅ Found checkbox near "Show HTML code" label');
              break;
            }
          }
          
          // Check previous sibling
          const prevSibling = element.previousElementSibling;
          if (prevSibling && prevSibling.type === 'checkbox') {
            checkbox = prevSibling;
            console.log('[eBay Lister] ✅ Found checkbox as previous sibling');
            break;
          }
        }
      }
    }
    
    // Method 3: Find checkbox in description section
    if (!checkbox) {
      const descSection = document.querySelector('[id*="DESCRIPTION"], [id*="description"]');
      if (descSection) {
        const sectionCheckboxes = descSection.querySelectorAll('input[type="checkbox"]');
        for (const cb of sectionCheckboxes) {
          const id = (cb.id || '').toLowerCase();
          if (id.includes('editor') || id.includes('mode')) {
            checkbox = cb;
            console.log('[eBay Lister] ✅ Found checkbox in description section:', cb.id);
            break;
          }
        }
      }
    }
    
    if (!checkbox) {
      await wait(500 * attempts);
    }
  }
  
  if (!checkbox) {
    console.error('[eBay Lister] ❌ Could not find "Show HTML code" checkbox');
    return false;
  }
  
  // ─────────────────────────────────────────────
  // STEP 2: Check the "Show HTML code" checkbox
  // ─────────────────────────────────────────────
  const wasChecked = checkbox.checked;
  console.log('[eBay Lister] 🔍 [STEP 2] Checkbox state - wasChecked:', wasChecked);
  
  if (!wasChecked) {
    console.log('[eBay Lister] ✅ Checking "Show HTML code" checkbox...');
    
    // Scroll into view if needed
    checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(300);
    
    // Click the checkbox to enable HTML mode
    checkbox.click();
    
    // Also dispatch events for React/eBay framework
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Wait for textarea to appear
    await wait(1500);
    console.log('[eBay Lister] ✅ HTML mode enabled, waiting for textarea...');
  }
  
  // ─────────────────────────────────────────────
  // STEP 3: Find and fill the HTML textarea
  // ─────────────────────────────────────────────
  console.log('[eBay Lister] 🔍 [STEP 3] Searching for HTML textarea...');
  
  let textarea = null;
  attempts = 0;
  
  while (!textarea && attempts < maxAttempts) {
    attempts++;
    console.log(`[eBay Lister] Textarea search attempt ${attempts}/${maxAttempts}...`);
    
    // Try textarea selectors
    for (const selector of htmlTextareaSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) {
          textarea = el;
          console.log('[eBay Lister] ✅ Found textarea with selector:', selector);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Fallback: Find any visible textarea in description section
    if (!textarea) {
      const descSection = document.querySelector('[id*="DESCRIPTION"], [id*="description"]');
      if (descSection) {
        const textareas = descSection.querySelectorAll('textarea');
        for (const ta of textareas) {
          if (ta.offsetParent !== null) {
            textarea = ta;
            console.log('[eBay Lister] ✅ Found textarea in description section');
            break;
          }
        }
      }
    }
    
    // Fallback: Find any visible textarea on page that's for description
    if (!textarea) {
      const allTextareas = document.querySelectorAll('textarea');
      for (const ta of allTextareas) {
        if (ta.offsetParent !== null) {
          const id = (ta.id || '').toLowerCase();
          const name = (ta.name || '').toLowerCase();
          const placeholder = (ta.placeholder || '').toLowerCase();
          
          if (id.includes('description') || id.includes('rte') || 
              name.includes('description') || placeholder.includes('html')) {
            textarea = ta;
            console.log('[eBay Lister] ✅ Found description textarea by attributes');
            break;
          }
        }
      }
    }
    
    if (!textarea) {
      await wait(500 * attempts);
    }
  }
  
  if (!textarea) {
    console.error('[eBay Lister] ❌ Could not find HTML textarea');
    // Restore checkbox state
    if (!wasChecked && checkbox.checked) {
      checkbox.click();
    }
    return false;
  }
  
  // ─────────────────────────────────────────────
  // STEP 4: Paste HTML description into textarea
  // ─────────────────────────────────────────────
  console.log('[eBay Lister] 📝 [STEP 4] Pasting HTML description into textarea...');
  
  try {
    // Focus the textarea
    textarea.focus();
    
    // Clear existing content
    textarea.value = '';
    
    // Use React-safe input method
    const lastValue = textarea.value;
    textarea.value = description;
    
    const event = new Event('input', { bubbles: true });
    const tracker = textarea._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    
    textarea.dispatchEvent(event);
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.dispatchEvent(new Event('blur', { bubbles: true }));
    
    // Verify the value was set
    if (textarea.value.length > 0) {
      console.log('[eBay Lister] ✅ HTML description pasted successfully! Length:', textarea.value.length);
    } else {
      console.warn('[eBay Lister] ⚠️ Textarea value may not have been set correctly');
    }
  } catch (error) {
    console.error('[eBay Lister] ❌ Error pasting description:', error);
    // Restore checkbox state
    if (!wasChecked && checkbox.checked) {
      checkbox.click();
    }
    return false;
  }
  
  // ─────────────────────────────────────────────
  // STEP 5: Uncheck "Show HTML code" checkbox (return to visual mode)
  // ─────────────────────────────────────────────
  await wait(800);
  
  console.log('[eBay Lister] 🔄 [STEP 5] Unchecking "Show HTML code" checkbox...');
  
  if (checkbox.checked) {
    checkbox.click();
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(500);
    console.log('[eBay Lister] ✅ Returned to visual mode');
  }
  
  console.log('[eBay Lister] ✅ Description paste workflow completed successfully!');
  return true;
}
