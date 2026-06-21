import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const extensionPath = path.resolve('apps/extension/dist/extension-dev');
  const userDataDir = 'C:\\\\Users\\\\MUTI\\\\AppData\\\\Local\\\\Google\\\\Chrome\\\\User Data';

  console.log("Launching Chrome with your profile...");
  try {
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      args: [
        '--disable-extensions-except=' + extensionPath,
        '--load-extension=' + extensionPath,
        '--remote-debugging-port=9222'
      ]
    });
    
    console.log("=========================================");
    console.log("✅ CHROME LAUNCHED SUCCESSFULLY!");
    console.log("Please navigate to your eBay draft listing.");
    console.log("=========================================");
    
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[eBay Agent]') || text.includes('STEP')) {
        console.log(text);
      }
    });

    await new Promise(() => {}); // Wait forever
  } catch(e) {
    console.log("❌ ERROR LAUNCHING CHROME:");
    console.log(e.message);
    console.log("\\n➡️ You likely still have Chrome running in the background. Please close it completely from the system tray and try again!");
  }
})();
