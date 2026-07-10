/**
 * Find React components that reference a useState variable before its declaration (TDZ crash).
 * Ignores string literals and comments so URL paths like "/api/college/rules" do not false-positive.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(import.meta.dirname, '..', 'src');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules') walk(p, out);
    else if (/\.(jsx|js)$/.test(ent.name)) out.push(p);
  }
  return out;
}

/** Strip strings, template literals, and comments for identifier analysis. */
function stripLiterals(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '/' && next === '/') {
      i += 2;
      while (i < src.length && src[i] !== '\n') i++;
      out += ' ';
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < src.length - 1 && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      out += ' ';
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      out += ' ';
      continue;
    }
    if (ch === '`') {
      i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === '`') {
          i++;
          break;
        }
        if (src[i] === '$' && src[i + 1] === '{') {
          i += 2;
          let depth = 1;
          while (i < src.length && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            i++;
          }
          continue;
        }
        i++;
      }
      out += ' ';
      continue;
    }

    out += ch;
    i++;
  }
  return out;
}

function scanFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const fnRe = /export default function (\w+)\([^)]*\)\s*\{/g;
  let m;
  const issues = [];
  while ((m = fnRe.exec(src))) {
    const fnStart = m.index + m[0].length;
    const fnName = m[1];
    let depth = 1;
    let i = fnStart;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.slice(fnStart, i - 1);
    const strippedBody = stripLiterals(body);
    const stateVars = [];
    const stateRe = /const \[(\w+),\s*set\w+\]\s*=\s*useState/g;
    let sm;
    while ((sm = stateRe.exec(strippedBody))) {
      stateVars.push({ name: sm[1], index: sm.index });
    }
    for (const { name, index: declIndex } of stateVars) {
      const before = strippedBody.slice(0, declIndex);
      const refRe = new RegExp(`\\b${name}\\b`, 'g');
      let rm;
      while ((rm = refRe.exec(before))) {
        issues.push({ fnName, stateVar: name, file: filePath });
        break;
      }
    }
  }
  return issues;
}

const files = walk(ROOT);
const all = [];
for (const f of files) {
  all.push(...scanFile(f));
}

if (!all.length) {
  console.log('OK: no useState TDZ issues found');
  process.exit(0);
}

console.log(`FOUND ${all.length} use-before-init issue(s):\n`);
for (const i of all) {
  console.log(`  ${path.relative(path.join(import.meta.dirname, '..'), i.file)}`);
  console.log(`    ${i.fnName}: "${i.stateVar}" used before useState\n`);
}
process.exit(1);
