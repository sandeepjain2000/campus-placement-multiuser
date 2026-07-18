import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { resolveCollegeStaffTenantFromSession } from '@/lib/sessionTenant';
import { assertCollegeStaff } from '@/lib/collegeAccess';
import { canVerifyStudentCvs, getCollegeCvVerificationSettings } from '@/lib/collegeCvVerification';
import { isStudentCvsTableReady, listStudentCvsForCollege } from '@/lib/studentCv';
import {
  formatErrorReference,
  getRequestIp,
  postgresErrorHint,
  writePlatformErrorLog,
} from '@/lib/platformErrorLog';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';
import { appendErrorReference } from '@/lib/errorReference';
import { CV_SYSTEM_ERROR_CODES } from '@/lib/cvSystemErrorCodes';

const COLLEGE_CV_LOAD_WARNING = 'We could not load student CVs right now. Try again in a moment.';

function normalizeCaughtError(error) {
  if (error instanceof Error) return error;
  const err = new Error(
    error && typeof error === 'object' && error.message
      ? String(error.message)
      : String(error || 'Unknown college CV list failure'),
  );
  if (error && typeof error === 'object') {
    if (error.code != null) err.code = error.code;
    if (error.detail != null) err.detail = error.detail;
  }
  return err;
}

function requestPath(request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return '/api/college/students/[id]/student-cv-list';
  }
}

async function logCollegeCvSoftFailure(request, session, error, errorCode, userMessage, extra = {}) {
  const err = normalizeCaughtError(error);
  const hint = postgresErrorHint(err);
  const referenceId = await writePlatformErrorLog({
    context: PLATFORM_ERROR_CONTEXT.COLLEGE_STUDENT_CV_LIST,
    error: err,
    errorCode: errorCode || err.code || null,
    statusCode: errorCode === CV_SYSTEM_ERROR_CODES.MIGRATION ? 503 : 500,
    severity: 'error',
    userId: session?.user?.id || session?.user?.sub || null,
    tenantId: session?.user?.tenantId || session?.user?.tenant_id || null,
    userMessage,
    ipAddress: getRequestIp(request),
    details: {
      source: 'cv_soft_failure',
      route: requestPath(request),
      requestMethod: 'GET',
      systemErrorCode: errorCode,
      actorEmail: session?.user?.email || null,
      pgCode: err.code || null,
      pgHint: hint,
      studentId: extra.studentId || null,
      // Keep original message distinct from the friendly userMessage
      technicalMessage: err.message,
    },
  });
  const reference = formatErrorReference(referenceId);
  return {
    referenceId,
    reference,
    warning: appendErrorReference(userMessage, { reference, referenceId }),
    errorCode,
  };
}

export async function getCollegeStudentCvListResponse(request, studentId) {
  const session = await getServerSession(authOptions);
  const gate = assertCollegeStaff(session);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const tenantId = await resolveCollegeStaffTenantFromSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
  }

  if (!studentId) {
    return NextResponse.json({ error: 'Student id is required' }, { status: 400 });
  }

  const ready = await isStudentCvsTableReady();
  // Soft-empty when the labelled-CV table is not migrated yet — avoid a 5xx toast that
  // appends "Full details were saved for the platform administrator."
  if (!ready) {
    const meta = await logCollegeCvSoftFailure(
      request,
      session,
      new Error('student_cvs table or label column missing — run migration 099_student_cvs.sql'),
      CV_SYSTEM_ERROR_CODES.MIGRATION,
      'CV management is not available until setup is finished.',
      { studentId },
    );
    return NextResponse.json({
      items: [],
      requireCvVerification: false,
      delegateCvVerificationToCommittee: false,
      canVerify: false,
      cvManagementAvailable: false,
      unavailable: true,
      ...meta,
    });
  }

  let check;
  try {
    check = await query(
      `SELECT id FROM student_profiles
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND ${SP_ACTIVE_CLAUSE}
       LIMIT 1`,
      [studentId, tenantId],
    );
  } catch (e) {
    const meta = await logCollegeCvSoftFailure(
      request,
      session,
      e,
      CV_SYSTEM_ERROR_CODES.COLLEGE_LIST_QUERY,
      COLLEGE_CV_LOAD_WARNING,
      { studentId },
    );
    return NextResponse.json({
      items: [],
      requireCvVerification: false,
      canVerify: false,
      unavailable: true,
      ...meta,
    });
  }

  if (!check.rows.length) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get('includeArchived') === '1';
  let settings = { requireCvVerification: false, delegateCvVerificationToCommittee: false };
  try {
    settings = await getCollegeCvVerificationSettings(tenantId);
  } catch (e) {
    console.error('getCollegeCvVerificationSettings', e);
  }

  let items = [];
  try {
    items = await listStudentCvsForCollege(studentId, { includeArchived });
  } catch (e) {
    console.error('listStudentCvsForCollege', e);
    const meta = await logCollegeCvSoftFailure(
      request,
      session,
      e,
      CV_SYSTEM_ERROR_CODES.COLLEGE_LIST_QUERY,
      'Could not load labelled CVs for this student.',
      { studentId },
    );
    return NextResponse.json({
      items: [],
      requireCvVerification: Boolean(settings.requireCvVerification),
      delegateCvVerificationToCommittee: Boolean(settings.delegateCvVerificationToCommittee),
      canVerify: canVerifyStudentCvs(session, settings),
      cvManagementAvailable: true,
      unavailable: true,
      ...meta,
    });
  }

  return NextResponse.json({
    items,
    requireCvVerification: settings.requireCvVerification,
    delegateCvVerificationToCommittee: settings.delegateCvVerificationToCommittee,
    canVerify: canVerifyStudentCvs(session, settings),
    cvManagementAvailable: true,
  });
}

/** Soft empty payload used by route catch blocks (never HTTP 500 — avoids empty api_response logs). */
export async function collegeCvListSoftEmptyResponse(request, error) {
  console.error('GET college student CV list failed:', error);
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }
  let studentId = null;
  try {
    const parts = requestPath(request).split('/');
    const idx = parts.indexOf('students');
    if (idx >= 0 && parts[idx + 1]) studentId = parts[idx + 1];
  } catch {
    studentId = null;
  }
  try {
    const meta = await logCollegeCvSoftFailure(
      request,
      session,
      error,
      CV_SYSTEM_ERROR_CODES.COLLEGE_LIST,
      COLLEGE_CV_LOAD_WARNING,
      { studentId },
    );
    return NextResponse.json({
      items: [],
      requireCvVerification: false,
      canVerify: false,
      unavailable: true,
      ...meta,
    });
  } catch (logErr) {
    console.error('collegeCvListSoftEmptyResponse logging failed', logErr);
    return NextResponse.json({
      items: [],
      requireCvVerification: false,
      canVerify: false,
      unavailable: true,
      warning: COLLEGE_CV_LOAD_WARNING,
    });
  }
}
