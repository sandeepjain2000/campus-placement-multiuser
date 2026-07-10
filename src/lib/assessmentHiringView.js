import { query } from '@/lib/db';
import { pickRepresentativeAssessmentRows } from '@/lib/assessmentRowsDedupe';
import { formatStudentSystemId } from '@/lib/studentSystemId';
import { AND_EAU_NOT_DELETED, AND_SP_NOT_DELETED } from '@/lib/softDeleteSql';
import {
  classifyAssessmentOpportunityKind,
  buildAssessmentSummary,
  filterAssessmentRowsByKind,
} from '@/lib/assessmentHiringViewShared';

export { pickRepresentativeAssessmentRows, buildAssessmentSummary, classifyAssessmentOpportunityKind, filterAssessmentRowsByKind };

/**
 * Read-only consolidated rows from employer_assessment_* for Hiring Assessment screens.
 * @param {{ employerId?: string | null, tenantId?: string | null }} filter
 */
export async function fetchAssessmentRowsForView(filter) {
  const { employerId, tenantId, driveId, jobId } = filter;
  const params = [];
  let where = '1=1';
  if (employerId) {
    params.push(employerId);
    where += ` AND eau.employer_id = $${params.length}::uuid`;
  }
  if (tenantId) {
    params.push(tenantId);
    where += ` AND eau.tenant_id = $${params.length}::uuid`;
  }
  if (driveId) {
    params.push(driveId);
    where += ` AND eau.drive_id = $${params.length}::uuid`;
  }
  if (jobId) {
    params.push(jobId);
    where += ` AND eau.job_id = $${params.length}::uuid`;
  }

  const rows = await query(
    `SELECT
       ear.id,
       ear.student_profile_id,
       ear.roll_number,
       t.short_code,
       COALESCE(
         NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
         NULLIF(TRIM(u.email), ''),
         ear.roll_number
       ) AS candidate_name,
       ear.hiring_result,
       ear.remarks,
       eau.id AS upload_id,
       eau.drive_id AS upload_drive_id,
       eau.job_id AS upload_job_id,
       jp.job_type,
       eau.original_file_name,
       eau.created_at AS upload_created_at,
       eau.tenant_id,
       t.name AS tenant_name,
       ep.company_name AS employer_company,
       eau.employer_id AS employer_id
     FROM employer_assessment_rows ear
     JOIN employer_assessment_uploads eau ON eau.id = ear.upload_id
     JOIN employer_profiles ep ON ep.id = eau.employer_id
     JOIN tenants t ON t.id = eau.tenant_id
     JOIN student_profiles sp ON sp.id = ear.student_profile_id
     LEFT JOIN users u ON u.id = sp.user_id
     LEFT JOIN job_postings jp ON jp.id = eau.job_id AND COALESCE(jp.is_deleted, false) = false
     WHERE ${where}
       ${AND_EAU_NOT_DELETED}
       ${AND_SP_NOT_DELETED}
     ORDER BY eau.created_at DESC, ear.roll_number ASC NULLS LAST, ear.created_at ASC`,
    params,
  );

  return rows.rows.map((row) => ({
    ...row,
    system_id: formatStudentSystemId(row.short_code, row.roll_number),
    opportunity_kind: classifyAssessmentOpportunityKind(row),
  }));
}
