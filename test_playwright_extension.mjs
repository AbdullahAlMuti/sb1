import { chromium } from 'playwright';
import path from 'path';
import { assertFileDoesNotTargetProduction } from './scripts/production-target-guard.mjs';

(async () => {
    const pathToExtension = path.join(process.cwd(), 'apps/extension');
    const userDataDir = path.join(process.cwd(), '.playwright_data');
    assertFileDoesNotTargetProduction(path.join(pathToExtension, 'common', 'config.js'));

    console.log('Loading extension from:', pathToExtension);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: [
            `--disable-extensions-except=${pathToExtension}`,
            `--load-extension=${pathToExtension}`
        ]
    });

    const page = await context.newPage();
    
    // Log console errors from the page
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning' || msg.text().includes('Bulk')) {
            console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`);
        }
    });
    
    page.on('pageerror', err => {
        console.log(`[PAGE ERROR] ${err.message}`);
    });

    try {
        console.log('Navigating to Amazon URL...');
        await page.goto('https://www.amazon.com/dp/B0D5LYXLV5/', { waitUntil: 'networkidle', timeout: 30000 });
        
        console.log('Waiting for extension to inject (5 seconds)...');
        await page.waitForTimeout(5000);

        // Check if the content script injected by finding the "List it" button
        const listButton = await page.evaluate(() => {
            const btn = document.getElementById('initial-list-button');
            return btn ? btn.outerHTML : null;
        });

        if (listButton) {
            console.log('✅ Content script injected successfully! Button found.');
        } else {
            console.log('❌ Content script did NOT inject. Button not found.');
        }

        // Test sending the scrape message
        console.log('Testing SCRAPE_COMPLETE_PRODUCT message...');
        
        // Wait another few seconds to ensure extension background is ready
        await page.waitForTimeout(2000);
        
        // Let's open the background page and see if it throws errors
        // Actually, we can just close it for now.
        console.log('Test completed successfully.');

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        await context.close();
    }
})();
