/** Alumni surfaces live under /dashboard/alumni (student role, isAlumni). */
export const ALUMNI_BROWSE_JOBS_PATH = '/dashboard/alumni/jobs';
export const ALUMNI_MY_JOBS_PATH = '/dashboard/alumni/applications/jobs';
export const ALUMNI_GETTING_STARTED_PATH = '/dashboard/alumni/getting-started';

/** Legacy paths — middleware redirects alumni users to /dashboard/alumni equivalents. */
export const LEGACY_STUDENT_JOBS_PATH = '/dashboard/student/jobs';
export const LEGACY_STUDENT_APPLICATIONS_JOBS_PATH = '/dashboard/student/applications/jobs';
export const LEGACY_STUDENT_GETTING_STARTED_PATH = '/dashboard/student/getting-started';

/** Paths for alumni job flows (campus students must not land here). */
export function isAlumniStudentJobPath(pathname) {
  const p = String(pathname || '');
  return (
    p === ALUMNI_BROWSE_JOBS_PATH ||
    p.startsWith(`${ALUMNI_BROWSE_JOBS_PATH}/`) ||
    p === ALUMNI_MY_JOBS_PATH ||
    p.startsWith(`${ALUMNI_MY_JOBS_PATH}/`) ||
    p === LEGACY_STUDENT_JOBS_PATH ||
    p.startsWith(`${LEGACY_STUDENT_JOBS_PATH}/`) ||
    p === LEGACY_STUDENT_APPLICATIONS_JOBS_PATH ||
    p.startsWith(`${LEGACY_STUDENT_APPLICATIONS_JOBS_PATH}/`)
  );
}

export function campusStudentJobRedirectPath(pathname) {
  const p = String(pathname || '');
  if (
    p === LEGACY_STUDENT_APPLICATIONS_JOBS_PATH ||
    p.startsWith(`${LEGACY_STUDENT_APPLICATIONS_JOBS_PATH}/`) ||
    p === ALUMNI_MY_JOBS_PATH ||
    p.startsWith(`${ALUMNI_MY_JOBS_PATH}/`)
  ) {
    return '/dashboard/student/applications/drives';
  }
  return '/dashboard/student/drives';
}

