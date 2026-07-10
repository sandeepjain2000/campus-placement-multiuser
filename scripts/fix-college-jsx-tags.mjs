import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src/app/dashboard/college');

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name === 'page.js') fix(p);
  }
}

function pascalDesktop(tag) {
  const base = tag.replace(/^dt_/, '');
  return base.charAt(0).toUpperCase() + base.slice(1) + 'Desktop';
}

function pascalMobile(tag) {
  const base = tag.replace(/^mb_/, '');
  return base.charAt(0).toUpperCase() + base.slice(1) + 'Mobile';
}

function fix(file) {
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes('ResponsiveWrapper')) return;
  const orig = s;

  s = s.replace(/import dt_([A-Za-z0-9_]+) from '(\.\/dt_[^']+)';/g, (_, base, mod) => {
    const name = base.charAt(0).toUpperCase() + base.slice(1) + 'Desktop';
    return `import ${name} from '${mod}';`;
  });
  s = s.replace(/import mb_([A-Za-z0-9_]+) from '(\.\/mb_[^']+)';/g, (_, base, mod) => {
    const name = base.charAt(0).toUpperCase() + base.slice(1) + 'Mobile';
    return `import ${name} from '${mod}';`;
  });
  s = s.replace(/desktopView=\{<(dt_[A-Za-z0-9_]+) \/>}/g, (_, tag) => {
    return `desktopView={<${pascalDesktop(tag)} />}`;
  });
  s = s.replace(/mobileView=\{<(mb_[A-Za-z0-9_]+) \/>}/g, (_, tag) => {
    return `mobileView={<${pascalMobile(tag)} />}`;
  });

  if (s !== orig) {
    fs.writeFileSync(file, s);
    console.log('fixed', path.relative(process.cwd(), file));
  }
}

walk(root);
