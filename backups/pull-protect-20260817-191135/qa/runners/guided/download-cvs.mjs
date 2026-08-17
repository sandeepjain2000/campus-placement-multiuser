/**
 * Standalone: log in as employer and download application CVs to qa/data/downloads/cvs/.
 *
 *   npm run test:guided:download-cvs
 *   node qa/runners/guided/download-cvs.mjs --role student --limit 3
 *   node qa/runners/guided/download-cvs.mjs --marker GT-20260502-120000
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { DEMO_SEED_PASSWORD } from '../../../src/lib/demoLogins.js';
import { configPath } from './paths.mjs';
import { CV_DOWNLOAD_ROOT, downloadEmployerApplicationCvs, downloadStudentOwnCvs } from './cv-download.mjs';

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArgs(argv) {
  const args = {
    role: 'employer',
    limit: 5,
    marker: '',
    tabs: 'internships,drives,jobs,projects',
    studentName: '',
    baseUrl: null,
    help: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--role') {
      args.role = argv[i + 1] || 'employer';
      i += 1;
    } else if (a === '--limit') {
      args.limit = Number(argv[i + 1]) || 5;
      i += 1;
    } else if (a === '--marker') {
      args.marker = argv[i + 1] || '';
      i += 1;
    } else if (a === '--tabs') {
      args.tabs = argv[i + 1] || args.tabs;
      i += 1;
    } else if (a === '--student') {
      args.studentName = argv[i + 1] || '';
      i += 1;
    } else if (a === '--base-url' || a === '-b') {
      args.baseUrl = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Download CVs into ${CV_DOWNLOAD_ROOT}/<timestamp>/

Usage:
  npm run test:guided:download-cvs
  node qa/runners/guided/download-cvs.mjs [options]

Options:
  --role employer|student   Default employer (application CVs with labels)
  --limit N                 Max files (default 5)
  --marker GT-...           Only applications whose opening title contains marker
  --tabs internships,drives Comma-separated employer tabs (default all four)
  --student Arjun           Filter employer list by student name substring
  --base-url http://127.0.0.1:3000

Requires: npm run dev (or QA_BASE_URL) and seeded demo accounts.
`);
}

async function guidedLogin(page, baseUrl, email, password) {
  const res = await page.request.post(`${baseUrl}/api/guided-runner/sign-in`, {
    data: { email, password },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok() || !data.ok) {
    throw new Error(data.error || `Guided sign-in failed (${res.status()})`);
  }
  await page.goto(`${baseUrl}${data.redirectTo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/dashboard\//, { timeout: 30_000 });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const config = loadJson(configPath('use-cases.json'));
  const baseUrl = (
    args.baseUrl ||
    process.env.QA_BASE_URL ||
    config?.defaultBaseUrl ||
    'http://127.0.0.1:3000'
  ).replace(/\/$/, '');

  const accounts = config?.accounts || {
    student: 'arjun.verma@iitm.edu',
    employer: 'hr@techcorp.com',
    college_admin: 'admin@iitm.edu',
  };
  const password = accounts.password || DEMO_SEED_PASSWORD;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const role = args.role === 'student' ? 'student' : 'employer';
    const email = accounts[role] || accounts.employer;
    console.log(`\n▶ CV download (${role})`);
    console.log(`  Base URL: ${baseUrl}`);
    console.log(`  Account: ${email}`);
    await guidedLogin(page, baseUrl, email, password);

    let manifest;
    if (role === 'student') {
      manifest = await downloadStudentOwnCvs(page, baseUrl, { limit: args.limit });
    } else {
      manifest = await downloadEmployerApplicationCvs(page, baseUrl, {
        limit: args.limit,
        marker: args.marker || null,
        tabs: args.tabs.split(',').map((t) => t.trim()).filter(Boolean),
        studentNameContains: args.studentName || null,
      });
    }

    console.log(`\n✓ Saved ${manifest.count} file(s) to:\n  ${manifest.outDir}`);
    if (manifest.note) console.log(`  Note: ${manifest.note}`);
    console.log(`  Manifest: ${path.join(manifest.outDir, 'manifest.json')}\n`);
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
