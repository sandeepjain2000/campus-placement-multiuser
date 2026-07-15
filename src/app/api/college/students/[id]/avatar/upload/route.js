import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { assertCollegeWriter } from '@/lib/collegeAccess';
import { resolveCollegeStaffTenantFromSession } from '@/lib/sessionTenant';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { isS3Configured, uploadStudentAvatarBuffer, describeStorageError } from '@/lib/s3';
import { toSignedViewUrl } from '@/lib/clientAssetUrl';
import {
  validateStudentAvatarBuffer,
  validateStudentAvatarFile,
} from '@/lib/studentAvatarUpload';
import { formatValidationError } from '@/lib/validationErrorCode';
import { withApiHandlers } from '@/lib/platformErrorRoute';

function buildAvatarViewUrl(fileUrl) {
  return toSignedViewUrl(fileUrl) || String(fileUrl || '').trim();
}

function storageErr(message) {
  return formatValidationError('student.photo', message);
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

async function __platform_POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const gate = assertCollegeWriter(session);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const tenantId = await resolveCollegeStaffTenantFromSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    if (!isS3Configured()) {
      return NextResponse.json(
        {
          error: storageErr('Cloud storage not configured'),
          hint: 'Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME on the server.',
        },
        { status: 503 },
      );
    }

    const { id: studentId } = await params;
    if (!studentId) {
      return NextResponse.json({ error: storageErr('Student id is required.') }, { status: 400 });
    }

    const studentRes = await query(
      `SELECT sp.id, sp.user_id
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.tenant_id = $1::uuid
         AND sp.id = $2::uuid
         AND u.role = 'student'
         AND ${SP_ACTIVE_CLAUSE}
       LIMIT 1`,
      [tenantId, studentId],
    );
    const student = studentRes.rows[0];
    if (!student?.user_id) {
      return NextResponse.json({ error: storageErr('Student not found.') }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: storageErr('No file selected.') }, { status: 400 });
    }

    const meta = validateStudentAvatarFile({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!meta.ok) {
      return NextResponse.json({ error: meta.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = validateStudentAvatarBuffer(buffer, meta.contentType);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const uploaded = await uploadStudentAvatarBuffer({
      userId: student.user_id,
      fileName: file.name || 'photo',
      contentType: validated.contentType,
      body: buffer,
    });

    const upd = await query(
      `UPDATE users SET avatar_url = $1, updated_at = NOW()
       WHERE id = $2::uuid AND role = 'student'
       RETURNING avatar_url`,
      [uploaded.fileUrl, student.user_id],
    );

    if (!upd.rows[0]) {
      return NextResponse.json({ error: storageErr('User not found.') }, { status: 404 });
    }

    return NextResponse.json({
      avatar_url: upd.rows[0].avatar_url,
      fileUrl: uploaded.fileUrl,
      viewUrl: buildAvatarViewUrl(upd.rows[0].avatar_url),
      studentId,
      storage: 's3',
      bucket: uploaded.bucket,
      key: uploaded.key,
    });
  } catch (e) {
    console.error('POST /api/college/students/[id]/avatar/upload', e);
    const msg = String(e?.message || '');
    if (msg.includes('S3 is not configured')) {
      return NextResponse.json({ error: storageErr('Cloud storage not configured'), hint: msg }, { status: 503 });
    }
    return NextResponse.json({ error: storageErr(describeStorageError(e)) }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  {
    POST: __platform_POST,
  },
  { context: 'api_college_student_avatar_upload' },
);
export const POST = __platformApiHandlers.POST;
