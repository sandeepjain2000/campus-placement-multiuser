/**
 * Upload all sample CVs from docs/CVs/ as labelled student CVs.
 * QA/agent testing only — not for production seeding or student-facing demos.
 *
 *   npm run test:guided:upload-sample-cvs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import { DEMO_SEED_PASSWORD } from '../../../src/lib/demoLogins.js';
import { configPath } from './paths.mjs';
import { SAMPLE_CV_DIR, uploadSampleCvs } from './cv-upload.mjs';

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArgs(argv) {
  const args = { baseUrl: null, help: false, replace: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--replace') args.replace = true;
    else if (a === '--base-url' || a === '-b') {
      args.baseUrl = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Upload sample CVs from:
  ${SAMPLE_CV_DIR}

Labels (from manifest.json):
  Research CV | Academic CV | Grad school CV | High school CV | Internship CV

Usage:
  npm run test:guided:upload-sample-cvs
  node qa/runners/guided/upload-sample-cvs.mjs [--base-url URL]

Requires: npm run dev, S3 configured, migration 099 applied.
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

  const accounts = config?.accounts || { student: 'arjun.verma@iitm.edu' };
  const email = accounts.student;
  const password = accounts.password || DEMO_SEED_PASSWORD;

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  try {
    console.log('\n▶ Upload sample CVs (student)');
    console.log(`  Base URL: ${baseUrl}`);
    console.log(`  Account: ${email}`);
    console.log(`  Source: ${SAMPLE_CV_DIR}\n`);

    await guidedLogin(page, baseUrl, email, password);
    const result = await uploadSampleCvs(page, baseUrl, {
      skipExistingLabels: !args.replace,
    });

    console.log(`\n✓ Uploaded ${result.uploaded.length}, skipped ${result.skipped.length}`);
    console.log('  Open /dashboard/student/cvs to review or apply with CV picker.\n');
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
