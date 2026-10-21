const { test, expect } = require('@playwright/test');
const { answerLoginCaptcha } = require('../answerLoginCaptcha');
const { genuineAccount } = require('../genuineAccounts');

// ─── Shared login helper ──────────────────────────────────────────────────────
// Uses the URL-param shortcut: /login?email=<email> fills the form automatically.
// This avoids the complex dropdown selector entirely.
async function loginAsDemo(page, email) {
  // Navigate with the email pre-param so the form auto-fills (see login page useEffect)
  await page.goto(`/login?email=${encodeURIComponent(email)}`);

  // Wait for the email field to be auto-filled
  await expect(page.locator('#login-form').locator('#login-email').first()).toHaveValue(email, { timeout: 15_000 });

  // Password is also filled by the same effect via DEMO_SEED_PASSWORD
  await expect(page.locator('#login-form').locator('#login-password').first()).not.toHaveValue('', { timeout: 10_000 });

  // Submit
  await answerLoginCaptcha(page);
  await page.locator('#login-form').locator('#login-submit').first().click();
}

// ─── Tests ───────────────────────────────────────────────────────────────────
test.describe('Authentication Flows', () => {

  test('Student login using demo account', async ({ page }) => {
    await loginAsDemo(page, genuineAccount('student'));

    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 15_000 });
    // Hub title is personalized (e.g. "Arjun — Home"), not the literal word "Dashboard".
    await expect(page.locator('.dashboard-nav-hub-page-title')).toContainText(/Home/i, { timeout: 15_000 });

    await page.getByRole('button', { name: /sign out/i }).click({ force: true });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('Employer login using demo account', async ({ page }) => {
    await loginAsDemo(page, genuineAccount('employer'));

    await expect(page).toHaveURL(/\/dashboard\/employer/, { timeout: 15_000 });
    await expect(page.locator('.dashboard-nav-hub-page-title')).toContainText(/Home/i, { timeout: 15_000 });

    await page.getByRole('button', { name: /sign out/i }).click({ force: true });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('College Admin login using demo account', async ({ page }) => {
    await loginAsDemo(page, genuineAccount('college_admin'));

    await expect(page).toHaveURL(/\/dashboard\/college/, { timeout: 15_000 });
    await expect(page.locator('.dashboard-nav-hub-page-title')).toContainText(/Home/i, { timeout: 15_000 });

    await page.getByRole('button', { name: /sign out/i }).click({ force: true });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

});
