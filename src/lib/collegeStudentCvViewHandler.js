import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { resolveCollegeStaffTenantFromSession } from '@/lib/sessionTenant';
import { assertCollegeStaff } from '@/lib/collegeAccess';
import { isStudentCvsTableReady } from '@/lib/studentCv';
import { classifyCvStorageFailure, isCvDownloadRequest, presignStudentCvFile } from '@/lib/studentCvPresign';
import {
  formatErrorReference,
  getRequestIp,
  writePlatformErrorLog,
} from '@/lib/platformErrorLog';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';
import { CV_SYSTEM_ERROR_CODES } from '@/lib/cvSystemErrorCodes';

async function logCollegeCvViewFailure(request, session, error, classified) {
  const referenceId = await writePlatformErrorLog({
    context: PLATFORM_ERROR_CONTEXT.COLLEGE_STUDENT_CV_VIEW,
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
      route: '/api/college/students/.../student-cv-view',
      systemErrorCode: classified.errorCode,
      actorEmail: session?.user?.email || null,
    },
  });
  return formatErrorReference(referenceId);
}

export async function handleCollegeStudentCvViewGet(studentId, cvId, request) {
  const session = await getServerSession(authOptions);
  const gate = assertCollegeStaff(session);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const tenantId = await resolveCollegeStaffTenantFromSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
  }

  if (!(await isStudentCvsTableReady())) {
    return NextResponse.json({ error: 'CV management is not available' }, { status: 503 });
  }

  const profileId = String(studentId || '').trim();
  const id = String(cvId || '').trim();
  if (!profileId || !id) {
    return NextResponse.json({ error: 'Missing student or CV id' }, { status: 400 });
  }

  const check = await query(
    `SELECT id FROM student_profiles
     WHERE id = $1::uuid AND tenant_id = $2::uuid AND ${SP_ACTIVE_CLAUSE}
     LIMIT 1`,
    [profileId, tenantId],
  );
  if (!check.rows.length) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const r = await query(
    `SELECT label, file_url, file_extension
     FROM student_cvs
     WHERE id = $1::uuid AND student_id = $2::uuid`,
    [id, profileId],
  );
  const row = r.rows[0];
  if (!row) {
    return NextResponse.json({ error: 'CV not found' }, { status: 404 });
  }
  if (!String(row.file_url || '').trim()) {
    return NextResponse.json(
      {
        error: 'This file is no longer available. Ask the student to re-upload the CV.',
        errorCode: CV_SYSTEM_ERROR_CODES.S3_MISSING,
      },
      { status: 410 },
    );
  }

  try {
    const mode = isCvDownloadRequest(request) ? 'download' : 'view';
    const { downloadUrl } = await presignStudentCvFile({
      fileUrl: row.file_url,
      label: row.label,
      fileExtension: row.file_extension,
      mode,
    });
    return NextResponse.redirect(downloadUrl);
  } catch (e) {
    const classified = classifyCvStorageFailure(e);
    const reference = await logCollegeCvViewFailure(request, session, e, classified);
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
