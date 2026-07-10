/**
 * Wrap App Router API route handlers with withApiHandlers for platform error logging.
 * Usage: node scripts/wire-api-error-logging.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const apiRoot = path.join(root, 'src', 'app', 'api');
const dryRun = process.argv.includes('--dry-run');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/**
 * Routes that MUST NOT be wrapped with withApiHandlers.
 * NextAuth returns redirects, CSRF tokens, HTML — not standard JSON.
 * Wrapping these routes causes the "double login" bug.
 * See: src/app/api/auth/AUTH_ROUTES_README.md
 */
const EXCLUDED_ROUTES = [
  'src/app/api/auth/[...nextauth]/route.js',
];

function isExcluded(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  return EXCLUDED_ROUTES.some((ex) => rel === ex || rel.endsWith(ex));
}

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


function inferContext(relPath) {
  let p = relPath
    .replace(/^src\/app\/api\//, '')
    .replace(/\\/g, '/')
    .replace(/\/route\.js$/, '');
  p = p.replace(/\[[^\]]+\]/g, 'id');
  const slug = p.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  const key = `api_${slug || 'root'}`;
  return key.length <= 80 ? key : key.slice(0, 80);
}

function wireFile(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  let src = fs.readFileSync(filePath, 'utf8');

  if (isExcluded(filePath)) {
    return { rel, status: 'skip', reason: 'excluded (auth critical path)' };
  }
  if (src.includes('withApiHandlers') || src.includes('__platformApiHandlers')) {
    return { rel, status: 'skip', reason: 'already wrapped' };
  }
  if (src.includes('@no-platform-error-wrap')) {
    return { rel, status: 'skip', reason: 'opted out' };
  }

  const methodsFound = [];
  let updated = src;

  for (const method of METHODS) {
    const re = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`);
    if (re.test(updated)) {
      updated = updated.replace(re, `async function __platform_${method}(`);
      methodsFound.push(method);
    }
  }

  if (!methodsFound.length) {
    return { rel, status: 'skip', reason: 'no export async handlers' };
  }

  if (!updated.includes('withApiHandlers') && !updated.includes('__platformApiHandlers')) {
    // This should never be reached due to the check at the top, but keeping logic consistent.
  }

  const importRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@\/lib\/platformErrorRoute['"];?/;
  const match = updated.match(importRegex);
  
  if (match) {
      if (!match[1].includes('withApiHandlers')) {
          updated = updated.replace(importRegex, `import { $1, withApiHandlers } from '@/lib/platformErrorRoute';`);
      }
  } else {
    const importLine = "import { withApiHandlers } from '@/lib/platformErrorRoute';\n";
    const exportDynamic = updated.match(/^export const dynamic/m);
    if (exportDynamic) {
      updated = updated.replace(/^(export const dynamic[^\n]*\n)/m, `$1${importLine}`);
    } else {
      updated = importLine + updated;
    }
  }

  const context = inferContext(rel);
  const handlerEntries = methodsFound.map((m) => `  ${m}: __platform_${m},`).join('\n');
  const exportLines = methodsFound.map((m) => `export const ${m} = __platformApiHandlers.${m};`).join('\n');

  updated += `

const __platformApiHandlers = withApiHandlers({
${handlerEntries}
}, { context: '${context}' });
${exportLines}
`;

  if (!dryRun) {
    fs.writeFileSync(filePath, updated, 'utf8');
  }

  return { rel, status: 'wired', methods: methodsFound, context };
}

const files = walk(apiRoot);
const results = files.map(wireFile);
const wired = results.filter((r) => r.status === 'wired');
const skipped = results.filter((r) => r.status === 'skip');

console.log(`Platform error logging wire${dryRun ? ' (dry-run)' : ''}\n`);
console.log(`Wired: ${wired.length}`);
for (const r of wired) console.log(`  + ${r.rel} [${r.methods.join(', ')}] → ${r.context}`);
console.log(`\nSkipped: ${skipped.length}`);
if (process.env.VERBOSE) {
  for (const r of skipped) console.log(`  - ${r.rel}: ${r.reason}`);
}

process.exit(0);
