import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const extensionPath = path.resolve('apps/extension/dist/extension-dev');
  console.log('Loading extension from: ' + extensionPath);

  // Use a completely fresh directory to avoid any locking errors
  const userDataDir = path.resolve('./.playwright_data_ebay_2');
  
  try {
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      args: [
        '--disable-extensions-except=' + extensionPath,
        '--load-extension=' + extensionPath
      ]
    });

    const page = context.pages()[0] || await context.newPage();
    
    // Set up console log forwarding
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[eBay Agent]') || text.includes('STEP')) {
        console.log(text);
      }
    });

    console.log('Navigating to eBay...');
    await page.goto('https://www.ebay.com');
    
    console.log('\\n=============================================');
    console.log('BROWSER IS OPEN!');
    console.log('Please log in and navigate to a listing draft.');
    console.log('The extension will automatically trigger when it detects the listing page.');
    console.log('=============================================\\n');

    // Wait indefinitely
    await new Promise(() => {});
  } catch (e) {
    console.error("FAILED TO LAUNCH:");
    console.error(e.message);
  }
})();
