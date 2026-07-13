import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { isUuid } from '@/lib/tenantContext';
import { writeEmployerAssessmentAudit } from '@/lib/employerAssessmentAudit';
import { recalculateAssessmentUploadSummary } from '@/lib/assessmentUploadSummary';
import { formatStudentSystemId } from '@/lib/studentSystemId';
import { AND_EAU_NOT_DELETED, AND_SP_NOT_DELETED } from '@/lib/softDeleteSql';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

async function assertOwnsUpload(employerId, uploadId) {
  const r = await query(
    `SELECT id, tenant_id, drive_id, job_id, original_file_name, total_rows, accepted_rows, rejected_rows, created_at
     FROM employer_assessment_uploads eau
     WHERE eau.id = $1::uuid AND eau.employer_id = $2::uuid ${AND_EAU_NOT_DELETED}
     LIMIT 1`,
    [uploadId, employerId],
  );
  return r.rows[0] || null;
}

/** GET — upload metadata and accepted rows (for view/edit after CSV). */
async function __platform_GET(_request, { params }) {
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

    const rowsRes = await query(
      `SELECT
         ear.id,
         ear.roll_number,
         ear.candidate_name,
         ear.hiring_result,
         ear.remarks,
         ear.is_unregistered_student,
         TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS account_name,
         t.short_code
       FROM employer_assessment_rows ear
       JOIN student_profiles sp ON sp.id = ear.student_profile_id
       JOIN users u ON u.id = sp.user_id
       LEFT JOIN tenants t ON t.id = sp.tenant_id
       WHERE ear.upload_id = $1::uuid ${AND_SP_NOT_DELETED}
       ORDER BY ear.roll_number ASC NULLS LAST, ear.created_at ASC`,
      [uploadId],
    );

    return NextResponse.json({
      upload,
      rows: rowsRes.rows.map((row) => ({
        ...row,
        system_id: formatStudentSystemId(row.short_code, row.roll_number),
      })),
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

/** PATCH — batch-update hiring_result / remarks / candidate_name for rows in this upload. */
async function __platform_PATCH(request, { params }) {
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

    const byRowId = new Map();
    for (const r of rowsIn) {
      const rowId = String(r?.id || '').trim();
      if (rowId && isUuid(rowId)) byRowId.set(rowId, r);
    }
    const rowIds = [...byRowId.keys()];
    if (rowIds.length === 0) {
      return NextResponse.json({ error: 'No valid row ids' }, { status: 400 });
    }

    const ROW_FIELDS = ['hiring_result', 'remarks', 'candidate_name'];

    let summary = null;

    await transaction(async (client) => {
      const prevRes = await client.query(
        `SELECT id, roll_number, hiring_result, remarks, candidate_name
         FROM employer_assessment_rows
         WHERE upload_id = $1::uuid AND id = ANY($2::uuid[])`,
        [uploadId, rowIds],
      );
      const prevById = new Map(prevRes.rows.map((row) => [row.id, row]));

      const changes = [];
      for (const [rowId, r] of byRowId) {
        const old = prevById.get(rowId);
        if (!old) continue;

        const own = await client.query(
          `SELECT ear.id
           FROM employer_assessment_rows ear
           JOIN employer_assessment_uploads u ON u.id = ear.upload_id
           WHERE ear.id = $1::uuid AND ear.upload_id = $2::uuid AND u.employer_id = $3::uuid
           LIMIT 1`,
          [rowId, uploadId, employerId],
        );
        if (!own.rows.length) continue;

        const next = {
          hiring_result: trimText(r.hiring_result, 2000) || null,
          remarks: trimText(r.remarks, 4000) || null,
          candidate_name: trimText(r.candidate_name, 255) || null,
        };

        const before = {};
        const after = {};
        let touched = false;
        for (const f of ROW_FIELDS) {
          const o = old[f] == null ? '' : String(old[f]);
          const n = next[f] == null ? '' : String(next[f]);
          if (o !== n) {
            touched = true;
            before[f] = old[f];
            after[f] = next[f];
          }
        }

        await client.query(
          `UPDATE employer_assessment_rows
           SET hiring_result = $1,
               remarks = $2,
               candidate_name = $3
           WHERE id = $4::uuid`,
          [next.hiring_result, next.remarks, next.candidate_name, rowId],
        );

        if (touched) {
          changes.push({ rowId, roll_number: old.roll_number, before, after });
        }
      }

      if (changes.length > 0) {
        const MAX_LOG = 80;
        const logged = changes.slice(0, MAX_LOG);
        await writeEmployerAssessmentAudit(client, {
          tenantId: upload.tenant_id,
          userId: session.user.id || null,
          uploadId,
          kind: 'rows_save',
          summary: `Saved edits to ${changes.length} assessment row(s)`,
          details: {
            changed_row_count: changes.length,
            changes: logged,
            changes_truncated: changes.length > MAX_LOG,
          },
        });
      }

      summary = await recalculateAssessmentUploadSummary(client, uploadId);
    });

    return NextResponse.json({ success: true, summary });
  } catch (e) {
    console.error('PATCH /api/employer/assessments/[uploadId]', e);
    return NextResponse.json({ error: 'Failed to save assessment rows' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_employer_assessments_id' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
