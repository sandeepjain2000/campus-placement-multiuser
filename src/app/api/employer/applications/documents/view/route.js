import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { createDownloadUrlForKey, isS3Configured } from '@/lib/s3';
import {



  canEmployerAccessStudent,
  extractS3Key,
  getEmployerProfileId,
} from '@/lib/employerApplicationAccess';
import { isAuthoritativeResumeUrl, isPlaceholderResumeUrl } from '@/lib/studentResumeUrl';

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

function isViewableDocumentUrl(url) {
  const value = String(url || '').trim();
  if (!/^https?:\/\//i.test(value)) return false;
  if (isPlaceholderResumeUrl(value)) return false;
  return isAuthoritativeResumeUrl(value) || !value.includes('dummy.pdf');
}

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const { searchParams } = new URL(request.url);
    const studentId = String(searchParams.get('studentId') || '').trim();
    const documentId = String(searchParams.get('documentId') || '').trim();
    if (!userId || !studentId || !documentId) {
      return NextResponse.json({ error: 'studentId and documentId are required' }, { status: 400 });
    }

    const employerId = await getEmployerProfileId(userId);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const allowed = await canEmployerAccessStudent(employerId, studentId);
    if (!allowed) {
      return NextResponse.json({ error: 'Document not available for this employer' }, { status: 403 });
    }

    const doc = await query(
      `SELECT id, file_url
       FROM student_documents
       WHERE id = $1::uuid AND student_id = $2::uuid
       LIMIT 1`,
      [documentId, studentId],
    );
    if (!doc.rows[0]) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const fileUrl = String(doc.rows[0].file_url || '').trim();
    if (!isViewableDocumentUrl(fileUrl)) {
      return NextResponse.json({ error: 'This document is not available to view' }, { status: 404 });
    }

    if (isS3Url(fileUrl) && isS3Configured()) {
      const key = extractS3Key(fileUrl);
      if (key) {
        const { downloadUrl } = await createDownloadUrlForKey(key, 60 * 30);
        return NextResponse.redirect(downloadUrl);
      }
    }

    return NextResponse.redirect(fileUrl);
  } catch (e) {
    console.error('GET /api/employer/applications/documents/view', e);
    return NextResponse.json({ error: 'Could not open document' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_applications_documents_view' });
export const GET = __platformApiHandlers.GET;
