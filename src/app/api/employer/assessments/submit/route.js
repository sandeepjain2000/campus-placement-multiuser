import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { isAssessmentRoundKind } from '@/lib/assessmentRoundMap';
import { submitAssessmentContext, getOrCreateAssessmentContext } from '@/lib/assessmentContext';
import { isUuid } from '@/lib/tenantContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

/** POST — lock hiring results for a campus + opportunity target (draft → submitted). */
async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const kind = String(body?.kind || '').trim();
    const tenantId = String(body?.tenantId || '').trim();
    const driveId = String(body?.driveId || '').trim() || null;
    const jobId = String(body?.jobId || '').trim() || null;

    if (!isAssessmentRoundKind(kind)) {
      return NextResponse.json({ error: 'kind must be internship, jobs, drive, or projects' }, { status: 400 });
    }
    if (!tenantId || !isUuid(tenantId)) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    if (driveId && jobId) {
      return NextResponse.json({ error: 'Provide driveId or jobId, not both' }, { status: 400 });
    }
    if (!driveId && !jobId) {
      return NextResponse.json({ error: 'driveId or jobId is required' }, { status: 400 });
    }
    if (driveId && !isUuid(driveId)) {
      return NextResponse.json({ error: 'Invalid driveId' }, { status: 400 });
    }
    if (jobId && !isUuid(jobId)) {
      return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
    }

    const ctx = await transaction((client) =>
      submitAssessmentContext(client, {
        employerId,
        tenantId,
        opportunityKind: kind,
        driveId,
        jobId,
        userId: session.user.id || null,
      }),
    );

    return NextResponse.json({
      ok: true,
      submission_status: ctx.submission_status,
      submitted_at: ctx.submitted_at,
    });
  } catch (e) {
    console.error('POST /api/employer/assessments/submit', e);
    const status = e?.statusCode || 500;
    return NextResponse.json({ error: e.message || 'Failed to submit results' }, { status });
  }
}

/** GET — submission status for a context */
async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const url = new URL(request.url);
    const kind = url.searchParams.get('kind') || 'jobs';
    const tenantId = url.searchParams.get('tenantId')?.trim() || '';
    const driveId = url.searchParams.get('driveId')?.trim() || null;
    const jobId = url.searchParams.get('jobId')?.trim() || null;

    if (!isAssessmentRoundKind(kind) || !tenantId || !isUuid(tenantId)) {
      return NextResponse.json({ error: 'kind and tenantId required' }, { status: 400 });
    }

    const ctx = await getOrCreateAssessmentContext(null, {
      employerId,
      tenantId,
      opportunityKind: kind,
      driveId,
      jobId,
    });

    return NextResponse.json({
      submission_status: ctx.submission_status || 'draft',
      submitted_at: ctx.submitted_at || null,
    });
  } catch (e) {
    console.error('GET /api/employer/assessments/submit', e);
    return NextResponse.json({ error: 'Failed to load submission status' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_employer_assessments_submit' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
