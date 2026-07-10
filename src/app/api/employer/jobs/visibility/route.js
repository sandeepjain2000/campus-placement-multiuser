import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { filterTenantIdsForJobPosting } from '@/lib/employerPostingCampusConstraints';
import { AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';
import { invalidateStudentOpportunityListCache } from '@/lib/jobPostingPublishState';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;






/**
 * POST — add campus visibility rows for an already-published job (repair / backfill).
 * Body: { jobId: uuid, tenantIds: uuid[] }
 */
async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { jobId, tenantIds = [] } = body;
    const uniqueTenants = [...new Set((tenantIds || []).map((t) => String(t).trim()).filter(Boolean))];

    if (!jobId || !uniqueTenants.length) {
      return NextResponse.json({ error: 'jobId and at least one tenantId are required' }, { status: 400 });
    }

    const emp = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid`, [userId]);
    if (!emp.rowCount) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }
    const employerId = emp.rows[0].id;

    const jobRes = await query(
      `SELECT id, status, job_type FROM job_postings jp WHERE jp.id = $1::uuid AND jp.employer_id = $2::uuid ${AND_JP_NOT_DELETED}`,
      [jobId, employerId],
    );
    if (!jobRes.rowCount) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (jobRes.rows[0].status !== 'published') {
      return NextResponse.json({ error: 'Only published jobs can be synced to campuses' }, { status: 409 });
    }
    const jobType = jobRes.rows[0].job_type;

    const summary = await transaction(async (client) => {
      const allowedTenants = await filterTenantIdsForJobPosting(
        client,
        employerId,
        uniqueTenants,
        jobType,
      );
      let inserted = 0;
      let skippedNotApproved = 0;
      let skippedByConstraint = uniqueTenants.length - allowedTenants.length;
      for (const tenantId of allowedTenants) {
        const appr = await client.query(
          `SELECT 1 FROM employer_approvals
           WHERE tenant_id = $1::uuid AND employer_id = $2::uuid AND status = 'approved'`,
          [tenantId, employerId],
        );
        if (!appr.rows.length) {
          skippedNotApproved += 1;
          continue;
        }
        const ins = await client.query(
          `INSERT INTO job_posting_visibility (job_id, tenant_id) VALUES ($1::uuid, $2::uuid)
           ON CONFLICT (job_id, tenant_id) DO NOTHING
           RETURNING job_id`,
          [jobId, tenantId],
        );
        if (ins.rows.length) inserted += 1;
      }
      return { inserted, skippedNotApproved, skippedByConstraint };
    });

    invalidateStudentOpportunityListCache();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error('POST /api/employer/jobs/visibility', e);
    return NextResponse.json({ error: 'Failed to sync visibility' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_employer_jobs_visibility' });
export const POST = __platformApiHandlers.POST;
