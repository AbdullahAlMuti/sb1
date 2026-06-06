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


// Message listener for Prelist
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "RUN_SCENARIO") {
    console.log("🎯 RUN_SCENARIO received:", request);
    const { scenarioType, title } = request;
    let scenarioTitle = title;
    if (!scenarioTitle) {
      const data = await chrome.storage.local.get(["ebayTitle", "productTitle"]);
      scenarioTitle = data.ebayTitle || data.productTitle;
    }
    if (!scenarioTitle) return;
    await scenarioManager.executeScenario(scenarioTitle, scenarioType);
  }
});



// Auto-Start on Prelist Page
(async function() {
    const url = window.location.href;
    const isPrelistPage = url.includes('prelist/home') || 
                          url.includes('prelist') || 
                          url.includes('sr=shListingsTopNav') || 
                          url.includes('s=rshListingsCTA') ||
                          url.includes('/sl/'); // Handle general /sl/
    
    if (isPrelistPage) {
        console.log("🎯 Detected eBay Prelist page - auto-starting scenario...");
        const data = await chrome.storage.local.get(["ebayTitle", "productTitle", "selectedEbayTitle", "selectedTitleTimestamp"]);
        
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
        const selectedTitleIsRecent = data.selectedTitleTimestamp && data.selectedTitleTimestamp >= thirtyMinutesAgo;
        const title = (selectedTitleIsRecent && data.selectedEbayTitle) || data.ebayTitle || data.productTitle;

        if (title) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const hasConditionDialog = document.querySelector('[id*="condition-side-pane"]') || document.querySelector('[id*="condition-dialog"]');
            const hasSpecialRadio = document.querySelector('input.radio_control[id*="condition-1000"]');
            let scenarioType = 3; 
            if (hasSpecialRadio) scenarioType = 1;
            else if (hasConditionDialog) scenarioType = 2;
            
            await scenarioManager.executeScenario(title, scenarioType);
            
            if (data.selectedEbayTitle) {
                chrome.storage.local.remove(['selectedEbayTitle', 'selectedTitleTimestamp']);
            }
        }
    }
})();
