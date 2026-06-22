import { chromium } from 'playwright';
import path from 'path';

(async () => {
  console.log("Launching headless browser for verification test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[eBay Agent]') || text.includes('STEP')) {
      console.log(text);
    }
  });

  console.log("Loading mock_ebay.html...");
  await page.goto('file://' + path.resolve('mock_ebay.html').replace(/\\\\/g, '/'));

  console.log("Injecting chrome API mock and auctionData...");
  await page.evaluate(() => {
    window.chrome = {
      storage: {
        local: {
          get: async () => ({}),
          remove: async () => ({})
        }
      }
    };
    window.wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    
    window.findElementWithSelectors = async function(selectors, timeout = 15000) {
      const startTime = Date.now();
      let lastError = null;
      while (Date.now() - startTime < timeout) {
        for (const selector of selectors) {
          try {
            const el = document.querySelector(selector);
            if (el && el.offsetParent !== null && !el.disabled) {
              return el;
            }
          } catch (e) {
            lastError = e;
          }
        }
        await wait(300);
      }
      throw lastError || new Error("None matched");
    };

    window.UIHelper = { showToast: () => {} };
  });

  console.log("Injecting ebay_lister.js...");
  await page.addScriptTag({ path: path.resolve('apps/extension/content_scripts/ebay_lister.js') });

  console.log("Executing runEbayAutomation...");
  await page.evaluate(async () => {
    const testData = {
      ebayTitle: "Test Product Title",
      ebaySku: "TEST-SKU-123",
      ebayPrice: "45.99",
      ebayDescription: "<b>Test Description</b>",
      itemSpecifics: [
        { name: "Brand", value: "TestBrand" },
        { name: "Color", value: "Red" }
      ]
    };
    await runEbayAutomation(testData);
  });

  console.log("\\n--- VERIFYING RESULTS ---");
  
  const title = await page.$eval('#title-input', el => el.value);
  console.log("Title field value: " + title + " (Expected: Test Product Title)");

  const sku = await page.$eval('#sku-input', el => el.value);
  console.log("SKU field value: " + sku + " (Expected: TEST-SKU-123)");

  const condition = await page.$eval('#condition-select', el => el.value);
  console.log("Condition field value: " + condition + " (Expected: 1000)");

  const price = await page.$eval('#price-input', el => el.value);
  console.log("Price field value: " + price + " (Expected: 45.99)");

  const country = await page.$eval('#country-select', el => el.value);
  console.log("Country field value: " + country + " (Expected: US)");

  const desc = await page.$eval('#desc-iframe', iframe => iframe.contentDocument.body.innerHTML);
  console.log("Description iframe content: " + desc + " (Expected: <b>Test Description</b>)");
  
  const checkboxes = await page.$$eval('.additional-specifics input[type="checkbox"]:checked', els => els.length);
  console.log("Checked Additional Specifics: " + checkboxes + " (Expected: 5)");

  const modalsProcessed = await page.$$eval('.modal input', els => els.some(el => el.value !== ''));
  console.log("Custom Specifics Processed: " + modalsProcessed + " (Expected: true)");

  console.log("---------------------------\\n");

  await browser.close();
})();
