import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createStudentDocumentPresign, isS3Configured } from '@/lib/s3';
import {
  normalizeStudentDocumentContentType,
  STUDENT_DOCUMENT_MAX_BYTES,
  STUDENT_RESUME_MAX_BYTES,
  validateStudentDocumentFileForType,
  isResumeDocumentType,
} from '@/lib/studentDocumentUpload';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;


async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isS3Configured()) {
      return NextResponse.json(
        {
          error: 'Cloud storage not configured',
          hint: 'Set AWS env vars on the server, or use direct upload when available.',
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const document_type = String(body.document_type || body.documentType || 'resume').trim();
    const fileName = String(body.fileName || 'document');
    const contentType = normalizeStudentDocumentContentType(body.contentType, fileName);
    const fileSize = Number(body.fileSize || 0);

    const check = validateStudentDocumentFileForType(
      { name: fileName, type: contentType, size: fileSize },
      document_type,
    );
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }
    const out = await createStudentDocumentPresign({
      userId,
      fileName: check.fileName,
      contentType: check.contentType,
    });

    return NextResponse.json({
      ...out,
      maxBytes: isResumeDocumentType(document_type) ? STUDENT_RESUME_MAX_BYTES : STUDENT_DOCUMENT_MAX_BYTES,
      preferServerUpload: true,
    });
  } catch (e) {
    console.error('POST /api/student/documents/presign', e);
    return NextResponse.json({ error: 'Presign failed' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_student_documents_presign' });
export const POST = __platformApiHandlers.POST;
