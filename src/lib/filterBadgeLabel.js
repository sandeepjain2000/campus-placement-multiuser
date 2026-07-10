/** True when a filter badge should show a numeric count. */
export function shouldShowFilterCount(count) {
  const n = Number(count);
  return Number.isFinite(n) && n > 0;
}

/** "Applied" or "Applied 3" — no count when zero. */
export function formatFilterBadgeLabel(label, count) {
  const base = String(label ?? '');
  if (!shouldShowFilterCount(count)) return base;
  return `${base} ${Math.trunc(Number(count))}`;
}

/** "Applied" or "Applied (3)" — no count when zero. */
export function formatFilterBadgeLabelParen(label, count) {
  const base = String(label ?? '');
  if (!shouldShowFilterCount(count)) return base;
  return `${base} (${Math.trunc(Number(count))})`;
}

/**
 * Count rows for status filter pills.
 * Empty key = all except withdrawn (matches employer applications default filter).
 */
export function countApplicationStatusPills(items, pills, { statusField = 'status' } = {}) {
  const list = Array.isArray(items) ? items : [];
  const pillList = Array.isArray(pills) ? pills : [];
  const counts = Object.fromEntries(pillList.map((p) => [p.key, 0]));

  for (const item of list) {
    const status = String(item?.[statusField] ?? '').toLowerCase();
    for (const pill of pillList) {
      if (pill.key === '') {
        if (status !== 'withdrawn') counts[''] += 1;
      } else if (pill.key === status) {
        counts[pill.key] += 1;
      }
    }
  }

  return counts;
}
