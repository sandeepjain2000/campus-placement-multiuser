#!/usr/bin/env node
/**
 * Upload a sample profile photo from qa2/profilepics/ for the test student.
 *   npm run test:guided:upload-profile-photos
 */
import { chromium } from 'playwright';
import { beginGuidedSession, finishGuidedSession, guidedLogin, resolveAccounts, resolveBaseUrl } from './runner-session.mjs';
import { QA2_PROFILE_DIR, uploadQa2ProfilePhoto } from './qa2-assets.mjs';

function parseArgs(argv) {
  const args = { baseUrl: null, help: false, file: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--file' || a === '-f') {
      args.file = argv[i + 1];
      i += 1;
    } else if (a === '--base-url' || a === '-b') {
      args.baseUrl = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`\nUpload qa2/profilepics for test student.\n  npm run test:guided:upload-profile-photos\n  Source: ${QA2_PROFILE_DIR}\n`);
    return;
  }

  const baseUrl = resolveBaseUrl(args);
  const accounts = resolveAccounts();
  beginGuidedSession('upload-profile-photos');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`\n▶ Upload profile photo → ${accounts.student}`);
    await guidedLogin(page, baseUrl, accounts.student, accounts.password);
    const result = await uploadQa2ProfilePhoto(page, baseUrl, { file: args.file });
    if (result.storageSkipped) {
      console.log(`\n○ Skipped — ${result.reason}\n`);
      process.exit(0);
    }
    console.log(`\n✓ Uploaded ${result.file}`);
    console.log(`  avatar_url: ${result.avatar_url}\n`);
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
