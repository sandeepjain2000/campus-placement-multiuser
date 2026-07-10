import fs from 'fs';
import path from 'path';

const prefixes = [
  'src/app/api/student',
  'src/app/api/employer',
  'src/app/api/college',
  'src/app/api/admin',
  'src/app/api/notifications',
  'src/app/api/user/data-export',
  'src/app/api/hiring-assessment',
  'src/app/api/demo',
];

const CONFIG_LINES = [
  "export const dynamic = 'force-dynamic';",
  'export const revalidate = 0;',
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name === 'route.js') files.push(p);
  }
  return files;
}

function findImportEnd(lines) {
  let inImport = false;
  let end = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*import\s/.test(line)) {
      inImport = true;
      end = i;
      if (/from\s+['"][^'"]+['"];?\s*$/.test(line)) inImport = false;
      continue;
    }
    if (inImport) {
      end = i;
      if (/from\s+['"][^'"]+['"];?\s*$/.test(line)) inImport = false;
    } else if (end > 0 && line.trim() !== '') {
      break;
    }
  }
  return end;
}

let fixed = 0;
for (const prefix of prefixes) {
  if (!fs.existsSync(prefix)) continue;
  for (const file of walk(prefix)) {
    let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

    lines = lines.filter(
      (l) =>
        l.trim() !== "export const dynamic = 'force-dynamic';" &&
        l.trim() !== 'export const revalidate = 0;',
    );

    const importEnd = findImportEnd(lines);
    lines.splice(importEnd + 1, 0, '', ...CONFIG_LINES, '');
    fs.writeFileSync(file, lines.join('\n'));
    fixed += 1;
  }
}

console.log(`Normalized ${fixed} route files`);
