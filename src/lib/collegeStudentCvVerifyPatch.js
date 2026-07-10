import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { resolveCollegeStaffTenantFromSession } from '@/lib/sessionTenant';
import { assertCollegeCvVerifier } from '@/lib/collegeCvVerification';
import { isStudentCvVerificationReady } from '@/lib/studentCv';
import { mapStudentCvRow } from '@/lib/studentCvShared';

export async function patchCollegeStudentCvVerify(request, studentId, cvId) {
  const session = await getServerSession(authOptions);
  const tenantId = await resolveCollegeStaffTenantFromSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
  }

  const verifierGate = await assertCollegeCvVerifier(session, tenantId);
  if (!verifierGate.ok) {
    return NextResponse.json({ error: verifierGate.error }, { status: verifierGate.status });
  }

  const verificationReady = await isStudentCvVerificationReady();
  if (!verificationReady) {
    return NextResponse.json(
      { error: 'CV verification is not available until migration 102_student_cv_verification.sql is applied.' },
      { status: 503 },
    );
  }

  if (!studentId || !cvId) {
    return NextResponse.json({ error: 'Student id and CV id are required' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const verified = body?.verified === true;

  const check = await query(
    `SELECT sc.id
     FROM student_cvs sc
     INNER JOIN student_profiles sp ON sp.id = sc.student_id
     WHERE sc.id = $1::uuid AND sc.student_id = $2::uuid AND sp.tenant_id = $3::uuid
       AND sc.archived_at IS NULL AND ${SP_ACTIVE_CLAUSE}
     LIMIT 1`,
    [cvId, studentId, tenantId],
  );
  if (!check.rows.length) {
    return NextResponse.json({ error: 'CV not found for this student' }, { status: 404 });
  }

  const updated = await query(
    `UPDATE student_cvs
     SET cv_verified_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
         cv_verified_by = CASE WHEN $2 THEN $3::uuid ELSE NULL END,
         updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING id, label, file_size, is_default, archived_at, cv_verified_at, cv_verified_by, created_at, updated_at`,
    [cvId, verified, session.user.id],
  );

  return NextResponse.json({ item: mapStudentCvRow(updated.rows[0]), verified });
}
