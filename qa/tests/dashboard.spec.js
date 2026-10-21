const { test, expect } = require('@playwright/test');
const { answerLoginCaptcha } = require('../answerLoginCaptcha');
const { genuineAccount } = require('../genuineAccounts');

// ─── Shared login helper (URL-param approach — no dropdown needed) ────────────
async function loginAsDemo(page, email) {
  await page.goto(`/login?email=${encodeURIComponent(email)}`);
  await expect(page.locator('#login-form').locator('#login-email').first()).toHaveValue(email, { timeout: 15_000 });
  await expect(page.locator('#login-form').locator('#login-password').first()).not.toHaveValue('', { timeout: 10_000 });
  await answerLoginCaptcha(page);
  await page.locator('#login-form').locator('#login-submit').first().click();
}

// ─── Tests ───────────────────────────────────────────────────────────────────
test.describe('Dashboard Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, genuineAccount('student'));
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 15_000 });
  });

  test('Navigate using the mega menu hub', async ({ page }) => {
    await expect(page.locator('.dashboard-nav-hub-page-title')).toBeVisible({ timeout: 15_000 });

    const profileLink = page.locator('a:has-text("My profile")').first();
    await expect(profileLink).toBeVisible({ timeout: 15_000 });
    await profileLink.click();

    await expect(page).toHaveURL(/\/dashboard\/student\/profile/, { timeout: 15_000 });
    await expect(page.locator('.sidebar')).toBeVisible({ timeout: 15_000 });

    await page.locator('.topbar-left a:has-text("Home")').click();
    await expect(page.locator('.dashboard-nav-hub')).toBeVisible({ timeout: 15_000 });
  });

  test('Toggle theme functionality', async ({ page }) => {
    const themeButton = page.locator('button[title="Toggle theme"]').first();
    await expect(themeButton).toBeVisible({ timeout: 15_000 });

    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('data-theme');

    await themeButton.click();
    const expectedNewTheme = initialTheme === 'dark' ? 'light' : 'dark';
    await expect(htmlElement).toHaveAttribute('data-theme', expectedNewTheme, { timeout: 15_000 });

    await themeButton.click();
    await expect(htmlElement).toHaveAttribute('data-theme', initialTheme, { timeout: 15_000 });
  });

});
