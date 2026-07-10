import { NextResponse } from 'next/server';
import { isDemoDataApiEnabled, demoDataDisabledResponse } from '@/lib/demoDataAccess';
import { applyDemoStudentToJob } from '@/lib/demoDataFactory';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;






async function __platform_POST(request) {
  if (!isDemoDataApiEnabled()) return demoDataDisabledResponse();
  try {
    const body = await request.json().catch(() => ({}));
    const tenantId = body?.tenantId ? String(body.tenantId).trim() : undefined;
    const jobId = body?.jobId ? String(body.jobId).trim() : undefined;
    const payload = await applyDemoStudentToJob({ tenantId, jobId });
    const status = payload.ok === false ? 400 : 200;
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        ...payload,
      },
      { status },
    );
  } catch (e) {
    console.error('POST /api/demo/apply-to-job', e);
    return NextResponse.json({ ok: false, error: e.message || 'Failed to apply' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_demo_apply_to_job' });
export const POST = __platformApiHandlers.POST;
