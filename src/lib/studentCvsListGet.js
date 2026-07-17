import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import {
  isStudentCvsTableReady,
  isStudentCvVerificationReady,
  mapStudentCvRow,
  getStudentCampusCvVerificationGate,
  ensureLegacyCvRowFromProfile,
  getStudentCvApplyState,
  buildStudentCvUsageCountSelect,
} from '@/lib/studentCv';

/** Shared GET handler for student labelled CV list (apply picker). */
export async function getStudentCvsListResponse(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ready = await isStudentCvsTableReady();
  if (!ready) {
    return NextResponse.json(
      { error: 'CV management is not available until migration 099_student_cvs.sql is applied.', items: [] },
      { status: 503 },
    );
  }

  const userId = session.user.id || session.user.sub;
  const studentId = await getOrCreateStudentProfileId(userId);
  if (!studentId) {
    return NextResponse.json({ items: [] });
  }

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get('includeArchived') === '1';
  const verificationReady = await isStudentCvVerificationReady();
  const usageCountSql = await buildStudentCvUsageCountSelect();
  const verificationColumns = verificationReady ? ', sc.cv_verified_at, sc.cv_verified_by' : '';

  async function fetchCvRows() {
    return query(
      `SELECT sc.id, sc.label, sc.file_size, sc.is_default, sc.archived_at, sc.created_at, sc.updated_at${verificationColumns},
              (sc.file_url IS NOT NULL AND BTRIM(sc.file_url) <> '') AS has_file,
              ${usageCountSql}
       FROM student_cvs sc
       WHERE sc.student_id = $1::uuid
         ${includeArchived ? '' : 'AND sc.archived_at IS NULL'}
       ORDER BY sc.archived_at NULLS FIRST, sc.is_default DESC, sc.created_at DESC`,
      [studentId],
    );
  }

  let r = await fetchCvRows();
  if (!includeArchived && !r.rows.length) {
    try {
      await ensureLegacyCvRowFromProfile(studentId);
    } catch (e) {
      console.error('ensureLegacyCvRowFromProfile', studentId, e);
    }
    r = await fetchCvRows();
  }

  const applyState = await getStudentCvApplyState(studentId);
  const tenantId = session.user.tenantId ?? session.user.tenant_id;
  const cvVerification = await getStudentCampusCvVerificationGate(studentId, tenantId);

  return NextResponse.json({
    items: r.rows.map((row) => mapStudentCvRow(row)),
    legacyResumeAvailable: Boolean(applyState.hasResume && !r.rows.length),
    cvVerification: {
      required: cvVerification.required,
      hasVerifiedCv: cvVerification.hasVerifiedCv,
    },
  });
}
