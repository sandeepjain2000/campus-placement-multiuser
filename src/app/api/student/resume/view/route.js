import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { createDownloadUrlForKey, isS3Configured } from '@/lib/s3';
import { isAuthoritativeResumeUrl, resolveStudentResumeUrl } from '@/lib/studentResumeUrl';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




function extractS3Key(fileUrl) {
  try {
    const u = new URL(String(fileUrl || ''));
    const key = decodeURIComponent((u.pathname || '').replace(/^\/+/, ''));
    return key || null;
  } catch {
    return null;
  }
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const studentId = await getOrCreateStudentProfileId(userId);
    if (!studentId) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const [profileRes, docsRes] = await Promise.all([
      query(`SELECT resume_url FROM student_profiles WHERE id = $1::uuid`, [studentId]),
      query(
        `SELECT document_type, document_name, file_url, uploaded_at
         FROM student_documents
         WHERE student_id = $1::uuid
         ORDER BY uploaded_at DESC`,
        [studentId],
      ),
    ]);

    const documents = docsRes.rows.map((row) => ({
      type: row.document_type,
      name: row.document_name,
      url: row.file_url,
      uploadedAt: row.uploaded_at,
    }));

    const resumeUrl = resolveStudentResumeUrl({
      resumeUrl: profileRes.rows[0]?.resume_url,
      documents,
    });

    if (!resumeUrl) {
      return NextResponse.json({ error: 'No résumé uploaded yet' }, { status: 404 });
    }

    if (!isAuthoritativeResumeUrl(resumeUrl)) {
      return NextResponse.redirect(resumeUrl);
    }

    if (!isS3Configured()) {
      return NextResponse.json({ error: 'File storage not configured' }, { status: 503 });
    }

    const key = extractS3Key(resumeUrl);
    if (!key) {
      return NextResponse.json({ error: 'Invalid résumé file location' }, { status: 400 });
    }

    const { downloadUrl } = await createDownloadUrlForKey(key, 60 * 30);
    return NextResponse.redirect(downloadUrl);
  } catch (e) {
    console.error('GET /api/student/resume/view', e);
    return NextResponse.json({ error: 'Could not open résumé' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_student_resume_view' });
export const GET = __platformApiHandlers.GET;
