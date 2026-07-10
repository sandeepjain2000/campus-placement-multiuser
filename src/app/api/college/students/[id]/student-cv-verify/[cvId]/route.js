import { NextResponse } from 'next/server';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { patchCollegeStudentCvVerify } from '@/lib/collegeStudentCvVerifyPatch';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_PATCH(request, { params }) {
  try {
    const { id, cvId } = await params;
    return await patchCollegeStudentCvVerify(request, id, cvId);
  } catch (e) {
    console.error('PATCH /api/college/students/[id]/student-cv-verify/[cvId]', e);
    return NextResponse.json({ error: 'Failed to update CV verification' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  { PATCH: __platform_PATCH },
  { context: 'api_college_student_cv_verify' },
);
export const PATCH = __platformApiHandlers.PATCH;
