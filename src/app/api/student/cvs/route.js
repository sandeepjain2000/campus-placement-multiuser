import { NextResponse } from 'next/server';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { getStudentCvsListResponse } from '@/lib/studentCvsListGet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request) {
  try {
    return await getStudentCvsListResponse(request);
  } catch (e) {
    console.error('GET /api/student/cvs', e);
    return NextResponse.json({ error: 'Failed to load CVs' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers({ GET: __platform_GET }, { context: 'api_student_cvs' });
export const GET = __platformApiHandlers.GET;
