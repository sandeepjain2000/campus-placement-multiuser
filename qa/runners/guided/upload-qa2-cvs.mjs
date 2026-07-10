#!/usr/bin/env node
/**
 * Upload sample CVs from qa2/CVs/ for the test student.
 *   npm run test:guided:upload-qa2-cvs
 */
import { chromium } from 'playwright';
import { beginGuidedSession, finishGuidedSession, guidedLogin, resolveAccounts, resolveBaseUrl } from './runner-session.mjs';
import { QA2_CV_DIR, uploadQa2Cvs } from './qa2-assets.mjs';

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

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`\nUpload qa2/CVs PDFs as labelled student CVs.\n  npm run test:guided:upload-qa2-cvs\n  Source: ${QA2_CV_DIR}\n`);
    return;
  }

  const baseUrl = resolveBaseUrl(args);
  const accounts = resolveAccounts();
  beginGuidedSession('upload-qa2-cvs');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`\n▶ Upload qa2 CVs → ${accounts.student}`);
    await guidedLogin(page, baseUrl, accounts.student, accounts.password);
    const result = await uploadQa2Cvs(page, baseUrl, { skipExistingLabels: !args.replace });
    if (result.storageSkipped) {
      console.log(`\n○ Skipped — ${result.reason}\n`);
      process.exit(0);
    }
    console.log(`\n✓ Uploaded ${result.uploaded.length}, skipped ${result.skipped.length}\n`);
  } finally {
    await browser.close().catch(() => {});
    finishGuidedSession();
  }
}

main().catch((e) => {
  console.error(e);
  finishGuidedSession();
  process.exit(1);
});
