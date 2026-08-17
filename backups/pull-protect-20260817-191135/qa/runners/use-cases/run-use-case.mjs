#!/usr/bin/env node
/**
 * Run one use-case runner by slug.
 *
 *   npm run qa:uc -- clarifications
 *   npm run qa:uc -- clarifications --base-url https://campus-placement-omega.vercel.app
 *   npm run qa:uc:api -- guest-engagement
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runApiSmokeForSlug } from './api-smoke.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../guided/config/use-case-runners.json'), 'utf8'),
);

function parseArgs(argv) {
  const args = { slug: null, list: false, api: false, baseUrl: null, help: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--list' || a === '-l') args.list = true;
    else if (a === '--api') args.api = true;
    else if (a === '--base-url' || a === '-b') {
      args.baseUrl = argv[i + 1];
      i += 1;
    } else if (!a.startsWith('-') && !args.slug) {
      args.slug = a;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Run a use-case runner by slug.

  npm run qa:uc -- <slug> [--base-url URL]
  npm run qa:uc:list
  npm run qa:uc:api -- <slug>   (API smoke where available)

Guided runner: headless auto playbook (no voice).
API smoke: Playwright API checks for guest-engagement, clarifications.
`);
}

function listSlugs() {
  console.log('Use-case runners:\n');
  for (const row of MANIFEST.cases) {
    console.log(`  ${row.slug.padEnd(36)} ${row.title}`);
  }
  console.log(`\nTotal: ${MANIFEST.cases.length}`);
}

function runGuidedPlaybook(slug, baseUrl) {
  const entry = MANIFEST.cases.find((c) => c.slug === slug);
  if (!entry) {
    console.error(`Unknown slug: ${slug}. Run with --list.`);
    process.exit(1);
  }
  const playbook = entry.playbook || slug;
  const guided = path.join(__dirname, '../guided/run-guided.mjs');
  const cmd = ['node', guided, '--playbook', playbook, '--auto', '--no-voice', '--headless'];
  if (baseUrl) cmd.push('--base-url', baseUrl);

  console.log(`Running guided playbook: ${playbook} (slug: ${slug})`);
  const child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => process.exit(code ?? 1));
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }
  if (args.list) {
    listSlugs();
    return;
  }
  if (!args.slug) {
    printHelp();
    process.exit(1);
  }

  if (args.api) {
    const code = await runApiSmokeForSlug(args.slug, args.baseUrl);
    process.exit(code);
    return;
  }

  runGuidedPlaybook(args.slug, args.baseUrl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
