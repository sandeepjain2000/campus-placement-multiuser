/**
 * Client-side search, filter, and sort helpers for tabular list screens.
 */

/**
 * @param {unknown} row
 * @param {(row: unknown) => string} getSearchText
 * @param {string} query
 */
export function rowMatchesSearch(row, getSearchText, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return String(getSearchText(row) || '').toLowerCase().includes(q);
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {string} sortKey
 * @param {Record<string, (a: unknown, b: unknown) => number>} comparators
 */
export function sortRows(items, sortKey, comparators) {
  const cmp = comparators[sortKey] || comparators.default;
  if (!cmp) return [...items];
  return [...items].sort(cmp);
}

/** Resolve a comparable display name from common list-row identity fields. */
export function rowSortNameValue(row) {
  if (!row || typeof row !== 'object') return '';
  const direct =
    row.name ??
    row.title ??
    row.label ??
    row.candidate_name ??
    row.student_name ??
    row.studentName ??
    row.student ??
    row.company_name ??
    row.companyName ??
    row.company ??
    row.original_file_name ??
    row.document_name ??
    row.actor_name ??
    row.action ??
    null;
  if (direct != null && String(direct).trim()) return String(direct).trim();

  const first = row.first_name ?? row.firstName ?? '';
  const last = row.last_name ?? row.lastName ?? '';
  const full = `${first} ${last}`.trim();
  if (full) return full;

  // Utility lists with no person/company label (e.g. my-exports).
  const fallback = row.status ?? row.format ?? '';
  return fallback != null ? String(fallback).trim() : '';
}

export const SORT_NAME_ASC = {
  value: 'name_asc',
  label: 'Name (A → Z)',
  compare: (a, b) =>
    rowSortNameValue(a).localeCompare(rowSortNameValue(b), undefined, {
      sensitivity: 'base',
    }),
};

export const SORT_NAME_DESC = {
  value: 'name_desc',
  label: 'Name (Z → A)',
  compare: (a, b) => SORT_NAME_ASC.compare(b, a),
};

/** Resolve a comparable timestamp from common list-row date fields. */
export function rowSortDateValue(row) {
  const raw =
    row?.createdAt ??
    row?.created_at ??
    row?.date ??
    row?.appliedAt ??
    row?.archivedAt ??
    row?.start_date ??
    row?.eventDate ??
    row?.upload_created_at ??
    row?.uploaded_at ??
    row?.updatedAt ??
    row?.internshipStartDate ??
    0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

export const SORT_DATE_DESC = {
  value: 'date_desc',
  label: 'Newest first',
  compare: (a, b) => rowSortDateValue(b) - rowSortDateValue(a),
};

export const SORT_DATE_ASC = {
  value: 'date_asc',
  label: 'Oldest first',
  compare: (a, b) => SORT_DATE_DESC.compare(b, a),
};
