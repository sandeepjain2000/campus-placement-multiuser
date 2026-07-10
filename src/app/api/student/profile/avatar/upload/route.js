import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isS3Configured, uploadStudentAvatarBuffer, describeStorageError } from '@/lib/s3';
import { toSignedViewUrl } from '@/lib/clientAssetUrl';
import {
  normalizeStudentAvatarContentType,
  validateStudentAvatarBuffer,
  validateStudentAvatarFile,
} from '@/lib/studentAvatarUpload';

function buildAvatarViewUrl(fileUrl) {
  return toSignedViewUrl(fileUrl) || String(fileUrl || '').trim();
}

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
          hint: 'Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME on the server.',
        },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const meta = validateStudentAvatarFile({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!meta.ok) {
      return NextResponse.json({ error: meta.error }, { status: 400 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = validateStudentAvatarBuffer(buffer, meta.contentType);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const uploaded = await uploadStudentAvatarBuffer({
      userId,
      fileName: file.name || 'photo',
      contentType: validated.contentType,
      body: buffer,
    });

    const upd = await query(
      `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 AND role = 'student' RETURNING avatar_url`,
      [uploaded.fileUrl, userId],
    );

    if (!upd.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      avatar_url: upd.rows[0].avatar_url,
      fileUrl: uploaded.fileUrl,
      viewUrl: buildAvatarViewUrl(upd.rows[0].avatar_url),
    });
  } catch (e) {
    console.error('POST /api/student/profile/avatar/upload', e);
    const msg = String(e?.message || '');
    if (msg.includes('S3 is not configured')) {
      return NextResponse.json({ error: 'Cloud storage not configured', hint: msg }, { status: 503 });
    }
    return NextResponse.json({ error: describeStorageError(e) }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_student_profile_avatar_upload' });
export const POST = __platformApiHandlers.POST;
