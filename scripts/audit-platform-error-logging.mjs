/**
 * Audit API routes for withApiHandlers platform error logging.
 * Usage: node scripts/audit-platform-error-logging.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const apiRoot = path.join(root, 'src', 'app', 'api');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (e.name === 'route.js') files.push(full);
  }
  return files;
}

const routes = walk(apiRoot);
const wired = [];
const aliases = [];
const optedOut = [];
const missing = [];

for (const file of routes) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const src = fs.readFileSync(file, 'utf8');

  if (src.includes('@no-platform-error-wrap')) {
    optedOut.push(rel);
    continue;
  }

  if (src.includes('withApiHandlers') || src.includes('__platformApiHandlers')) {
    wired.push(rel);
    continue;
  }

  // Re-export from a wrapped sibling route (e.g. college/overview → college/dashboard).
  if (/export\s*\{[^}]*\}\s*from\s+['"]/.test(src) && !/export\s+async\s+function/.test(src)) {
    aliases.push(rel);
    continue;
  }

  missing.push(rel);
}

console.log('Platform error logging audit (all API routes)\n');
console.log(`Wrapped (${wired.length}):`);
for (const r of wired.sort()) console.log(`  ✓ ${r}`);
if (aliases.length) {
  console.log(`\nRe-exports wrapped handler (${aliases.length}):`);
  for (const r of aliases.sort()) console.log(`  ↪ ${r}`);
}
if (optedOut.length) {
  console.log(`\nOpted out (${optedOut.length}):`);
  for (const r of optedOut.sort()) console.log(`  ⊘ ${r}`);
}
console.log(`\nMissing wrapper (${missing.length}):`);
for (const r of missing.sort()) console.log(`  ✗ ${r}`);
process.exit(missing.length > 0 ? 1 : 0);
