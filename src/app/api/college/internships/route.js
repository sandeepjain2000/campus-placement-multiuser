import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveCollegeAdminTenantId } from '@/lib/sessionTenant';
import { AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';
import { patchCollegeJobListingApproval } from '@/lib/collegeJobListingApproval';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

/**
 * Internship & program listings visible to this college (all campus approval states).
 * Students only see rows where job_posting_visibility.college_status = 'approved'.
 */
async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const sessionTenant = session.user.tenantId || session.user.tenant_id;
    const tenantId = (await resolveCollegeAdminTenantId(userId, sessionTenant)) || sessionTenant;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const result = await query(
      `SELECT
         jp.id,
         jp.title,
         jp.description,
         jp.salary_min,
         jp.salary_max,
         jp.min_cgpa,
         jp.vacancies,
         jp.skills_required,
         jp.job_type,
         jp.status,
         jp.created_at,
         ep.id AS employer_id,
         ep.company_name,
         ep.website,
         jpv.college_status,
         jpv.approved_at AS college_approved_at,
         jpv.rejection_reason
       FROM job_postings jp
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       INNER JOIN job_posting_visibility jpv
         ON jpv.job_id = jp.id AND jpv.tenant_id = $1::uuid
       INNER JOIN employer_approvals ea
         ON ea.employer_id = ep.id
        AND ea.tenant_id = $1::uuid
        AND ea.status = 'approved'
       WHERE jp.job_type IN ('internship', 'short_project', 'hackathon')
         AND jp.status = 'published' ${AND_JP_NOT_DELETED}
       ORDER BY
         CASE jpv.college_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
         jp.created_at DESC`,
      [tenantId],
    );

    return NextResponse.json({ internships: result.rows });
  } catch (e) {
    console.error('GET /api/college/internships', e);
    return NextResponse.json({ error: 'Failed to load internships' }, { status: 500 });
  }
}

/** PATCH { jobId, action: 'approve' | 'reject', rejectionReason? } */
async function __platform_PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const sessionTenant = session.user.tenantId || session.user.tenant_id;
    const tenantId = (await resolveCollegeAdminTenantId(userId, sessionTenant)) || sessionTenant;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const jobId = String(body?.jobId || '').trim();
    const action = body?.action;
    const rejectionReason = body?.rejectionReason ? String(body.rejectionReason).trim() : null;

    if (!jobId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'jobId and a valid action (approve|reject) are required' }, { status: 400 });
    }

    const result = await patchCollegeJobListingApproval({
      userId,
      tenantId,
      jobId,
      action,
      rejectionReason,
      jobTypes: ['internship', 'short_project', 'hackathon'],
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, currentStatus: result.currentStatus },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      jobId: result.jobId,
      collegeStatus: result.collegeStatus,
    });
  } catch (e) {
    console.error('PATCH /api/college/internships', e);
    return NextResponse.json({ error: 'Failed to update listing approval' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_college_internships' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
