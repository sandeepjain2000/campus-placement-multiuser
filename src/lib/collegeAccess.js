/** College staff roles that belong to a tenant. */
export const COLLEGE_STAFF_ROLES = ['college_admin', 'placement_committee'];

export function isCollegeStaffRole(role) {
  return COLLEGE_STAFF_ROLES.includes(String(role || ''));
}

/** Full college admin — can mutate college data. */
export function isCollegeWriterRole(role) {
  return String(role || '') === 'college_admin';
}

export function isPlacementCommitteeRole(role) {
  return String(role || '') === 'placement_committee';
}

export function assertCollegeStaff(session) {
  if (!session?.user || !isCollegeStaffRole(session.user.role)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}

export function assertCollegeWriter(session) {
  if (!session?.user || !isCollegeWriterRole(session.user.role)) {
    return { ok: false, status: 403, error: 'Read-only access for placement committee' };
  }
  return { ok: true };
}

/** Dashboard paths placement committee may open (student data read-only). */
const PLACEMENT_COMMITTEE_BLOCKED = [
  '/dashboard/college/students/add',
];

export function isPlacementCommitteePathAllowed(pathname) {
  const path = String(pathname || '');
  if (PLACEMENT_COMMITTEE_BLOCKED.some((p) => path === p || path.startsWith(`${p}/`))) {
    return false;
  }
  if (/\/students\/[^/]+\/edit\/?$/.test(path)) return false;
  const allowedPrefixes = [
    '/dashboard/college',
    '/dashboard/college/overview',
    '/dashboard/college/getting-started',
    '/dashboard/college/students',
    '/dashboard/college/applications',
  ];
  return allowedPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
}
