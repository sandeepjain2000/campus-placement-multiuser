import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { isS3Configured, uploadStudentDocumentBuffer } from '@/lib/s3';
import { validateStudentDocumentFileForType, validateStudentDocumentBuffer } from '@/lib/studentDocumentUpload';
import {
  extractFileExtension,
  isStudentCvsTableReady,
  mapStudentCvRow,
  syncDefaultCvOnProfile,
  validateCvLabel,
} from '@/lib/studentCv';

export async function handleStudentCvUploadPost(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isStudentCvsTableReady())) {
    return NextResponse.json(
      { error: 'CV management is not available until migration 099_student_cvs.sql is applied.' },
      { status: 503 },
    );
  }

  if (!isS3Configured()) {
    return NextResponse.json({ error: 'Cloud storage not configured' }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const labelRaw = formData.get('label');
  const setAsDefault =
    String(formData.get('set_as_default') || '').trim() === '1' ||
    String(formData.get('set_as_default') || '').toLowerCase() === 'true';

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const labelCheck = validateCvLabel(labelRaw);
  if (labelCheck.error) {
    return NextResponse.json({ error: labelCheck.error }, { status: 400 });
  }

  const fileName = file.name || 'cv.pdf';
  const meta = validateStudentDocumentFileForType({ name: fileName, type: file.type, size: file.size }, 'resume');
  if (!meta.ok) {
    return NextResponse.json({ error: meta.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = validateStudentDocumentBuffer(buffer, meta);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const userId = session.user.id || session.user.sub;
  const studentId = await getOrCreateStudentProfileId(userId);
  if (!studentId) {
    return NextResponse.json({ error: 'Student profile required' }, { status: 400 });
  }

  const uploaded = await uploadStudentDocumentBuffer({
    userId,
    fileName: validated.fileName,
    contentType: validated.contentType,
    body: buffer,
  });

  const extension = extractFileExtension(validated.fileName);

  const item = await transaction(async (client) => {
    const countRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM student_cvs WHERE student_id = $1::uuid AND archived_at IS NULL`,
      [studentId],
    );
    const isFirst = (countRes.rows[0]?.n ?? 0) === 0;
    const makeDefault = isFirst || setAsDefault;

    if (makeDefault) {
      await client.query(
        `UPDATE student_cvs SET is_default = false, updated_at = NOW()
         WHERE student_id = $1::uuid AND archived_at IS NULL`,
        [studentId],
      );
    }

    const ins = await client.query(
      `INSERT INTO student_cvs
        (student_id, label, file_url, file_size, original_file_name, file_extension, is_default)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
       RETURNING id, label, file_size, is_default, archived_at, created_at, updated_at`,
      [
        studentId,
        labelCheck.label,
        uploaded.fileUrl,
        validated.size,
        validated.fileName,
        extension,
        makeDefault,
      ],
    );

    if (makeDefault) {
      await syncDefaultCvOnProfile(client, studentId, uploaded.fileUrl);
    }

    return ins.rows[0];
  });

  return NextResponse.json({ item: mapStudentCvRow(item) }, { status: 201 });
}
