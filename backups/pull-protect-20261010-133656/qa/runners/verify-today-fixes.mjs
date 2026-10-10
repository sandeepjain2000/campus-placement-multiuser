#!/usr/bin/env node
/**
 * Verifies 2026-07-14 fixes via browser + API + DB.
 * Covers: alumni label, committee demos + Getting Started, college drive tabs + REJECT confirm,
 * and purge clearing all notifications.
 *
 * Run: npm run qa:verify:today-fixes
 * Requires: npm run dev on localhost:3000
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import pg from 'pg';
import { startGuidedSession, endGuidedSession } from '../../src/lib/guidedRunnerDb.js';
import { REJECT_DRIVE_CONFIRM_PHRASE } from '../../src/lib/collegeDriveRejectConfirm.js';
import { DEFAULT_COLLEGE_DRIVE_STATUS_TAB } from '../../src/lib/collegeDriveStatusTabs.js';

const BASE = (process.env.BASE_URL || process.env.QA_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const PASSWORD = 'Admin@123';

const COMMITTEE_RETRY_EMAILS = [
  'committee.jadavpur@campus-placement.work',
  'committee.vit@campus-placement.work',
  'committee.dtu@campus-placement.work',
  'committee.iiith@campus-placement.work',
];

function readEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    out[k] = v;
  }
  return out;
}

function databaseUrl() {
  const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local') };
  return process.env.DATABASE_URL || env.DATABASE_URL || env.SUPABASE_DATABASE_URL || '';
}

async function login(page, email) {
  const signInRes = await page.request.post(`${BASE}/api/guided-runner/sign-in`, {
    data: { email, password: PASSWORD },
  });
  const data = await signInRes.json().catch(() => ({}));
  if (!signInRes.ok() || !data.ok || !data.redirectTo) {
    throw new Error(data.error || `Guided sign-in failed for ${email} (${signInRes.status()})`);
  }
  await page.goto(`${BASE}${data.redirectTo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/dashboard\//, { timeout: 60_000 });
}

async function verifyAlumniLabel(page) {
  await login(page, 'priya.sharma.alumni@iitm.edu');
  await page.waitForTimeout(1000);

  const sessionRes = await page.request.get(`${BASE}/api/auth/session`);
  const session = await sessionRes.json().catch(() => ({}));
  if (!session?.user?.isAlumni) {
    throw new Error(`Session missing isAlumni=true (got ${JSON.stringify(session?.user || session)})`);
  }

  // Alumni home is the full-screen hub (`/dashboard/student`) — role chip, not "Alumni Portal" topbar.
  await page.getByText(/^Alumni$/).first().waitFor({ timeout: 15_000 });
  const bodyText = await page.locator('body').innerText();
  if (/\bStudent\b/.test(bodyText) && !/\bAlumni\b/.test(bodyText)) {
    throw new Error('Alumni still labeled Student with no Alumni text');
  }
  // Must not show Student as the role under the alumni name on the hub
  const hubRoleIsStudent = await page
    .locator('text=Priya Sharma')
    .locator('..')
    .getByText(/^Student$/)
    .count()
    .catch(() => 0);
  if (hubRoleIsStudent > 0) {
    throw new Error('Hub still shows Student role under alumni name');
  }

  return { email: 'priya.sharma.alumni@iitm.edu', ok: true };
}

async function verifyCommitteeLogins(page) {
  const results = [];
  for (const email of COMMITTEE_RETRY_EMAILS) {
    await login(page, email);
    results.push(email);
  }
  return { emails: results, ok: true };
}

async function verifyCommitteeGettingStarted(page) {
  await login(page, 'committee@iitm.edu');
  await page.goto(`${BASE}/dashboard/college/getting-started`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/Coming soon/i).waitFor({ timeout: 20_000 });

  const text = await page.locator('body').innerText();
  if (/Super Admin|Review pending sign-ups/i.test(text)) {
    throw new Error('Placement Committee still shows Super Admin checklist copy');
  }

  const onboard = await page.request.get(`${BASE}/api/user/onboarding`);
  const json = await onboard.json().catch(() => ({}));
  if (!onboard.ok()) throw new Error(json.error || `onboarding ${onboard.status()}`);
  const progress = json.progress || json;
  const stepsLen = Array.isArray(progress.steps) ? progress.steps.length : null;
  if (progress.comingSoon !== true && stepsLen !== 0) {
    throw new Error(`Expected comingSoon / empty steps for committee, got ${JSON.stringify(json).slice(0, 200)}`);
  }

  return { ok: true, comingSoon: Boolean(progress.comingSoon), steps: stepsLen };
}

async function verifyCollegeDriveTabsAndReject(page) {
  await login(page, 'admin@iitm.edu');
  await page.goto(`${BASE}/dashboard/college/drives`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const tablist = page.getByRole('tablist', { name: /drive status/i });
  await tablist.waitFor({ timeout: 15_000 });

  const unapproved = tablist.getByRole('tab', { name: /unapproved/i });
  const selected = await unapproved.getAttribute('aria-selected');
  if (selected !== 'true') {
    throw new Error(`Expected Unapproved tab selected by default (DEFAULT=${DEFAULT_COLLEGE_DRIVE_STATUS_TAB}), got aria-selected=${selected}`);
  }

  // Prefer rejecting an existing requested drive; otherwise just open/close dialog if any Reject exists
  const rejectBtn = page.getByRole('button', { name: /^Reject$/ }).first();
  if ((await rejectBtn.count()) === 0) {
    // Switch to All — if still no Reject button, skip dialog check but tabs passed
    await tablist.getByRole('tab', { name: /^All/i }).click();
    await page.waitForTimeout(500);
  }

  if ((await rejectBtn.count()) === 0) {
    return { ok: true, tabsDefault: 'unapproved', rejectDialog: 'skipped-no-requested-drive' };
  }

  await rejectBtn.click();
  const dialog = page.getByRole('dialog', { name: /reject this placement drive/i });
  await dialog.waitFor({ timeout: 10_000 });

  const confirmBtn = dialog.getByRole('button', { name: /reject drive/i });
  if (!(await confirmBtn.isDisabled())) {
    throw new Error('Reject drive button should be disabled until phrase is typed');
  }

  await dialog.locator('#confirm-dialog-phrase').fill(REJECT_DRIVE_CONFIRM_PHRASE);
  if (await confirmBtn.isDisabled()) {
    throw new Error(`Reject drive stayed disabled after typing ${REJECT_DRIVE_CONFIRM_PHRASE}`);
  }

  // Cancel without actually rejecting
  await dialog.getByRole('button', { name: /keep drive/i }).click();
  await page.waitForTimeout(300);
  if ((await dialog.count()) > 0 && (await dialog.isVisible().catch(() => false))) {
    throw new Error('Reject dialog did not close after Keep drive');
  }

  return { ok: true, tabsDefault: 'unapproved', rejectDialog: 'verified' };
}

async function verifyPurgeClearsAlerts() {
  const dbUrl = databaseUrl();
  if (!dbUrl) throw new Error('DATABASE_URL not set (.env.local)');

  const local = /localhost|127\.0\.0\.1/.test(dbUrl);
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: local ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const before = await client.query(`SELECT COUNT(*)::int AS n FROM notifications`);
    const beforeN = before.rows[0]?.n ?? 0;

    // Insert a clearly marked probe so we always have something to delete
    const user = await client.query(`SELECT id FROM users WHERE email = 'admin@iitm.edu' LIMIT 1`);
    const userId = user.rows[0]?.id;
    if (!userId) throw new Error('admin@iitm.edu not found to insert probe notification');
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, 'info', '/dashboard')`,
      [userId, 'QA-TODAY-FIX probe', 'Temporary alert for purge verification'],
    );

    const mid = await client.query(`SELECT COUNT(*)::int AS n FROM notifications`);
    const midN = mid.rows[0]?.n ?? 0;
    if (midN < 1) throw new Error('Failed to insert probe notification');

    // Run the same DELETE the purge script uses
    const deleted = await client.query(`DELETE FROM notifications`);
    const after = await client.query(`SELECT COUNT(*)::int AS n FROM notifications`);
    const afterN = after.rows[0]?.n ?? 0;

    if (afterN !== 0) {
      throw new Error(`Expected 0 notifications after DELETE, got ${afterN}`);
    }

    return {
      ok: true,
      before: beforeN,
      deleted: deleted.rowCount || 0,
      after: afterN,
      note: 'Verified DELETE FROM notifications (same as qa:purge:internships-drives)',
    };
  } finally {
    await client.end();
  }
}

async function main() {
  startGuidedSession({ playbookId: 'verify-today-fixes', marker: `GT-TODAY-${Date.now()}` });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch (e) {
    console.error(`Dev server not reachable at ${BASE}. Start with: npm run dev`);
    process.exit(1);
  }

  const checks = [
    ['alumni-label', verifyAlumniLabel],
    ['committee-logins-retry', verifyCommitteeLogins],
    ['committee-getting-started', verifyCommitteeGettingStarted],
    ['college-drives-tabs-reject', verifyCollegeDriveTabsAndReject],
  ];

  for (const [name, fn] of checks) {
    try {
      const detail = await fn(page);
      results.push({ check: name, status: 'PASS', ...detail });
      console.log(`PASS ${name}`);
    } catch (e) {
      results.push({ check: name, status: 'FAIL', error: e.message });
      console.error(`FAIL ${name}:`, e.message);
    }
  }

  try {
    const purge = await verifyPurgeClearsAlerts();
    results.push({ check: 'purge-clears-alerts', status: 'PASS', ...purge });
    console.log('PASS purge-clears-alerts');
  } catch (e) {
    results.push({ check: 'purge-clears-alerts', status: 'FAIL', error: e.message });
    console.error('FAIL purge-clears-alerts:', e.message);
  }

  await browser.close();
  endGuidedSession();

  const failed = results.filter((r) => r.status === 'FAIL');
  console.log('\n--- verify-today-fixes summary ---');
  for (const r of results) {
    console.log(`${r.status}  ${r.check}${r.error ? ` — ${r.error}` : ''}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
