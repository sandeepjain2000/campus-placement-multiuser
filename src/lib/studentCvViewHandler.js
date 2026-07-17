import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { isStudentCvsTableReady } from '@/lib/studentCv';
import { isCvDownloadRequest, presignStudentCvFile } from '@/lib/studentCvPresign';

export async function handleStudentCvViewGet(cvId, request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isStudentCvsTableReady())) {
    return NextResponse.json({ error: 'CV management is not available' }, { status: 503 });
  }

  const id = String(cvId || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing CV id' }, { status: 400 });
  }

  const studentId = await getOrCreateStudentProfileId(session.user.id);
  if (!studentId) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
  }

  const r = await query(
    `SELECT label, file_url, file_extension
     FROM student_cvs
     WHERE id = $1::uuid AND student_id = $2::uuid`,
    [id, studentId],
  );
  const row = r.rows[0];
  if (!row) {
    return NextResponse.json({ error: 'CV not found' }, { status: 404 });
  }
  const fileUrl = String(row.file_url || '').trim();
  if (!fileUrl) {
    return NextResponse.json(
      { error: 'This file is no longer available.' },
      { status: 410 },
    );
  }

  try {
    const mode = isCvDownloadRequest(request) ? 'download' : 'view';
    const { downloadUrl } = await presignStudentCvFile({
      fileUrl,
      label: row.label,
      fileExtension: row.file_extension,
      mode,
    });
    return NextResponse.redirect(downloadUrl);
  } catch (e) {
    const msg = e?.message || 'Could not open CV';
    const gone =
      /no longer available/i.test(msg) ||
      /invalid file location/i.test(msg);
    return NextResponse.json(
      { error: gone ? 'This file is no longer available.' : msg },
      { status: gone ? 410 : 503 },
    );
  }
}
