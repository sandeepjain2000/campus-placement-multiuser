import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { parseCsv } from '@/lib/csvExport';
import { query, transaction } from '@/lib/db';
import { isS3Configured, putObjectText } from '@/lib/s3';
import { isUuid } from '@/lib/tenantContext';

const DISALLOWED_JOB_TYPES = new Set(['internship', 'short_project', 'hackathon']);
const REQUIRED_HEADERS = ['college_roll_no'];
const ROUND_HEADERS = ['round_1', 'round_2', 'round_3', 'round_4', 'round_5'];

async function getEmployerId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

function getCell(row, idx) {
  return idx >= 0 ? String(row[idx] || '').trim() : '';
}

/** Strip BOM, Excel quotes, braces — common causes of "invalid" UUID at upload. */
function sanitizeUuidInput(raw) {
  let s = String(raw ?? '').trim().replace(/^\uFEFF/, '');
  if (!s) return '';
  s = s.replace(/^["']|["']$/g, '').replace(/^\{|\}$/g, '').trim();
  if (s.startsWith('=') && s.length > 2) {
    s = s.replace(/^="|"$/g, '').replace(/^='+/, '').trim();
  }
  return s;
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const roundNames = ROUND_HEADERS.map((_, i) => String(form.get(`round_${i + 1}_name`) || '').trim());

    if (!file || typeof file.text !== 'function') {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    const csvText = await file.text();
    const parsed = parseCsv(csvText);
    if (!parsed.headers.length) {
      return NextResponse.json({ error: 'CSV is empty or invalid' }, { status: 400 });
    }

    const headers = parsed.headers.map((h) => String(h).trim().toLowerCase());
    for (const h of REQUIRED_HEADERS) {
      if (!headers.includes(h)) {
        return NextResponse.json({ error: `Missing required CSV column: ${h}` }, { status: 400 });
      }
    }

    const driveIdCol = headers.findIndex((h) => h === 'placement_drive_id' || h === 'drive_id');
    const csvDriveIds = new Set();
    if (driveIdCol >= 0) {
      for (const r of parsed.rows) {
        const v = sanitizeUuidInput(getCell(r, driveIdCol));
        if (v) csvDriveIds.add(v);
      }
    }
    if (csvDriveIds.size > 1) {
      return NextResponse.json(
        { error: 'CSV has multiple different placement_drive_id values; use one UUID per file.' },
        { status: 400 },
      );
    }
    const driveIdFromCsv = csvDriveIds.size === 1 ? [...csvDriveIds][0] : null;

    const driveIdForm = sanitizeUuidInput(form.get('driveId'));
    const jobIdForm = sanitizeUuidInput(form.get('jobId'));
    const tenantIdFromForm = sanitizeUuidInput(form.get('tenantId'));

    if (driveIdForm && jobIdForm) {
      return NextResponse.json({ error: 'Provide either driveId or jobId in the form, not both' }, { status: 400 });
    }
    if (jobIdForm && driveIdFromCsv) {
      return NextResponse.json(
        {
          error:
            'Job uploads cannot include placement_drive_id in the CSV. Remove that column or switch target to Placement Drive.',
        },
        { status: 400 },
      );
    }
    if (driveIdForm && driveIdFromCsv && driveIdForm !== driveIdFromCsv) {
      return NextResponse.json(
        { error: `Selected drive does not match CSV placement_drive_id (${driveIdFromCsv}).` },
        { status: 400 },
      );
    }

    const effectiveDriveId = driveIdForm || driveIdFromCsv || '';
    const effectiveJobId = jobIdForm || '';

    if (!effectiveDriveId && !effectiveJobId) {
      return NextResponse.json(
        {
          error:
            'Select a placement drive or job above, or add column placement_drive_id (drive UUID) to the CSV.',
        },
        { status: 400 },
      );
    }

    const headerIdx = {
      college_roll_no: headers.indexOf('college_roll_no'),
      candidate_name: headers.indexOf('candidate_name'),
      remarks: headers.indexOf('remarks'),
      round_1: headers.indexOf('round_1'),
      round_2: headers.indexOf('round_2'),
      round_3: headers.indexOf('round_3'),
      round_4: headers.indexOf('round_4'),
      round_5: headers.indexOf('round_5'),
    };

    let tenantId = null;
    let targetDriveId = null;
    let targetJobId = null;

    if (effectiveDriveId) {
      if (!isUuid(effectiveDriveId)) {
        return NextResponse.json(
          {
            error:
              'Invalid drive id (must be a UUID). Use the drive dropdown, or copy placement_drive_id from the template / drive export.',
          },
          { status: 400 },
        );
      }
      const drive = await query(
        `SELECT id, tenant_id, job_id
         FROM placement_drives
         WHERE id = $1::uuid AND employer_id = $2::uuid
         LIMIT 1`,
        [effectiveDriveId, employerId],
      );
      if (!drive.rows.length) {
        return NextResponse.json({ error: 'Drive not found for this employer' }, { status: 404 });
      }
      targetDriveId = effectiveDriveId;
      tenantId = drive.rows[0].tenant_id;
      if (drive.rows[0].job_id) {
        const jt = await query(`SELECT job_type FROM job_postings WHERE id = $1::uuid LIMIT 1`, [drive.rows[0].job_id]);
        const jobType = jt.rows[0]?.job_type;
        if (jobType && DISALLOWED_JOB_TYPES.has(jobType)) {
          return NextResponse.json({ error: 'Uploads are not allowed for internships/projects' }, { status: 400 });
        }
      }
    } else {
      if (!isUuid(effectiveJobId)) {
        return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
      }
      if (!tenantIdFromForm || !isUuid(tenantIdFromForm)) {
        return NextResponse.json({ error: 'tenantId is required for job uploads' }, { status: 400 });
      }
      const job = await query(
        `SELECT id, job_type
         FROM job_postings
         WHERE id = $1::uuid AND employer_id = $2::uuid
         LIMIT 1`,
        [effectiveJobId, employerId],
      );
      if (!job.rows.length) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      if (DISALLOWED_JOB_TYPES.has(job.rows[0].job_type)) {
        return NextResponse.json({ error: 'Uploads are not allowed for internships/projects' }, { status: 400 });
      }
      const approval = await query(
        `SELECT 1
         FROM employer_approvals
         WHERE employer_id = $1::uuid AND tenant_id = $2::uuid AND status = 'approved'
         LIMIT 1`,
        [employerId, tenantIdFromForm],
      );
      if (!approval.rows.length) {
        return NextResponse.json({ error: 'Employer is not approved for the selected tenant' }, { status: 403 });
      }
      tenantId = tenantIdFromForm;
      targetJobId = effectiveJobId;
    }

    const dedupe = new Set();
    const errors = [];
    const preparedRows = [];
    for (let i = 0; i < parsed.rows.length; i += 1) {
      const r = parsed.rows[i];
      const rowNum = i + 2;
      const roll = getCell(r, headerIdx.college_roll_no);
      const remarks = getCell(r, headerIdx.remarks);
      if (!roll) {
        errors.push(`Row ${rowNum}: college_roll_no is required`);
        continue;
      }
      if (dedupe.has(roll)) {
        errors.push(`Row ${rowNum}: duplicate college_roll_no (${roll})`);
        continue;
      }
      dedupe.add(roll);
      if (remarks.length > 4000) {
        errors.push(`Row ${rowNum}: remarks exceeds 4000 characters`);
        continue;
      }
      preparedRows.push({
        roll,
        candidateName: getCell(r, headerIdx.candidate_name),
        remarks,
        round_1: getCell(r, headerIdx.round_1),
        round_2: getCell(r, headerIdx.round_2),
        round_3: getCell(r, headerIdx.round_3),
        round_4: getCell(r, headerIdx.round_4),
        round_5: getCell(r, headerIdx.round_5),
      });
    }

    let s3Key = null;
    if (isS3Configured()) {
      s3Key = `employer-assessments/${employerId}/${tenantId}/${Date.now()}-${randomUUID()}.csv`;
      await putObjectText({
        key: s3Key,
        body: csvText,
        contentType: 'text/csv; charset=utf-8',
      });
    }

    const out = await transaction(async (client) => {
      const up = await client.query(
        `INSERT INTO employer_assessment_uploads
           (employer_id, tenant_id, drive_id, job_id, uploaded_by, original_file_name, s3_key, total_rows)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8)
         RETURNING id`,
        [employerId, tenantId, targetDriveId, targetJobId, session.user.id || null, String(file.name || 'results.csv'), s3Key, parsed.rows.length],
      );
      const uploadId = up.rows[0].id;

      for (let i = 0; i < 5; i += 1) {
        await client.query(
          `INSERT INTO employer_assessment_rounds (upload_id, round_no, round_label)
           VALUES ($1::uuid, $2, $3)`,
          [uploadId, i + 1, roundNames[i] || `Round ${i + 1}`],
        );
      }

      let accepted = 0;
      for (const row of preparedRows) {
        const studentRes = await client.query(
          `SELECT id, roll_number, enrollment_number
           FROM student_profiles
           WHERE tenant_id = $1::uuid
             AND (LOWER(COALESCE(roll_number, '')) = LOWER($2) OR LOWER(COALESCE(enrollment_number, '')) = LOWER($2))
           LIMIT 1`,
          [tenantId, row.roll],
        );
        if (!studentRes.rows.length) {
          errors.push(`Roll ${row.roll}: not found in master student list`);
          continue;
        }
        const studentId = studentRes.rows[0].id;
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
            row.roll,
            isUnregistered,
            row.round_1,
            row.round_2,
            row.round_3,
            row.round_4,
            row.round_5,
            row.remarks,
            row.candidateName || null,
          ],
        );
        accepted += 1;
      }

      await client.query(
        `UPDATE employer_assessment_uploads
         SET accepted_rows = $1, rejected_rows = $2
         WHERE id = $3::uuid`,
        [accepted, parsed.rows.length - accepted, uploadId],
      );

      return { uploadId, accepted };
    });

    return NextResponse.json(
      {
        ok: true,
        uploadId: out.uploadId,
        totalRows: parsed.rows.length,
        acceptedRows: out.accepted,
        rejectedRows: parsed.rows.length - out.accepted,
        errors,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/employer/assessments/upload failed:', error);
    return NextResponse.json({ error: 'Failed to upload results CSV' }, { status: 500 });
  }
}
