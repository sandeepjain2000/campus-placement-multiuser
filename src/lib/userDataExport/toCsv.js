import { rowsToCsv, toCsvIsoDate } from '@/lib/csvExport';

export const EXPORT_FORMAT = 'csv';

function serializeCell(value) {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return toCsvIsoDate(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function unionHeaders(rows) {
  const keys = new Set();
  for (const row of rows) {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((k) => keys.add(k));
    }
  }
  return [...keys].sort();
}

function arraySectionToCsv(rows) {
  if (!rows?.length) {
    return rowsToCsv(['message'], [['(no rows)']]);
  }
  const headers = unionHeaders(rows);
  const data = rows.map((row) => headers.map((h) => serializeCell(row[h])));
  return rowsToCsv(headers, data);
}

function objectSectionToCsv(obj) {
  if (!obj) {
    return rowsToCsv(['field', 'value'], [['(empty)', '']]);
  }
  const entries = Object.keys(obj)
    .sort()
    .map((key) => [key, serializeCell(obj[key])]);
  return rowsToCsv(['field', 'value'], entries);
}

function sectionTitle(key) {
  return String(key).replace(/_/g, ' ').toUpperCase();
}

/** Flatten any role's data-export payload into a multi-section CSV document. */
export function exportPayloadToCsv(payload) {
  const parts = [
    rowsToCsv(['exported_at', 'role', 'user_id'], [
      [payload.exportedAt, payload.role, payload.userId],
    ]),
  ];

  const sections = payload?.sections || {};
  const keys = Object.keys(sections).sort();

  for (const key of keys) {
    const value = sections[key];
    const title = sectionTitle(key);

    if (Array.isArray(value)) {
      parts.push('', title, arraySectionToCsv(value));
    } else if (value && typeof value === 'object') {
      parts.push('', title, objectSectionToCsv(value));
    } else {
      parts.push('', title, rowsToCsv(['field', 'value'], [[key, serializeCell(value)]]));
    }
  }

  return parts.join('\n');
}

export function buildExportFile(payload) {
  const csv = exportPayloadToCsv(payload);
  const body = Buffer.from(`\uFEFF${csv}`, 'utf8');
  return {
    body,
    format: EXPORT_FORMAT,
    contentType: 'text/csv; charset=utf-8',
    ext: 'csv',
  };
}
