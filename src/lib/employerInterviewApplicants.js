import { query } from '@/lib/db';
import { normalizeInterviewOpportunityKind } from '@/lib/employerInterviewOpportunity';
import { AND_APP_NOT_DELETED, AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

const APPLICANT_STATUS_SQL = `AND a.status NOT IN ('withdrawn', 'rejected')`;
const PROGRAM_STATUS_SQL = `AND pa.status NOT IN ('withdrawn', 'rejected')`;

/**
 * Load applicant emails for an interview slot's mapped opening at a campus.
 * @returns {Promise<Array<{ email: string, name: string }>>}
 */
export async function loadEmployerInterviewApplicantRecipients({
  employerId,
  campusId,
  opportunityKind,
  opportunityId,
}) {
  const kind = normalizeInterviewOpportunityKind(opportunityKind);
  const oppId = String(opportunityId || '').trim();
  if (!kind || !oppId || !employerId || !campusId) return [];

  if (kind === 'drive') {
    const res = await query(
      `SELECT DISTINCT
         COALESCE(NULLIF(TRIM(u.communication_email), ''), u.email) AS email,
         TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS name
       FROM applications a
       INNER JOIN placement_drives d ON d.id = a.drive_id
       INNER JOIN student_profiles sp ON sp.id = a.student_id
       INNER JOIN users u ON u.id = sp.user_id
       WHERE d.id = $1::uuid
         AND d.employer_id = $2::uuid
         AND d.tenant_id = $3::uuid
         AND sp.tenant_id = $3::uuid
         ${APPLICANT_STATUS_SQL}
         AND ${SP_ACTIVE_CLAUSE}
         ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}`,
      [oppId, employerId, campusId],
    );
    return res.rows
      .map((r) => ({ email: String(r.email || '').trim().toLowerCase(), name: String(r.name || '').trim() }))
      .filter((r) => r.email);
  }

  const res = await query(
    `SELECT DISTINCT
       COALESCE(NULLIF(TRIM(u.communication_email), ''), u.email) AS email,
       TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS name
     FROM program_applications pa
     INNER JOIN job_postings jp ON jp.id = pa.job_id
     INNER JOIN student_profiles sp ON sp.id = pa.student_id
     INNER JOIN users u ON u.id = sp.user_id
     WHERE jp.id = $1::uuid
       AND jp.employer_id = $2::uuid
       AND sp.tenant_id = $3::uuid
       ${PROGRAM_STATUS_SQL}
       AND ${SP_ACTIVE_CLAUSE}
       ${AND_PA_NOT_DELETED} ${AND_JP_NOT_DELETED}`,
    [oppId, employerId, campusId],
  );
  return res.rows
    .map((r) => ({ email: String(r.email || '').trim().toLowerCase(), name: String(r.name || '').trim() }))
    .filter((r) => r.email);
}
