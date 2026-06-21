import { chromium } from 'playwright';
import path from 'path';

(async () => {
    // Ensure we point to the dev build where you ran prepare:dev
    const pathToExtension = path.join(process.cwd(), 'apps/extension/dist/extension-dev');
    const userDataDir = path.join(process.cwd(), '.playwright_data_ebay');

    console.log('Loading extension from:', pathToExtension);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, // This will pop open the browser on your screen!
        args: [
            `--disable-extensions-except=${pathToExtension}`,
            `--load-extension=${pathToExtension}`
        ]
    });

    const page = await context.newPage();
    
    // We will listen to the console to see where it's failing
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.text().includes('eBay Agent') || msg.text().includes('eBay Lister') || msg.text().includes('STEP')) {
            console.log(`[BROWSER LOG] ${msg.type()}: ${msg.text()}`);
        }
    });
    
    page.on('pageerror', err => {
        console.log(`[BROWSER ERROR] ${err.message}`);
    });

    try {
        console.log('Navigating to eBay... Please log in if needed and open a listing page to test.');
        await page.goto('https://www.ebay.com/', { waitUntil: 'networkidle', timeout: 30000 });
        
        console.log('Browser is open! The script is keeping it alive. Check the terminal for extension logs as you test.');
        // Keeps the browser open infinitely so you can test manually
        await new Promise(() => {});

    } catch (e) {
        console.error('Test Failed:', e);
    }
})();
