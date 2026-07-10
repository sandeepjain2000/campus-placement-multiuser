#!/usr/bin/env node
/**
 * Runs a command with stdout/stderr copied to campus-placement/logs/run-<timestamp>.log
 *
 * Usage:
 *   node scripts/run-with-log.mjs -- npm run build
 *   node scripts/run-with-log.mjs -- npx vercel --prod
 *   node scripts/run-with-log.mjs -- npm run verify:aws
 */
import { spawn } from 'child_process';
import { mkdirSync, createWriteStream } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const logsDir = join(root, 'logs');
mkdirSync(logsDir, { recursive: true });

let argv = process.argv.slice(2);
if (argv[0] === '--') argv = argv.slice(1);
if (!argv.length) {
  console.error('Usage: node scripts/run-with-log.mjs [--] <command> [args...]');
  console.error('Logs are written under: campus-placement/logs/run-<timestamp>.log');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = join(logsDir, `run-${stamp}.log`);
const log = createWriteStream(logPath, { flags: 'a' });
const header = `# ${new Date().toISOString()}\n# cwd: ${root}\n# ${argv.join(' ')}\n\n`;
log.write(header);

const child = spawn(argv[0], argv.slice(1), {
  cwd: root,
  env: process.env,
  shell: process.platform === 'win32',
  stdio: ['inherit', 'pipe', 'pipe'],
});

child.stdout?.on('data', (d) => {
  process.stdout.write(d);
  log.write(d);
});
child.stderr?.on('data', (d) => {
  process.stderr.write(d);
  log.write(d);
});
child.on('error', (err) => {
  log.write(`\n[spawn error] ${err.message}\n`);
  console.error(err);
  log.end();
  process.exit(1);
});
child.on('close', (code, signal) => {
  log.write(`\n# exit ${code}${signal ? ` signal ${signal}` : ''}\n`);
  log.end();
  console.error(`\n[run-with-log] ${logPath}`);
  process.exit(code === null ? 1 : code);
});
