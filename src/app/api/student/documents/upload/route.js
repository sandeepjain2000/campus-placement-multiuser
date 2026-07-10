import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { completeStudentDocumentRecord } from '@/lib/completeStudentDocument';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { isS3Configured, uploadStudentDocumentBuffer } from '@/lib/s3';
import {
  normalizeStudentDocumentContentType,
  validateStudentDocumentBuffer,
  validateStudentDocumentFileForType,
} from '@/lib/studentDocumentUpload';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




export const runtime = 'nodejs';

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
          hint: 'Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME on the server (see scripts/verify-aws-credentials.mjs).',
        },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const document_type = String(formData.get('document_type') || 'resume').trim();
    const setAsPrimary =
      String(formData.get('set_as_primary') || '').trim() === '1' ||
      String(formData.get('set_as_primary') || '').toLowerCase() === 'true';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name || 'document';
    const meta = validateStudentDocumentFileForType(
      {
        name: fileName,
        type: file.type,
        size: file.size,
      },
      document_type,
    );
    if (!meta.ok) {
      return NextResponse.json({ error: meta.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = validateStudentDocumentBuffer(buffer, meta);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    const studentId = await getOrCreateStudentProfileId(userId);
    if (!studentId) {
      return NextResponse.json(
        { error: 'Could not resolve your student profile. Contact your placement office to link your account to a campus.' },
        { status: 400 },
      );
    }

    const uploaded = await uploadStudentDocumentBuffer({
      userId,
      fileName: validated.fileName,
      contentType: validated.contentType,
      body: buffer,
    });

    const document = await completeStudentDocumentRecord(studentId, {
      document_type,
      document_name: validated.fileName,
      file_url: uploaded.fileUrl,
      file_size: validated.size,
      setAsPrimaryResume: setAsPrimary && document_type === 'resume',
    });

    return NextResponse.json(
      {
        document,
        fileUrl: uploaded.fileUrl,
        contentType: normalizeStudentDocumentContentType(validated.contentType, validated.fileName),
      },
      { status: 201 },
    );
  } catch (e) {
    console.error('POST /api/student/documents/upload', e);
    const msg = String(e?.message || '');
    if (msg.includes('S3 is not configured')) {
      return NextResponse.json({ error: 'Cloud storage not configured', hint: msg }, { status: 503 });
    }
    return NextResponse.json({ error: msg || 'Upload failed' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_student_documents_upload' });
export const POST = __platformApiHandlers.POST;
