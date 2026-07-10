import { NextResponse } from 'next/server';
import { isDemoDataApiEnabled, demoDataDisabledResponse } from '@/lib/demoDataAccess';
import { ensureDemoIitmTieUps } from '@/lib/employerIitmTieUp';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function __platform_POST(request) {
  if (!isDemoDataApiEnabled()) return demoDataDisabledResponse();
  try {
    const body = await request.json().catch(() => ({}));
    const employerId = body?.employerId ? String(body.employerId).trim() : undefined;
    const payload = await ensureDemoIitmTieUps({ employerId });
    return NextResponse.json({
      ok: payload.ok !== false,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  } catch (e) {
    console.error('POST /api/demo/ensure-iitm-tieup', e);
    return NextResponse.json(
      { ok: false, error: e.message || 'Failed to ensure IIT Madras tie-up' },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_demo_ensure_iitm_tieup' });
export const POST = __platformApiHandlers.POST;
