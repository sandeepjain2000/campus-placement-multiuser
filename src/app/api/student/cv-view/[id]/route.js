import { NextResponse } from 'next/server';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { handleStudentCvViewGet } from '@/lib/studentCvViewHandler';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(_request, { params }) {
  try {
    const { id } = await params;
    return await handleStudentCvViewGet(id);
  } catch (e) {
    console.error('GET /api/student/cv-view/[id]', e);
    return NextResponse.json({ error: 'Could not open CV' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers({ GET: __platform_GET }, { context: 'api_student_cv_view' });
export const GET = __platformApiHandlers.GET;
