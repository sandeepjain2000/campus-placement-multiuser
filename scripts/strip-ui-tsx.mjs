import fs from 'fs';
import path from 'path';

const srcRoot = path.resolve(
  '../admincn-free/shadcn-nextjs-admincn-admin-template-free-1.0.0/src/components/ui'
);
const dstRoot = path.resolve('src/components/ui');
const files = [
  'button.tsx',
  'input.tsx',
  'textarea.tsx',
  'card.tsx',
  'label.tsx',
  'separator.tsx',
  'field.tsx',
  'input-group.tsx',
  'tabs.tsx',
  'badge.tsx',
];

function stripTs(t) {
  t = t.replace(/import \{ cva, type VariantProps \} from 'class-variance-authority'/g, "import { cva } from 'class-variance-authority'");
  t = t.replace(/, type VariantProps \} from 'class-variance-authority'/g, " } from 'class-variance-authority'");
  t = t.replace(/import \{ clsx, type ClassValue \} from 'clsx'/g, "import { clsx } from 'clsx'");
  // Drop standalone type aliases
  t = t.replace(/^type [A-Za-z0-9_]+ = .+$/gm, '');
  // Function param closing with type annotation: }: Foo) {
  t = t.replace(/\}: [^=\n]+?(?=\) \{)/g, '}');
  t = t.replace(/\}: [^=\n]+?(?=\)\s*\{)/g, '}');
  // Simple param types like `type,` already handled by ?:/:
  t = t.replace(/\?: [A-Za-z0-9_.'"|\[\] <>,]+(?=[,)])/g, '');
  t = t.replace(/: React\.ComponentProps<'[^']+'>/g, '');
  t = t.replace(/: React\.ComponentProps<typeof [^>]+>/g, '');
  t = t.replace(/ & VariantProps<typeof [A-Za-z0-9_]+>/g, '');
  t = t.replace(/: VariantProps<typeof [A-Za-z0-9_]+>/g, '');
  t = t.replace(/: ButtonPrimitive\.Props/g, '');
  t = t.replace(/: SeparatorPrimitive\.Props/g, '');
  t = t.replace(/: TabsPrimitive\.[A-Za-z.]+/g, '');
  t = t.replace(/: Omit<[^>]+>/g, '');
  t = t.replace(/: useRender\.ComponentProps<'span'>/g, '');
  t = t.replace(/mergeProps<'span'>/g, 'mergeProps');
  t = t.replace(/\(e as HTMLElement\)/g, '(e)');
  t = t.replace(/ as HTMLElement/g, '');
  t = t.replace(/: 'button' \| 'submit' \| 'reset'/g, '');
  t = t.replace(/Array<\{ message\?: string \} \| undefined>/g, '');
  t = t.replace(/: React\.ReactNode/g, '');
  // leftover lonely type fragments on param lines like `className,` OK
  // Remove leftover `: FooBar` after identifiers before `=` is dangerous — skip
  return t;
}

for (const f of files) {
  const raw = fs.readFileSync(path.join(srcRoot, f), 'utf8');
  const out = stripTs(raw);
  const dest = path.join(dstRoot, f.replace(/\.tsx$/, '.jsx'));
  fs.writeFileSync(dest, out);
  // quick sanity: no remaining ": VariantProps" or "type VariantProps"
  const suspects = out.match(/: (VariantProps|React\.|ButtonPrimitive|useRender)/g);
  console.log(f, '->', path.basename(dest), suspects ? `WARN ${suspects.join(',')}` : 'ok');
}
