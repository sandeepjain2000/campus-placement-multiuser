import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createEmployerLogoPresign, isS3Configured } from '@/lib/s3';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isS3Configured()) {
      return NextResponse.json({ error: 'S3 not configured' }, { status: 503 });
    }

    const body = await req.json();
    const fileName = String(body.fileName || 'logo');
    const contentType = String(body.contentType || 'application/octet-stream');
    const fileSize = Number(body.fileSize || 0);
    if (fileSize > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 2MB)' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Use JPEG, PNG, WebP, or GIF' }, { status: 400 });
    }

    const out = await createEmployerLogoPresign({
      userId: session.user.id,
      fileName,
      contentType,
    });
    return NextResponse.json(out);
  } catch (e) {
    console.error('POST /api/employer/profile/logo/presign', e);
    return NextResponse.json({ error: 'Presign failed' }, { status: 500 });
  }
}
