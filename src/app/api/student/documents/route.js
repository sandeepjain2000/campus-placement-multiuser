import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { syncProfileResumeAfterDocumentDelete } from '@/lib/completeStudentDocument';
import { isAuthoritativeResumeUrl } from '@/lib/studentResumeUrl';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const studentId = await getOrCreateStudentProfileId(userId);
    if (!studentId) {
      return NextResponse.json({ documents: [] });
    }

    const [res, profileRes] = await Promise.all([
      query(
        `SELECT id, document_type, document_name, file_url, file_size, is_verified, uploaded_at
         FROM student_documents
         WHERE student_id = $1
         ORDER BY uploaded_at DESC`,
        [studentId],
      ),
      query(`SELECT resume_url FROM student_profiles WHERE id = $1::uuid`, [studentId]),
    ]);

    const primaryResumeUrl = String(profileRes.rows[0]?.resume_url || '').trim();
    const documents = res.rows.map((row) => ({
      ...row,
      is_primary_resume:
        String(row.document_type || '').toLowerCase() === 'resume' &&
        isAuthoritativeResumeUrl(primaryResumeUrl) &&
        String(row.file_url || '').trim() === primaryResumeUrl,
    }));

    const hasPrimaryResumeRow = documents.some((doc) => doc.is_primary_resume);
    const exposedPrimaryUrl =
      isAuthoritativeResumeUrl(primaryResumeUrl) && hasPrimaryResumeRow ? primaryResumeUrl : '';

    return NextResponse.json({
      documents,
      primaryResumeUrl: exposedPrimaryUrl,
    });
  } catch (e) {
    console.error('GET /api/student/documents', e);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

async function __platform_DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('id');
    if (!docId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const userId = session.user.id || session.user.sub;
    const studentId = await getOrCreateStudentProfileId(userId);
    if (!studentId) {
      return NextResponse.json({ error: 'No student profile' }, { status: 404 });
    }

    const deleted = await transaction(async (client) => {
      const res = await client.query(
        `SELECT id, document_type, file_url FROM student_documents
         WHERE id = $1 AND student_id = $2`,
        [docId, studentId],
      );
      if (!res.rowCount) return null;
      const row = res.rows[0];
      if (String(row.document_type || '').toLowerCase() === 'resume') {
        return { blocked: true };
      }

      const del = await client.query(
        `DELETE FROM student_documents
         WHERE id = $1 AND student_id = $2
         RETURNING id, document_type, file_url`,
        [docId, studentId],
      );

      if (del.rowCount === 0) return null;

      await syncProfileResumeAfterDocumentDelete(client, studentId, {
        documentType: row.document_type,
        fileUrl: row.file_url,
      });
      return del.rows[0];
    });

    if (deleted?.blocked) {
      return NextResponse.json(
        { error: 'CVs cannot be deleted. Open My CVs to archive a résumé instead.' },
        { status: 403 },
      );
    }

    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/student/documents', e);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  DELETE: __platform_DELETE,
}, { context: 'api_student_documents' });
export const GET = __platformApiHandlers.GET;
export const DELETE = __platformApiHandlers.DELETE;
