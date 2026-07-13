import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { resolveCollegeStaffTenantFromSession } from '@/lib/sessionTenant';
import { assertCollegeStaff } from '@/lib/collegeAccess';
import { isStudentCvsTableReady } from '@/lib/studentCv';
import { isCvDownloadRequest, presignStudentCvFile } from '@/lib/studentCvPresign';

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
  if (!row?.file_url) {
    return NextResponse.json({ error: 'CV not found' }, { status: 404 });
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
    return NextResponse.json({ error: e.message || 'Could not open CV' }, { status: 503 });
  }
}
