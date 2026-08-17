#!/usr/bin/env node
/**
 * Verifies recent fixes via browser + API (offer template edit, internship backlogs default).
 * Run: node qa/runners/verify-recent-fixes.mjs
 * Requires: npm run dev on localhost:3000
 */
import { chromium } from 'playwright';
import { startGuidedSession, endGuidedSession } from '../../src/lib/guidedRunnerDb.js';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASSWORD = 'Admin@123';

async function login(page, email) {
  const signInRes = await page.request.post(`${BASE}/api/guided-runner/sign-in`, {
    data: { email, password: PASSWORD },
  });
  const data = await signInRes.json().catch(() => ({}));
  if (!signInRes.ok() || !data.ok || !data.redirectTo) {
    throw new Error(data.error || `Guided sign-in failed (${signInRes.status()})`);
  }
  await page.goto(`${BASE}${data.redirectTo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/dashboard\//, { timeout: 60_000 });
}

async function verifyOfferTemplateEdit(page) {
  await login(page, 'hr@techcorp.com');

  const marker = `GT-FIX-${Date.now()}`;
  const createRes = await page.request.post(`${BASE}/api/employer/offer-templates`, {
    data: {
      name: `${marker} Test Template`,
      jobTitle: 'Software Engineer',
      salary: 800000,
      location: 'Chennai',
      joiningDate: '2026-08-01',
      responseDeadline: '2026-07-31',
      bodyTemplate: `Dear {{student_name}},\n\nOffer for ${marker}.`,
      eventType: 'drive',
    },
  });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok) throw new Error(created.error || `Create failed (${createRes.status()})`);

  const id = created.template?.id;
  if (!id) throw new Error('Create response missing template id');

  const patchRes = await page.request.patch(`${BASE}/api/employer/offer-templates/${id}`, {
    data: { name: `${marker} Updated` },
  });
  const patched = await patchRes.json().catch(() => ({}));
  if (!patchRes.ok) {
    const msg = patched.error || `PATCH failed (${patchRes.status()})`;
    if (/template id required/i.test(msg)) {
      throw new Error(`Offer template edit regression: ${msg}`);
    }
    throw new Error(msg);
  }

  return { marker, templateId: id, ok: true };
}

async function verifyInternshipBacklogsDefault(page) {
  await login(page, 'hr@techcorp.com');
  await page.goto(`${BASE}/dashboard/employer/internships`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /post internship/i }).click();

  const group = page.locator('.form-group').filter({ hasText: 'Max active backlogs' });
  const value = await group.locator('input').first().inputValue();

  if (value !== '0') {
    throw new Error(`Expected maxBacklogs default "0", got "${value}"`);
  }

  return { defaultBacklogs: value, ok: true };
}

async function main() {
  startGuidedSession({ playbookId: 'verify-recent-fixes', marker: `GT-FIX-${Date.now()}` });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch (e) {
    console.error(`Dev server not reachable at ${BASE}. Start with: npm run dev`);
    process.exit(1);
  }

  try {
    const offer = await verifyOfferTemplateEdit(page);
    results.push({ check: 'offer-template-edit', status: 'PASS', ...offer });
    console.log('PASS offer-template-edit');
  } catch (e) {
    results.push({ check: 'offer-template-edit', status: 'FAIL', error: e.message });
    console.error('FAIL offer-template-edit:', e.message);
  }

  try {
    const backlogs = await verifyInternshipBacklogsDefault(page);
    results.push({ check: 'internship-backlogs-default', status: 'PASS', ...backlogs });
    console.log('PASS internship-backlogs-default');
  } catch (e) {
    results.push({ check: 'internship-backlogs-default', status: 'FAIL', error: e.message });
    console.error('FAIL internship-backlogs-default:', e.message);
  }

  await browser.close();
  endGuidedSession();

  const failed = results.filter((r) => r.status === 'FAIL');
  console.log('\n--- verify-recent-fixes summary ---');
  for (const r of results) console.log(`${r.status}  ${r.check}${r.error ? ` — ${r.error}` : ''}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
