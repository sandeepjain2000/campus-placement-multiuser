import { NextResponse } from 'next/server';
import { isDemoDataApiEnabled, demoDataDisabledResponse } from '@/lib/demoDataAccess';
import { ensureEmployerTieUpBootstrap } from '@/lib/employerTieUpBootstrap';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

/** POST { scope?: 'demo' | 'all' } — restore approved campus–employer tie-ups. */
async function __platform_POST(request) {
  if (!isDemoDataApiEnabled()) return demoDataDisabledResponse();
  try {
    const body = await request.json().catch(() => ({}));
    const scope = body?.scope === 'all' ? 'all' : 'demo';
    const payload = await ensureEmployerTieUpBootstrap({ scope });
    return NextResponse.json({
      ok: payload.ok !== false,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  } catch (e) {
    console.error('POST /api/demo/ensure-all-tieups', e);
    return NextResponse.json(
      { ok: false, error: e.message || 'Failed to restore tie-ups' },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_demo_ensure_all_tieups' });
export const POST = __platformApiHandlers.POST;
