const { test, expect } = require('@playwright/test');

// ─── Shared login helper ──────────────────────────────────────────────────────
// Uses the URL-param shortcut: /login?email=<email> fills the form automatically.
// This avoids the complex dropdown selector entirely.
async function loginAsDemo(page, email) {
  // Navigate with the email pre-param so the form auto-fills (see login page useEffect)
  await page.goto(`/login?email=${encodeURIComponent(email)}`);

  // Wait for the email field to be auto-filled
  await expect(page.locator('#login-email')).toHaveValue(email, { timeout: 15_000 });

  // Password is also filled by the same effect via DEMO_SEED_PASSWORD
  await expect(page.locator('#login-password')).not.toHaveValue('', { timeout: 10_000 });

  // Submit
  await page.locator('#login-submit').click();
}

// ─── Tests ───────────────────────────────────────────────────────────────────
test.describe('Authentication Flows', () => {

  test('Student login using demo account', async ({ page }) => {
    await loginAsDemo(page, 'arjun.verma@iitm.edu');

    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 15_000 });
    await expect(page.locator('.dashboard-nav-hub-page-title')).toContainText('Dashboard', { timeout: 15_000 });

    await page.getByRole('button', { name: /sign out/i }).click({ force: true });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('Employer login using demo account', async ({ page }) => {
    await loginAsDemo(page, 'hr@techcorp.com');

    await expect(page).toHaveURL(/\/dashboard\/employer/, { timeout: 15_000 });
    await expect(page.locator('.dashboard-nav-hub-page-title')).toContainText('Dashboard', { timeout: 15_000 });

    await page.getByRole('button', { name: /sign out/i }).click({ force: true });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('College Admin login using demo account', async ({ page }) => {
    await loginAsDemo(page, 'admin@iitm.edu');

    await expect(page).toHaveURL(/\/dashboard\/college/, { timeout: 15_000 });
    await expect(page.locator('.dashboard-nav-hub-page-title')).toContainText('Dashboard', { timeout: 15_000 });

    await page.getByRole('button', { name: /sign out/i }).click({ force: true });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

});
