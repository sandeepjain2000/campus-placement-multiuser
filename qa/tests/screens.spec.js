/**
 * screens.spec.js – Smoke-tests every screen in CampusPlacement_Test_Cases.xlsx
 *
 * Goal: Verify each page/route loads without crashing (no 404, no error boundary,
 * no blank screen). Does NOT test data correctness — that is covered by manual tests.
 *
 * Login strategy: ?email= URL param fills both email + password automatically.
 */
const { test, expect } = require('@playwright/test');

// ─── Login helper ─────────────────────────────────────────────────────────────
async function loginAsDemo(page, email) {
  await page.goto(`/login?email=${encodeURIComponent(email)}`);
  await expect(page.locator('#login-email')).toHaveValue(email, { timeout: 15_000 });
  await expect(page.locator('#login-password')).not.toHaveValue('', { timeout: 10_000 });
  await page.locator('#login-submit').click();
}

// Verify a page opened successfully — no error boundary, not a 404
async function assertPageOpened(page, urlPattern) {
  await expect(page).toHaveURL(urlPattern, { timeout: 15_000 });
  // Page must not show a generic error / 404
  const bodyText = await page.locator('body').innerText({ timeout: 10_000 });
  expect(bodyText).not.toMatch(/404.*not found/i);
  expect(bodyText).not.toMatch(/application error/i);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION SCREENS  (TC_AUTH_001 – TC_AUTH_006)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('TC_AUTH – Authentication screens', () => {

  test('TC_AUTH_001 – /login screen opens', async ({ page }) => {
    await page.goto('/login');
    await assertPageOpened(page, /\/login/);
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 15_000 });
  });

  test('TC_AUTH_001b – Student login lands on /dashboard/student', async ({ page }) => {
    await loginAsDemo(page, 'arjun.verma@iitm.edu');
    await assertPageOpened(page, /\/dashboard\/student/);
  });

  test('TC_AUTH_002 – Employer login lands on /dashboard/employer', async ({ page }) => {
    await loginAsDemo(page, 'hr@techcorp.com');
    await assertPageOpened(page, /\/dashboard\/employer/);
  });

  test('TC_AUTH_003 – College Admin login lands on /dashboard/college', async ({ page }) => {
    await loginAsDemo(page, 'admin@iitm.edu');
    await assertPageOpened(page, /\/dashboard\/college/);
  });

  test('TC_AUTH_004 – /register screen opens', async ({ page }) => {
    await page.goto('/register');
    await assertPageOpened(page, /\/register/);
  });

  test('TC_AUTH_005 – /forgot-password screen opens', async ({ page }) => {
    await page.goto('/forgot-password');
    await assertPageOpened(page, /\/forgot-password/);
  });

  test('TC_AUTH_006 – Logout returns to /login', async ({ page }) => {
    await loginAsDemo(page, 'arjun.verma@iitm.edu');
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 15_000 });
    await page.getByRole('button', { name: /sign out/i }).click();
    await assertPageOpened(page, /\/login/);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION / DASHBOARD SCREENS  (TC_NAV_001 – TC_NAV_003)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('TC_NAV – Navigation & dashboard screens', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'arjun.verma@iitm.edu');
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 15_000 });
  });

  test('TC_NAV_001 – Student hub opens and "My profile" navigates to profile', async ({ page }) => {
    await expect(page.locator('.dashboard-nav-hub-page-title')).toBeVisible({ timeout: 15_000 });
    await page.locator('a:has-text("My profile")').first().click();
    await assertPageOpened(page, /\/dashboard\/student\/profile/);
  });

  test('TC_NAV_002 – Theme toggle changes data-theme attribute', async ({ page }) => {
    const btn = page.locator('button[title="Toggle theme"]').first();
    await expect(btn).toBeVisible({ timeout: 15_000 });
    const before = await page.locator('html').getAttribute('data-theme');
    await btn.click();
    const after = await page.locator('html').getAttribute('data-theme');
    expect(after).not.toBe(before);
  });

  test('TC_NAV_003 – Sidebar visible on inner pages', async ({ page }) => {
    await page.goto('/dashboard/student/profile');
    await assertPageOpened(page, /\/dashboard\/student\/profile/);
    await expect(page.locator('.sidebar')).toBeVisible({ timeout: 15_000 });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT SCREENS  (TC_STU_001 – TC_STU_005)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('TC_STU – Student screens open', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'arjun.verma@iitm.edu');
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 15_000 });
  });

  test('TC_STU_001 – /dashboard/student/profile opens', async ({ page }) => {
    await page.goto('/dashboard/student/profile');
    await assertPageOpened(page, /\/dashboard\/student\/profile/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_STU_002 – /dashboard/student/documents opens', async ({ page }) => {
    await page.goto('/dashboard/student/documents');
    await assertPageOpened(page, /\/dashboard\/student\/documents/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_STU_003 – /dashboard/student/jobs opens', async ({ page }) => {
    await page.goto('/dashboard/student/jobs');
    await assertPageOpened(page, /\/dashboard\/student\/jobs/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_STU_004 – /dashboard/student/offers opens', async ({ page }) => {
    await page.goto('/dashboard/student/offers');
    await assertPageOpened(page, /\/dashboard\/student\/offers/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_STU_005 – /dashboard/student/applications opens', async ({ page }) => {
    await page.goto('/dashboard/student/applications');
    await assertPageOpened(page, /\/dashboard\/student\/applications/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYER SCREENS  (TC_EMP_001 – TC_EMP_005)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('TC_EMP – Employer screens open', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'hr@techcorp.com');
    await expect(page).toHaveURL(/\/dashboard\/employer/, { timeout: 15_000 });
  });

  test('TC_EMP_001 – /dashboard/employer/drives opens', async ({ page }) => {
    await page.goto('/dashboard/employer/drives');
    await assertPageOpened(page, /\/dashboard\/employer\/drives/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_EMP_002 – /dashboard/employer/applications opens', async ({ page }) => {
    await page.goto('/dashboard/employer/applications');
    await assertPageOpened(page, /\/dashboard\/employer\/applications/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_EMP_003 – /dashboard/employer/jobs opens', async ({ page }) => {
    await page.goto('/dashboard/employer/jobs');
    await assertPageOpened(page, /\/dashboard\/employer\/jobs/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_EMP_004 – /dashboard/employer/offers opens', async ({ page }) => {
    await page.goto('/dashboard/employer/offers');
    await assertPageOpened(page, /\/dashboard\/employer\/offers/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_EMP_005 – /dashboard/employer/profile opens', async ({ page }) => {
    await page.goto('/dashboard/employer/profile');
    await assertPageOpened(page, /\/dashboard\/employer\/profile/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_EMP_006 – /dashboard/employer/overview opens', async ({ page }) => {
    await page.goto('/dashboard/employer/overview');
    await assertPageOpened(page, /\/dashboard\/employer\/overview/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_EMP_007 – /dashboard/employer/interviews opens', async ({ page }) => {
    await page.goto('/dashboard/employer/interviews');
    await assertPageOpened(page, /\/dashboard\/employer\/interviews/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// COLLEGE ADMIN SCREENS  (TC_COL_001 – TC_COL_005)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('TC_COL – College Admin screens open', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin@iitm.edu');
    await expect(page).toHaveURL(/\/dashboard\/college/, { timeout: 15_000 });
  });

  test('TC_COL_001 – /dashboard/college/students opens', async ({ page }) => {
    await page.goto('/dashboard/college/students');
    await assertPageOpened(page, /\/dashboard\/college\/students/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_002 – /dashboard/college/drives opens', async ({ page }) => {
    await page.goto('/dashboard/college/drives');
    await assertPageOpened(page, /\/dashboard\/college\/drives/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_003 – /dashboard/college/offers-upload opens', async ({ page }) => {
    await page.goto('/dashboard/college/offers-upload');
    await assertPageOpened(page, /\/dashboard\/college\/offers-upload/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_004 – /dashboard/college/overview opens', async ({ page }) => {
    await page.goto('/dashboard/college/overview');
    await assertPageOpened(page, /\/dashboard\/college\/overview/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_005 – /dashboard/college/employers opens', async ({ page }) => {
    await page.goto('/dashboard/college/employers');
    await assertPageOpened(page, /\/dashboard\/college\/employers/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_006 – /dashboard/college/interviews opens', async ({ page }) => {
    await page.goto('/dashboard/college/interviews');
    await assertPageOpened(page, /\/dashboard\/college\/interviews/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_007 – /dashboard/college/offers opens', async ({ page }) => {
    await page.goto('/dashboard/college/offers');
    await assertPageOpened(page, /\/dashboard\/college\/offers/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_008 – /dashboard/college/rules opens (not blank)', async ({ page }) => {
    await page.goto('/dashboard/college/rules');
    await assertPageOpened(page, /\/dashboard\/college\/rules/);
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_009 – /dashboard/college/academic-years opens (not blank)', async ({ page }) => {
    await page.goto('/dashboard/college/academic-years');
    await assertPageOpened(page, /\/dashboard\/college\/academic-years/);
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_010 – /dashboard/college/infrastructure opens (not blank)', async ({ page }) => {
    await page.goto('/dashboard/college/infrastructure');
    await assertPageOpened(page, /\/dashboard\/college\/infrastructure/);
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_011 – /dashboard/college/settings opens (not blank)', async ({ page }) => {
    await page.goto('/dashboard/college/settings');
    await assertPageOpened(page, /\/dashboard\/college\/settings/);
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_012 – /dashboard/college/hiring-assessment opens (not blank)', async ({ page }) => {
    await page.goto('/dashboard/college/hiring-assessment');
    await assertPageOpened(page, /\/dashboard\/college\/hiring-assessment/);
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_013 – /dashboard/college/interviews opens (not blank)', async ({ page }) => {
    await page.goto('/dashboard/college/interviews');
    await assertPageOpened(page, /\/dashboard\/college\/interviews/);
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_014 – /dashboard/college/reports opens (not blank)', async ({ page }) => {
    await page.goto('/dashboard/college/reports');
    await assertPageOpened(page, /\/dashboard\/college\/reports/);
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_COL_015 – /dashboard/college/audit-reports opens (not blank)', async ({ page }) => {
    await page.goto('/dashboard/college/audit-reports');
    await assertPageOpened(page, /\/dashboard\/college\/audit-reports/);
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible({ timeout: 15_000 });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN SCREENS  (TC_SAD_001 – TC_SAD_003)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('TC_SAD – Super Admin screens open', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin@placementhub.com');
    await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 15_000 });
  });

  test('TC_SAD_001 – /dashboard/admin/colleges opens', async ({ page }) => {
    await page.goto('/dashboard/admin/colleges');
    await assertPageOpened(page, /\/dashboard\/admin\/colleges/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_SAD_002 – /dashboard/admin/settings opens', async ({ page }) => {
    await page.goto('/dashboard/admin/settings');
    await assertPageOpened(page, /\/dashboard\/admin\/settings/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_SAD_003 – /dashboard/admin/overview opens', async ({ page }) => {
    await page.goto('/dashboard/admin/overview');
    await assertPageOpened(page, /\/dashboard\/admin\/overview/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_SAD_004 – /dashboard/admin/employers opens', async ({ page }) => {
    await page.goto('/dashboard/admin/employers');
    await assertPageOpened(page, /\/dashboard\/admin\/employers/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_SAD_005 – /dashboard/admin/users opens', async ({ page }) => {
    await page.goto('/dashboard/admin/users');
    await assertPageOpened(page, /\/dashboard\/admin\/users/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC_SAD_006 – /dashboard/admin/pending-registrations opens', async ({ page }) => {
    await page.goto('/dashboard/admin/pending-registrations');
    await assertPageOpened(page, /\/dashboard\/admin\/pending-registrations/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

});
