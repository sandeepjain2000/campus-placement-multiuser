import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(
  __dirname,
  '../../admincn-free/shadcn-nextjs-admincn-admin-template-free-1.0.0/src/components/ui'
);
const dstRoot = path.resolve(__dirname, '../src/components/ui');

const files = process.argv.slice(2).length
  ? process.argv.slice(2).map((f) => (f.endsWith('.tsx') ? f : `${f}.tsx`))
  : [
      'dialog.tsx',
      'alert.tsx',
      'table.tsx',
      'button.tsx',
      'card.tsx',
      'badge.tsx',
      'input-group.tsx',
      'field.tsx',
      'tabs.tsx',
      'separator.tsx',
      'label.tsx',
      'input.tsx',
      'textarea.tsx',
      'select.tsx',
      'checkbox.tsx',
      'radio-group.tsx',
      'popover.tsx',
    ];

/**
 * Keep structure and classNames identical; strip TypeScript only for Babel (JS app).
 */
function stripTypesOnly(t) {
  t = t.replace(
    /import \{ cva, type VariantProps \} from 'class-variance-authority'/g,
    "import { cva } from 'class-variance-authority'"
  );
  t = t.replace(/, type VariantProps \} from 'class-variance-authority'/g, " } from 'class-variance-authority'");

  // Multiline param type annotations: `}: SomeType) {` / `}: A & { ... }) {`
  t = t.replace(/\}:[\s\S]*?(?=\)\s*\{)/g, '}');

  // Single-line `: Type` on function params / spreads already cleared by above for complexes
  t = t.replace(/: DialogPrimitive\.[A-Za-z.]+/g, '');
  t = t.replace(/: React\.ComponentProps<'[^']+'>/g, '');
  t = t.replace(/: React\.ComponentProps<typeof [^>]+>/g, '');
  t = t.replace(/ & VariantProps<typeof [^>]+>/g, '');
  t = t.replace(/: VariantProps<typeof [^>]+>/g, '');
  t = t.replace(/Omit<React\.ComponentProps<typeof [^>]+>,\s*'[^']+'\s*\|\s*'[^']+'>/g, '');
  t = t.replace(/\?: [A-Za-z0-9_.'"|\[\] <>,]+(?=[,)])/g, '');
  t = t.replace(/^type [A-Za-z0-9_]+ = .+$/gm, '');

  // Casts — protect import aliases (`Select as SelectPrimitive`) before stripping ` as Type`
  const protectedImports = [];
  t = t.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"]/g, (m) => {
    protectedImports.push(m);
    return `__PROTECTED_IMPORT_${protectedImports.length - 1}__`;
  });
  t = t.replace(/\(e\.target as HTMLElement\)/g, 'e.target');
  t = t.replace(/ as [A-Za-z0-9_.<|'>\s]+(?=[,;)\]}])/g, '');
  t = t.replace(/__PROTECTED_IMPORT_(\d+)__/g, (_, i) => protectedImports[Number(i)]);

  // Clean empty lines left by type removals (keep max one blank)
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

function classStrings(t) {
  return [...t.matchAll(/className=\{cn\(\s*'([^']+)'/g)].map((m) => m[1]).concat(
    [...t.matchAll(/className=\{cn\(\s*"([^"]+)"/g)].map((m) => m[1]),
    [...t.matchAll(/cva\(\s*'([^']+)'/g)].map((m) => m[1]),
    [...t.matchAll(/cva\(\s*"([^"]+)"/g)].map((m) => m[1])
  );
}

for (const f of files) {
  const srcPath = path.join(srcRoot, f);
  if (!fs.existsSync(srcPath)) {
    console.error('missing source', f);
    continue;
  }
  const raw = fs.readFileSync(srcPath, 'utf8');
  const out = stripTypesOnly(raw);
  const dest = path.join(dstRoot, f.replace(/\.tsx$/, '.jsx'));

  // Bail if strip left obvious TS remnants
  const leftovers = [];
  if (/\} & \{/.test(out)) leftovers.push('intersection');
  if (/VariantProps/.test(out)) leftovers.push('VariantProps');
  if (/React\.ComponentProps/.test(out)) leftovers.push('ComponentProps');
  if (/:\s*DialogPrimitive\./.test(out)) leftovers.push('DialogPrimitive type');
  if (leftovers.length) {
    console.error('ABORT', f, 'leftovers:', leftovers.join(', '));
    continue;
  }

  const beforeClasses = new Set(classStrings(raw));
  const afterClasses = new Set(classStrings(out));
  const missing = [...beforeClasses].filter((c) => !afterClasses.has(c));
  if (missing.length) {
    console.error('ABORT', f, 'lost className strings:', missing.slice(0, 3));
    continue;
  }

  fs.writeFileSync(dest, out);
  console.log('synced', f, '→', path.basename(dest));
}
