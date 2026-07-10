import { NextResponse } from 'next/server';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { handleStudentCvUploadPost } from '@/lib/studentCvUploadHandler';
import { describeStorageError } from '@/lib/s3';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

async function __platform_POST(req) {
  try {
    return await handleStudentCvUploadPost(req);
  } catch (e) {
    console.error('POST /api/student/cvs/upload', e);
    return NextResponse.json({ error: describeStorageError(e) }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers({ POST: __platform_POST }, { context: 'api_student_cvs_upload' });
export const POST = __platformApiHandlers.POST;
