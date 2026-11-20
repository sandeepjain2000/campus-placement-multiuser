import { query } from '@/lib/db';
import { getDashboardMenu, getDashboardNavItemKey } from '@/config/dashboardMenu';
import {
  DEFAULT_MENU_HIGHLIGHT_COLOR,
  MENU_HIGHLIGHT_ROLE_OPTIONS,
  emptySelectedItems,
} from '@/lib/menuHighlightDefaults';

export {
  DEFAULT_MENU_HIGHLIGHT_COLOR,
  MENU_HIGHLIGHT_ROLE_OPTIONS,
  MENU_HIGHLIGHT_ENTITY_TYPES,
  emptySelectedItems,
} from '@/lib/menuHighlightDefaults';

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

let ensured = false;

async function ensureMenuHighlightTable() {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS menu_highlight_config (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      highlight_color TEXT NOT NULL DEFAULT '#FF0000',
      selected_items JSONB NOT NULL DEFAULT '{}'::jsonb,
      selected_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    INSERT INTO menu_highlight_config (id, highlight_color, selected_items, selected_entities)
    VALUES (1, '#FF0000', '{}'::jsonb, '[]'::jsonb)
    ON CONFLICT (id) DO NOTHING
  `);
  ensured = true;
}

function normalizeColor(value) {
  const raw = String(value || '').trim();
  if (!HEX_COLOR_RE.test(raw)) return DEFAULT_MENU_HIGHLIGHT_COLOR;
  if (raw.length === 4) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return raw.toUpperCase();
}

function normalizeItemKeys(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  const seen = new Set();
  for (const entry of value) {
    const key = String(entry || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function normalizeSelectedItems(raw) {
  const base = emptySelectedItems();
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  for (const { key } of MENU_HIGHLIGHT_ROLE_OPTIONS) {
    base[key] = normalizeItemKeys(obj[key]);
  }
  return base;
}

function normalizeSelectedEntities(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const entry of raw) {
    const type = String(entry?.type || '').trim();
    const id = String(entry?.id || '').trim();
    if (!['college', 'employer', 'student'].includes(type) || !id) continue;
    const token = `${type}:${id}`;
    if (seen.has(token)) continue;
    seen.add(token);
    const name = String(entry?.name || '').trim();
    out.push(name ? { type, id, name } : { type, id });
  }
  return out;
}

/**
 * Plain menu tree for Super Admin checkboxes (no React icon components).
 * @param {'college_admin'|'employer'|'student'} roleKey
 */
export function getHighlightableMenuStructure(roleKey) {
  const menu = getDashboardMenu(roleKey, null);
  const sections = Array.isArray(menu?.sections) ? menu.sections : [];
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    items: (section.items || []).map((item) => ({
      key: getDashboardNavItemKey(item),
      label: item.label,
      href: item.href,
      disabled: Boolean(item.disabled),
    })),
  }));
}

export async function getMenuHighlightConfig() {
  await ensureMenuHighlightTable();
  const result = await query(
    `SELECT highlight_color, selected_items, selected_entities, updated_at
     FROM menu_highlight_config WHERE id = 1`,
  );
  const row = result.rows[0];
  if (!row) {
    return {
      highlightColor: DEFAULT_MENU_HIGHLIGHT_COLOR,
      selectedItems: emptySelectedItems(),
      selectedEntities: [],
      updatedAt: null,
    };
  }
  return {
    highlightColor: normalizeColor(row.highlight_color),
    selectedItems: normalizeSelectedItems(row.selected_items),
    selectedEntities: normalizeSelectedEntities(row.selected_entities),
    updatedAt: row.updated_at || null,
  };
}

export async function saveMenuHighlightConfig({ highlightColor, selectedItems, selectedEntities }) {
  await ensureMenuHighlightTable();
  const color = normalizeColor(highlightColor);
  const items = normalizeSelectedItems(selectedItems);
  const entities = normalizeSelectedEntities(selectedEntities);
  await query(
    `INSERT INTO menu_highlight_config (id, highlight_color, selected_items, selected_entities, updated_at)
     VALUES (1, $1, $2::jsonb, $3::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET
       highlight_color = EXCLUDED.highlight_color,
       selected_items = EXCLUDED.selected_items,
       selected_entities = EXCLUDED.selected_entities,
       updated_at = NOW()`,
    [color, JSON.stringify(items), JSON.stringify(entities)],
  );
  return getMenuHighlightConfig();
}

async function resolveEmployerProfileId(userId) {
  const result = await query(`SELECT id FROM employer_profiles WHERE user_id = $1 LIMIT 1`, [userId]);
  return result.rows[0]?.id || null;
}

/**
 * Whether this session entity is in the Super Admin selection list.
 * Entity type matches role: college → college_admin, employer → employer, student → student.
 */
export async function isMenuHighlightEntitySelected(user, selectedEntities) {
  const role = user?.role;
  const entities = normalizeSelectedEntities(selectedEntities);
  if (!role || entities.length === 0) return false;

  if (role === 'college_admin') {
    const tenantId = user.tenantId || user.tenant_id;
    if (!tenantId) return false;
    return entities.some((e) => e.type === 'college' && e.id === String(tenantId));
  }

  if (role === 'employer') {
    const employerId = await resolveEmployerProfileId(user.id);
    if (!employerId) return false;
    return entities.some((e) => e.type === 'employer' && e.id === String(employerId));
  }

  if (role === 'student') {
    return entities.some((e) => e.type === 'student' && e.id === String(user.id));
  }

  return false;
}

/**
 * Runtime highlight payload for a logged-in user.
 * @returns {Promise<{ active: boolean, color: string, itemKeys: string[] }>}
 */
export async function resolveMenuHighlightForUser(user) {
  const config = await getMenuHighlightConfig();
  const role = user?.role;
  if (!MENU_HIGHLIGHT_ROLE_OPTIONS.some((r) => r.key === role)) {
    return { active: false, color: config.highlightColor, itemKeys: [] };
  }

  const selected = await isMenuHighlightEntitySelected(user, config.selectedEntities);
  if (!selected) {
    return { active: false, color: config.highlightColor, itemKeys: [] };
  }

  const itemKeys = normalizeItemKeys(config.selectedItems[role]);
  return {
    active: itemKeys.length > 0,
    color: config.highlightColor,
    itemKeys,
  };
}

export function menuItemHighlightStyle(itemKeys, color, item) {
  if (!Array.isArray(itemKeys) || itemKeys.length === 0 || !color) return undefined;
  const key = getDashboardNavItemKey(item);
  if (!itemKeys.includes(key)) return undefined;
  return { color };
}
