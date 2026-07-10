/** @no-platform-error-wrap — login debug ingest; manual try/catch to avoid recursion */
import { NextResponse } from 'next/server';
import { writePlatformErrorLog } from '@/lib/platformErrorLog';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';

export const dynamic = 'force-dynamic';

function stepIndicatesFailure(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return false;
  return steps.some((s) => {
    const event = String(s?.event || '').toLowerCase();
    if (event.includes('fail') || event.includes('error') || event.includes('signout')) {
      return true;
    }
    if (s?.data?.ok === false) return true;
    return false;
  });
}

/**
 * Public endpoint — no auth required (called from login page before session exists).
 * Persists login failures and session-guard sign-outs to platform_error_logs only.
 * Successful sign-ins are not logged (avoids polluting the error log UI).
 */
export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { steps, email, userAgent, sessionId } = body;

    if (!steps || !Array.isArray(steps)) {
      return NextResponse.json({ error: 'steps array is required' }, { status: 400 });
    }

    const failed = body.failed === true || stepIndicatesFailure(steps);
    if (!failed) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const safeEmail = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 200) : null;

    const xff = request.headers.get('x-forwarded-for');
    const ipAddress = xff ? xff.split(',')[0].trim().slice(0, 45) : request.headers.get('x-real-ip') || null;

    const details = {
      source: 'login_debug_browser',
      email: safeEmail,
      sessionId: typeof sessionId === 'string' ? sessionId.slice(0, 64) : null,
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 300) : null,
      steps: steps.slice(0, 50).map((s) => ({
        t: s.t,
        event: typeof s.event === 'string' ? s.event.slice(0, 200) : String(s.event || ''),
        data: s.data ?? null,
      })),
    };

    const isStaleGuard = steps.some(
      (s) => String(s?.event || '').toLowerCase().includes('guard_stale'),
    );
    const context = isStaleGuard
      ? PLATFORM_ERROR_CONTEXT.SESSION_STALE_SIGNOUT
      : PLATFORM_ERROR_CONTEXT.LOGIN_FAILED;
    const summary = isStaleGuard
      ? `Stale session sign-out for ${safeEmail || 'unknown'}`
      : `Login failed for ${safeEmail || 'unknown'}`;

    const logId = await writePlatformErrorLog({
      context,
      error: new Error(summary),
      statusCode: isStaleGuard ? 401 : 401,
      severity: 'warning',
      userMessage: summary,
      ipAddress,
      details,
    });

    return NextResponse.json({ ok: true, logId });
  } catch (err) {
    console.error('POST /api/debug/login-log', err);
    return NextResponse.json({ error: 'Failed to write log' }, { status: 500 });
  }
}
