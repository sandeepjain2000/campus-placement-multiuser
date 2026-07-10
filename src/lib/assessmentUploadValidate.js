import {
  WITHDRAWAL_ASSESSMENT_REJECT_MESSAGE,
  isStudentWithdrawnFromTarget,
} from '@/lib/applicationWithdrawal';
import { normalizeHiringResult, validateHiringResult } from '@/lib/hiringResult';
import { resolveRollFromCsvIdentifiers } from '@/lib/studentSystemId';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { getCell, resolveAssessmentTargetIds, resolveTarget, sanitizeUuidInput } from '@/lib/assessmentUploadProcessCore';
import {
  assertEmployerMayConfirmStudent,
  EMPLOYER_FCFS_CSV_REJECT_MESSAGE,
  fcfsTrackFromAssessmentKind,
  fcfsTrackFromAssessmentTarget,
  isFcfsHiringSelect,
} from '@/lib/campusFcfsSelection';

/** Map internal validation text to a column label for employer-facing errors. */
function columnizeValidationError(message) {
  const m = String(message || '');
  if (m.includes('placement_drive_id') || m.includes('job_id') || m.includes('not both')) {
    return `Column placement_drive_id / job_id: ${m}`;
  }
  if (m.startsWith('tenant_id') || m.startsWith('college_id')) {
    const clean = m.replace(/^(tenant_id|college_id)\s*/i, '');
    return `Column college_id / tenant_id: ${clean}`.trim();
  }
  if (m.includes('remarks')) return `Column remarks: ${m}`;
  if (m.includes('hiring_result') || m.includes('Shortlist') || m.includes('Reject') || m.includes('Select')) {
    return `Column hiring_result: ${m}`;
  }
  if (m.includes('system_id') || m.includes('college_roll_no') || m.includes('roll')) {
    return `Columns system_id / college_roll_no: ${m}`;
  }
  if (m.includes('Student') && m.includes('not found')) {
    return `Columns system_id / college_roll_no: ${m}`;
  }
  if (m.includes('employer_id')) {
    return `Column employer_id: ${m}`;
  }
  return m;
}

/** Flatten staging validation for API / UI (`Row 3: Column hiring_result: …`). */
export function formatAssessmentUploadErrors(stagingRows, { max = 50 } = {}) {
  const out = [];
  for (const row of stagingRows || []) {
    if (row.is_valid) continue;
    for (const err of row.validation_errors || []) {
      out.push(`Row ${row.rowNum}: ${columnizeValidationError(err)}`);
      if (out.length >= max) return out;
    }
  }
  return out;
}

/**
 * Validate parsed CSV rows without writing to assessment tables.
 */
export async function validateAssessmentCsvUpload(client, params) {
  const {
    employerId,
    parsed,
    headerIdx,
    defaultDriveId,
    defaultJobId,
    defaultTenantId,
    opportunityKind = null,
  } = params;

  const stagingRows = [];

  for (let i = 0; i < parsed.rows.length; i += 1) {
    const r = parsed.rows[i];
    const rowNum = i + 2;
    const rowDriveId = sanitizeUuidInput(getCell(r, headerIdx.placement_drive_id));
    const rowJobId = sanitizeUuidInput(getCell(r, headerIdx.job_id));
    const rowTenantId = sanitizeUuidInput(getCell(r, headerIdx.tenant_id));

    const resolvedTarget = resolveAssessmentTargetIds({
      driveId: rowDriveId || defaultDriveId || '',
      jobId: rowJobId || defaultJobId || '',
    });
    const driveId = resolvedTarget.driveId;
    const jobId = resolvedTarget.jobId;
    let tenantId = rowTenantId || defaultTenantId || '';

    const errors = [];
    if (resolvedTarget.error) errors.push(resolvedTarget.error);
    if (jobId && !tenantId) {
      errors.push('college_id / tenant_id is required when job_id is set (fill college_id on this row)');
    }

    if (headerIdx.employer_id !== undefined && headerIdx.employer_id >= 0) {
      const rowEmployerId = sanitizeUuidInput(getCell(r, headerIdx.employer_id));
      if (rowEmployerId && rowEmployerId.toLowerCase() !== employerId.toLowerCase()) {
        errors.push('employer_id in CSV does not match the authenticated employer profile ID');
      }
    }

    const remarks = getCell(r, headerIdx.remarks);
    if (remarks.length > 4000) errors.push('remarks exceeds 4000 characters (max 4000)');

    const hiringRaw = getCell(r, headerIdx.hiring_result);
    const hiringErr = validateHiringResult(hiringRaw);
    if (hiringErr) errors.push(`hiring_result — ${hiringErr}`);

    let resolvedRoll = null;
    let resolvedSystemId = null;

    if (errors.length === 0) {
      const target = await resolveTarget(client, employerId, {
        driveId: driveId || null,
        jobId: jobId || null,
        tenantId: tenantId || null,
      });
      if (target.error) {
        errors.push(target.error);
      } else {
        tenantId = target.tenantId;
        const tenantMeta = await client.query(`SELECT short_code FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
        const shortCode = tenantMeta.rows[0]?.short_code || '';
        const resolved = resolveRollFromCsvIdentifiers({
          systemIdCell: getCell(r, headerIdx.system_id),
          rollCell: getCell(r, headerIdx.college_roll_no),
          shortCode,
        });
        if (resolved.error) {
          errors.push(resolved.error);
        } else {
          resolvedRoll = resolved.rollNumber;
          resolvedSystemId = resolved.systemId || '';
          const studentRes = await client.query(
            `SELECT id FROM student_profiles
             WHERE tenant_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
               AND (LOWER(COALESCE(roll_number, '')) = LOWER($2)
                 OR LOWER(COALESCE(enrollment_number, '')) = LOWER($2))
             LIMIT 1`,
            [tenantId, resolvedRoll],
          );
          if (!studentRes.rows.length) {
            errors.push(`Student ${resolvedRoll}: not found in master student list`);
          } else {
            const studentProfileId = studentRes.rows[0].id;
            const withdrawn = await isStudentWithdrawnFromTarget(client, studentProfileId, {
              driveId: driveId || null,
              jobId: jobId || null,
            });
            if (withdrawn) {
              errors.push(`Student ${resolvedRoll}: ${WITHDRAWAL_ASSESSMENT_REJECT_MESSAGE}`);
            } else if (isFcfsHiringSelect(hiringRaw)) {
              const track =
                fcfsTrackFromAssessmentTarget({
                  opportunityKind,
                  targetDriveId: driveId || null,
                  targetJobId: jobId || null,
                }) || fcfsTrackFromAssessmentKind(opportunityKind);
              if (track) {
                const fcfs = await assertEmployerMayConfirmStudent(
                  {
                    tenantId,
                    studentProfileId,
                    track,
                    employerId,
                  },
                  client,
                );
                if (!fcfs.ok) {
                  errors.push(`Student ${resolvedRoll}: ${EMPLOYER_FCFS_CSV_REJECT_MESSAGE}`);
                }
              }
            }
          }
        }
      }
    }

    stagingRows.push({
      rowNum,
      system_id: resolvedSystemId || getCell(r, headerIdx.system_id),
      college_roll_no: resolvedRoll || getCell(r, headerIdx.college_roll_no),
      placement_drive_id: rowDriveId || driveId,
      job_id: rowJobId || jobId,
      tenant_id: tenantId,
      candidate_name: getCell(r, headerIdx.candidate_name),
      hiring_result: normalizeHiringResult(hiringRaw),
      remarks,
      validation_errors: errors,
      is_valid: errors.length === 0,
    });
  }

  const invalidCount = stagingRows.filter((r) => !r.is_valid).length;
  return {
    stagingRows,
    invalidCount,
    totalRows: parsed.rows.length,
    canCommitDirectly: invalidCount === 0 && stagingRows.length > 0,
  };
}
