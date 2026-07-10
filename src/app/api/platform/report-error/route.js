import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  getRequestIp,
  sanitizePayloadForLog,
  writePlatformErrorLog,
  formatErrorReference,
} from '@/lib/platformErrorLog';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function resolveEmployerId(userId) {
  if (!userId) return null;
  const r = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return r.rows[0]?.id || null;
}

/**
 * Client-reported API/UI failures — backup when server route did not persist a log entry.
 * POST { context, route, statusCode?, message, details?, alreadyLogged? }
 */
async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.alreadyLogged || body.referenceId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const message = String(body.message || body.error || 'Client-reported failure').slice(0, 4000);
    const context = String(body.context || PLATFORM_ERROR_CONTEXT.CLIENT_API_FAILURE).slice(0, 80);
    const statusCode = Number.isFinite(body.statusCode) ? Number(body.statusCode) : null;
    const userId = session.user.id || session.user.sub || null;
    const employerId =
      session.user.role === 'employer' ? await resolveEmployerId(userId) : null;

    const id = await writePlatformErrorLog({
      context,
      error: new Error(message),
      statusCode,
      severity: (statusCode ?? 0) >= 500 ? 'error' : 'warning',
      userId,
      employerId,
      userMessage: message,
      ipAddress: getRequestIp(request),
      details: {
        source: 'client_report',
        actorEmail: session.user.email || null,
        route: body.route ? String(body.route).slice(0, 500) : null,
        clientDetails: sanitizePayloadForLog(body.details),
      },
    });

    const ref = formatErrorReference(id);
    return NextResponse.json({
      ok: true,
      referenceId: id || undefined,
      reference: ref || undefined,
    });
  } catch (e) {
    console.error('POST /api/platform/report-error', e);
    return NextResponse.json({ error: 'Failed to record error' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_platform_report_error' });
export const POST = __platformApiHandlers.POST;
