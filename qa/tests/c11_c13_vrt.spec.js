/**
 * c11_c13_vrt.spec.js
 * C-11 & C-13 – Visual Design Consistency & Tokens
 *
 * Uses Playwright Visual Regression Testing (VRT) to snapshot core screens
 * and compare them against baselines to detect unintended CSS/UI changes.
 * 
 * Run with `--update-snapshots` on first execution to generate baselines.
 */

const { test, expect } = require('@playwright/test');

async function loginAs(page, email) {
  await page.goto(`/login?email=${encodeURIComponent(email)}`);
  await expect(page.locator('#login-email')).toHaveValue(email, { timeout: 15_000 });
  await page.locator('#login-submit').click();
  await page.waitForURL(/\/dashboard\//, { timeout: 15_000 });
  
  // Wait for all network requests to finish to avoid capturing loading spinners
  await page.waitForLoadState('networkidle');
  // Add a small explicit wait for any final animations/fonts to render
  await page.waitForTimeout(2000);
}

test.describe('C11/C13 - Visual Regression Testing', () => {
  // Visual tests can be sensitive to animations, so we disable animations globally if needed,
  // or just use masking for dynamic data. Since we want to check the layout shell,
  // we capture full page.

  test('Student Dashboard Overview VRT', async ({ page }) => {
    await loginAs(page, 'arjun.verma@iitm.edu');
    await page.goto('/dashboard/student');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // We mask dynamic content (like charts or specific timestamps) if needed,
    // but for now we snapshot the whole page.
    await expect(page).toHaveScreenshot('student-dashboard-overview.png', {
      fullPage: true,
      maxDiffPixels: 100 // Allow slight anti-aliasing differences
    });
  });

  test('Employer Dashboard Overview VRT', async ({ page }) => {
    await loginAs(page, 'hr@techcorp.com');
    await page.goto('/dashboard/employer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('employer-dashboard-overview.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('College Admin Dashboard Overview VRT', async ({ page }) => {
    await loginAs(page, 'admin@iitm.edu');
    await page.goto('/dashboard/college');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('college-dashboard-overview.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('Super Admin Dashboard Overview VRT', async ({ page }) => {
    await loginAs(page, 'admin@placementhub.com');
    await page.goto('/dashboard/admin/overview');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('admin-dashboard-overview.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

});
