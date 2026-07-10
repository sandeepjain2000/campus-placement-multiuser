import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isAssessmentRoundKind } from '@/lib/assessmentRoundMap';
import { listPendingImportSessions } from '@/lib/assessmentImportStaging';
import { formatAssessImportApiError } from '@/lib/assessmentUploadDbError';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

/** GET — list pending CSV import review sessions. Query: kind=internship|jobs|drive|projects (optional) */
async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const kind = new URL(request.url).searchParams.get('kind')?.trim() || '';
    if (kind && !isAssessmentRoundKind(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }

    const sessions = await listPendingImportSessions(employerId, {
      opportunityKind: kind || null,
    });

    const counts = { internship: 0, jobs: 0, drive: 0, projects: 0 };
    if (!kind) {
      const all = await listPendingImportSessions(employerId);
      for (const s of all) {
        const k = s.opportunity_kind;
        if (counts[k] !== undefined) counts[k] += 1;
      }
    }

    return NextResponse.json({
      sessions,
      counts: kind ? undefined : counts,
    });
  } catch (e) {
    console.error('GET /api/employer/assessments/import', e);
    const { status, message } = formatAssessImportApiError(e, { upload: false });
    return NextResponse.json(
      { error: message, sessions: [], counts: {} },
      { status },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_assessments_import' });
export const GET = __platformApiHandlers.GET;
