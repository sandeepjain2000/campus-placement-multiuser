#!/usr/bin/env node
/**
 * Regenerate qa/routes-by-role.js from src/config/dashboardMenu.js.
 * Used by blank-screens tests and QA runners — run after menu changes.
 *
 *   npm run qa:sync-routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { menuConfig } from '../src/config/dashboardMenu.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'qa', 'routes-by-role.js');

const SHARED = [
  { label: 'Alerts', href: '/dashboard/alerts' },
  { label: 'Feedback', href: '/dashboard/feedback' },
  { label: 'My data export', href: '/dashboard/my-exports' },
];

const ROLE_HOME_PATH = {
  student: '/dashboard/student',
  employer: '/dashboard/employer',
  college_admin: '/dashboard/college',
  super_admin: '/dashboard/admin',
};

function dedupe(routes) {
  const seen = new Set();
  return routes.filter((r) => {
    if (seen.has(r.href)) return false;
    seen.add(r.href);
    return true;
  });
}

function buildRoutesForRole(role) {
  const cfg = menuConfig[role];
  if (!cfg) return [];
  const home = ROLE_HOME_PATH[role];
  const routes = [{ label: 'Hub', href: home, hub: true }];
  for (const sec of cfg.sections || []) {
    for (const item of sec.items || []) {
      if (!item.href) continue;
      routes.push({ label: item.label, href: item.href });
    }
  }
  if (role !== 'super_admin') {
    routes.push(...SHARED);
  }
  return dedupe(routes);
}

function formatRoutes(name, routes) {
  const lines = routes.map((r) => {
    const hub = r.hub ? ', hub: true' : '';
    return `  { label: ${JSON.stringify(r.label)}, href: ${JSON.stringify(r.href)}${hub} },`;
  });
  return `const ${name} = dedupe([\n${lines.join('\n')}\n]);`;
}

const studentRoutes = buildRoutesForRole('student');
const employerRoutes = buildRoutesForRole('employer');
const collegeAdminRoutes = buildRoutesForRole('college_admin');
const superAdminRoutes = buildRoutesForRole('super_admin');

const file = `/**
 * Dashboard routes per role (from src/config/dashboardMenu.js).
 * Used by blank-screens.spec.js — keep in sync when menu changes.
 *
 * Regenerate: npm run qa:sync-routes
 */

const SHARED = [
  { label: 'Alerts', href: '/dashboard/alerts' },
  { label: 'Feedback', href: '/dashboard/feedback' },
  { label: 'My data export', href: '/dashboard/my-exports' },
];

function dedupe(routes) {
  const seen = new Set();
  return routes.filter((r) => {
    if (seen.has(r.href)) return false;
    seen.add(r.href);
    return true;
  });
}

${formatRoutes('collegeAdminRoutes', collegeAdminRoutes)}

${formatRoutes('studentRoutes', studentRoutes)}

${formatRoutes('employerRoutes', employerRoutes)}

${formatRoutes('superAdminRoutes', superAdminRoutes)}

module.exports = {
  DEMO_LOGINS: {
    student: 'arjun.verma@iitm.edu',
    employer: 'hr@techcorp.com',
    college_admin: 'admin@iitm.edu',
    super_admin: 'admin@placementhub.com',
  },
  ROLE_HOME: {
    student: /\/dashboard\/student/,
    employer: /\/dashboard\/employer/,
    college_admin: /\/dashboard\/college/,
    super_admin: /\/dashboard\/admin/,
  },
  ROUTES_BY_ROLE: {
    student: studentRoutes,
    employer: employerRoutes,
    college_admin: collegeAdminRoutes,
    super_admin: superAdminRoutes,
  },
};
`;

fs.writeFileSync(OUT, file, 'utf8');
console.log(`Wrote ${OUT}`);
console.log(
  `  student: ${studentRoutes.length}, employer: ${employerRoutes.length}, college_admin: ${collegeAdminRoutes.length}, super_admin: ${superAdminRoutes.length}`,
);
