import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isAssessmentRoundKind } from '@/lib/assessmentRoundMap';
import { fetchAssessmentUpdateOnlineRows, saveAssessmentUpdateOnlineRows } from '@/lib/assessmentUpdateOnline';
import { isUuid } from '@/lib/tenantContext';
import { writePlatformErrorLog } from '@/lib/platformErrorLog';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

function parseContext(url) {
  const tenantId = url.searchParams.get('tenantId')?.trim() || '';
  const driveId = url.searchParams.get('driveId')?.trim() || null;
  const jobId = url.searchParams.get('jobId')?.trim() || null;
  return { tenantId, driveId, jobId };
}

/** GET — campus students with hiring_result for online editing. */
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
    const context = parseContext(url);

    if (!isAssessmentRoundKind(kind)) {
      return NextResponse.json({ error: 'kind must be internship, jobs, drive, or projects' }, { status: 400 });
    }
    if (!context.tenantId || !isUuid(context.tenantId)) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    if (!context.driveId && !context.jobId) {
      return NextResponse.json({ error: 'driveId or jobId is required' }, { status: 400 });
    }

    const payload = await fetchAssessmentUpdateOnlineRows(employerId, kind, context);
    return NextResponse.json(payload);
  } catch (e) {
    console.error('GET /api/employer/assessment-update-online', e);
    return NextResponse.json({ error: e.message || 'Failed to load students' }, { status: 500 });
  }
}

/** PATCH — save hiring_result / remarks for student rows. */
async function __platform_PATCH(request) {
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
    const driveId = body?.driveId ? String(body.driveId).trim() : null;
    const jobId = body?.jobId ? String(body.jobId).trim() : null;

    if (!isAssessmentRoundKind(kind)) {
      return NextResponse.json({ error: 'kind must be internship, jobs, drive, or projects' }, { status: 400 });
    }
    if (!tenantId || !isUuid(tenantId)) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const result = await saveAssessmentUpdateOnlineRows(
      employerId,
      session.user.id || null,
      kind,
      { tenantId, driveId, jobId },
      Array.isArray(body?.rows) ? body.rows : [],
    );

    if (result.errors && result.errors.length > 0) {
      writePlatformErrorLog({
        context: 'api_employer_assessment_update_online_patch',
        error: new Error(`Online assessment update completed with ${result.errors.length} errors/skips`),
        statusCode: 200,
        severity: 'warning',
        userId: session.user.id || null,
        employerId,
        userMessage: `Online assessment update: partial errors/skips occurred`,
        details: {
          kind,
          tenantId,
          driveId,
          jobId,
          savedCount: result.saved,
          errors: result.errors,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, saved: result.saved, errors: result.errors });
  } catch (e) {
    console.error('PATCH /api/employer/assessment-update-online', e);
    const status = e?.statusCode || (e.message?.includes('At most') || e.message?.includes('required') ? 400 : 500);
    return NextResponse.json({ error: e.message || 'Failed to save' }, { status });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_employer_assessment_update_online' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
