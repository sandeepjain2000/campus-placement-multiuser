import { query } from '@/lib/db';
import { resolveTenantAcademicYear } from '@/lib/resolveAcademicYearFromRequest';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export async function resolveCurrentAcademicYearLabel(tenantId) {
  const { year } = await resolveTenantAcademicYear(tenantId, null);
  return year?.label || null;
}

/**
 * All active master-list students for a campus, optionally filtered to current academic year batch.
 * @param {string} tenantId
 * @param {{ academicYearLabel?: string | null }} opts
 */
export async function listTenantStudentsForAssessment(tenantId, { academicYearLabel = null } = {}) {
  const params = [tenantId];
  let where = `sp.tenant_id = $1::uuid AND ${SP_ACTIVE_CLAUSE}
     AND sp.roll_number IS NOT NULL AND TRIM(sp.roll_number) <> ''`;
  if (academicYearLabel) {
    params.push(academicYearLabel);
    where += ` AND sp.joining_academic_year = $${params.length}`;
  }

  const res = await query(
    `SELECT sp.id AS student_profile_id,
            sp.roll_number,
            sp.tenant_id,
            sp.joining_academic_year,
            sp.cgpa,
            sp.branch,
            sp.department,
            sp.batch_year,
            sp.backlogs_active,
            sp.placement_status,
            sp.resume_url,
            EXISTS (
              SELECT 1 FROM student_documents sd
              WHERE sd.student_id = sp.id
                AND LOWER(TRIM(sd.document_type)) IN ('resume', 'cv')
                AND sd.file_url ~* '^https?://'
            ) AS has_resume_document,
            t.short_code,
            TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS student_name
     FROM student_profiles sp
     JOIN tenants t ON t.id = sp.tenant_id
     LEFT JOIN users u ON u.id = sp.user_id
     WHERE ${where}
     ORDER BY TRIM(sp.roll_number) ASC NULLS LAST`,
    params,
  );
  return res.rows;
}
