/**
 * Temporary dev-only screen labels (S-1, S-2, …) for quick reference during build-out.
 * Each path is unique; nested routes fall back to the longest matching prefix.
 */

const ROUTES_SORTED = [
  '/dashboard',
  '/dashboard/admin',
  '/dashboard/admin/colleges',
  '/dashboard/admin/colleges/add',
  '/dashboard/admin/employers',
  '/dashboard/admin/placement-listings',
  '/dashboard/admin/marketplace',
  '/dashboard/admin/pending-registrations',
  '/dashboard/admin/feedback',
  '/dashboard/admin/overview',
  '/dashboard/admin/settings',
  '/dashboard/admin/users',
  '/dashboard/alerts',
  '/dashboard/college',
  '/dashboard/college/applications',
  '/dashboard/college/bulk-notifications',
  '/dashboard/college/feature-ideas',
  '/dashboard/college/calendar',
  '/dashboard/college/clarifications',
  '/dashboard/college/discussions',
  '/dashboard/college/drives',
  '/dashboard/college/marketplace',
  '/dashboard/college/enrollment-key',
  '/dashboard/college/guest-engagements',
  '/dashboard/college/mentorship-requests',
  '/dashboard/college/message-templates',
  '/dashboard/college/communication-templates',
  '/dashboard/college/employers',
  '/dashboard/college/employers/requests',
  '/dashboard/college/events',
  '/dashboard/college/hiring-assessment',
  '/dashboard/college/infrastructure',
  '/dashboard/college/interviews',
  '/dashboard/college/internship-results',
  '/dashboard/college/internship-feedback',
  '/dashboard/college/internship-guides',
  '/dashboard/college/internship-ppo',
  '/dashboard/college/internships',
  '/dashboard/college/offers',
  '/dashboard/college/offers-upload',
  '/dashboard/college/overview',
  '/dashboard/college/reports',
  '/dashboard/college/rules',
  '/dashboard/college/academic-years',
  '/dashboard/college/settings',
  '/dashboard/college/sponsorships',
  '/dashboard/college/startup-funding',
  '/dashboard/college/students',
  '/dashboard/employer',
  '/dashboard/employer/applications',
  '/dashboard/employer/calendar',
  '/dashboard/employer/campus-guest-needs',
  '/dashboard/employer/mentorship-requests',
  '/dashboard/employer/communication-templates',
  '/dashboard/employer/clarifications',
  '/dashboard/employer/discussions',
  '/dashboard/employer/drives',
  '/dashboard/employer/hiring-assessment',
  '/dashboard/employer/interviews',
  '/dashboard/employer/internship-feedback',
  '/dashboard/employer/internship-supervisors',
  '/dashboard/employer/internship-ppo',
  '/dashboard/employer/internships',
  '/dashboard/employer/alumni/jobs',
  '/dashboard/employer/alumni/applications',
  '/dashboard/employer/alumni/interviews',
  '/dashboard/employer/offers',
  '/dashboard/employer/offers-upload',
  '/dashboard/employer/overview',
  '/dashboard/employer/profile',
  '/dashboard/employer/projects',
  '/dashboard/employer/select-campus',
  '/dashboard/employer/marketplace',
  '/dashboard/employer/sponsorships',
  '/dashboard/employer/startup-funding',
  '/dashboard/feedback',
  '/dashboard/student',
  '/dashboard/alumni/jobs',
  '/dashboard/alumni/applications/jobs',
  '/dashboard/student/applications/jobs',
  '/dashboard/student/applications/internships',
  '/dashboard/student/applications/projects',
  '/dashboard/student/applications/mentorship',
  '/dashboard/student/applications/hackathons',
  '/dashboard/student/calendar',
  '/dashboard/student/clarifications',
  '/dashboard/student/mentorship-requests',
  '/dashboard/student/discussions',
  '/dashboard/student/my-cvs',
  '/dashboard/student/documents',
  '/dashboard/student/drives',
  '/dashboard/student/internship-feedback',
  '/dashboard/student/internship-ppo',
  '/dashboard/student/internships',
  '/dashboard/student/internships/not-processed',
  '/dashboard/student/projects',
  '/dashboard/student/hackathons',
  '/dashboard/student/interviews',
  '/dashboard/student/offers',
  '/dashboard/student/overview',
  '/dashboard/student/profile',
  '/dashboard/student/reminders',
  '/data-entry',
  '/data-entry/users',
  '/data-entry/student-profiles',
  '/data-entry/placement-drives',
  '/data-entry/offers',
  '/dashboard/employer/assessment-uploads',
  '/dashboard/employer/assessment-uploads/review',
  '/dashboard/employer/assessment-uploads/import/[sessionId]',
  '/dashboard/employer/assessment-update-online',
  '/dashboard/employer/assessment-summary',
  '/dashboard/college/audit-reports',
  '/dashboard/admin/audit-reports',
  '/dashboard/admin/error-logs',
  '/dashboard/admin/email-templates',
  '/dashboard/my-exports',
  '/dashboard/admin/archived-students',
  '/dashboard/alumni/jobs',
  '/dashboard/alumni/applications/jobs',
  '/dashboard/student/jobs',
  '/dashboard/employer/drives/request',
  '/dashboard/employer/drives/edit',
];

/** @type {Record<string, string>} */
export const DEV_SCREEN_BY_PATH = Object.fromEntries(
  ROUTES_SORTED.map((path, i) => [path, `S-${i + 1}`]),
);

/**
 * @param {string | null | undefined} pathname — from usePathname() (no query)
 * @returns {string | null}
 */
export function getDevScreenId(pathname) {
  if (!pathname) return null;
  let p = pathname.split('?')[0];
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p === '' || p === '/') return 'LANDING';
  if (DEV_SCREEN_BY_PATH[p]) return DEV_SCREEN_BY_PATH[p];
  const keys = Object.keys(DEV_SCREEN_BY_PATH).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (p === key || p.startsWith(`${key}/`)) return DEV_SCREEN_BY_PATH[key];
  }
  const slug = p
    .replace(/^\//, '')
    .replace(/[^a-zA-Z0-9/-]+/g, '-')
    .replace(/\//g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `PATH-${slug}` : 'PATH-root';
}
