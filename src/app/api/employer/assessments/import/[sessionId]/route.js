import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { isUuid } from '@/lib/tenantContext';
import {
  commitStagingSession,
  loadImportStagingSession,
  rejectStagingSession,
  revalidateStagingRow,
} from '@/lib/assessmentImportStaging';
import { HIRING_RESULT_OPTIONS } from '@/lib/hiringResult';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

/** GET — load import review session */
async function __platform_GET(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const { sessionId } = await params;
    if (!sessionId || !isUuid(sessionId)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
    }

    const loaded = await loadImportStagingSession(null, employerId, sessionId);
    if (!loaded) return NextResponse.json({ error: 'Import session not found' }, { status: 404 });

    const invalidCount = loaded.rows.filter((r) => !r.is_valid).length;
    return NextResponse.json({
      session: loaded.session,
      rows: loaded.rows,
      invalidCount,
      hiringResultOptions: HIRING_RESULT_OPTIONS,
      canAccept: loaded.session.status === 'pending_review' && invalidCount === 0 && loaded.rows.length > 0,
    });
  } catch (e) {
    console.error('GET /api/employer/assessments/import/[sessionId]', e);
    return NextResponse.json({ error: 'Failed to load import session' }, { status: 500 });
  }
}

/** PATCH — fix a staging row */
async function __platform_PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const { sessionId } = await params;
    if (!sessionId || !isUuid(sessionId)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const rowId = String(body?.rowId || '').trim();
    if (!rowId || !isUuid(rowId)) {
      return NextResponse.json({ error: 'rowId required' }, { status: 400 });
    }

    const updated = await transaction((client) =>
      revalidateStagingRow(client, employerId, rowId, body?.patch || body),
    );
    if (!updated) return NextResponse.json({ error: 'Row not found or session closed' }, { status: 404 });

    const loaded = await loadImportStagingSession(null, employerId, sessionId);
    const invalidCount = loaded?.rows.filter((r) => !r.is_valid).length ?? 0;

    return NextResponse.json({
      row: updated,
      invalidCount,
      canAccept: loaded?.session.status === 'pending_review' && invalidCount === 0,
    });
  } catch (e) {
    console.error('PATCH /api/employer/assessments/import/[sessionId]', e);
    return NextResponse.json({ error: 'Failed to update row' }, { status: 500 });
  }
}

/** POST — accept or reject import */
async function __platform_POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const { sessionId } = await params;
    if (!sessionId || !isUuid(sessionId)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();

    if (action === 'reject') {
      const ok = await transaction((client) => rejectStagingSession(client, employerId, sessionId));
      if (!ok) return NextResponse.json({ error: 'Session not found or already closed' }, { status: 404 });
      return NextResponse.json({ ok: true, status: 'rejected' });
    }

    if (action === 'accept') {
      const loaded = await loadImportStagingSession(null, employerId, sessionId);
      if (!loaded) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

      const result = await transaction((client) =>
        commitStagingSession(client, {
          employerId,
          userId: session.user.id || null,
          sessionId,
          opportunityKind: loaded.session.opportunity_kind,
          fileName: loaded.session.original_file_name,
          s3Key: loaded.session.s3_key,
        }),
      );

      if (!result.ok) {
        return NextResponse.json({ error: result.error || 'Commit failed' }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        uploadId: result.uploadId,
        acceptedRows: result.acceptedRows,
        rejectedRows: result.rejectedRows,
      });
    }

    return NextResponse.json({ error: 'action must be accept or reject' }, { status: 400 });
  } catch (e) {
    if (e?.statusCode === 409) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error('POST /api/employer/assessments/import/[sessionId]', e);
    return NextResponse.json({ error: e.message || 'Failed to process import' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
  PATCH: __platform_PATCH,
}, { context: 'api_employer_assessments_import_id' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
export const PATCH = __platformApiHandlers.PATCH;
