#!/usr/bin/env node
/**
 * Purge internships/drives, then run feature + recent-fix verification runners.
 *   npm run qa:purge-and-test
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
  });
}

async function main() {
  console.log('\n=== Step 1: Purge internships & drives ===\n');
  await run('npm', ['run', 'qa:purge:internships-drives']);

  console.log('\n=== Step 2: Feature verification ===\n');
  await run('npm', ['run', 'qa:verify:features']);

  console.log('\n=== Step 3: Recent-fix verification ===\n');
  await run('npm', ['run', 'qa:verify:recent-fixes']);

  console.log('\n=== Step 4: Internship publish playbook (auto) ===\n');
  await run('node', [
    'qa/runners/guided/run-guided.mjs',
    '--playbook',
    'internships-employer-publish',
    '--auto',
    '--no-voice',
  ]);

  console.log('\n✓ Purge and test run complete.\n');
}

main().catch((e) => {
  console.error('\nPurge-and-test failed:', e.message);
  process.exit(1);
});
