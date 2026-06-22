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
        
        console.log('Waiting for extension to inject (5 seconds)...');
        await page.waitForTimeout(5000);

        // Check if the content script injected by finding the "List it" button or the overlay
        const listButton = await page.evaluate(() => {
            const btn = document.getElementById('initial-list-button') || document.getElementById('opti-list-btn');
            return btn ? btn.outerHTML : null;
        });

        if (listButton) {
            console.log('✅ Content script injected successfully! Button found:', listButton);
        } else {
            console.log('❌ Content script did NOT inject. Button not found.');
        }

        // Keep browser open for a few seconds to inspect
        await page.waitForTimeout(5000);
        console.log('Test completed successfully.');

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        await context.close();
    }
})();
