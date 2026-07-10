import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { isUuid } from '@/lib/tenantContext';
import { writeEmployerAssessmentAudit } from '@/lib/employerAssessmentAudit';
import { resolveRollFromCsvIdentifiers } from '@/lib/studentSystemId';
import { normalizeHiringResult, validateHiringResult } from '@/lib/hiringResult';
import {
  assertEmployerMayConfirmStudent,
  fcfsTrackFromAssessmentTarget,
  isFcfsHiringSelect,
} from '@/lib/campusFcfsSelection';
import {
  isStudentWithdrawnFromTarget,
  WITHDRAWAL_ASSESSMENT_REJECT_MESSAGE,
} from '@/lib/applicationWithdrawal';
import { AND_APP_NOT_DELETED, AND_EAU_NOT_DELETED } from '@/lib/softDeleteSql';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

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
async function __platform_POST(request, { params }) {
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
       FROM employer_assessment_uploads eau
       WHERE eau.id = $1::uuid AND eau.employer_id = $2::uuid ${AND_EAU_NOT_DELETED}
       LIMIT 1`,
      [uploadId, employerId],
    );
    const upload = up.rows[0];
    if (!upload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const tenantId = upload.tenant_id;
    const tenantMeta = await query(`SELECT short_code FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
    const tenantShortCode = tenantMeta.rows[0]?.short_code || '';
    const resolved = resolveRollFromCsvIdentifiers({
      systemIdCell: body?.system_id,
      rollCell: body?.college_roll_no || body?.roll_number,
      shortCode: tenantShortCode,
    });
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const roll = resolved.rollNumber;
    const targetDriveId = upload.drive_id;
    const targetJobId = upload.job_id;

    const hiringErr = validateHiringResult(body?.hiring_result);
    if (hiringErr) {
      return NextResponse.json({ error: hiringErr }, { status: 400 });
    }

    const out = await transaction(async (client) => {
      const studentRes = await client.query(
        `SELECT id, roll_number
         FROM student_profiles
         WHERE tenant_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
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

      const withdrawn = await isStudentWithdrawnFromTarget(client, studentId, {
        driveId: targetDriveId,
        jobId: targetJobId,
      });
      if (withdrawn) {
        const e = new Error(WITHDRAWAL_ASSESSMENT_REJECT_MESSAGE);
        e.statusCode = 400;
        throw e;
      }

      if (isFcfsHiringSelect(body?.hiring_result)) {
        const track = fcfsTrackFromAssessmentTarget({
          targetDriveId,
          targetJobId,
        });
        if (track) {
          const fcfs = await assertEmployerMayConfirmStudent(
            {
              tenantId,
              studentProfileId: studentId,
              track,
              employerId,
            },
            client,
          );
          if (!fcfs.ok) {
            const e = new Error(fcfs.error);
            e.statusCode = 409;
            throw e;
          }
        }
      }

      const existed = await client.query(
        `SELECT id FROM employer_assessment_rows WHERE upload_id = $1::uuid AND student_profile_id = $2::uuid LIMIT 1`,
        [uploadId, studentId],
      );
      const wasNew = !existed.rows.length;

      const appRes = await client.query(
        `SELECT id
         FROM applications
         WHERE student_id = $1::uuid ${AND_APP_NOT_DELETED}
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
            hiring_result, remarks, candidate_name)
         VALUES
           ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8)
         ON CONFLICT (upload_id, student_profile_id) DO UPDATE
           SET application_id = EXCLUDED.application_id,
               is_unregistered_student = EXCLUDED.is_unregistered_student,
               hiring_result = EXCLUDED.hiring_result,
               remarks = EXCLUDED.remarks,
               candidate_name = EXCLUDED.candidate_name`,
        [
          uploadId,
          studentId,
          applicationId,
          canonicalRoll,
          isUnregistered,
          normalizeHiringResult(body?.hiring_result) || null,
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

      await writeEmployerAssessmentAudit(client, {
        tenantId: upload.tenant_id,
        userId: session.user.id || null,
        uploadId,
        kind: 'row_add',
        summary: wasNew
          ? `Added student (roll ${roll}) to assessment upload`
          : `Updated student (roll ${roll}) via manual add`,
        details: { college_roll_no: roll, created: wasNew },
      });

      return { wasNew };
    });

    return NextResponse.json({ success: true, created: out.wasNew }, { status: 201 });
  } catch (e) {
    const code = e.statusCode || 500;
    if (code >= 500) console.error('POST /api/employer/assessments/[uploadId]/rows', e);
    return NextResponse.json({ error: e.message || 'Failed to add row' }, { status: code });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_employer_assessments_id_rows' });
export const POST = __platformApiHandlers.POST;
