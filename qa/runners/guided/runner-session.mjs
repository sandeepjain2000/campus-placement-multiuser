/**
 * Shared session helpers for QA Playwright runners.
 */
import fs from 'fs';
import { startGuidedSession, endGuidedSession } from '../../../src/lib/guidedRunnerDb.js';
import { DEMO_SEED_PASSWORD } from '../../../src/lib/demoLogins.js';
import { configPath } from './paths.mjs';

export function loadUseCasesConfig() {
  return JSON.parse(fs.readFileSync(configPath('use-cases.json'), 'utf8'));
}

export function resolveBaseUrl(args = {}) {
  const config = loadUseCasesConfig();
  return (
    args.baseUrl ||
    process.env.QA_BASE_URL ||
    process.env.BASE_URL ||
    config?.defaultBaseUrl ||
    'http://127.0.0.1:3000'
  ).replace(/\/$/, '');
}

export function resolveAccounts() {
  const config = loadUseCasesConfig();
  const accounts = config?.accounts || {};
  return {
    student: accounts.student || 'arjun.verma@iitm.edu',
    employer: accounts.employer || 'hr@techcorp.com',
    college_admin: accounts.college_admin || 'admin@iitm.edu',
    password: accounts.password || DEMO_SEED_PASSWORD,
  };
}

/** @param {import('playwright').Page} page */
export async function guidedLogin(page, baseUrl, email, password = DEMO_SEED_PASSWORD) {
  const signInRes = await page.request.post(`${baseUrl}/api/guided-runner/sign-in`, {
    data: { email, password },
  });
  const data = await signInRes.json().catch(() => ({}));
  if (!signInRes.ok() || !data.ok || !data.redirectTo) {
    throw new Error(data.error || `Guided sign-in failed (${signInRes.status()})`);
  }
  await page.goto(`${baseUrl}${data.redirectTo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/dashboard\//, { timeout: 60_000 });
}

export function beginGuidedSession(playbookId, marker) {
  startGuidedSession({ playbookId, marker: marker || `GT-${Date.now()}` });
}

export function finishGuidedSession() {
  endGuidedSession();
}
