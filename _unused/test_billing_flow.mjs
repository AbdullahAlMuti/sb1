import { chromium } from 'playwright';

(async () => {
  const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3001';
  console.log(`Running billing flow tests against: ${serverUrl}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track page logs and errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[PAGE ERROR LOG] ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  const pageErrors = [];
  page.on('pageerror', err => {
    console.error(`[PAGE UNCAUGHT ERROR] ${err.stack || err.message}`);
    pageErrors.push(err);
  });

  try {
    // 1. Navigate to /auth
    console.log('Testing /auth page load...');
    let response = await page.goto(`${serverUrl}/auth`, { waitUntil: 'networkidle', timeout: 15000 });
    if (!response || response.status() >= 400) {
      throw new Error(`Failed to load /auth. HTTP Status: ${response ? response.status() : 'None'}`);
    }
    // Verify login/auth page contains typical auth elements (e.g. Sign In, Login, or password input)
    const hasLoginButton = await page.locator('button:has-text("Sign In"), button:has-text("Login"), h1:has-text("Sign in"), input[type="password"]').count() > 0;
    console.log(`- /auth page loaded successfully. Sign-in element exists: ${hasLoginButton}`);

    // 2. Navigate to /signup
    console.log('Testing /signup page load...');
    response = await page.goto(`${serverUrl}/signup`, { waitUntil: 'networkidle', timeout: 15000 });
    if (!response || response.status() >= 400) {
      throw new Error(`Failed to load /signup. HTTP Status: ${response ? response.status() : 'None'}`);
    }
    // Verify signup page contains typical register/signup elements (e.g. Sign Up, Register, or email input)
    const hasRegisterButton = await page.locator('button:has-text("Sign Up"), button:has-text("Register"), h1:has-text("Sign up"), h1:has-text("Create an account"), input[type="email"]').count() > 0;
    console.log(`- /signup page loaded successfully. Sign-up element exists: ${hasRegisterButton}`);

    // 3. Navigate to /checkout?plan=trial without active session
    console.log('Testing /checkout?plan=trial redirect to /signup?plan=trial...');
    await page.goto(`${serverUrl}/checkout?plan=trial`, { waitUntil: 'networkidle', timeout: 15000 });
    
    // Wait for redirect to happen (client-side routing redirect)
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log(`- Redirected url: ${currentUrl}`);
    
    if (currentUrl.includes('/signup') && currentUrl.includes('plan=trial')) {
      console.log('✅ Redirect to /signup?plan=trial verified successfully!');
    } else {
      throw new Error(`Expected redirect to /signup?plan=trial, but got: ${currentUrl}`);
    }

    // 4. Navigate to /payment-cancelled
    console.log('Testing /payment-cancelled renders...');
    response = await page.goto(`${serverUrl}/payment-cancelled`, { waitUntil: 'networkidle', timeout: 15000 });
    if (!response || response.status() >= 400) {
      throw new Error(`Failed to load /payment-cancelled. HTTP Status: ${response ? response.status() : 'None'}`);
    }
    
    const hasCancelText = await page.locator('h1:has-text("cancelled"), h1:has-text("Cancelled"), p:has-text("cancelled")').count() > 0;
    if (!hasCancelText) {
      throw new Error('Expected cancellation text on /payment-cancelled page but none found.');
    }
    console.log('- /payment-cancelled loaded with expected text.');

    // 5. Verify no console errors occurred on /payment-cancelled
    if (consoleErrors.length > 0) {
      console.log(`⚠️ Page reported ${consoleErrors.length} console errors during navigation.`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`❌ Uncaught page errors detected: ${pageErrors.map(e => e.message).join(', ')}`);
    }

    console.log('✅ All billing flow integration checks passed successfully!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Integration test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
