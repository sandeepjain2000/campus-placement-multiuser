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
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
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

let pageCount = 0;
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
}
console.log('Wrote', outPath, Object.keys(menus).map((k) => `${k}:${menus[k].sections.length} sections`).join(', '));
console.log('Synced', cssDest);
console.log('Generated', pageCount, 'screen HTML files under docs/static-mockups/pages/');
