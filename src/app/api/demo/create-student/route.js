import { NextResponse } from 'next/server';
import { isDemoDataApiEnabled, demoDataDisabledResponse } from '@/lib/demoDataAccess';
import { createDemoStudents } from '@/lib/demoDataFactory';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;






async function __platform_POST(request) {
  if (!isDemoDataApiEnabled()) return demoDataDisabledResponse();
  try {
    const body = await request.json().catch(() => ({}));
    const tenantId = body?.tenantId ? String(body.tenantId).trim() : undefined;
    const count = body?.count != null ? Number(body.count) : 1;
    const payload = await createDemoStudents({ tenantId, count });
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  } catch (e) {
    console.error('POST /api/demo/create-student', e);
    return NextResponse.json({ ok: false, error: e.message || 'Failed to create student' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_demo_create_student' });
export const POST = __platformApiHandlers.POST;
