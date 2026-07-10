const { test, expect } = require('@playwright/test');

test('production student cvs API', async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'https://campus-placement-omega.vercel.app';
  await page.goto(`${base}/login?email=${encodeURIComponent('arjun.verma@iitm.edu')}`);
  await expect(page.locator('#login-email')).toHaveValue('arjun.verma@iitm.edu', { timeout: 20000 });
  await expect(page.locator('#login-password')).not.toHaveValue('', { timeout: 15000 });
  await page.locator('#login-submit').click();
  await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 20000 });

  const api = await page.evaluate(async () => {
    const res = await fetch('/api/student/cv-list');
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  });

  console.log('CV_API', JSON.stringify(api, null, 2));
  expect(api.status).toBe(200);
  expect(Array.isArray(api.json.items)).toBe(true);
  expect(api.json.items.length).toBeGreaterThan(0);
});
