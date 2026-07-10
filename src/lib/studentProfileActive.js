/**
 * SQL helpers for soft-archived student profiles.
 * Archived students are hidden from college lists, drives/jobs, and student portal actions.
 */

/** Use on student_profiles alias `sp`. */
export const SP_ACTIVE_CLAUSE =
  'sp.archived_at IS NULL AND COALESCE(sp.is_deleted, false) = false';

/** Use on bare student_profiles table. */
export const STUDENT_PROFILE_ACTIVE_CLAUSE =
  'archived_at IS NULL AND COALESCE(is_deleted, false) = false';

/** Use in JOIN ON after `JOIN student_profiles sp ON sp.tenant_id = t.id AND` */
export const SP_ACTIVE_ON = SP_ACTIVE_CLAUSE;

/**
 * Subquery of active profile ids for a tenant.
 * @param {string} tenantParam SQL placeholder only (e.g. `$1`), never a raw UUID string.
 */
export function activeStudentIdsForTenant(tenantParam) {
  const placeholder = String(tenantParam || '').trim();
  if (!/^\$\d+$/.test(placeholder)) {
    throw new Error('activeStudentIdsForTenant: tenantParam must be a SQL placeholder such as $1');
  }
  return `(SELECT id FROM student_profiles WHERE tenant_id = ${placeholder}::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE})`;
}
