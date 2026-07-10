import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src/app');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (
      /page\.(js|jsx)$/.test(ent.name) ||
      /^(dt_|mb_|Desktop|Mobile)[A-Za-z]+\.(js|jsx)$/.test(ent.name)
    ) {
      out.push(p);
    }
  }
  return out;
}

const routes = [
  ...walk(path.join(ROOT, 'dashboard')),
  ...walk(path.join(ROOT, 'data-entry')),
];

const SEARCH_PAT =
  /placeholder\s*=\s*["'][^"']*[Ss]earch|setSearch|searchQuery|studentReportSearch|Search by|Search student|Search company|filterQuery/i;
const FILTER_PAT =
  /filter(Status|Type|Mode|Role|Tab)|statusFilter|setFilter|activeFilter|Filter:|All \(|useStudentListFilters|StudentListFiltersPanel/i;
const TABLE_PAT = /<table[\s>]|table-responsive|role="table"/i;

const devContent = fs.readFileSync('src/config/devScreenIds.js', 'utf8');
const routeLines = [...devContent.matchAll(/'(\/[^']+)'/g)].map((m, i) => ({
  path: m[1],
  id: `S-${i + 1}`,
}));

function screenId(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  let href = null;
  const m = norm.match(/src\/app\/(dashboard\/[^/]+(?:\/[^/]+)*)\/page\.js/);
  if (m) href = `/${m[1]}`;
  else {
    const m2 = norm.match(/src\/app\/(dashboard\/[^/]+\/[^/]+)\//);
    if (m2) href = `/${m2[1]}`;
  }
  if (!href) {
    const m3 = norm.match(/src\/app\/(data-entry\/[^/]+)/);
    if (m3) href = `/${m3[1]}`;
  }
  if (!href) return null;
  const sorted = [...routeLines].sort((a, b) => b.path.length - a.path.length);
  for (const row of sorted) {
    if (href === row.path || href.startsWith(`${row.path}/`)) return row.id;
  }
  return href;
}

function labelFor(filePath) {
  const id = screenId(filePath);
  const row = routeLines.find((r) => r.id === id);
  return { id: id || '?', path: row?.path || '', file: filePath.replace(/\\/g, '/') };
}

const results = [];
for (const file of routes.sort()) {
  const content = fs.readFileSync(file, 'utf8');
  if (!TABLE_PAT.test(content)) continue;
  const hasSearch = SEARCH_PAT.test(content);
  const hasFilter = FILTER_PAT.test(content);
  results.push({ ...labelFor(file), hasSearch, hasFilter, noBoth: !hasSearch && !hasFilter });
}

const byScreen = new Map();
for (const r of results) {
  const key = r.id;
  if (!byScreen.has(key)) byScreen.set(key, r);
  else {
    const ex = byScreen.get(key);
    ex.hasSearch = ex.hasSearch || r.hasSearch;
    ex.hasFilter = ex.hasFilter || r.hasFilter;
    ex.noBoth = !ex.hasSearch && !ex.hasFilter;
    ex.file += `; ${r.file}`;
  }
}

const merged = [...byScreen.values()].sort((a, b) => {
  const na = parseInt((a.id || 'S-0').replace('S-', ''), 10);
  const nb = parseInt((b.id || 'S-0').replace('S-', ''), 10);
  return na - nb;
});

console.log('=== No search AND no filter (tabular) ===');
for (const r of merged.filter((x) => x.noBoth)) {
  console.log(`${r.id}\t${r.path}\t${r.file}`);
}

console.log('\n=== Has search, no filter (tabular) ===');
for (const r of merged.filter((x) => x.hasSearch && !x.hasFilter)) {
  console.log(`${r.id}\t${r.path}`);
}

console.log('\n=== Has filter, no search (tabular) ===');
for (const r of merged.filter((x) => !x.hasSearch && x.hasFilter)) {
  console.log(`${r.id}\t${r.path}`);
}
