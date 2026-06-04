import { chromium } from 'playwright';

(async () => {
    const urls = [
        'https://www.amazon.com/dp/B0D5LYXLV5/',
        'https://www.amazon.com/Strings-Marking-Merchandise-Display-Holiday/dp/B0BMV8FRBT',
        'https://www.amazon.com/dp/B09YRK94V6/'
    ];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    for (const url of urls) {
        console.log(`\n==============================================`);
        console.log(`Testing URL: ${url}`);
        
        const page = await context.newPage();
        
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // Wait a bit for dynamic content
            await page.waitForTimeout(3000);
            
            // Try to scrape using the same logic as amazon_injector.js
            const productData = await page.evaluate(() => {
                const getElText = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.innerText.trim() : '';
                };

                const getElAttr = (selector, attr) => {
                    const el = document.querySelector(selector);
                    return el ? el.getAttribute(attr) : '';
                };

                const getAllElText = (selector) => {
                    return Array.from(document.querySelectorAll(selector))
                        .map(el => el.innerText.trim())
                        .filter(text => text);
                };

                return {
                    asin: document.querySelector('input#asin')?.value ||
                        window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || '',
                    title: getElText('#productTitle'),
                    price: getElText('.a-price .a-offscreen') || getElText('#corePrice_feature_div .a-price'),
                    mainImage: getElAttr('#landingImage', 'src') || getElAttr('#imgBlkFront', 'src'),
                };
            });
            
            console.log('Scraped Data:', productData);
            
            if (!productData.title || !productData.price) {
                console.log('❌ MISSING TITLE OR PRICE!');
                // Log what is actually available for price
                const rawPrice = await page.evaluate(() => {
                    return {
                        priceblock: document.querySelector('#priceblock_ourprice')?.innerText,
                        apex: document.querySelector('.apexPriceToPay')?.innerText,
                        core: document.querySelector('#corePrice_feature_div')?.innerText,
                    };
                });
                console.log('Alternative price selectors:', rawPrice);
            } else {
                console.log('✅ Scrape successful');
            }
            
        } catch (e) {
            console.error('Error processing URL:', e);
        } finally {
            await page.close();
        }
    }

    await browser.close();
})();
