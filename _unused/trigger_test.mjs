import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  console.log("Connecting to your active Chrome browser on port 9222...");
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log("Connected successfully!");

    const contexts = browser.contexts();
    let ebayPage = null;

    for (const context of contexts) {
      const pages = context.pages();
      for (const page of pages) {
        const url = page.url();
        if (url.includes('ebay.com/lstng') || url.includes('ebay.com')) {
          ebayPage = page;
          break;
        }
      }
      if (ebayPage) break;
    }

    if (!ebayPage) {
      console.log("❌ Could not find an active eBay tab. Please make sure you are on the eBay draft page!");
      process.exit(1);
    }

    console.log("✅ Found eBay tab! URL:", ebayPage.url());

    // Listen to console logs from the page
    ebayPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[eBay Agent]') || text.includes('STEP')) {
        console.log("->", text);
      }
    });

    console.log("Injecting test script and running automation...");
    
    // Inject the robust ebay_lister script directly into the page just in case the extension isn't loaded
    const scriptContent = fs.readFileSync(path.resolve('apps/extension/content_scripts/ebay_lister.js'), 'utf8');
    await ebayPage.addScriptTag({ content: scriptContent });

    // Execute the automation with test data
    await ebayPage.evaluate(async () => {
      const testData = {
        ebayTitle: "Playwright Automated Test Product",
        ebaySku: "AUTO-TEST-12345",
        ebayPrice: "19.99",
        ebayDescription: "<b>This is an automated test from the AI agent!</b>",
        itemSpecifics: [
          { name: "Brand", value: "TestBrand" }
        ]
      };
      
      // Provide mock globals if needed
      window.wait = (ms) => new Promise(r => setTimeout(r, ms));
      if (typeof window.chrome === 'undefined') {
        window.chrome = { storage: { local: { get: async () => ({}) } } };
      }
      
      console.log("Triggering runEbayAutomation now...");
      await runEbayAutomation(testData);
    });

    console.log("\\nAutomation triggered! Waiting 20 seconds to monitor logs...");
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    console.log("Done monitoring.");
    process.exit(0);
  } catch (e) {
    console.log("❌ ERROR CONNECTING TO CHROME:");
    console.log(e.message);
    console.log("\\nMake sure you fully closed Chrome before I ran that command!");
  }
})();
