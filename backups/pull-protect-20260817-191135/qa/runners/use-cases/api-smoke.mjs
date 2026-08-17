/**
 * API smoke tests for use cases that can be verified without manual steps.
 */
import { chromium } from 'playwright';
import { DEMO_SEED_PASSWORD } from '../../../src/lib/demoLogins.js';

const DEFAULT_BASE = process.env.QA_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3000';

async function uiLogin(page, baseUrl, email, password = DEMO_SEED_PASSWORD) {
  await page.goto(`${baseUrl}/login?email=${encodeURIComponent(email)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.waitForSelector('#login-email', { timeout: 20_000 });
  const pwd = await page.locator('#login-password').inputValue();
  if (!pwd) await page.fill('#login-password', password);
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('#login-submit');
      return btn && !btn.disabled;
    },
    { timeout: 30_000 },
  );
  const captcha = page.locator('#login-captcha');
  if (await captcha.count()) {
    const current = await captcha.inputValue();
    if (!current) await captcha.fill('7');
  }
  await page.click('#login-submit');
  await page.waitForURL(/\/(dashboard|auth\/continue)/, { timeout: 90_000 });
  if (page.url().includes('/auth/continue')) {
    await page.waitForURL(/\/dashboard\//, { timeout: 90_000 });
  }
}

const API_SMOKE = {
  async 'guest-engagement'(baseUrl) {
    const marker = `GT-UC-GUEST-${Date.now()}`;
    const browser = await chromium.launch({ headless: true });
    const college = await browser.newPage();
    await uiLogin(college, baseUrl, 'admin@iitm.edu');
    const create = await college.request.post(`${baseUrl}/api/college/engagement-listings`, {
      data: {
        kind: 'guest_lecture',
        title: `${marker} Lecture`,
        summary: 'API smoke guest need',
        status: 'published',
      },
    });
    const created = await create.json().catch(() => ({}));
    if (!create.ok) throw new Error(created.error || 'Guest need create failed');
    await college.close();

    const employer = await browser.newPage();
    await uiLogin(employer, baseUrl, 'hr@techcorp.com');
    const list = await employer.request.get(`${baseUrl}/api/employer/engagement-listings`);
    const listJson = await list.json().catch(() => ({}));
    const row = (listJson.listings || []).find((l) => String(l.title || '').includes(marker));
    if (!row) throw new Error('Employer cannot see published guest need');
    await browser.close();
    return { marker, listingId: created.listing?.id };
  },

  async clarifications(baseUrl) {
    const marker = `GT-UC-CLAR-${Date.now()}`;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await uiLogin(page, baseUrl, 'arjun.verma@iitm.edu');
    const res = await page.request.post(`${baseUrl}/api/clarifications`, {
      data: {
        company: 'TechCorp Solutions',
        postedBy: 'Student',
        questionTexts: [`${marker} timeline?`],
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || json.userMessage || 'Clarification POST failed');
    await browser.close();
    return { marker };
  },
};

/**
 * @param {string} slug
 * @param {string | null} baseUrl
 * @returns {Promise<number>} exit code
 */
export async function runApiSmokeForSlug(slug, baseUrl = null) {
  const base = (baseUrl || DEFAULT_BASE).replace(/\/$/, '');
  const fn = API_SMOKE[slug];
  if (!fn) {
    console.error(`No API smoke runner for "${slug}". Use: ${Object.keys(API_SMOKE).join(', ')}`);
    return 1;
  }
  try {
    const result = await fn(base);
    console.log(`PASS api-smoke:${slug}`, result);
    return 0;
  } catch (e) {
    console.error(`FAIL api-smoke:${slug}`, e.message);
    return 1;
  }
}
