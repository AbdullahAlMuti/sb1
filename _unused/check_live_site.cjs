const { chromium } = require('playwright');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`PAGE ERROR: ${msg.text()}`);
    } else {
      console.log(`PAGE LOG: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`UNCAUGHT EXCEPTION: ${error.message}`);
  });

  page.on('requestfailed', request => {
    console.log(`REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
  });

  console.log("Navigating to https://sellersuit.com ...");
  const response = await page.goto('https://sellersuit.com', { waitUntil: 'networkidle' });
  
  console.log(`Status: ${response.status()}`);
  
  const content = await page.content();
  if (content.includes('id="root"')) {
    const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML);
    console.log(`Root HTML length: ${rootHtml.length}`);
    if (rootHtml.length === 0) {
      console.log("Root div is strictly empty (React failed to mount).");
    }
  }

  await browser.close();
})();
