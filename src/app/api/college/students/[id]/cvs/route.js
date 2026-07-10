import { NextResponse } from 'next/server';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { getCollegeStudentCvListResponse } from '@/lib/collegeStudentCvListGet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request, { params }) {
  try {
    const { id } = await params;
    return await getCollegeStudentCvListResponse(request, id);
  } catch (e) {
    console.error('GET /api/college/students/[id]/cvs', e);
    return NextResponse.json({ error: 'Failed to load student CVs' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers({ GET: __platform_GET }, { context: 'api_college_student_cvs' });
export const GET = __platformApiHandlers.GET;
