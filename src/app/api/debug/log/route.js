/** @no-platform-error-wrap — client debug ingest; manual try/catch to avoid recursion */
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Public endpoint — no auth required (called from browser before/without a session).
 * Accepts a structured debug trace from any client-side module and persists to platform_error_logs.
 */
export async function POST(request) {
  try {
    let body = {};
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { module, steps, email, userAgent, sessionId } = body;

    if (!steps || !Array.isArray(steps)) {
      return NextResponse.json({ error: 'steps[] is required' }, { status: 400 });
    }

    const safeModule = typeof module === 'string' ? module.replace(/[^a-z0-9_]/gi, '_').slice(0, 60) : 'unknown';
    const safeEmail = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 200) : null;

    const xff = request.headers.get('x-forwarded-for');
    const ipAddress = xff ? xff.split(',')[0].trim().slice(0, 45) : (request.headers.get('x-real-ip') || null);

    const safeSteps = steps.slice(0, 200).map((s) => ({
      t: s.t,
      event: typeof s.event === 'string' ? s.event.slice(0, 200) : String(s.event || ''),
      data: s.data ?? null,
    }));

    const lastStep = safeSteps[safeSteps.length - 1];
    const failed =
      lastStep?.event?.toLowerCase().includes('fail') ||
      lastStep?.event?.toLowerCase().includes('error') ||
      lastStep?.data?.ok === false ||
      lastStep?.data?.error;

    const summary = `[DEBUG:client] ${safeModule} — ${safeSteps.length} steps — ${failed ? 'FAILED' : 'OK'}${safeEmail ? ` — ${safeEmail}` : ''}`;

    await query(
      `INSERT INTO platform_error_logs
         (severity, context, status_code, user_message, error_message, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        failed ? 'warning' : 'info',
        `debug_${safeModule}`.slice(0, 80),
        failed ? 400 : 200,
        summary,
        summary,
        JSON.stringify({
          source: 'client_debug',
          module: safeModule,
          email: safeEmail,
          sessionId: typeof sessionId === 'string' ? sessionId.slice(0, 64) : null,
          userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 300) : null,
          steps: safeSteps,
        }),
        ipAddress,
      ],
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/debug/log', err);
    return NextResponse.json({ error: 'Failed to write log' }, { status: 500 });
  }
}
