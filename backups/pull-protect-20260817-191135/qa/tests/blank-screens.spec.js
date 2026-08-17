/**
 * blank-screens.spec.js — Every dashboard route must render visible content (not blank).
 *
 * Catches regressions like lowercase JSX tags (<dt_Settings />) that mount empty DOM nodes.
 */
const { test, expect } = require('@playwright/test');
const { DEMO_LOGINS, ROLE_HOME, ROUTES_BY_ROLE } = require('../routes-by-role');

async function loginAsDemo(page, email, homePattern) {
  await page.goto(`/login?email=${encodeURIComponent(email)}`);
  await expect(page.locator('#login-email')).toHaveValue(email, { timeout: 15_000 });
  await expect(page.locator('#login-password')).not.toHaveValue('', { timeout: 10_000 });
  await page.locator('#login-submit').click();
  await expect(page).toHaveURL(homePattern, { timeout: 30_000 });
  await expect(page.locator('#main-content, .dashboard-nav-hub-page-title').first()).toBeVisible({
    timeout: 30_000,
  });
}

async function assertRouteNotBlank(page, route) {
  const { label, href, hub } = route;
  await page.goto(href, { waitUntil: 'load' });
  await expect(page).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?.*)?$`), {
    timeout: 20_000,
  });

  await expect
    .poll(
      async () => (await page.locator('body').innerText()).trim().length,
      { timeout: 25_000, message: `${label} (${href}): page never rendered text` },
    )
    .toBeGreaterThan(20);

  const bodyText = await page.locator('body').innerText();
  expect(bodyText, `${label} (${href}): stuck on login`).not.toMatch(/welcome back/i);
  expect(bodyText, `${label} (${href}): 404`).not.toMatch(/404.*not found/i);
  expect(bodyText, `${label} (${href}): app error`).not.toMatch(/application error/i);

  const orphanDtMb = await page.evaluate(() => {
    const root = document.querySelector('#main-content') || document.body;
    return [...root.querySelectorAll('*')].filter((el) => {
      const tag = el.tagName.toLowerCase();
      return tag.startsWith('dt_') || tag.startsWith('mb_');
    }).length;
  });
  expect(orphanDtMb, `${label} (${href}): stray dt_/mb_ DOM nodes`).toBe(0);

  if (hub) {
    await expect(
      page.locator('.dashboard-nav-hub-page-title, .dashboard-nav-hub-intro h1, h1').first(),
      `${label} (${href}): hub has no title`,
    ).toBeVisible({ timeout: 20_000 });
    return;
  }

  const main = page.locator('#main-content');
  await expect(main, `${label} (${href}): main region missing`).toBeVisible({ timeout: 20_000 });

  await expect
    .poll(
      async () => (await main.innerText()).replace(/\s+/g, ' ').trim().length,
      { timeout: 20_000, message: `${label} (${href}): main content never populated` },
    )
    .toBeGreaterThan(30);

  await expect(
    page.locator('#main-content h1, #main-content h2, #main-content .card-title').first(),
    `${label} (${href}): no visible heading in main`,
  ).toBeVisible({ timeout: 20_000 });
}

for (const [role, routes] of Object.entries(ROUTES_BY_ROLE)) {
  test.describe(`Blank screen guard — ${role}`, () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDemo(page, DEMO_LOGINS[role], ROLE_HOME[role]);
    });

    for (const route of routes) {
      test(`${route.label} — ${route.href}`, async ({ page }) => {
        await assertRouteNotBlank(page, route);
      });
    }
  });
}
