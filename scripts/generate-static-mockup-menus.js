/**
 * One-off generator: reads src/config/dashboardMenu.js and writes mockup-menus.js
 */
const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../src/config/dashboardMenu.js');
const src = fs.readFileSync(srcPath, 'utf8');

function iconToKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

const roles = ['student', 'employer', 'college_admin', 'placement_committee', 'super_admin'];
const startIdx = src.indexOf('export const menuConfig = {');
const endIdx = src.indexOf('\n};', startIdx);
const block = src.slice(startIdx, endIdx + 3);

function extractRoleBlock(text, role) {
  const marker = `${role}: {`;
  const start = text.indexOf(marker);
  if (start < 0) return '';
  let depth = 0;
  for (let i = start + marker.length - 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return '';
}

function parseItems(itemsBlock) {
  const items = [];
  const itemBlocks = itemsBlock.match(/\{[\s\S]*?\}/g) || [];
  for (const ib of itemBlocks) {
    const idM = ib.match(/id:\s*'([^']+)'/);
    const labelM = ib.match(/label:\s*'((?:\\'|[^'])*)'/);
    const hrefM = ib.match(/href:\s*'([^']+)'/);
    const iconM = ib.match(/icon:\s*(\w+)/);
    if (!labelM || !hrefM) continue;
    items.push({
      id: idM ? idM[1] : hrefM[1],
      label: labelM[1].replace(/\\'/g, "'"),
      href: hrefM[1],
      icon: iconM ? iconToKebab(iconM[1]) : 'circle',
      disabled: /disabled:\s*true/.test(ib),
    });
  }
  return items;
}

const menus = {};
for (const role of roles) {
  const roleBlock = extractRoleBlock(block, role);
  if (!roleBlock) continue;

  const titleMatch = roleBlock.match(/title:\s*'([^']+)'/);
  const title = titleMatch ? titleMatch[1] : role;

  const sections = [];
  const sectionRe = /\{\s*id:\s*'([^']+)',\s*title:\s*'([^']+)',\s*items:\s*\[([\s\S]*?)\]\s*,?\s*\}/g;
  let sm;
  while ((sm = sectionRe.exec(roleBlock)) !== null) {
    const [, id, sectionTitle, itemsBlock] = sm;
    sections.push({ id, title: sectionTitle, items: parseItems(itemsBlock) });
  }

  menus[role] = { title, sections };
}

const outPath = path.join(__dirname, '../docs/static-mockups/mockup-menus.js');
const body = `/* Auto-generated from src/config/dashboardMenu.js — do not edit by hand */\nwindow.PLACEMENTHUB_MOCKUP_MENUS = ${JSON.stringify(menus, null, 2)};\n`;
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, body);

const cssSrc = path.join(__dirname, '../src/app/globals.css');
const cssDest = path.join(__dirname, '../docs/static-mockups/assets/placementhub-globals.css');
fs.mkdirSync(path.dirname(cssDest), { recursive: true });
fs.copyFileSync(cssSrc, cssDest);

const MENU_KEY_TO_FOLDER = {
  student: 'student',
  employer: 'employer',
  college_admin: 'college',
  placement_committee: 'placement-committee',
  super_admin: 'super-admin',
};

function hrefToSlug(href) {
  if (!href || href.startsWith('#')) {
    return (href || 'placeholder').replace(/^#/, 'hash-').replace(/[^a-zA-Z0-9-]/g, '-');
  }
  return href
    .replace(/^\//, '')
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function pageHtmlTemplate(profileKey, href, label) {
  const safeLabel = label.replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const safeHref = href.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PlacementHub — ${safeLabel} (static mockup)</title>
    <link rel="stylesheet" href="../../assets/placementhub-globals.css" />
    <link rel="stylesheet" href="../../assets/placementhub-mockup.css" />
    <script src="https://unpkg.com/lucide@0.487.0/dist/umd/lucide.min.js" defer></script>
  </head>
  <body data-mockup-role="${profileKey}" data-mockup-href="${safeHref}">
    <div id="app-root"></div>
    <script src="../../mockup-menus.js"></script>
    <script src="../../mockup-data.js"></script>
    <script src="../../mockup-app.js"></script>
  </body>
</html>
`;
}

/** Full-screen mega-menu hub (role Home / landing) — no data-mockup-href so mockup-app renders the hub. */
function landingHtmlTemplate(profileKey, label) {
  const safeLabel = label.replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PlacementHub — ${safeLabel} Home (static mockup)</title>
    <link rel="stylesheet" href="../../assets/placementhub-globals.css" />
    <link rel="stylesheet" href="../../assets/placementhub-mockup.css" />
    <script src="https://unpkg.com/lucide@0.487.0/dist/umd/lucide.min.js" defer></script>
  </head>
  <body data-mockup-role="${profileKey}" data-mockup-landing="1">
    <div id="app-root"></div>
    <script src="../../mockup-menus.js"></script>
    <script src="../../mockup-data.js"></script>
    <script src="../../mockup-app.js"></script>
  </body>
</html>
`;
}

function rootEntryHtmlTemplate(profileKey, label) {
  const safeLabel = label.replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PlacementHub — ${safeLabel} Home (static mockup)</title>
    <link rel="stylesheet" href="assets/placementhub-globals.css" />
    <link rel="stylesheet" href="assets/placementhub-mockup.css" />
    <script src="https://unpkg.com/lucide@0.487.0/dist/umd/lucide.min.js" defer></script>
  </head>
  <body data-mockup-role="${profileKey}" data-mockup-landing="1">
    <div id="app-root"></div>
    <script src="mockup-menus.js"></script>
    <script src="mockup-data.js"></script>
    <script src="mockup-app.js"></script>
  </body>
</html>
`;
}

/** Live ROLE_HOME_PATHS — used for landing file aliases under pages/. */
const ROLE_HOME_HREFS = {
  student: '/dashboard/student',
  employer: '/dashboard/employer',
  college_admin: '/dashboard/college',
  // Live app shares /dashboard/college; mockup also keeps a role-specific alias.
  placement_committee: '/dashboard/college',
  super_admin: '/dashboard/admin',
};

const ROLE_LANDING_LABELS = {
  student: 'Student',
  employer: 'Employer',
  college_admin: 'College Admin',
  placement_committee: 'Placement Committee',
  super_admin: 'Super Admin',
};

const FOLDER_TO_ROOT_FILE = {
  student: 'student.html',
  employer: 'employer.html',
  college: 'college.html',
  'placement-committee': 'placement-committee.html',
  'super-admin': 'super-admin.html',
};

let pageCount = 0;
let landingCount = 0;
const mockupsRoot = path.join(__dirname, '../docs/static-mockups');
for (const [menuKey, menu] of Object.entries(menus)) {
  const folderKey = MENU_KEY_TO_FOLDER[menuKey];
  if (!folderKey) continue;
  const dir = path.join(mockupsRoot, 'pages', folderKey);
  fs.mkdirSync(dir, { recursive: true });
  const written = new Set();
  for (const section of menu.sections) {
    for (const item of section.items) {
      if (item.disabled || item.href.startsWith('#')) continue;
      const slug = hrefToSlug(item.href);
      if (written.has(slug)) continue;
      written.add(slug);
      fs.writeFileSync(path.join(dir, `${slug}.html`), pageHtmlTemplate(folderKey, item.href, item.label), 'utf8');
      pageCount++;
    }
  }

  // Role Home / landing pages (mega-menu hub) — were previously only at docs/static-mockups/{role}.html
  const landingLabel = ROLE_LANDING_LABELS[menuKey] || folderKey;
  const landingHtml = landingHtmlTemplate(folderKey, landingLabel);
  const landingNames = ['home.html', 'landing.html'];
  // Placement committee also gets a role-specific alias (live path is shared with college).
  if (menuKey === 'placement_committee') {
    landingNames.push('dashboard-placement-committee.html');
  }
  const homeHref = ROLE_HOME_HREFS[menuKey];
  if (homeHref) {
    const homeSlug = hrefToSlug(homeHref);
    // Only add ROLE_HOME path alias when it does not collide with an inner menu screen.
    if (homeSlug && !written.has(homeSlug)) {
      landingNames.push(`${homeSlug}.html`);
    }
  }
  for (const name of landingNames) {
    fs.writeFileSync(path.join(dir, name), landingHtml, 'utf8');
    landingCount++;
  }

  const rootFile = FOLDER_TO_ROOT_FILE[folderKey];
  if (rootFile) {
    fs.writeFileSync(path.join(mockupsRoot, rootFile), rootEntryHtmlTemplate(folderKey, landingLabel), 'utf8');
  }
}

const indexHtml = `<!DOCTYPE html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PlacementHub — Static mockups</title>
    <link rel="stylesheet" href="assets/placementhub-globals.css" />
    <link rel="stylesheet" href="assets/placementhub-mockup.css" />
    <style>
      .mockup-index { max-width: 52rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
      .mockup-index h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
      .mockup-index .lede { color: var(--text-secondary); margin: 0 0 1.75rem; line-height: 1.55; }
      .mockup-index-grid { display: grid; gap: 0.85rem; }
      .mockup-index-card {
        display: flex; flex-direction: column; gap: 0.35rem;
        padding: 1rem 1.15rem; border: 1px solid var(--border-default);
        border-radius: var(--radius-lg); background: var(--bg-primary); text-decoration: none; color: inherit;
      }
      .mockup-index-card:hover { border-color: var(--primary-300); background: var(--bg-secondary); }
      .mockup-index-card strong { font-size: 1rem; }
      .mockup-index-card span { font-size: 0.8125rem; color: var(--text-tertiary); }
      .mockup-index-card em { font-style: normal; font-size: 0.75rem; color: var(--text-link); font-weight: 600; }
    </style>
  </head>
  <body>
    <main class="mockup-index">
      <h1>PlacementHub static mockups</h1>
      <p class="lede">Open a <strong>role Home / landing</strong> page (full-screen mega-menu hub). Inner screens live under <code>pages/{role}/</code>.</p>
      <div class="mockup-index-grid">
        <a class="mockup-index-card" href="employer.html"><strong>Employer Home</strong><span>Mega-menu landing · TechCorp Solutions</span><em>employer.html · pages/employer/home.html</em></a>
        <a class="mockup-index-card" href="student.html"><strong>Student Home</strong><span>Mega-menu landing</span><em>student.html · pages/student/home.html</em></a>
        <a class="mockup-index-card" href="college.html"><strong>College Admin Home</strong><span>Mega-menu landing</span><em>college.html · pages/college/home.html</em></a>
        <a class="mockup-index-card" href="placement-committee.html"><strong>Placement Committee Home</strong><span>Mega-menu landing (read-only subset)</span><em>placement-committee.html · pages/placement-committee/home.html</em></a>
        <a class="mockup-index-card" href="super-admin.html"><strong>Super Admin Home</strong><span>Platform operations hub</span><em>super-admin.html · pages/super-admin/home.html</em></a>
      </div>
    </main>
  </body>
</html>
`;
fs.writeFileSync(path.join(mockupsRoot, 'index.html'), indexHtml, 'utf8');

console.log('Wrote', outPath, Object.keys(menus).map((k) => `${k}:${menus[k].sections.length} sections`).join(', '));
console.log('Synced', cssDest);
console.log('Generated', pageCount, 'screen HTML files +', landingCount, 'landing aliases under docs/static-mockups/pages/');
console.log('Wrote index.html and refreshed role root entry HTML files');
