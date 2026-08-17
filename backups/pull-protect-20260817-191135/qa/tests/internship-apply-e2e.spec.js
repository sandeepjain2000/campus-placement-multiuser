const { test, expect } = require('@playwright/test');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const STUDENT_EMAIL = process.env.QA_STUDENT_EMAIL || 'arjun.verma@iitm.edu';

async function loginAsStudent(page) {
  await page.goto(`${BASE}/login?email=${encodeURIComponent(STUDENT_EMAIL)}`);
  await expect(page.locator('#login-email')).toHaveValue(STUDENT_EMAIL, { timeout: 25_000 });
  await expect(page.locator('#login-password')).not.toHaveValue('', { timeout: 15_000 });
  await page.locator('#login-submit').click();
  await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 25_000 });
}

test('student can apply to an internship', async ({ page }) => {
  await loginAsStudent(page);

  const cvApi = await page.evaluate(async () => {
    let res = await fetch('/api/student/cv-list');
    if (res.status === 404) res = await fetch('/api/student/cvs');
    const json = await res.json().catch(() => ({}));
    return { status: res.status, count: Array.isArray(json.items) ? json.items.length : 0 };
  });
  console.log('CV_API', cvApi);
  expect([200, 503]).toContain(cvApi.status);

  await page.goto(`${BASE}/dashboard/student/internships`);
  await expect(page.locator('h1, .dashboard-nav-hub-page-title').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('table.data-table tbody tr').first()).toBeVisible({ timeout: 25_000 });

  const marker = process.env.QA_GT_MARKER || 'GT-2026-06-301902';
  const search = page.getByPlaceholder(/Search company, role, or status/i).first();
  if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
    await search.fill(marker);
    await page.waitForTimeout(500);
  }

  const applyBtn = page.getByRole('button', { name: /^Apply$/i }).first();
  const hasApply = await applyBtn.isVisible({ timeout: 15_000 }).catch(() => false);
  if (!hasApply) {
    test.skip(true, 'No open internships with Apply button visible for this student.');
  }

  const row = applyBtn.locator('xpath=ancestor::tr[1]');
  const rowText = (await row.textContent().catch(() => '')) || 'internship row';
  console.log('Applying to row:', rowText.slice(0, 120));

  await applyBtn.click();
  await expect(page.getByRole('dialog')).toContainText('Choose CV for this application', { timeout: 15_000 });

  const applyResponse = page.waitForResponse(
    (res) => res.url().includes('/api/student/program-applications') && res.request().method() === 'POST',
    { timeout: 45_000 },
  );

  await page.getByRole('button', { name: 'Submit application' }).click();

  const postRes = await applyResponse;
  const postJson = await postRes.json().catch(() => ({}));
  console.log('APPLY_POST', postRes.status(), postJson);

  expect(postRes.ok(), `Apply API failed: ${postJson.error || postRes.status()}`).toBeTruthy();
  expect(postJson.status).toBe('applied');

  await expect(row.locator('.badge').filter({ hasText: /^Applied$/i })).toBeVisible({ timeout: 15_000 });
});
