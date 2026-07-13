import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isS3Configured } from '@/lib/s3';
import { isCvDownloadRequest, presignLegacyResumeFile } from '@/lib/studentCvPresign';
import { extractS3Key, getLatestResumeForStudent } from '@/lib/employerApplicationAccess';
import { isAuthoritativeResumeUrl, resolveStudentResumeUrl } from '@/lib/studentResumeUrl';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { resolveCollegeStaffTenantFromSession } from '@/lib/sessionTenant';
import { assertCollegeStaff } from '@/lib/collegeAccess';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;






function isS3Url(url) {
  try {
    const host = new URL(String(url || '')).hostname.toLowerCase();
    return host.includes('.s3.') || host.includes('amazonaws.com');
  } catch {
    return false;
  }
}

async function __platform_GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const gate = assertCollegeStaff(session);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const tenantId = await resolveCollegeStaffTenantFromSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const { id: studentId } = await params;
    if (!studentId) {
      return NextResponse.json({ error: 'Student id is required' }, { status: 400 });
    }

    const profileRow = await query(
      `SELECT sp.id, sp.resume_url
       FROM student_profiles sp
       WHERE sp.id = $1::uuid AND sp.tenant_id = $2::uuid AND ${SP_ACTIVE_CLAUSE}`,
      [studentId, tenantId],
    );
    if (!profileRow.rows[0]) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const latestResume = await getLatestResumeForStudent(studentId);
    let fileUrl = latestResume?.file_url || '';

    if (!isAuthoritativeResumeUrl(fileUrl)) {
      const docs = await query(
        `SELECT document_type AS type, file_url AS url, uploaded_at AS "uploadedAt"
         FROM student_documents
         WHERE student_id = $1::uuid
         ORDER BY uploaded_at DESC`,
        [studentId],
      );
      fileUrl = resolveStudentResumeUrl({
        resumeUrl: profileRow.rows[0].resume_url,
        documents: docs.rows,
      });
    }

    if (!isAuthoritativeResumeUrl(fileUrl)) {
      return NextResponse.json({ error: 'No uploaded resume found for this student' }, { status: 404 });
    }

    if (isS3Url(fileUrl) && isS3Configured()) {
      const key = extractS3Key(fileUrl);
      if (key) {
        const mode = isCvDownloadRequest(request) ? 'download' : 'view';
        const legacyDoc = (await query(
          `SELECT document_name FROM student_documents
           WHERE student_id = $1::uuid AND LOWER(document_type) = 'resume'
           ORDER BY uploaded_at DESC LIMIT 1`,
          [studentId],
        )).rows[0];
        const { downloadUrl } = await presignLegacyResumeFile({
          fileUrl,
          fileName: legacyDoc?.document_name || 'resume.pdf',
          mode,
        });
        return NextResponse.redirect(downloadUrl);
      }
    }

    return NextResponse.redirect(fileUrl);
  } catch (e) {
    console.error('GET /api/college/students/[id]/resume', e);
    return NextResponse.json({ error: 'Could not open resume' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_students_id_resume' });
export const GET = __platformApiHandlers.GET;
