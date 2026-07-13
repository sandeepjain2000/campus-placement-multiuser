import { NextResponse } from 'next/server';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { handleCollegeStudentCvViewGet } from '@/lib/collegeStudentCvViewHandler';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request, { params }) {
  try {
    const { id: studentId, cvId } = await params;
    return await handleCollegeStudentCvViewGet(studentId, cvId, request);
  } catch (e) {
    console.error('GET /api/college/students/[id]/student-cv-view/[cvId]', e);
    return NextResponse.json({ error: 'Could not open CV' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET },
  { context: 'api_college_students_id_student_cv_view' },
);
export const GET = __platformApiHandlers.GET;
