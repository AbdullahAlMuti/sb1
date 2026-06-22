import { chromium } from 'playwright';
import path from 'path';

(async () => {
    const pathToExtension = path.join(process.cwd(), 'apps/extension/dist/extension-dev');
    const userDataDir = path.join(process.cwd(), '.playwright_data');

    console.log('Loading extension from:', pathToExtension);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: [
            `--disable-extensions-except=${pathToExtension}`,
            `--load-extension=${pathToExtension}`
        ]
    });

    const page = await context.newPage();
    
    page.on('console', msg => {
        console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
        console.log(`[PAGE ERROR] ${err.message}`);
    });

    try {
        console.log('Navigating to Amazon URL...');
        await page.goto('https://www.amazon.com/dp/B0D5LYXLV5/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        console.log('Waiting for "List it" button...');
        await page.waitForSelector('#initial-list-button', { timeout: 10000 });
        
        console.log('Clicking "List it" button...');
        await page.click('#initial-list-button');
        
        console.log('Waiting for scrape process to complete...');
        // Wait for the overlay to not have the active class (handles both fast and slow extraction)
        await page.waitForSelector('#ss-scrape-overlay:not(.active)', { timeout: 15000 });
        console.log('✅ Success: Scrape overlay is hidden (extraction complete)!');

    } catch (e) {
        console.error('Test Failed:', e);
        
        // Take a screenshot of the failure state if possible
        try {
            await page.screenshot({ path: 'scratch_failure_screenshot.png' });
            console.log('Saved failure screenshot to scratch_failure_screenshot.png');
        } catch (screenshotError) {
            console.error('Failed to take screenshot:', screenshotError);
        }
    } finally {
        await context.close();
    }
})();
