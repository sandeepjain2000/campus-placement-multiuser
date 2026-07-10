import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { completeStudentDocumentRecord } from '@/lib/completeStudentDocument';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const document_type = String(body.document_type || '').trim();
    const document_name = String(body.document_name || '').trim();
    const file_url = String(body.file_url || '').trim();
    const file_size = body.file_size != null ? parseInt(body.file_size, 10) : null;

    if (!document_name || !file_url) {
      return NextResponse.json({ error: 'document_name and file_url required' }, { status: 400 });
    }

    const userId = session.user.id || session.user.sub;
    const studentId = await getOrCreateStudentProfileId(userId);
    if (!studentId) {
      return NextResponse.json(
        { error: 'Could not resolve your student profile. Contact your placement office.' },
        { status: 400 },
      );
    }

    const setAsPrimary =
      body.setAsPrimaryResume === true ||
      String(body.set_as_primary || '').trim() === '1' ||
      String(body.set_as_primary || '').toLowerCase() === 'true';

    const document = await completeStudentDocumentRecord(studentId, {
      document_type,
      document_name,
      file_url,
      file_size,
      setAsPrimaryResume: setAsPrimary && document_type === 'resume',
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (e) {
    console.error('POST /api/student/documents/complete', e);
    const msg = String(e?.message || '');
    if (msg === 'Invalid document_type') {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: 'Could not save document to your profile' }, { status: 503 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_student_documents_complete' });
export const POST = __platformApiHandlers.POST;
