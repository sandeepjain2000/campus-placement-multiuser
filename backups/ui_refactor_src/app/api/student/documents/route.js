import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = await getOrCreateStudentProfileId(session.user.id);
    if (!studentId) {
      return NextResponse.json({ documents: [] });
    }

    const res = await query(
      `SELECT id, document_type, document_name, file_url, file_size, is_verified, uploaded_at
       FROM student_documents
       WHERE student_id = $1
       ORDER BY uploaded_at DESC`,
      [studentId],
    );

    return NextResponse.json({ documents: res.rows });
  } catch (e) {
    console.error('GET /api/student/documents', e);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('id');
    if (!docId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const studentId = await getOrCreateStudentProfileId(session.user.id);
    if (!studentId) {
      return NextResponse.json({ error: 'No student profile' }, { status: 404 });
    }

    const res = await query(
      `DELETE FROM student_documents WHERE id = $1 AND student_id = $2 RETURNING id`,
      [docId, studentId],
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/student/documents', e);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}
