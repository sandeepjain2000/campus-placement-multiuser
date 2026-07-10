import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createStudentDocumentPresign, isS3Configured } from '@/lib/s3';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const EXT_TO_TYPE = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const MAX_BYTES = 5 * 1024 * 1024;

function normalizeContentType(contentType, fileName) {
  const raw = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (raw && raw !== 'application/octet-stream' && ALLOWED_TYPES.has(raw)) return raw;
  const ext = String(fileName || '').split('.').pop()?.toLowerCase();
  if (ext && EXT_TO_TYPE[ext]) return EXT_TO_TYPE[ext];
  return raw || 'application/octet-stream';
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isS3Configured()) {
      return NextResponse.json(
        {
          error: 'S3 not configured',
          hint: 'Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME on the server.',
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const fileName = String(body.fileName || 'document');
    const contentType = normalizeContentType(body.contentType, fileName);
    const fileSize = Number(body.fileSize || 0);

    if (fileSize > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: 'Unsupported file type — use PDF, Word (.doc/.docx), or images (JPEG, PNG, WebP, GIF)' },
        { status: 400 },
      );
    }

    const out = await createStudentDocumentPresign({
      userId: session.user.id,
      fileName,
      contentType,
    });

    return NextResponse.json(out);
  } catch (e) {
    console.error('POST /api/student/documents/presign', e);
    return NextResponse.json({ error: 'Presign failed' }, { status: 500 });
  }
}
