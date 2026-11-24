/**
 * Super Admin proxy login (tenant impersonation).
 * Single focused case — not a full workbook run.
 */
const { test, expect } = require('@playwright/test');
const { answerLoginCaptcha } = require('../answerLoginCaptcha');
const { genuineAccount } = require('../genuineAccounts');

async function loginAsDemo(page, email) {
  await page.goto(`/login?email=${encodeURIComponent(email)}`);
  await expect(page.locator('#login-form').locator('#login-email').first()).toHaveValue(email, {
    timeout: 15_000,
  });
  await expect(page.locator('#login-form').locator('#login-password').first()).not.toHaveValue('', {
    timeout: 10_000,
  });
  await answerLoginCaptcha(page);
  await page.locator('#login-form').locator('#login-submit').first().click();
}

test.describe('Super Admin proxy login', () => {
  test('TC_SAD_PROXY_001 – Login as college, see banner, Exit restores admin', async ({ page }) => {
    await loginAsDemo(page, genuineAccount('super_admin'));
    await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 15_000 });

    await page.goto('/dashboard/admin/colleges');
    await expect(page).toHaveURL(/\/dashboard\/admin\/colleges/, { timeout: 15_000 });

    const loginBtn = page.getByRole('button', { name: /Login as/i }).first();
    await expect(loginBtn).toBeVisible({ timeout: 15_000 });

    // Prefer an enabled Login as (college with active admin).
    const enabledLogin = page.locator('button[aria-label^="Login as"]:not([disabled])').first();
    const enabledCount = await enabledLogin.count();
    test.skip(enabledCount === 0, 'No college with an active admin available for proxy login');

    await Promise.all([
      page.waitForURL(/\/dashboard\/college/, { timeout: 20_000 }),
      enabledLogin.click(),
    ]);

    await expect(page.getByTestId('impersonation-banner')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('impersonation-exit')).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/dashboard\/admin/, { timeout: 20_000 }),
      page.getByTestId('impersonation-exit').click(),
    ]);

    await expect(page.getByTestId('impersonation-banner')).toHaveCount(0);
  });
});
