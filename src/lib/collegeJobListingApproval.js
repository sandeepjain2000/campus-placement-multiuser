import { query } from '@/lib/db';
import { notifyStudentsListingApproved } from '@/lib/jobPostingCollegeApproval';
import { AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';

/**
 * College admin approve/reject for a published job listing on their campus.
 * @param {{ userId: string, tenantId: string, jobId: string, action: 'approve' | 'reject', rejectionReason?: string | null, jobTypes: string[] }} params
 */
export async function patchCollegeJobListingApproval({
  userId,
  tenantId,
  jobId,
  action,
  rejectionReason = null,
  jobTypes,
}) {
  const fromStatuses = action === 'approve' ? ['pending', 'rejected'] : ['pending'];
  const nextStatus = action === 'approve' ? 'approved' : 'rejected';

  const updated = await query(
    `UPDATE job_posting_visibility jpv
     SET college_status = $1::varchar,
         approved_by = CASE WHEN $1::varchar = 'approved' THEN $2::uuid ELSE NULL END,
         approved_at = CASE WHEN $1::varchar = 'approved' THEN NOW() ELSE NULL END,
         rejection_reason = CASE WHEN $1::varchar = 'rejected' THEN $3 ELSE NULL END
     FROM job_postings jp
     INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
     WHERE jpv.job_id = jp.id
       AND jpv.job_id = $4::uuid
       AND jpv.tenant_id = $5::uuid
       AND jpv.college_status = ANY($6::varchar[])
       AND jp.status = 'published'
       AND jp.job_type = ANY($7::varchar[])
       ${AND_JP_NOT_DELETED}
     RETURNING jp.id, jp.title, jp.job_type, ep.company_name, jpv.college_status`,
    [nextStatus, userId, rejectionReason, jobId, tenantId, fromStatuses, jobTypes],
  );

  if (!updated.rows.length) {
    const meta = await query(
      `SELECT jpv.college_status, jp.job_type
       FROM job_posting_visibility jpv
       JOIN job_postings jp ON jp.id = jpv.job_id
       WHERE jpv.job_id = $1::uuid AND jpv.tenant_id = $2::uuid ${AND_JP_NOT_DELETED}`,
      [jobId, tenantId],
    );
    if (!meta.rows[0]) {
      return { ok: false, status: 404, error: 'Listing not found for your campus' };
    }
    return {
      ok: false,
      status: 409,
      error:
        action === 'approve'
          ? 'This listing is not awaiting approval (already approved or still pending employer publish).'
          : 'Only pending listings can be rejected.',
      currentStatus: meta.rows[0].college_status,
    };
  }

  const row = updated.rows[0];
  if (row.college_status === 'approved') {
    await notifyStudentsListingApproved(null, {
      tenantId,
      title: row.title,
      jobType: row.job_type,
      companyName: row.company_name,
    });
  }

  return {
    ok: true,
    jobId: row.id,
    collegeStatus: row.college_status,
  };
}
