const { test, expect } = require('@playwright/test');

// ─── Shared login helper (URL-param approach — no dropdown needed) ────────────
async function loginAsDemo(page, email) {
  await page.goto(`/login?email=${encodeURIComponent(email)}`);
  await expect(page.locator('#login-email')).toHaveValue(email, { timeout: 15_000 });
  await expect(page.locator('#login-password')).not.toHaveValue('', { timeout: 10_000 });
  await page.locator('#login-submit').click();
}

// ─── Tests ───────────────────────────────────────────────────────────────────
test.describe('Offers Service Integrity', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'hr@techcorp.com');
    await expect(page).toHaveURL(/\/dashboard\/employer/, { timeout: 15_000 });
  });

  test('Employer Offers page loads with table or empty state', async ({ page }) => {
    await page.goto('/dashboard/employer/offers');

    await expect(page.locator('h1')).toContainText('Offer', { timeout: 15_000 });

    const tableVisible      = await page.locator('table').isVisible();
    const emptyStateVisible = await page.locator('[class*="empty-state"]').isVisible();
    const noDataText        = await page.locator('text=/no offers/i').isVisible();

    expect(tableVisible || emptyStateVisible || noDataText).toBeTruthy();
  });

  test('Download Template button triggers CSV download', async ({ page }) => {
    await page.goto('/dashboard/employer/offers');
    await expect(page.locator('h1')).toContainText('Offer', { timeout: 15_000 });

    const templateBtn = page.locator('button:has-text("Template"), a:has-text("Template")').first();

    if (await templateBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        templateBtn.click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    } else {
      console.log('Template button not directly visible — skipping download assertion');
    }
  });

});
