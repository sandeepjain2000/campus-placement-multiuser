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

function trimText(v, maxLen) {
  const s = v == null ? '' : String(v);
  if (s.length > maxLen) return s.slice(0, maxLen);
  return s;
}

/**
 * POST — optional manual row: same rules as CSV (student must exist on upload tenant; drive/job from upload).
 */
export async function POST(request, { params }) {
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

    const up = await query(
      `SELECT id, tenant_id, drive_id, job_id
       FROM employer_assessment_uploads
       WHERE id = $1::uuid AND employer_id = $2::uuid
       LIMIT 1`,
      [uploadId, employerId],
    );
    const upload = up.rows[0];
    if (!upload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const roll = String(body?.college_roll_no || body?.roll_number || '').trim();
    if (!roll) {
      return NextResponse.json({ error: 'college_roll_no is required' }, { status: 400 });
    }

    const tenantId = upload.tenant_id;
    const targetDriveId = upload.drive_id;
    const targetJobId = upload.job_id;

    const out = await transaction(async (client) => {
      const studentRes = await client.query(
        `SELECT id, roll_number
         FROM student_profiles
         WHERE tenant_id = $1::uuid
           AND (LOWER(COALESCE(roll_number, '')) = LOWER($2) OR LOWER(COALESCE(enrollment_number, '')) = LOWER($2))
         LIMIT 1`,
        [tenantId, roll],
      );
      if (!studentRes.rows.length) {
        const e = new Error('Student not found for this campus');
        e.statusCode = 400;
        throw e;
      }
      const studentId = studentRes.rows[0].id;
      const canonicalRoll = studentRes.rows[0].roll_number || roll;

      const existed = await client.query(
        `SELECT id FROM employer_assessment_rows WHERE upload_id = $1::uuid AND student_profile_id = $2::uuid LIMIT 1`,
        [uploadId, studentId],
      );
      const wasNew = !existed.rows.length;

      const appRes = await client.query(
        `SELECT id
         FROM applications
         WHERE student_id = $1::uuid
           AND (
             ($2::uuid IS NOT NULL AND drive_id = $2::uuid) OR
             ($3::uuid IS NOT NULL AND job_id = $3::uuid)
           )
         ORDER BY applied_at DESC
         LIMIT 1`,
        [studentId, targetDriveId, targetJobId],
      );
      const applicationId = appRes.rows[0]?.id || null;
      const isUnregistered = !applicationId;

      await client.query(
        `INSERT INTO employer_assessment_rows
           (upload_id, student_profile_id, application_id, roll_number, is_unregistered_student,
            round_1_result, round_2_result, round_3_result, round_4_result, round_5_result, remarks, candidate_name)
         VALUES
           ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (upload_id, student_profile_id) DO UPDATE
           SET application_id = EXCLUDED.application_id,
               is_unregistered_student = EXCLUDED.is_unregistered_student,
               round_1_result = EXCLUDED.round_1_result,
               round_2_result = EXCLUDED.round_2_result,
               round_3_result = EXCLUDED.round_3_result,
               round_4_result = EXCLUDED.round_4_result,
               round_5_result = EXCLUDED.round_5_result,
               remarks = EXCLUDED.remarks,
               candidate_name = EXCLUDED.candidate_name`,
        [
          uploadId,
          studentId,
          applicationId,
          canonicalRoll,
          isUnregistered,
          trimText(body?.round_1_result, 2000),
          trimText(body?.round_2_result, 2000),
          trimText(body?.round_3_result, 2000),
          trimText(body?.round_4_result, 2000),
          trimText(body?.round_5_result, 2000),
          trimText(body?.remarks, 4000) || null,
          trimText(body?.candidate_name, 255) || null,
        ],
      );

      if (wasNew) {
        await client.query(
          `UPDATE employer_assessment_uploads SET accepted_rows = accepted_rows + 1 WHERE id = $1::uuid`,
          [uploadId],
        );
      }

      return { wasNew };
    });

    return NextResponse.json({ success: true, created: out.wasNew }, { status: 201 });
  } catch (e) {
    const code = e.statusCode || 500;
    if (code >= 500) console.error('POST /api/employer/assessments/[uploadId]/rows', e);
    return NextResponse.json({ error: e.message || 'Failed to add row' }, { status: code });
  }
}
