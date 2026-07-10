import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/tenantContext';
import {
  buildAssessmentSummary,
  fetchAssessmentRowsForView,
} from '@/lib/assessmentHiringView';
import { listAssessmentContextStatuses } from '@/lib/assessmentContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

async function employerHasApprovedTenant(userId, tenantId) {
  const emp = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  const eid = emp.rows[0]?.id;
  if (!eid) return false;
  const r = await query(
    `SELECT 1 FROM employer_approvals
     WHERE employer_id = $1::uuid AND tenant_id = $2::uuid AND status = 'approved'
     LIMIT 1`,
    [eid, tenantId],
  );
  return r.rows.length > 0;
}

function contextKey(row) {
  if (row.upload_drive_id) return `drive:${row.upload_drive_id}`;
  if (row.upload_job_id) return `job:${row.upload_job_id}:${row.tenant_id}`;
  return '';
}

/** GET — hiring results dashboard (draft + submitted). */
async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const url = new URL(request.url);
    const tenantParam = url.searchParams.get('tenantId');
    const tenantId =
      tenantParam && isUuid(tenantParam) && (await employerHasApprovedTenant(session.user.id, tenantParam))
        ? tenantParam
        : null;

    const rows = await fetchAssessmentRowsForView({
      employerId,
      tenantId: tenantId || undefined,
    });

    const contexts = await listAssessmentContextStatuses(employerId, {
      tenantId: tenantId || undefined,
    });
    const statusByKey = new Map();
    for (const c of contexts) {
      const key = c.drive_id ? `drive:${c.drive_id}` : `job:${c.job_id}:${c.tenant_id}`;
      statusByKey.set(key, c.submission_status);
    }

    const enrichedRows = rows.map((r) => ({
      ...r,
      submission_status: statusByKey.get(contextKey(r)) || 'draft',
    }));

    const summary = buildAssessmentSummary(enrichedRows);

    return NextResponse.json({
      rows: enrichedRows,
      summary,
      tenantFilter: tenantId,
      contexts,
    });
  } catch (e) {
    console.error('GET /api/employer/hiring-assessment-view', e);
    return NextResponse.json({ error: 'Failed to load assessment view' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_hiring_assessment_view' });
export const GET = __platformApiHandlers.GET;
