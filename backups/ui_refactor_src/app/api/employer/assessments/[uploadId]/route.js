import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { isUuid } from '@/lib/tenantContext';

async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

async function assertOwnsUpload(employerId, uploadId) {
  const r = await query(
    `SELECT id, tenant_id, drive_id, job_id, original_file_name, total_rows, accepted_rows, rejected_rows, created_at
     FROM employer_assessment_uploads
     WHERE id = $1::uuid AND employer_id = $2::uuid
     LIMIT 1`,
    [uploadId, employerId],
  );
  return r.rows[0] || null;
}

/** GET — upload metadata, round labels, and accepted rows (for view/edit after CSV). */
export async function GET(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { uploadId } = await params;
    if (!uploadId || !isUuid(uploadId)) {
      return NextResponse.json({ error: 'Invalid upload id' }, { status: 400 });
    }
    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const upload = await assertOwnsUpload(employerId, uploadId);
    if (!upload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });

    const rounds = await query(
      `SELECT round_no, round_label FROM employer_assessment_rounds WHERE upload_id = $1::uuid ORDER BY round_no ASC`,
      [uploadId],
    );
    const rowsRes = await query(
      `SELECT
         ear.id,
         ear.roll_number,
         ear.candidate_name,
         ear.round_1_result,
         ear.round_2_result,
         ear.round_3_result,
         ear.round_4_result,
         ear.round_5_result,
         ear.remarks,
         ear.is_unregistered_student,
         TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS account_name
       FROM employer_assessment_rows ear
       JOIN student_profiles sp ON sp.id = ear.student_profile_id
       JOIN users u ON u.id = sp.user_id
       WHERE ear.upload_id = $1::uuid
       ORDER BY ear.roll_number ASC NULLS LAST, ear.created_at ASC`,
      [uploadId],
    );

    return NextResponse.json({
      upload,
      rounds: rounds.rows,
      rows: rowsRes.rows,
    });
  } catch (e) {
    console.error('GET /api/employer/assessments/[uploadId]', e);
    return NextResponse.json({ error: 'Failed to load assessment upload' }, { status: 500 });
  }
}

function trimText(v, maxLen) {
  const s = v == null ? '' : String(v);
  if (s.length > maxLen) return s.slice(0, maxLen);
  return s;
}

/** PATCH — batch-update round cells / remarks / candidate_name for rows in this upload. */
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { uploadId } = await params;
    if (!uploadId || !isUuid(uploadId)) {
      return NextResponse.json({ error: 'Invalid upload id' }, { status: 400 });
    }
    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const upload = await assertOwnsUpload(employerId, uploadId);
    if (!upload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const rowsIn = Array.isArray(body?.rows) ? body.rows : null;
    if (!rowsIn || rowsIn.length === 0) {
      return NextResponse.json({ error: 'rows array required' }, { status: 400 });
    }
    if (rowsIn.length > 500) {
      return NextResponse.json({ error: 'At most 500 rows per save' }, { status: 400 });
    }

    await transaction(async (client) => {
      for (const r of rowsIn) {
        const rowId = String(r?.id || '').trim();
        if (!rowId || !isUuid(rowId)) continue;

        const own = await client.query(
          `SELECT ear.id
           FROM employer_assessment_rows ear
           JOIN employer_assessment_uploads u ON u.id = ear.upload_id
           WHERE ear.id = $1::uuid AND ear.upload_id = $2::uuid AND u.employer_id = $3::uuid
           LIMIT 1`,
          [rowId, uploadId, employerId],
        );
        if (!own.rows.length) continue;

        await client.query(
          `UPDATE employer_assessment_rows
           SET round_1_result = $1,
               round_2_result = $2,
               round_3_result = $3,
               round_4_result = $4,
               round_5_result = $5,
               remarks = $6,
               candidate_name = $7
           WHERE id = $8::uuid`,
          [
            trimText(r.round_1_result, 2000),
            trimText(r.round_2_result, 2000),
            trimText(r.round_3_result, 2000),
            trimText(r.round_4_result, 2000),
            trimText(r.round_5_result, 2000),
            trimText(r.remarks, 4000) || null,
            trimText(r.candidate_name, 255) || null,
            rowId,
          ],
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('PATCH /api/employer/assessments/[uploadId]', e);
    return NextResponse.json({ error: 'Failed to save assessment rows' }, { status: 500 });
  }
}
