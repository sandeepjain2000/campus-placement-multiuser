import { normalizeHiringResult, validateHiringResult } from '@/lib/hiringResult';
import {
  assertEmployerMayConfirmStudent,
  EMPLOYER_FCFS_CSV_REJECT_MESSAGE,
  fcfsTrackFromAssessmentTarget,
  isFcfsHiringSelect,
} from '@/lib/campusFcfsSelection';
import { resolveRollFromCsvIdentifiers } from '@/lib/studentSystemId';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { query } from '@/lib/db';
import { commitValidatedAssessmentRows } from '@/lib/assessmentUploadCommit';
import { isUuid } from '@/lib/tenantContext';
import { resolveAssessmentTargetIds, resolveTarget, sanitizeUuidInput } from '@/lib/assessmentUploadProcessCore';

function db(client) {
  return client || { query: (...args) => query(...args) };
}

async function resolveImportSessionCreatedBy(client, userId) {
  if (!userId || !isUuid(String(userId))) return null;
  const res = await client.query(`SELECT 1 FROM users WHERE id = $1::uuid LIMIT 1`, [userId]);
  return res.rows.length ? String(userId) : null;
}

async function resolveImportSessionTarget(client, employerId, {
  defaultTenantId = null,
  defaultDriveId = null,
  defaultJobId = null,
  stagingRows = [],
}) {
  let tenantId = sanitizeUuidInput(defaultTenantId)
    || sanitizeUuidInput(stagingRows.find((r) => r.tenant_id)?.tenant_id)
    || null;
  let driveId = sanitizeUuidInput(defaultDriveId)
    || sanitizeUuidInput(stagingRows.find((r) => r.placement_drive_id)?.placement_drive_id)
    || null;
  let jobId = sanitizeUuidInput(defaultJobId)
    || sanitizeUuidInput(stagingRows.find((r) => r.job_id)?.job_id)
    || null;

  if (driveId || jobId) {
    const target = await resolveTarget(client, employerId, {
      driveId: driveId || null,
      jobId: jobId || null,
      tenantId: tenantId || null,
    });
    if (target.error) {
      const err = new Error(target.error);
      err.statusCode = 400;
      throw err;
    }
    tenantId = target.tenantId;
    driveId = target.targetDriveId;
    jobId = target.targetJobId;
  }

  if (!tenantId) {
    const err = new Error('Campus (tenant) context is required to save import for review.');
    err.statusCode = 400;
    throw err;
  }

  return { tenantId, driveId, jobId };
}

export async function createImportStagingSession(client, {
  employerId,
  userId,
  opportunityKind,
  fileName,
  s3Key,
  stagingRows,
  defaultTenantId = null,
  defaultDriveId = null,
  defaultJobId = null,
}) {
  const { tenantId, driveId, jobId } = await resolveImportSessionTarget(client, employerId, {
    defaultTenantId,
    defaultDriveId,
    defaultJobId,
    stagingRows,
  });
  const createdBy = await resolveImportSessionCreatedBy(client, userId);

  const session = await client.query(
    `INSERT INTO employer_assessment_import_sessions
       (employer_id, tenant_id, opportunity_kind, drive_id, job_id, status, original_file_name, s3_key, created_by)
     VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5::uuid, 'pending_review', $6, $7, $8::uuid)
     RETURNING id`,
    [employerId, tenantId, opportunityKind, driveId || null, jobId || null, fileName, s3Key, createdBy],
  );
  const sessionId = session.rows[0].id;

  for (const row of stagingRows) {
    const placementDriveId = row.placement_drive_id || driveId || null;
    const jobIdCell = row.job_id || jobId || null;
    const tenantIdCell = row.tenant_id || tenantId || null;
    await client.query(
      `INSERT INTO employer_assessment_import_staging_rows
         (session_id, row_num, system_id, college_roll_no, placement_drive_id, job_id, tenant_id,
          candidate_name, hiring_result, remarks, validation_errors, is_valid)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
      [
        sessionId,
        row.rowNum,
        row.system_id || null,
        row.college_roll_no || null,
        placementDriveId,
        jobIdCell,
        tenantIdCell,
        row.candidate_name || null,
        row.hiring_result || null,
        row.remarks || null,
        JSON.stringify(row.validation_errors || []),
        row.is_valid,
      ],
    );
  }

  return sessionId;
}

/** Pending import sessions for employer UI (correction screen entry). */
export async function listPendingImportSessions(employerId, { opportunityKind = null } = {}) {
  const params = [employerId];
  let where = `s.employer_id = $1::uuid AND s.status = 'pending_review'`;
  if (opportunityKind) {
    params.push(opportunityKind);
    where += ` AND s.opportunity_kind = $${params.length}`;
  }

  const res = await query(
    `SELECT
       s.id,
       s.opportunity_kind,
       s.original_file_name,
       s.created_at,
       s.tenant_id,
       s.drive_id,
       s.job_id,
       (SELECT COUNT(*)::int FROM employer_assessment_import_staging_rows r WHERE r.session_id = s.id) AS row_count,
       (SELECT COUNT(*)::int FROM employer_assessment_import_staging_rows r WHERE r.session_id = s.id AND NOT r.is_valid) AS invalid_count
     FROM employer_assessment_import_sessions s
     WHERE ${where}
     ORDER BY s.created_at DESC
     LIMIT 50`,
    params,
  );
  return res.rows;
}

export async function loadImportStagingSession(client, employerId, sessionId) {
  const conn = db(client);
  const sessionRes = await conn.query(
    `SELECT * FROM employer_assessment_import_sessions
     WHERE id = $1::uuid AND employer_id = $2::uuid LIMIT 1`,
    [sessionId, employerId],
  );
  const session = sessionRes.rows[0];
  if (!session) return null;

  const rowsRes = await conn.query(
    `SELECT id, row_num, system_id, college_roll_no, placement_drive_id, job_id, tenant_id,
            candidate_name, hiring_result, remarks, validation_errors, is_valid
     FROM employer_assessment_import_staging_rows
     WHERE session_id = $1::uuid
     ORDER BY row_num ASC`,
    [sessionId],
  );

  return { session, rows: rowsRes.rows };
}

export async function revalidateStagingRow(client, employerId, rowId, patch) {
  const rowRes = await client.query(
    `SELECT sr.*, s.employer_id, s.tenant_id AS session_tenant_id, s.opportunity_kind
     FROM employer_assessment_import_staging_rows sr
     JOIN employer_assessment_import_sessions s ON s.id = sr.session_id
     WHERE sr.id = $1::uuid AND s.employer_id = $2::uuid AND s.status = 'pending_review'
     LIMIT 1`,
    [rowId, employerId],
  );
  const existing = rowRes.rows[0];
  if (!existing) return null;

  const merged = {
    system_id: patch.system_id !== undefined ? String(patch.system_id || '').trim() : existing.system_id,
    college_roll_no: patch.college_roll_no !== undefined ? String(patch.college_roll_no || '').trim() : existing.college_roll_no,
    placement_drive_id: patch.placement_drive_id !== undefined ? sanitizeUuidInput(patch.placement_drive_id) : existing.placement_drive_id,
    job_id: patch.job_id !== undefined ? sanitizeUuidInput(patch.job_id) : existing.job_id,
    tenant_id: patch.tenant_id !== undefined ? sanitizeUuidInput(patch.tenant_id) : existing.tenant_id,
    candidate_name: patch.candidate_name !== undefined ? String(patch.candidate_name || '').trim() : existing.candidate_name,
    hiring_result: patch.hiring_result !== undefined ? normalizeHiringResult(patch.hiring_result) : existing.hiring_result,
    remarks: patch.remarks !== undefined ? String(patch.remarks || '').trim() : existing.remarks,
  };

  const errors = [];
  const resolvedTarget = resolveAssessmentTargetIds({
    driveId: merged.placement_drive_id || '',
    jobId: merged.job_id || '',
  });
  if (resolvedTarget.error) errors.push(resolvedTarget.error);
  if (resolvedTarget.jobId && !merged.tenant_id) errors.push('tenant_id is required when job_id is set');
  if (merged.remarks.length > 4000) errors.push('remarks exceeds 4000 characters');
  const hiringErr = validateHiringResult(merged.hiring_result);
  if (hiringErr) errors.push(hiringErr);

  if (errors.length === 0) {
    const target = await resolveTarget(client, employerId, {
      driveId: resolvedTarget.driveId || null,
      jobId: resolvedTarget.jobId || null,
      tenantId: merged.tenant_id || null,
    });
    if (target.error) errors.push(target.error);
    else {
      merged.tenant_id = target.tenantId;
      const tenantMeta = await client.query(`SELECT short_code FROM tenants WHERE id = $1::uuid LIMIT 1`, [target.tenantId]);
      const shortCode = tenantMeta.rows[0]?.short_code || '';
      const resolved = resolveRollFromCsvIdentifiers({
        systemIdCell: merged.system_id,
        rollCell: merged.college_roll_no,
        shortCode,
      });
      if (resolved.error) errors.push(resolved.error);
      else {
        merged.college_roll_no = resolved.rollNumber;
        merged.system_id = resolved.systemId || merged.system_id;
        const studentRes = await client.query(
          `SELECT id FROM student_profiles
           WHERE tenant_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
             AND (LOWER(COALESCE(roll_number, '')) = LOWER($2)
               OR LOWER(COALESCE(enrollment_number, '')) = LOWER($2))
           LIMIT 1`,
          [target.tenantId, resolved.rollNumber],
        );
        if (!studentRes.rows.length) {
          errors.push(`Student ${resolved.rollNumber}: not found in master student list`);
        } else if (isFcfsHiringSelect(merged.hiring_result)) {
          const track = fcfsTrackFromAssessmentTarget({
            opportunityKind: existing.opportunity_kind,
            targetDriveId: resolvedTarget.driveId || null,
            targetJobId: resolvedTarget.jobId || null,
          });
          if (track) {
            const fcfs = await assertEmployerMayConfirmStudent(
              {
                tenantId: target.tenantId,
                studentProfileId: studentRes.rows[0].id,
                track,
                employerId,
              },
              client,
            );
            if (!fcfs.ok) {
              errors.push(`Student ${resolved.rollNumber}: ${EMPLOYER_FCFS_CSV_REJECT_MESSAGE}`);
            }
          }
        }
      }
    }
  }

  const isValid = errors.length === 0;
  await client.query(
    `UPDATE employer_assessment_import_staging_rows
     SET system_id = $1, college_roll_no = $2, placement_drive_id = $3, job_id = $4, tenant_id = $5,
         candidate_name = $6, hiring_result = $7, remarks = $8, validation_errors = $9::jsonb, is_valid = $10
     WHERE id = $11::uuid`,
    [
      merged.system_id || null,
      merged.college_roll_no || null,
      merged.placement_drive_id || null,
      merged.job_id || null,
      merged.tenant_id || null,
      merged.candidate_name || null,
      merged.hiring_result || null,
      merged.remarks || null,
      JSON.stringify(errors),
      isValid,
      rowId,
    ],
  );

  return { ...merged, validation_errors: errors, is_valid: isValid, id: rowId };
}

export async function commitStagingSession(client, params) {
  const { employerId, userId, sessionId, opportunityKind, fileName, s3Key } = params;
  const loaded = await loadImportStagingSession(client, employerId, sessionId);
  if (!loaded) return { ok: false, error: 'Session not found' };
  if (loaded.session.status !== 'pending_review') {
    return { ok: false, error: 'Session is no longer pending review' };
  }
  if (loaded.rows.some((r) => !r.is_valid)) {
    return { ok: false, error: 'Fix all validation errors before accepting import' };
  }

  const stagingRows = loaded.rows.map((r) => ({
    rowNum: r.row_num,
    system_id: r.system_id,
    college_roll_no: r.college_roll_no,
    placement_drive_id: r.placement_drive_id,
    job_id: r.job_id,
    tenant_id: r.tenant_id,
    candidate_name: r.candidate_name,
    hiring_result: r.hiring_result,
    remarks: r.remarks,
    is_valid: true,
    validation_errors: [],
  }));

  const out = await commitValidatedAssessmentRows(client, {
    employerId,
    userId,
    opportunityKind,
    fileName: fileName || loaded.session.original_file_name,
    s3Key: s3Key || loaded.session.s3_key,
    stagingRows,
  });

  await client.query(
    `UPDATE employer_assessment_import_sessions
     SET status = 'committed', committed_at = NOW()
     WHERE id = $1::uuid`,
    [sessionId],
  );

  return { ok: true, ...out };
}

export async function rejectStagingSession(client, employerId, sessionId) {
  const res = await client.query(
    `UPDATE employer_assessment_import_sessions
     SET status = 'rejected', rejected_at = NOW()
     WHERE id = $1::uuid AND employer_id = $2::uuid AND status = 'pending_review'
     RETURNING id`,
    [sessionId, employerId],
  );
  return res.rows.length > 0;
}
