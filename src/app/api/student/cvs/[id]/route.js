import { NextResponse } from 'next/server';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { handleStudentCvPatch } from '@/lib/studentCvPatchHandler';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_PATCH(request, { params }) {
  try {
    const { id } = await params;
    return await handleStudentCvPatch(request, id);
  } catch (e) {
    console.error('PATCH /api/student/cvs/[id]', e);
    return NextResponse.json({ error: 'Failed to update CV' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers({ PATCH: __platform_PATCH }, { context: 'api_student_cvs_id' });
export const PATCH = __platformApiHandlers.PATCH;
