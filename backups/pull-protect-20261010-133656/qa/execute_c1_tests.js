const { chromium } = require('@playwright/test');
const fs = require('fs');

async function runTests() {
  const data = JSON.parse(fs.readFileSync('C-1-Role-Based-Screen-Access.json', 'utf8'));
  const testCases = data.testCases.slice(0, 50); // Batch 1: cases 0-50
  
  const results = [];
  
  const browser = await chromium.launch({ headless: true });
  
  // We'll group tests by demoAccount to minimize logins
  const testsByAccount = {};
  for (const tc of testCases) {
    const key = tc.demoAccount.email + '|' + tc.demoAccount.password;
    if (!testsByAccount[key]) testsByAccount[key] = [];
    testsByAccount[key].push(tc);
  }
  
  for (const accountKey of Object.keys(testsByAccount)) {
    const [email, password] = accountKey.split('|');
    const tcs = testsByAccount[accountKey];
    
    console.error(`Logging in as ${email}...`);
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Use domcontentloaded — networkidle stalls on Next.js data fetching
      await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard/**', { timeout: 30_000 });
      console.error(`Successfully logged in as ${email}`);
    } catch (e) {
      const currentUrl = page.url();
      console.error(`Login failed for ${email} — current URL: ${currentUrl} — ${e.message.split('\n')[0]}`);
      for (const tc of tcs) {
        results.push({ id: tc.testCaseId, status: 'Failed', notes: 'Login failed' });
      }
      await context.close();
      continue;
    }
    
    for (const tc of tcs) {
      console.error(`Executing ${tc.testCaseId}: ${tc.title}`);
      
      // Extract target route
      let targetRoute = null;
      for (const step of tc.steps) {
        const match = step.match(/(?:\/dashboard\/[\w/-]+)/);
        if (match) {
          targetRoute = match[0];
          break;
        }
      }
      
      if (!targetRoute) {
        results.push({ id: tc.testCaseId, status: 'Failed', notes: 'Could not extract target route from steps' });
        continue;
      }
      
      try {
        // domcontentloaded is faster and more reliable than networkidle for Next.js
        await page.goto(`http://localhost:3000${targetRoute}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        
        // Wait for redirect to settle (middleware runs async)
        await page.waitForTimeout(800);
        
        const currentUrl = page.url();
        const hasErrorToast = await page.locator('.toast-error').count() > 0;
        
        if (tc.type === 'positive_navigation') {
          if (currentUrl.includes(targetRoute) && !hasErrorToast) {
            results.push({ id: tc.testCaseId, status: 'Passed', notes: `Successfully loaded ${targetRoute}` });
          } else {
            results.push({ id: tc.testCaseId, status: 'Failed', notes: `Failed to load ${targetRoute} (URL: ${currentUrl})` });
          }
        } else if (tc.type === 'negative_authorization') {
          if (!currentUrl.includes(targetRoute)) {
            results.push({ id: tc.testCaseId, status: 'Passed', notes: `Correctly redirected away from ${targetRoute}` });
          } else {
            results.push({ id: tc.testCaseId, status: 'Failed', notes: `User was able to access restricted route ${targetRoute}` });
          }
        }
      } catch (e) {
        results.push({ id: tc.testCaseId, status: 'Failed', notes: e.message });
      }
    }
    await context.close();
  }
  
  await browser.close();
  
  // Write output to a results JSON file
  fs.writeFileSync('c1_0_50_results.json', JSON.stringify(results, null, 2));
  console.log('Finished executing batch 1 (0-50) tests.');
}

runTests().catch(console.error);
