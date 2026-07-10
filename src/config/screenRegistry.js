import { menuConfig } from '@/config/dashboardMenu';
import { getDevScreenId } from '@/config/devScreenIds';

/** Extra routes not in sidebar menus */
const EXTRA_SCREENS = [
  { roles: ['super_admin'], label: 'Data entry — Users', href: '/data-entry/users', section: 'Data entry' },
  { roles: ['super_admin'], label: 'Data entry — Student profiles', href: '/data-entry/student-profiles', section: 'Data entry' },
  { roles: ['super_admin'], label: 'Data entry — Placement drives', href: '/data-entry/placement-drives', section: 'Data entry' },
];

/**
 * @returns {Array<{ href: string; label: string; section: string; roles: string[]; screenId: string; searchText: string }>}
 */
export function buildScreenRegistry() {
  /** @type {Map<string, { href: string; label: string; section: string; roles: Set<string>; screenId: string }>} */
  const byHref = new Map();

  for (const [role, cfg] of Object.entries(menuConfig)) {
    for (const sec of cfg.sections || []) {
      for (const item of sec.items || []) {
        const href = item.href;
        if (!href) continue;
        const screenId = getDevScreenId(href) || '';
        const ex = byHref.get(href);
        if (ex) {
          ex.roles.add(role);
          if (item.label && item.label.length > ex.label.length) ex.label = item.label;
        } else {
          byHref.set(href, {
            href,
            label: item.label,
            section: sec.title,
            roles: new Set([role]),
            screenId,
          });
        }
      }
    }
  }

  for (const row of EXTRA_SCREENS) {
    const ex = byHref.get(row.href);
    const screenId = getDevScreenId(row.href) || '';
    if (ex) {
      for (const r of row.roles) ex.roles.add(r);
    } else {
      byHref.set(row.href, {
        href: row.href,
        label: row.label,
        section: row.section,
        roles: new Set(row.roles),
        screenId,
      });
    }
  }

  return Array.from(byHref.values()).map((v) => {
    const roles = Array.from(v.roles).sort();
    const searchText = [v.label, v.href, v.section, ...roles, v.screenId].join(' ').toLowerCase();
    return {
      href: v.href,
      label: v.label,
      section: v.section,
      roles,
      screenId: v.screenId,
      searchText,
    };
  });
}

/**
 * @param {string} role
 * @param {string} q
 * @param {number} [limit]
 */
export function filterScreensForRole(role, q, limit = 25) {
  const needle = String(q || '').trim().toLowerCase();
  const all = buildScreenRegistry();
  const roleScoped = all.filter((s) => s.roles.includes(role));
  const pool = roleScoped.length ? roleScoped : all;
  if (!needle) return pool.slice(0, limit);
  const tokens = needle.split(/\s+/).filter(Boolean);
  const scored = pool
    .map((s) => {
      let score = 0;
      for (const t of tokens) {
        if (s.href.toLowerCase().includes(t)) score += 5;
        if (s.label.toLowerCase().includes(t)) score += 4;
        if (s.section.toLowerCase().includes(t)) score += 2;
        if (s.screenId.toLowerCase().includes(t)) score += 3;
        for (const r of s.roles) {
          if (r.includes(t)) score += 1;
        }
      }
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.s);
}
