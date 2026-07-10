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

export const SORT_NAME_ASC = {
  value: 'name_asc',
  label: 'Name (A → Z)',
  compare: (a, b) =>
    String(a?.name ?? a?.title ?? a?.label ?? '').localeCompare(
      String(b?.name ?? b?.title ?? b?.label ?? ''),
      undefined,
      { sensitivity: 'base' },
    ),
};

export const SORT_NAME_DESC = {
  value: 'name_desc',
  label: 'Name (Z → A)',
  compare: (a, b) => SORT_NAME_ASC.compare(b, a),
};

export const SORT_DATE_DESC = {
  value: 'date_desc',
  label: 'Newest first',
  compare: (a, b) =>
    new Date(b?.createdAt ?? b?.created_at ?? b?.date ?? b?.appliedAt ?? 0) -
    new Date(a?.createdAt ?? a?.created_at ?? a?.date ?? a?.appliedAt ?? 0),
};

export const SORT_DATE_ASC = {
  value: 'date_asc',
  label: 'Oldest first',
  compare: (a, b) => SORT_DATE_DESC.compare(b, a),
};
