import { NextResponse } from 'next/server';
import { isDemoDataApiEnabled, demoDataDisabledResponse } from '@/lib/demoDataAccess';
import { advanceDemoApplication } from '@/lib/demoDataFactory';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;






async function __platform_POST(request) {
  if (!isDemoDataApiEnabled()) return demoDataDisabledResponse();
  try {
    const body = await request.json().catch(() => ({}));
    const tenantId = body?.tenantId ? String(body.tenantId).trim() : undefined;
    const status = body?.status ? String(body.status).trim().toLowerCase() : 'shortlisted';
    const channel = body?.channel ? String(body.channel).trim().toLowerCase() : 'any';
    const payload = await advanceDemoApplication({ tenantId, status, channel });
    const httpStatus = payload.ok === false ? 400 : 200;
    return NextResponse.json({ timestamp: new Date().toISOString(), ...payload }, { status: httpStatus });
  } catch (e) {
    console.error('POST /api/demo/advance-application', e);
    return NextResponse.json({ ok: false, error: e.message || 'Failed to advance application' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_demo_advance_application' });
export const POST = __platformApiHandlers.POST;
