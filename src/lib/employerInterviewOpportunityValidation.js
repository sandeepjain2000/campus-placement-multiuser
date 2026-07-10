import { query } from '@/lib/db';
import { isAlumniEmploymentType } from '@/lib/alumniJobPosting';
import { jobTypesClauseForAssessmentKind } from '@/lib/employerAssessmentTargetKinds';
import { AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';
import {
  interviewTabLabel,
  normalizeInterviewOpportunityKind,
} from '@/lib/employerInterviewOpportunity';

/**
 * Verify the opening belongs to this employer and approved campus partnership.
 * @returns {Promise<{ ok: true, title: string } | { ok: false, error: string }>}
 */
export async function validateEmployerInterviewOpportunity(employerId, campusId, kind, opportunityId) {
  const k = normalizeInterviewOpportunityKind(kind);
  const oppId = String(opportunityId || '').trim();
  if (!k) return { ok: false, error: 'Invalid hiring type.' };
  if (!oppId) return { ok: false, error: 'Select a specific job, internship, project, or placement drive.' };

  const approval = await query(
    `SELECT 1 FROM employer_approvals
     WHERE tenant_id = $1::uuid AND employer_id = $2::uuid AND status = 'approved'
     LIMIT 1`,
    [campusId, employerId],
  );
  if (!approval.rowCount) {
    return { ok: false, error: 'This college partnership is not approved yet.' };
  }

  if (k === 'drive') {
    const drives = await query(
      `SELECT d.id, d.title
       FROM placement_drives d
       WHERE d.id = $1::uuid
         AND d.employer_id = $2::uuid
         AND d.tenant_id = $3::uuid
         ${AND_DRIVE_NOT_DELETED}
       LIMIT 1`,
      [oppId, employerId, campusId],
    );
    if (!drives.rows.length) {
      return { ok: false, error: 'Placement drive not found for this campus.' };
    }
    return { ok: true, title: drives.rows[0].title || 'Placement drive' };
  }

  const { clause, params: typeParams } = jobTypesClauseForAssessmentKind(k, {
    alumniOnly: k === 'jobs',
    paramIndex: 4,
  });
  const jobs = await query(
    `SELECT jp.id, jp.title, jp.job_type
     FROM job_postings jp
     WHERE jp.id = $1::uuid
       AND jp.employer_id = $2::uuid
       AND EXISTS (
         SELECT 1 FROM job_posting_visibility jpv
         WHERE jpv.job_id = jp.id AND jpv.tenant_id = $3::uuid
       )
       ${clause}
       ${AND_JP_NOT_DELETED}
     LIMIT 1`,
    [oppId, employerId, campusId, ...typeParams],
  );
  if (!jobs.rows.length) {
    return { ok: false, error: `${interviewTabLabel(k)} opening not found for this campus.` };
  }
  if (k === 'jobs' && !isAlumniEmploymentType(jobs.rows[0].job_type)) {
    return { ok: false, error: 'Select an alumni job posting for alumni interview scheduling.' };
  }
  return { ok: true, title: jobs.rows[0].title || 'Opening' };
}
