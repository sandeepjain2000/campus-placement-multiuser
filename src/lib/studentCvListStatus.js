/** Client-safe CV list status labels for college student tables. */

/**
 * @param {'verified' | 'pending' | 'none' | null | undefined} status
 */
export function cvListStatusLabel(status) {
  if (status === 'verified') return 'Verified';
  if (status === 'pending') return 'Pending';
  if (status === 'none') return 'No CV';
  return '—';
}

/**
 * @param {'verified' | 'pending' | 'none' | null | undefined} status
 */
export function cvListStatusBadgeClass(status) {
  if (status === 'verified') return 'badge-green';
  if (status === 'pending') return 'badge-amber';
  if (status === 'none') return 'badge-gray';
  return '';
}
