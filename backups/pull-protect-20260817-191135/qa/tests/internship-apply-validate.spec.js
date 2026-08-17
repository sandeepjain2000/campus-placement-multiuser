const { test, expect } = require('@playwright/test');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const STUDENT_EMAIL = process.env.QA_STUDENT_EMAIL || 'arjun.verma@iitm.edu';
const GT_MARKER = process.env.QA_GT_MARKER || 'GT-2026-06-301902';

async function loginAsStudent(page) {
  await page.goto(`${BASE}/login?email=${encodeURIComponent(STUDENT_EMAIL)}`);
  await expect(page.locator('#login-email')).toHaveValue(STUDENT_EMAIL, { timeout: 25_000 });
  await expect(page.locator('#login-password')).not.toHaveValue('', { timeout: 15_000 });
  await page.locator('#login-submit').click();
  await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 25_000 });
}

test.describe('Internship apply validation', () => {
  test('CV list API returns active CVs', async ({ page }) => {
    await loginAsStudent(page);

    const api = await page.evaluate(async () => {
      let res = await fetch('/api/student/cv-list');
      if (res.status === 404) res = await fetch('/api/student/cvs');
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json.items) ? json.items.filter((c) => !c.archivedAt) : [];
      return { status: res.status, count: items.length, labels: items.map((c) => c.label) };
    });

    console.log('CV_API', api);
    expect(api.status).toBe(200);
    expect(api.count).toBeGreaterThan(0);
  });

  test('student can apply or already shows Applied for guided internship', async ({ page }) => {
    await loginAsStudent(page);

    await page.goto(`${BASE}/dashboard/student/internships`);
    await expect(page.locator('table.data-table tbody tr').first()).toBeVisible({ timeout: 25_000 });

    const search = page.getByPlaceholder(/Search company, role, or status/i).first();
    await search.fill(GT_MARKER);
    await page.waitForTimeout(500);

    const row = page.locator('table.data-table tbody tr').filter({ hasText: GT_MARKER }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });

    const applyBtn = row.getByRole('button', { name: /^Apply$/i });
    const alreadyApplied = await row.locator('.badge').filter({ hasText: /^Applied$/i }).isVisible().catch(() => false);

    if (alreadyApplied) {
      console.log('VALIDATE: already applied to', GT_MARKER);
      await expect(row.locator('.badge').filter({ hasText: /^Applied$/i })).toBeVisible();
      return;
    }

    const canApply = await applyBtn.isVisible({ timeout: 5000 }).catch(() => false);
    expect(canApply, `No Apply button and not Applied for ${GT_MARKER}`).toBeTruthy();

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

    expect(postRes.ok(), postJson.error || `HTTP ${postRes.status()}`).toBeTruthy();
    expect(postJson.status).toBe('applied');

    await expect(row.locator('.badge').filter({ hasText: /^Applied$/i })).toBeVisible({ timeout: 15_000 });
  });
});
