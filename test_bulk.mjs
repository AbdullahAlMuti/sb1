import { chromium } from '@playwright/test';
import path from 'path';

(async () => {
    try {
        console.log('Launching browser with extension...');
        const extensionPath = path.resolve('apps/extension/dist/extension-dev');
        
        const context = await chromium.launchPersistentContext('', {
            headless: false,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`
            ]
        });

        // Auto-accept alerts
        context.on('page', page => {
            page.on('dialog', dialog => {
                console.log('DIALOG:', dialog.message());
                dialog.accept();
            });
        });

        // 1. Monitor pages
        context.on('page', async newPage => {
            console.log('NEW TAB OPENED:', newPage.url());
            newPage.on('console', msg => console.log('NEW TAB LOG:', msg.text()));
            newPage.on('pageerror', err => console.log('NEW TAB ERROR:', err.message));
        });

        // 2. Monitor background workers
        context.on('serviceworker', async worker => {
            console.log('SERVICE WORKER CREATED:', worker.url());
            worker.on('console', msg => console.log('SW LOG:', msg.text()));
            worker.on('pageerror', err => console.log('SW ERROR:', err.message));
        });

        const page = context.pages()[0];
        page.on('dialog', dialog => {
            console.log('DIALOG:', dialog.message());
            dialog.accept();
        });
        
        // Listen to console and page errors
        page.on('console', msg => console.log('DASHBOARD LOG:', msg.text()));
        page.on('pageerror', err => console.log('DASHBOARD ERROR:', err.message));

        console.log('Navigating to local dashboard...');
        await page.goto('http://localhost:3001/');
        
        // Let it load
        await page.waitForTimeout(2000);

        console.log('Triggering START_BULK_JOB via window.postMessage...');
        await page.evaluate(() => {
            window.postMessage({
                source: 'sellersuit-dashboard',
                type: 'START_BULK_JOB',
                payload: {
                    urls: ['https://www.amazon.com/dp/B08N5WRWNW'], // Sample Amazon URL
                    currentIndex: 0,
                    interval: 1 // faster for testing
                }
            }, '*');
        });

        console.log('Waiting 15 seconds for flow to execute and gather evidence...');
        await page.waitForTimeout(15000);

        console.log('Closing browser.');
        await context.close();
    } catch (e) {
        console.error('Script failed:', e);
    }
})();
