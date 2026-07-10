import { query } from '@/lib/db';
import { resolveTenantAcademicYear } from '@/lib/resolveAcademicYearFromRequest';

/** Verify employer has an approved tie-up with the campus tenant. */
export async function assertEmployerApprovedCampus(employerId, campusId, client = null) {
  if (!employerId || !campusId) {
    const err = new Error('campusId is required');
    err.statusCode = 400;
    throw err;
  }
  const q = client ? client.query.bind(client) : query;
  const res = await q(
    `SELECT 1 FROM employer_approvals
     WHERE employer_id = $1::uuid AND tenant_id = $2::uuid AND status = 'approved'
     LIMIT 1`,
    [employerId, campusId],
  );
  if (!res.rowCount) {
    const err = new Error('No approved partnership with this campus');
    err.statusCode = 403;
    throw err;
  }
}

/** Resolve academic year for an employer's active campus (from query params or calendar default). */
export async function resolveEmployerCampusAcademicYear(employerId, campusId, searchParams) {
  await assertEmployerApprovedCampus(employerId, campusId);
  return resolveTenantAcademicYear(campusId, searchParams);
}

/**
 * SQL filter for placement_drives scoped to an academic year.
 * Includes legacy rows with NULL academic_year_id and in-flight requests.
 */
export function sqlDriveAcademicYearFilter(alias = 'd', paramIndex) {
  if (!paramIndex) return '';
  return ` AND (${alias}.academic_year_id = $${paramIndex}::uuid OR ${alias}.academic_year_id IS NULL OR ${alias}.status = 'requested')`;
}

/** SQL filter for job_postings scoped to an academic year (legacy NULL rows included). */
export function sqlJobAcademicYearFilter(alias = 'jp', paramIndex) {
  if (!paramIndex) return '';
  return ` AND (${alias}.academic_year_id = $${paramIndex}::uuid OR ${alias}.academic_year_id IS NULL)`;
}
