import { NextResponse } from 'next/server';
import { isDemoDataApiEnabled, demoDataDisabledResponse } from '@/lib/demoDataAccess';
import { listDemoColleges } from '@/lib/demoDataFactory';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;






async function __platform_GET() {
  if (!isDemoDataApiEnabled()) return demoDataDisabledResponse();
  try {
    const colleges = await listDemoColleges();
    return NextResponse.json({ colleges });
  } catch (e) {
    console.error('GET /api/demo/colleges', e);
    return NextResponse.json({ error: 'Failed to load colleges' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_demo_colleges' });
export const GET = __platformApiHandlers.GET;
