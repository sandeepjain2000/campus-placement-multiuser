import { query } from '@/lib/db';
import { findAcademicYearForDate } from '@/lib/academicYearTenant';

/**
 * Resolve academic year id from query ?academicYearId= or ?academicYearLabel=
 * Falls back to year containing today's date.
 */
export async function resolveTenantAcademicYear(tenantId, searchParams) {
  const id = searchParams?.get('academicYearId')?.trim();
  const label = searchParams?.get('academicYearLabel')?.trim();

  const yearsRes = await query(
    `SELECT id, label, sequence_number, period_start, period_end, semester_count
     FROM tenant_academic_years
     WHERE tenant_id = $1::uuid
     ORDER BY sequence_number ASC`,
    [tenantId],
  );
  const rows = yearsRes.rows;
  if (!rows.length) return { year: null, years: [], semesters: [] };

  let year = null;
  if (id) year = rows.find((r) => String(r.id) === id) || null;
  if (!year && label) year = rows.find((r) => r.label === label) || null;
  if (!year) year = findAcademicYearForDate(new Date(), rows);

  let semesters = [];
  if (year) {
    const semRes = await query(
      `SELECT id, academic_year_id, sequence_number, period_start, period_end
       FROM tenant_academic_year_semesters
       WHERE academic_year_id = $1::uuid
       ORDER BY sequence_number`,
      [year.id],
    );
    semesters = semRes.rows;
  }

  const current = findAcademicYearForDate(new Date(), rows);

  return { year, years: rows, semesters, current };
}
