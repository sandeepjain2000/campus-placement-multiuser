/** Employer alumni hiring surfaces under /dashboard/employer/alumni */
export const EMPLOYER_ALUMNI_JOBS_PATH = '/dashboard/employer/alumni/jobs';
export const EMPLOYER_ALUMNI_APPLICATIONS_PATH = '/dashboard/employer/alumni/applications';
export const EMPLOYER_ALUMNI_INTERVIEWS_PATH = '/dashboard/employer/alumni/interviews';

/** Legacy paths — middleware redirects to alumni routes. */
export const LEGACY_EMPLOYER_JOBS_PATH = '/dashboard/employer/jobs';

export function isEmployerAlumniDashboardPath(pathname) {
  return Boolean(pathname && String(pathname).startsWith('/dashboard/employer/alumni'));
}
