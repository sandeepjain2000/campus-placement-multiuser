/**
 * Login-screen demo accounts — single source for Data Tester API scoping.
 * Matches DEMO_LOGINS + SEEDED_EMPLOYER_CREDENTIALS on /login.
 */
import { DEMO_LOGINS, SEEDED_EMPLOYER_CREDENTIALS } from '@/lib/demoLogins';

function normEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function emailsWithIcon(icon) {
  return DEMO_LOGINS.filter((row) => row.icon === icon).map((row) => normEmail(row.email));
}

/** @type {readonly string[]} */
export const DEMO_SCREEN_STUDENT_EMAILS = Object.freeze(emailsWithIcon('🎓'));

/** @type {readonly string[]} */
export const DEMO_SCREEN_EMPLOYER_EMAILS = Object.freeze([
  ...emailsWithIcon('🏢'),
  ...SEEDED_EMPLOYER_CREDENTIALS.map((row) => normEmail(row.email)),
]);

/** @type {readonly string[]} */
export const DEMO_SCREEN_COLLEGE_ADMIN_EMAILS = Object.freeze(emailsWithIcon('🏫'));

/** Canonical demo college slugs (seed tenants). */
export const DEMO_SCREEN_COLLEGE_SLUGS = Object.freeze(['iit-madras', 'nit-trichy', 'bits-pilani']);

export function isDemoScreenStudentEmail(email) {
  return DEMO_SCREEN_STUDENT_EMAILS.includes(normEmail(email));
}

export function isDemoScreenEmployerEmail(email) {
  return DEMO_SCREEN_EMPLOYER_EMAILS.includes(normEmail(email));
}

/** SQL: `LOWER(u.email) = ANY($n::text[])` with demo student emails. */
export function demoScreenStudentEmailFilter(column = 'u.email', paramIndex = 1) {
  return `LOWER(${column}) = ANY($${paramIndex}::text[])`;
}

/** SQL: `LOWER(u.email) = ANY($n::text[])` with demo employer emails. */
export function demoScreenEmployerEmailFilter(column = 'u.email', paramIndex = 1) {
  return `LOWER(${column}) = ANY($${paramIndex}::text[])`;
}

/** SQL fragment restricting tenants to demo colleges (admin email or canonical slug). */
export function demoScreenCollegeTenantFilter(tAlias = 't', uAlias = 'u', slugParamIndex = 1, adminParamIndex = 2) {
  return `(
    ${tAlias}.slug = ANY($${slugParamIndex}::text[])
    OR EXISTS (
      SELECT 1 FROM users ${uAlias}
      WHERE ${uAlias}.tenant_id = ${tAlias}.id
        AND ${uAlias}.role = 'college_admin'
        AND LOWER(${uAlias}.email) = ANY($${adminParamIndex}::text[])
    )
  )`;
}

export const DEMO_SCREEN_SQL_PARAMS = Object.freeze({
  studentEmails: [...DEMO_SCREEN_STUDENT_EMAILS],
  employerEmails: [...DEMO_SCREEN_EMPLOYER_EMAILS],
  collegeAdminEmails: [...DEMO_SCREEN_COLLEGE_ADMIN_EMAILS],
  collegeSlugs: [...DEMO_SCREEN_COLLEGE_SLUGS],
});
