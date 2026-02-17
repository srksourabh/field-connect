import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  console.log('=== STEP 1: Navigate to login page ===');
  await page.goto('http://localhost:3003/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/step1-login.png' });
  console.log('Login page loaded. Title:', await page.title());

  console.log('=== STEP 2: Fill login credentials ===');
  await page.fill('input[type="tel"]', '9836719911');
  await page.fill('input[type="password"]', 'sour9911');
  await page.screenshot({ path: 'screenshots/step2-filled.png' });

  console.log('=== STEP 3: Click Sign In ===');
  await page.click('button[type="submit"]');

  // Wait for navigation away from login
  try {
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    console.log('Redirected to:', page.url());
  } catch (e) {
    console.log('Still on:', page.url());
    // Check for error message
    const errorText = await page.textContent('body');
    if (errorText.includes('Invalid')) {
      console.log('ERROR: Login failed - invalid credentials');
    }
  }
  await page.screenshot({ path: 'screenshots/step3-after-login.png' });

  console.log('=== STEP 4: Navigate to leave page ===');
  await page.goto('http://localhost:3003/dashboard/leave');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/step4-leave-page.png', fullPage: true });
  console.log('Leave page URL:', page.url());

  // Get balance card text
  const bodyText = await page.textContent('body');
  console.log('=== Leave page content (first 2000 chars) ===');
  console.log(bodyText.substring(0, 2000));

  console.log('=== STEP 5: Apply for casual leave ===');
  // Wait a moment for data to load
  await page.waitForTimeout(1000);

  // Take screenshot of the form area
  await page.screenshot({ path: 'screenshots/step5-before-apply.png', fullPage: true });

  // Try to find and interact with the leave form
  // Look for a leave type selector
  const selects = await page.$$('select');
  console.log('Number of select elements:', selects.length);

  const inputs = await page.$$('input');
  console.log('Number of input elements:', inputs.length);

  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent();
    console.log('Button found:', text.trim());
  }

  // Get all form-related HTML
  const html = await page.content();
  // Log select options
  const selectHtml = await page.$$eval('select', els => els.map(e => e.outerHTML));
  console.log('Select elements HTML:', selectHtml);

  const inputInfo = await page.$$eval('input', els => els.map(e => ({
    type: e.type,
    name: e.name,
    placeholder: e.placeholder,
    value: e.value
  })));
  console.log('Input elements:', JSON.stringify(inputInfo, null, 2));

  await browser.close();
  console.log('=== Test complete ===');
})();
