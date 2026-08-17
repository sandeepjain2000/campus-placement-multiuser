#!/usr/bin/env node
/**
 * Verifies post-deploy fixes on production or local:
 *  1. College creates & publishes campus guest need
 *  2. Employer sends guest confirmation email
 *  3. Student submits clarification question
 *
 *   node qa/runners/verify-deploy-fixes.mjs
 *   node qa/runners/verify-deploy-fixes.mjs --base-url https://campus-placement-omega.vercel.app
 */
import { chromium } from 'playwright';
import {
  beginGuidedSession,
  finishGuidedSession,
  resolveAccounts,
  resolveBaseUrl,
} from './guided/runner-session.mjs';
import { DEMO_SEED_PASSWORD } from '../../src/lib/demoLogins.js';

function parseArgs(argv) {
  const args = { baseUrl: null, help: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--base-url' || a === '-b') {
      args.baseUrl = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Verify deploy fixes (guest need, confirmation email, student clarification).

  node qa/runners/verify-deploy-fixes.mjs [--base-url URL]

Default base URL: QA_BASE_URL / BASE_URL / http://127.0.0.1:3000
Uses Playwright UI login (works on Vercel production).
`);
}

/** @param {import('playwright').Page} page */
async function uiLogin(page, baseUrl, email, password = DEMO_SEED_PASSWORD) {
  await page.goto(`${baseUrl}/login?email=${encodeURIComponent(email)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  await page.waitForSelector('#login-email', { timeout: 20_000 });
  await page.waitForFunction(
    (expected) => document.querySelector('#login-email')?.value === expected,
    email,
    { timeout: 20_000 },
  );

  const pwd = await page.locator('#login-password').inputValue();
  if (!pwd) {
    await page.fill('#login-password', password);
  }

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

/** @param {{ check: string, status: string, error?: string, note?: string, skipped?: boolean }} r */
function logResult(r) {
  const tag = r.skipped ? 'SKIP' : r.status;
  const suffix = r.error ? ` — ${r.error}` : r.note ? ` — ${r.note}` : '';
  console.log(`${tag}  ${r.check}${suffix}`);
}

/** @param {import('playwright').Page} page */
async function verifyCollegeGuestNeed(page, baseUrl, marker) {
  const res = await page.request.post(`${baseUrl}/api/college/engagement-listings`, {
    data: {
      kind: 'guest_lecture',
      title: `${marker} Guest Lecture`,
      summary: `Automated deploy verification summary for ${marker}.`,
      requirements: 'None',
      timeHint: 'Next week',
      status: 'published',
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || json.userMessage || `HTTP ${res.status()}`);
  }
  const id = json.listing?.id;
  if (!id) throw new Error('Create response missing listing id');
  return { listingId: id, title: json.listing.title };
}

/** @param {import('playwright').Page} page */
async function verifyEmployerGuestConfirmation(page, baseUrl, marker) {
  const listRes = await page.request.get(`${baseUrl}/api/employer/engagement-listings`);
  const listJson = await listRes.json().catch(() => ({}));
  if (!listRes.ok) {
    throw new Error(listJson.error || `List failed HTTP ${listRes.status()}`);
  }

  const listing = (listJson.listings || []).find((row) => String(row.title || '').includes(marker));
  if (!listing) {
    throw new Error(`Published listing "${marker}" not visible to employer`);
  }

  const draftRes = await page.request.get(
    `${baseUrl}/api/employer/engagement-listings/${listing.id}/confirmation-draft`,
  );
  const draft = await draftRes.json().catch(() => ({}));
  if (!draftRes.ok) {
    throw new Error(draft.error || `Draft failed HTTP ${draftRes.status()}`);
  }

  const subject = String(draft.subject || `Guest confirmation — ${marker}`).slice(0, 200);
  const body = String(draft.body || `QA confirmation for ${marker}`).slice(0, 2000);

  const sendRes = await page.request.post(
    `${baseUrl}/api/employer/engagement-listings/${listing.id}/send-confirmation`,
    { data: { subject, body } },
  );
  const sendJson = await sendRes.json().catch(() => ({}));

  if (sendRes.status() === 409) {
    return { listingId: listing.id, skipped: true, note: 'Confirmation already sent for this listing' };
  }
  if (sendRes.status() === 503 && /smtp|email is not configured/i.test(String(sendJson.error || ''))) {
    return { listingId: listing.id, skipped: true, note: sendJson.error || 'SMTP not configured' };
  }
  if (!sendRes.ok) {
    throw new Error(sendJson.error || sendJson.userMessage || `Send failed HTTP ${sendRes.status()}`);
  }

  return { listingId: listing.id, toEmail: sendJson.toEmail };
}

/** @param {import('playwright').Page} page */
async function verifyStudentClarification(page, baseUrl, marker) {
  const company = 'TechCorp Solutions';
  const res = await page.request.post(`${baseUrl}/api/clarifications`, {
    data: {
      company,
      postedBy: 'Student',
      questionTexts: [`${marker}: What is the interview timeline?`],
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || json.userMessage || `HTTP ${res.status()}`);
  }
  const batches = json.batches || [];
  const found = batches.some(
    (b) => b.company === company && b.questions?.some((q) => String(q.text || '').includes(marker)),
  );
  if (!found && !json.published) {
    throw new Error('Clarification POST succeeded but question not found in response batches');
  }
  return { company, published: Boolean(json.published) || found };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const baseUrl = resolveBaseUrl(args);
  const accounts = resolveAccounts();
  const password = accounts.password;
  const marker = `GT-DEPLOY-${Date.now()}`;
  const results = [];

  beginGuidedSession('verify-deploy-fixes', marker);

  const browser = await chromium.launch({ headless: true });

  try {
    await browser.newPage().then((p) =>
      p.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 }).then(() => p.close()),
    );
  } catch {
    console.error(`App not reachable at ${baseUrl}`);
    finishGuidedSession();
    process.exit(1);
  }

  console.log(`\nTarget: ${baseUrl}`);
  console.log(`Marker: ${marker}\n`);

  // 1 — College guest need
  const collegePage = await browser.newPage();
  try {
    await uiLogin(collegePage, baseUrl, accounts.college_admin, password);
    const guest = await verifyCollegeGuestNeed(collegePage, baseUrl, marker);
    results.push({
      check: 'college-guest-need-create',
      status: 'PASS',
      note: `listing ${guest.listingId}`,
    });
    logResult(results.at(-1));
  } catch (e) {
    results.push({ check: 'college-guest-need-create', status: 'FAIL', error: e.message });
    logResult(results.at(-1));
  } finally {
    await collegePage.close();
  }

  // 2 — Employer confirmation email
  const employerPage = await browser.newPage();
  try {
    await uiLogin(employerPage, baseUrl, accounts.employer, password);
    const mail = await verifyEmployerGuestConfirmation(employerPage, baseUrl, marker);
    if (mail.skipped) {
      results.push({
        check: 'employer-guest-confirmation-email',
        status: 'SKIP',
        skipped: true,
        note: mail.note,
      });
    } else {
      results.push({
        check: 'employer-guest-confirmation-email',
        status: 'PASS',
        note: `sent to ${mail.toEmail}`,
      });
    }
    logResult(results.at(-1));
  } catch (e) {
    results.push({ check: 'employer-guest-confirmation-email', status: 'FAIL', error: e.message });
    logResult(results.at(-1));
  } finally {
    await employerPage.close();
  }

  // 3 — Student clarification
  const studentPage = await browser.newPage();
  try {
    await uiLogin(studentPage, baseUrl, accounts.student, password);
    const clar = await verifyStudentClarification(studentPage, baseUrl, marker);
    results.push({
      check: 'student-clarification-submit',
      status: 'PASS',
      note: `${clar.company}${clar.published ? ' (reload deferred)' : ''}`,
    });
    logResult(results.at(-1));
  } catch (e) {
    results.push({ check: 'student-clarification-submit', status: 'FAIL', error: e.message });
    logResult(results.at(-1));
  } finally {
    await studentPage.close();
  }

  await browser.close();
  finishGuidedSession();

  console.log('\n--- verify-deploy-fixes summary ---');
  const failed = results.filter((r) => r.status === 'FAIL');
  for (const r of results) logResult(r);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  finishGuidedSession();
  process.exit(1);
});
