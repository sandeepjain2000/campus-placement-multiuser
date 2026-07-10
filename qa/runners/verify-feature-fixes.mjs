#!/usr/bin/env node
/**
 * Verifies feature fixes: profile photo, guided-runner 403 polling, unified CV apply modal,
 * campus students not seeing jobs.
 *
 *   npm run qa:verify:features
 * Requires: npm run dev
 */
import { chromium } from 'playwright';
import {
  beginGuidedSession,
  finishGuidedSession,
  guidedLogin,
  resolveAccounts,
  resolveBaseUrl,
} from './guided/runner-session.mjs';
import { uploadQa2Cvs, uploadQa2ProfilePhoto } from './guided/qa2-assets.mjs';

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
Verify recent feature fixes (Playwright + API).

  npm run qa:verify:features
  node qa/runners/verify-feature-fixes.mjs [--base-url URL]

Checks:
  1. guided-runner-403-polling   — stops after first 403 (no endless loop)
  2. campus-student-no-jobs      — /student/jobs redirects; no alumni job nav
  3. unified-cv-apply-modal      — single apply dialog with CV picker
  4. student-profile-photo       — upload from qa2/profilepics

Assets:
  qa2/CVs/          sample PDF CVs
  qa2/profilepics/  sample profile photos

Requires: npm run dev (S3 optional — storage checks skip gracefully)
`);
}

/** @param {{ check: string, status: string, error?: string, skipped?: boolean, note?: string }} result */
function logResult(result) {
  const tag = result.skipped ? 'SKIP' : result.status;
  const suffix = result.error ? ` — ${result.error}` : result.note ? ` — ${result.note}` : '';
  console.log(`${tag}  ${result.check}${suffix}`);
}

async function verifyGuidedRunner403Polling(page, baseUrl) {
  let stateCalls = 0;

  await page.route('**/api/guided-runner/state**', async (route) => {
    stateCalls += 1;
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Guided testing API disabled in this environment.' }),
    });
  });

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  if (stateCalls > 4) {
    throw new Error(`Expected polling to stop after 403; got ${stateCalls} /state requests in 5s`);
  }

  const badge = page.locator('.dev-guided-unavailable, [class*="dev-guided"]');
  const hasBadge = (await badge.count()) > 0;

  return { stateCalls, hasUnavailableBadge: hasBadge };
}

async function verifyCampusStudentNoJobs(page, baseUrl) {
  await page.goto(`${baseUrl}/dashboard/student/jobs`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/dashboard\/student\/drives/, { timeout: 15_000 });

  const navText = await page.locator('nav, aside, [class*="sidebar"]').first().innerText().catch(() => '');
  if (/browse alumni jobs|my alumni jobs|browse jobs/i.test(navText)) {
    throw new Error('Campus student sidebar still shows alumni job links');
  }

  await page.goto(`${baseUrl}/dashboard/alumni/jobs`, { waitUntil: 'domcontentloaded' });
  const alumniUrl = page.url();
  if (alumniUrl.includes('/dashboard/alumni/jobs')) {
    throw new Error(`Campus student reached alumni jobs URL: ${alumniUrl}`);
  }

  return { redirectedFromJobs: true, finalUrl: page.url() };
}

async function verifyUnifiedCvApplyModal(page, baseUrl) {
  const cvResult = await uploadQa2Cvs(page, baseUrl, { skipExistingLabels: true });
  if (cvResult.storageSkipped) {
    return { skipped: true, reason: cvResult.reason };
  }

  await page.goto(`${baseUrl}/dashboard/student/drives`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const applyBtn = page.getByRole('button', { name: /^apply now$/i }).first();
  if (!(await applyBtn.count())) {
    return { skipped: true, reason: 'No applyable drives in list — run drives playbook first' };
  }

  await applyBtn.click();
  await page.waitForSelector('#student-apply-cv-modal-title', { timeout: 10_000 });

  const modalCount = await page.locator('.modal-overlay.modal-overlay-solid .modal[role="dialog"]').count();
  if (modalCount !== 1) {
    throw new Error(`Expected 1 apply modal, found ${modalCount} stacked dialogs`);
  }

  const title = await page.locator('#student-apply-cv-modal-title').innerText();
  if (!/apply to/i.test(title)) {
    throw new Error(`Unexpected modal title: "${title}"`);
  }

  const hasCvPicker = (await page.getByText('Choose CV').count()) > 0;
  const hasSubmit = (await page.getByRole('button', { name: /submit application/i }).count()) > 0;
  if (!hasCvPicker && cvResult.uploaded.length + cvResult.skipped.length > 0) {
    throw new Error('Unified modal missing CV picker');
  }
  if (!hasSubmit) {
    throw new Error('Unified modal missing submit button');
  }

  await page.keyboard.press('Escape');
  return { modalCount, hasCvPicker, hasSubmit, title };
}

async function verifyStudentProfilePhoto(page, baseUrl) {
  const apiResult = await uploadQa2ProfilePhoto(page, baseUrl);
  if (apiResult.storageSkipped) {
    await page.goto(`${baseUrl}/dashboard/student/profile`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Change photo').first().waitFor({ timeout: 15_000 });
    const fileInput = page.locator('label:has-text("Change photo") input[type="file"]').first();
    if (!(await fileInput.count())) {
      throw new Error('Profile page missing photo file input');
    }
    return { storageSkipped: true, reason: apiResult.reason, uiInputPresent: true };
  }

  if (!apiResult.avatar_url) {
    throw new Error('Avatar upload succeeded but no avatar_url returned');
  }

  await page.goto(`${baseUrl}/dashboard/student/profile`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const img = page.locator('img[alt*="profile" i], img[alt*="photo" i]').first();
  const src = await img.getAttribute('src').catch(() => '');
  if (!src || src.includes('data:image/svg')) {
    throw new Error('Profile page does not show uploaded avatar image');
  }

  return { avatar_url: apiResult.avatar_url, file: apiResult.file };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const baseUrl = resolveBaseUrl(args);
  const accounts = resolveAccounts();
  beginGuidedSession('verify-feature-fixes', `GT-FEAT-${Date.now()}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch {
    console.error(`Dev server not reachable at ${baseUrl}. Start with: npm run dev`);
    finishGuidedSession();
    process.exit(1);
  }

  try {
    const r = await verifyGuidedRunner403Polling(page, baseUrl);
    results.push({ check: 'guided-runner-403-polling', status: 'PASS', note: `${r.stateCalls} state calls (≤4)` });
    logResult(results.at(-1));
  } catch (e) {
    results.push({ check: 'guided-runner-403-polling', status: 'FAIL', error: e.message });
    logResult(results.at(-1));
  }

  const studentPage = await browser.newPage();
  try {
    await guidedLogin(studentPage, baseUrl, accounts.student, accounts.password);

    try {
      const campus = await verifyCampusStudentNoJobs(studentPage, baseUrl);
      results.push({ check: 'campus-student-no-jobs', status: 'PASS', note: campus.finalUrl });
      logResult(results.at(-1));
    } catch (e) {
      results.push({ check: 'campus-student-no-jobs', status: 'FAIL', error: e.message });
      logResult(results.at(-1));
    }

    try {
      const cv = await verifyUnifiedCvApplyModal(studentPage, baseUrl);
      if (cv.skipped) {
        results.push({ check: 'unified-cv-apply-modal', status: 'SKIP', skipped: true, note: cv.reason });
      } else {
        results.push({ check: 'unified-cv-apply-modal', status: 'PASS', note: cv.title });
      }
      logResult(results.at(-1));
    } catch (e) {
      results.push({ check: 'unified-cv-apply-modal', status: 'FAIL', error: e.message });
      logResult(results.at(-1));
    }

    try {
      const photo = await verifyStudentProfilePhoto(studentPage, baseUrl);
      if (photo.storageSkipped) {
        results.push({
          check: 'student-profile-photo',
          status: 'SKIP',
          skipped: true,
          note: `${photo.reason} (file input present: ${photo.uiInputPresent})`,
        });
      } else {
        results.push({ check: 'student-profile-photo', status: 'PASS', note: photo.file });
      }
      logResult(results.at(-1));
    } catch (e) {
      results.push({ check: 'student-profile-photo', status: 'FAIL', error: e.message });
      logResult(results.at(-1));
    }
  } catch (e) {
    results.push({ check: 'student-login', status: 'FAIL', error: e.message });
    logResult(results.at(-1));
  } finally {
    await studentPage.close().catch(() => {});
  }

  await browser.close();
  finishGuidedSession();

  console.log('\n--- verify-feature-fixes summary ---');
  const failed = results.filter((r) => r.status === 'FAIL');
  for (const r of results) logResult(r);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  finishGuidedSession();
  process.exit(1);
});
