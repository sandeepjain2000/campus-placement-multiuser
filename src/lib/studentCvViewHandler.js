import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { isStudentCvsTableReady } from '@/lib/studentCv';
import { classifyCvStorageFailure, isCvDownloadRequest, presignStudentCvFile } from '@/lib/studentCvPresign';
import {
  formatErrorReference,
  getRequestIp,
  writePlatformErrorLog,
} from '@/lib/platformErrorLog';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';
import { CV_SYSTEM_ERROR_CODES } from '@/lib/cvSystemErrorCodes';

async function logCvViewFailure(request, session, error, classified) {
  const referenceId = await writePlatformErrorLog({
    context: PLATFORM_ERROR_CONTEXT.STUDENT_CV_VIEW,
    error,
    errorCode: classified.errorCode,
    statusCode: classified.status,
    severity: classified.gone ? 'warning' : 'error',
    userId: session?.user?.id || session?.user?.sub || null,
    tenantId: session?.user?.tenantId || session?.user?.tenant_id || null,
    userMessage: classified.message,
    ipAddress: getRequestIp(request),
    details: {
      source: 'cv_s3_view',
      route: '/api/student/cv-view',
      systemErrorCode: classified.errorCode,
      actorEmail: session?.user?.email || null,
    },
  });
  return formatErrorReference(referenceId);
}

export async function handleStudentCvViewGet(cvId, request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isStudentCvsTableReady())) {
    return NextResponse.json({ error: 'CV management is not available' }, { status: 503 });
  }

  const id = String(cvId || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing CV id' }, { status: 400 });
  }

  const studentId = await getOrCreateStudentProfileId(session.user.id);
  if (!studentId) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
  }

  const r = await query(
    `SELECT label, file_url, file_extension
     FROM student_cvs
     WHERE id = $1::uuid AND student_id = $2::uuid`,
    [id, studentId],
  );
  const row = r.rows[0];
  if (!row) {
    return NextResponse.json({ error: 'CV not found' }, { status: 404 });
  }
  const fileUrl = String(row.file_url || '').trim();
  if (!fileUrl) {
    return NextResponse.json(
      {
        error: 'This file is no longer available. Re-upload the CV to replace it.',
        errorCode: CV_SYSTEM_ERROR_CODES.S3_MISSING,
      },
      { status: 410 },
    );
  }

  try {
    const mode = isCvDownloadRequest(request) ? 'download' : 'view';
    const { downloadUrl } = await presignStudentCvFile({
      fileUrl,
      label: row.label,
      fileExtension: row.file_extension,
      mode,
    });
    return NextResponse.redirect(downloadUrl);
  } catch (e) {
    const classified = classifyCvStorageFailure(e);
    const reference = await logCvViewFailure(request, session, e, classified);
    return NextResponse.json(
      {
        error: classified.message,
        errorCode: classified.errorCode,
        ...(reference ? { reference } : {}),
      },
      { status: classified.status },
    );
  }
}
