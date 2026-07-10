import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isAssessmentRoundKind } from '@/lib/assessmentRoundMap';
import { jobTypesClauseForAssessmentKind } from '@/lib/employerAssessmentTargetKinds';
import { AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';
import { isUuid } from '@/lib/tenantContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerId(userId) {
  const r = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid`, [userId]);
  return r.rows[0] || null;
}

function formatDriveLabel(row) {
  const title = row.role || row.title || '';
  if (!title) return row.id;
  if (!row.date) return title;
  const dateLabel = new Date(row.date).toLocaleDateString(undefined, { dateStyle: 'medium' });
  return `${title} · ${dateLabel}`;
}

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    const emp = await getEmployerId(userId);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const tenantId = String(searchParams.get('tenantId') || '').trim();
    const kind = String(searchParams.get('kind') || '').trim();

    if (!isAssessmentRoundKind(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }
    if (!tenantId || !isUuid(tenantId)) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const approval = await query(
      `SELECT 1 FROM employer_approvals
       WHERE tenant_id = $1::uuid AND employer_id = $2::uuid AND status = 'approved'
       LIMIT 1`,
      [tenantId, emp.id],
    );
    if (!approval.rowCount) {
      return NextResponse.json({ error: 'No approved partnership with this campus' }, { status: 403 });
    }

    if (kind === 'drive') {
      const drives = await query(
        `SELECT d.id, d.title AS role, d.drive_date AS date
         FROM placement_drives d
         WHERE d.employer_id = $1::uuid
           AND d.tenant_id = $2::uuid
           ${AND_DRIVE_NOT_DELETED}
         ORDER BY d.drive_date DESC NULLS LAST, d.created_at DESC`,
        [emp.id, tenantId],
      );
      return NextResponse.json({
        targets: drives.rows.map((d) => ({ id: d.id, label: formatDriveLabel(d) })),
      });
    }

    const alumniOnly = searchParams.get('alumniOnly') === '1' || searchParams.get('alumniOnly') === 'true';
    const { clause, params: typeParams } = jobTypesClauseForAssessmentKind(kind, {
      alumniOnly: alumniOnly && kind === 'jobs',
    });
    const jobs = await query(
      `SELECT jp.id, jp.title, jp.job_type
       FROM job_postings jp
       WHERE jp.employer_id = $1::uuid
         AND EXISTS (
           SELECT 1 FROM job_posting_visibility jpv
           WHERE jpv.job_id = jp.id AND jpv.tenant_id = $2::uuid
         )
         ${clause}
         ${AND_JP_NOT_DELETED}
       ORDER BY jp.created_at DESC`,
      [emp.id, tenantId, ...typeParams],
    );

    return NextResponse.json({
      targets: jobs.rows.map((j) => ({
        id: j.id,
        label: j.title || j.id,
        jobType: j.job_type,
      })),
    });
  } catch (e) {
    console.error('GET /api/employer/assessments/targets', e);
    return NextResponse.json({ error: 'Failed to load targets' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_assessments_targets' });
export const GET = __platformApiHandlers.GET;
