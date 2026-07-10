/** Shared CSV parsing for offer import routes (college + employer). */

export const OFFER_STATUSES = new Set(['pending', 'accepted', 'rejected', 'expired', 'revoked']);

/** 8-4-4-4-12 hex (accepts nil UUID and any version nibble; stricter RFC checks are not required for DB cast). */
const CSV_HEX_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Empty / placeholder / non-UUID → null (no import error). Brace-wrapped OK.
 * Use for optional drive_id so Excel edits and column drift do not block the row.
 */
export function normalizeOptionalUuidCell(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  const sl = s.toLowerCase();
  if (['-', '—', 'n/a', 'na', 'none', 'null', '.', 'nil', '#n/a', '#na'].includes(sl)) return null;
  if (/^\{[0-9a-f-]{36}\}$/i.test(s)) s = s.slice(1, -1).trim();
  if (!CSV_HEX_UUID_RE.test(s)) return null;
  return s.toLowerCase();
}

export function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && c === ',') {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

export function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function pickCell(row, aliases) {
  for (const a of aliases) {
    const v = row[a];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

export function parseSalary(raw) {
  if (raw === undefined || raw === null || raw === '') return 0;
  const s = String(raw).replace(/[,₹\s]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function parseDeadline(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const isoTry = new Date(s.includes('T') ? s : `${s}T23:59:59`);
  if (!Number.isNaN(isoTry.getTime())) return isoTry.toISOString();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 23, 59, 59);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/** For offers.joining_date (DATE). */
export function parseJoiningDateOnly(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const isoTry = new Date(s.includes('T') ? s : `${s}T12:00:00`);
  if (!Number.isNaN(isoTry.getTime())) return isoTry.toISOString().slice(0, 10);
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const y = m[3];
    const mo = m[2].padStart(2, '0');
    const da = m[1].padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }
  return null;
}
