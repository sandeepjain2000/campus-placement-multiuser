import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(
  __dirname,
  '../../admincn-free/shadcn-nextjs-admincn-admin-template-free-1.0.0/src/components/ui'
);
const dstRoot = path.resolve(__dirname, '../src/components/ui');

const files = [
  'dialog',
  'alert',
  'table',
  'button',
  'card',
  'badge',
  'field',
  'input-group',
  'tabs',
  'separator',
  'label',
  'input',
  'textarea',
];

function classStrings(t) {
  return [...t.matchAll(/'([^']+)'/g)]
    .map((m) => m[1])
    .filter((s) => s.includes(' ') && /(bg-|text-|flex|grid|rounded|shadow|ring|data-|gap-|p-|m-)/.test(s));
}

function tsLeftovers(t) {
  const hits = [];
  if (/\} & \{/.test(t)) hits.push('intersection remnant');
  if (/VariantProps/.test(t)) hits.push('VariantProps');
  if (/React\.ComponentProps/.test(t)) hits.push('React.ComponentProps');
  if (/: DialogPrimitive\./.test(t)) hits.push('DialogPrimitive type');
  if (/\?: [A-Za-z]/.test(t)) hits.push('optional prop type');
  if (/^type /m.test(t)) hits.push('type alias');
  return hits;
}

for (const name of files) {
  const srcPath = path.join(srcRoot, `${name}.tsx`);
  const dstPath = path.join(dstRoot, `${name}.jsx`);
  if (!fs.existsSync(srcPath) || !fs.existsSync(dstPath)) {
    console.log(name, 'MISSING', fs.existsSync(srcPath) ? 'dst' : 'src');
    continue;
  }
  const src = fs.readFileSync(srcPath, 'utf8');
  const dst = fs.readFileSync(dstPath, 'utf8');
  const srcC = classStrings(src);
  const dstC = classStrings(dst);
  const missing = srcC.filter((c) => !dstC.includes(c));
  const extra = dstC.filter((c) => !srcC.includes(c));
  const leftovers = tsLeftovers(dst);
  console.log(`=== ${name}`);
  console.log(`  ts leftovers: ${leftovers.length ? leftovers.join(', ') : 'none'}`);
  console.log(`  missing class strings: ${missing.length}`);
  for (const c of missing.slice(0, 4)) console.log(`   - ${c.slice(0, 120)}`);
  console.log(`  extra class strings: ${extra.length}`);
  for (const c of extra.slice(0, 4)) console.log(`   + ${c.slice(0, 120)}`);
}
