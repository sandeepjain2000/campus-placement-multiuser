/** College Placement Drives status tabs (list filter). */

export const DEFAULT_COLLEGE_DRIVE_STATUS_TAB = 'unapproved';

export const COLLEGE_DRIVE_STATUS_TABS = [
  { id: 'unapproved', label: 'Unapproved' },
  { id: 'active', label: 'Approved' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const ACTIVE_STATUSES = new Set(['approved', 'scheduled', 'in_progress']);

/**
 * @param {string | null | undefined} status
 * @param {string} tab
 */
export function driveMatchesStatusTab(status, tab) {
  const s = String(status || '').toLowerCase();
  switch (tab) {
    case 'unapproved':
      return s === 'requested';
    case 'active':
      return ACTIVE_STATUSES.has(s);
    case 'completed':
      return s === 'completed';
    case 'rejected':
      return s === 'cancelled' || s === 'rejected';
    case 'all':
    default:
      return true;
  }
}

/**
 * @param {Array<{ status?: string }>} drives
 * @param {string} tab
 */
export function filterDrivesByStatusTab(drives, tab) {
  const list = Array.isArray(drives) ? drives : [];
  if (!tab || tab === 'all') return list;
  return list.filter((d) => driveMatchesStatusTab(d?.status, tab));
}

/**
 * @param {Array<{ status?: string }>} drives
 * @returns {Record<string, number>}
 */
export function countDrivesByStatusTab(drives) {
  const list = Array.isArray(drives) ? drives : [];
  const counts = Object.fromEntries(COLLEGE_DRIVE_STATUS_TABS.map((t) => [t.id, 0]));
  counts.all = list.length;
  for (const d of list) {
    for (const tab of COLLEGE_DRIVE_STATUS_TABS) {
      if (tab.id === 'all') continue;
      if (driveMatchesStatusTab(d?.status, tab.id)) counts[tab.id] += 1;
    }
  }
  return counts;
}
