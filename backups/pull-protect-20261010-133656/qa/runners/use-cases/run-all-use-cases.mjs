#!/usr/bin/env node
/**
 * Run all use-case runners headless and emit a summary report.
 *
 *   npm run qa:uc:all
 *   npm run qa:uc:all -- --base-url https://campus-placement-omega.vercel.app
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runApiSmokeForSlug } from './api-smoke.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../guided/config/use-case-runners.json'), 'utf8'),
);
const GUIDED = path.join(__dirname, '../guided/run-guided.mjs');

const DEFAULT_BASE =
  process.env.QA_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3000';
const PER_RUNNER_TIMEOUT_MS = Number(process.env.QA_UC_TIMEOUT_MS || 20 * 60 * 1000);

function parseArgs(argv) {
  const args = { baseUrl: DEFAULT_BASE, help: false, apiOnly: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--api-only') args.apiOnly = true;
    else if (a === '--base-url' || a === '-b') {
      args.baseUrl = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Run all ${MANIFEST.cases.length} use-case runners and print a report.

  npm run qa:uc:all [--base-url URL] [--api-only]

Default base URL: ${DEFAULT_BASE}
Per-runner timeout: ${PER_RUNNER_TIMEOUT_MS / 1000}s (QA_UC_TIMEOUT_MS to override)
`);
}

function formatDuration(ms) {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function runGuidedPlaybook(slug, playbook, baseUrl) {
  return new Promise((resolve) => {
    const started = Date.now();
    const output = [];
    const child = spawn(
      'node',
      [GUIDED, '--playbook', playbook, '--auto', '--no-voice', '--headless', '--base-url', baseUrl],
      { cwd: ROOT, shell: process.platform === 'win32' },
    );

    const onData = (chunk) => {
      const text = String(chunk);
      output.push(text);
      process.stdout.write(text);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        slug,
        playbook,
        status: 'TIMEOUT',
        exitCode: null,
        durationMs: Date.now() - started,
        error: `Exceeded ${PER_RUNNER_TIMEOUT_MS / 1000}s`,
        output: output.join(''),
      });
    }, PER_RUNNER_TIMEOUT_MS);

    child.on('exit', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - started;
      const text = output.join('');
      const actionErrors = (text.match(/\(action error:/g) || []).length;
      const finishedWithErrors = /finished with \d+ action error/i.test(text);
      let status = 'PASS';
      let error = '';
      if (code === null) status = 'FAIL';
      else if (code !== 0 || finishedWithErrors || actionErrors > 0) {
        status = 'FAIL';
        const errLine = text
          .split('\n')
          .reverse()
          .find((line) => /action error:|Error:|failed/i.test(line));
        error = errLine?.trim() || `exit code ${code}${actionErrors ? `, ${actionErrors} action error(s)` : ''}`;
      }
      resolve({
        slug,
        playbook,
        status,
        exitCode: code,
        durationMs,
        error,
        actionErrors,
        output: text,
      });
    });
  });
}

function printReport(results, baseUrl) {
  const passed = results.filter((r) => r.status === 'PASS');
  const failed = results.filter((r) => r.status === 'FAIL');
  const timedOut = results.filter((r) => r.status === 'TIMEOUT');
  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log('\n' + '='.repeat(72));
  console.log('USE-CASE RUNNER REPORT');
  console.log('='.repeat(72));
  console.log(`Base URL:  ${baseUrl}`);
  console.log(`Total:     ${results.length}`);
  console.log(`Passed:    ${passed.length}`);
  console.log(`Failed:    ${failed.length}`);
  console.log(`Timeout:   ${timedOut.length}`);
  console.log(`Duration:  ${formatDuration(totalMs)}`);
  console.log('='.repeat(72));

  console.log('\nResults:\n');
  console.log('Status   Duration  Slug');
  console.log('-'.repeat(72));
  for (const r of results) {
    const status = r.status.padEnd(8);
    const dur = formatDuration(r.durationMs).padEnd(9);
    console.log(`${status} ${dur} ${r.slug}`);
    if (r.error) console.log(`         └─ ${r.error}`);
  }

  if (failed.length || timedOut.length) {
    console.log('\nFailures detail:\n');
    for (const r of [...failed, ...timedOut]) {
      console.log(`• ${r.slug} (${r.playbook})`);
      console.log(`  ${r.error || 'Unknown error'}`);
    }
  }

  console.log('\n' + '='.repeat(72));
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const baseUrl = String(args.baseUrl).replace(/\/$/, '');
  console.log(`Running ${MANIFEST.cases.length} use-case runners against ${baseUrl}\n`);

  /** @type {Awaited<ReturnType<typeof runGuidedPlaybook>>[]} */
  const results = [];

  for (let i = 0; i < MANIFEST.cases.length; i += 1) {
    const entry = MANIFEST.cases[i];
    const playbook = entry.playbook || entry.slug;
    console.log(`\n[${i + 1}/${MANIFEST.cases.length}] ${entry.slug} → ${playbook}`);
    console.log('-'.repeat(72));

    if (args.apiOnly) {
      if (entry.slug !== 'guest-engagement' && entry.slug !== 'clarifications') {
        results.push({
          slug: entry.slug,
          playbook,
          status: 'SKIP',
          exitCode: 0,
          durationMs: 0,
          error: 'no API smoke runner',
          actionErrors: 0,
          output: '',
        });
        continue;
      }
      const apiStart = Date.now();
      const apiCode = await runApiSmokeForSlug(entry.slug, baseUrl);
      results.push({
        slug: entry.slug,
        playbook: `${playbook} (api-smoke)`,
        status: apiCode === 0 ? 'PASS' : 'FAIL',
        exitCode: apiCode,
        durationMs: Date.now() - apiStart,
        error: apiCode === 0 ? '' : 'API smoke failed',
        actionErrors: 0,
        output: '',
      });
      continue;
    }

    const result = await runGuidedPlaybook(entry.slug, playbook, baseUrl);
    results.push(result);
  }

  printReport(results, baseUrl);
  const hasFailure = results.some((r) => r.status === 'FAIL' || r.status === 'TIMEOUT');
  process.exit(hasFailure ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
