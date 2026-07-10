import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import {
  isStudentCvsTableReady,
  mapStudentCvRow,
  syncDefaultCvOnProfile,
  validateCvLabel,
} from '@/lib/studentCv';

async function loadCv(id, studentId) {
  const r = await query(
    `SELECT id, label, file_size, is_default, archived_at, created_at, updated_at, file_url
     FROM student_cvs WHERE id = $1::uuid AND student_id = $2::uuid`,
    [id, studentId],
  );
  return r.rows[0] || null;
}

export async function handleStudentCvPatch(request, cvId) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isStudentCvsTableReady())) {
    return NextResponse.json({ error: 'CV management unavailable' }, { status: 503 });
  }

  const studentId = await getOrCreateStudentProfileId(session.user.id);
  if (!studentId) {
    return NextResponse.json({ error: 'Student profile required' }, { status: 400 });
  }

  const id = String(cvId || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing CV id' }, { status: 400 });
  }

  const existing = await loadCv(id, studentId);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();

  if (body.action === 'archive') {
    if (existing.archived_at) {
      return NextResponse.json({ error: 'CV is already archived' }, { status: 400 });
    }

    const activeCount = await query(
      `SELECT COUNT(*)::int AS n FROM student_cvs
       WHERE student_id = $1::uuid AND archived_at IS NULL`,
      [studentId],
    );
    if ((activeCount.rows[0]?.n ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Keep at least one active CV. Upload another before archiving this one.' },
        { status: 400 },
      );
    }

    const updated = await transaction(async (client) => {
      await client.query(
        `UPDATE student_cvs SET archived_at = NOW(), is_default = false, updated_at = NOW()
         WHERE id = $1::uuid`,
        [id],
      );

      if (existing.is_default) {
        const next = await client.query(
          `SELECT id, file_url FROM student_cvs
           WHERE student_id = $1::uuid AND archived_at IS NULL
           ORDER BY created_at DESC LIMIT 1`,
          [studentId],
        );
        if (next.rows[0]) {
          await client.query(
            `UPDATE student_cvs SET is_default = true, updated_at = NOW() WHERE id = $1::uuid`,
            [next.rows[0].id],
          );
          await syncDefaultCvOnProfile(client, studentId, next.rows[0].file_url);
        }
      }

      const row = await client.query(
        `SELECT id, label, file_size, is_default, archived_at, created_at, updated_at
         FROM student_cvs WHERE id = $1::uuid`,
        [id],
      );
      return row.rows[0];
    });

    return NextResponse.json({ item: mapStudentCvRow(updated) });
  }

  if (body.action === 'set_default') {
    if (existing.archived_at) {
      return NextResponse.json({ error: 'Archived CVs cannot be set as default' }, { status: 400 });
    }

    const updated = await transaction(async (client) => {
      await client.query(
        `UPDATE student_cvs SET is_default = false, updated_at = NOW()
         WHERE student_id = $1::uuid AND archived_at IS NULL`,
        [studentId],
      );
      await client.query(
        `UPDATE student_cvs SET is_default = true, updated_at = NOW() WHERE id = $1::uuid`,
        [id],
      );
      await syncDefaultCvOnProfile(client, studentId, existing.file_url);
      const row = await client.query(
        `SELECT id, label, file_size, is_default, archived_at, created_at, updated_at
         FROM student_cvs WHERE id = $1::uuid`,
        [id],
      );
      return row.rows[0];
    });

    return NextResponse.json({ item: mapStudentCvRow(updated) });
  }

  if (body.label !== undefined) {
    const labelCheck = validateCvLabel(body.label);
    if (labelCheck.error) {
      return NextResponse.json({ error: labelCheck.error }, { status: 400 });
    }
    const r = await query(
      `UPDATE student_cvs SET label = $1, updated_at = NOW()
       WHERE id = $2::uuid AND student_id = $3::uuid
       RETURNING id, label, file_size, is_default, archived_at, created_at, updated_at`,
      [labelCheck.label, id, studentId],
    );
    return NextResponse.json({ item: mapStudentCvRow(r.rows[0]) });
  }

  return NextResponse.json({ error: 'No changes requested' }, { status: 400 });
}
