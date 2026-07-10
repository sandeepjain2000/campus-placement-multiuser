import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { createDownloadUrlForKey } from '@/lib/s3';

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

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('id') || '').trim();
    if (!id) return NextResponse.json({ error: 'Missing document id' }, { status: 400 });

    const userId = session.user.id || session.user.sub;
    const studentId = await getOrCreateStudentProfileId(userId);
    if (!studentId) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });

    const doc = await query(
      `SELECT id, file_url
       FROM student_documents
       WHERE id = $1::uuid AND student_id = $2::uuid
       LIMIT 1`,
      [id, studentId],
    );
    if (!doc.rows[0]) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const key = extractS3Key(doc.rows[0].file_url);
    if (!key) return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 });

    const { downloadUrl } = await createDownloadUrlForKey(key, 60 * 30);
    return NextResponse.redirect(downloadUrl);
  } catch (e) {
    console.error('GET /api/student/documents/view', e);
    return NextResponse.json({ error: 'Could not open document' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_student_documents_view' });
export const GET = __platformApiHandlers.GET;
