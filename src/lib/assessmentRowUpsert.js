import { AND_EAU_NOT_DELETED } from '@/lib/softDeleteSql';
import { normalizeHiringResult } from '@/lib/hiringResult';
import { syncApplicationStatusFromHiringResult } from '@/lib/syncApplicationFromHiringResult';

/**
 * Upsert assessment row by student within employer + campus + drive/job context.
 * Subsequent CSV / online edits overwrite prior row for the same system_id (student).
 */
export async function findAssessmentRowInContext(client, {
  employerId,
  tenantId,
  targetDriveId = null,
  targetJobId = null,
  studentProfileId,
}, tracer = null) {
  const t = tracer || { log: () => {} };
  t.log('findAssessmentRowInContext', 'query_start', { employerId, targetDriveId, targetJobId, studentProfileId });
  const res = await client.query(
    `SELECT ear.id, ear.upload_id, ear.application_id, ear.hiring_result, ear.remarks, ear.candidate_name
     FROM employer_assessment_rows ear
     JOIN employer_assessment_uploads eau ON eau.id = ear.upload_id
     WHERE eau.employer_id = $1::uuid
       AND eau.tenant_id = $2::uuid
       ${AND_EAU_NOT_DELETED}
       AND (
         ($3::uuid IS NOT NULL AND eau.drive_id = $3::uuid AND eau.job_id IS NULL)
         OR ($4::uuid IS NOT NULL AND eau.job_id = $4::uuid AND eau.drive_id IS NULL)
       )
       AND ear.student_profile_id = $5::uuid
     ORDER BY eau.created_at DESC, ear.created_at DESC
     LIMIT 1`,
    [employerId, tenantId, targetDriveId, targetJobId, studentProfileId],
  );
  const row = res.rows[0] || null;
  t.log('findAssessmentRowInContext', 'query_result', { found: !!row, id: row?.id, hiring_result: row?.hiring_result });
  return row;
}

export async function upsertAssessmentRowInContext(client, {
  employerId,
  tenantId,
  targetDriveId = null,
  targetJobId = null,
  uploadId,
  studentProfileId,
  applicationId = null,
  rollNumber,
  hiringResult,
  remarks = null,
  candidateName = null,
  isUnregisteredStudent = true,
}, tracer = null) {
  const t = tracer || { log: () => {} };
  const normalizedResult = normalizeHiringResult(hiringResult);
  t.log('upsertAssessmentRowInContext', 'normalise_hiring_result', { raw: hiringResult, normalised: normalizedResult });

  const existing = await findAssessmentRowInContext(client, {
    employerId,
    tenantId,
    targetDriveId,
    targetJobId,
    studentProfileId,
  }, t);

  if (existing) {
    t.log('upsertAssessmentRowInContext', 'updating_existing_row', { id: existing.id, newResult: normalizedResult });
    await client.query(
      `UPDATE employer_assessment_rows
       SET hiring_result = $1,
           remarks = $2,
           candidate_name = $3,
           roll_number = $4,
           application_id = COALESCE($5::uuid, application_id),
           is_unregistered_student = $6
       WHERE id = $7::uuid`,
      [
        normalizedResult || null,
        remarks,
        candidateName,
        rollNumber,
        applicationId,
        isUnregisteredStudent,
        existing.id,
      ],
    );
    const resolvedApplicationId = applicationId || existing.application_id;
    t.log('upsertAssessmentRowInContext', 'calling_sync', { resolvedApplicationId, normalizedResult });
    await syncApplicationStatusFromHiringResult(client, {
      employerId,
      applicationId: resolvedApplicationId,
      hiringResult: normalizedResult,
      targetDriveId,
      targetJobId,
    }, t);
    t.log('upsertAssessmentRowInContext', 'update_complete');
    return { uploadId: existing.upload_id, updated: true };
  }

  t.log('upsertAssessmentRowInContext', 'inserting_new_row', { studentProfileId, applicationId, normalizedResult });
  await client.query(
    `INSERT INTO employer_assessment_rows
       (upload_id, student_profile_id, application_id, roll_number, is_unregistered_student,
        hiring_result, remarks, candidate_name)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8)
     ON CONFLICT (upload_id, student_profile_id) DO UPDATE
       SET application_id = COALESCE(EXCLUDED.application_id, employer_assessment_rows.application_id),
           roll_number = EXCLUDED.roll_number,
           is_unregistered_student = EXCLUDED.is_unregistered_student,
           hiring_result = EXCLUDED.hiring_result,
           remarks = EXCLUDED.remarks,
           candidate_name = EXCLUDED.candidate_name`,
    [
      uploadId,
      studentProfileId,
      applicationId,
      rollNumber,
      isUnregisteredStudent,
      normalizedResult || null,
      remarks,
      candidateName,
    ],
  );

  t.log('upsertAssessmentRowInContext', 'calling_sync', { applicationId, normalizedResult });
  await syncApplicationStatusFromHiringResult(client, {
    employerId,
    applicationId,
    hiringResult: normalizedResult,
    targetDriveId,
    targetJobId,
  }, t);
  t.log('upsertAssessmentRowInContext', 'insert_complete');
  return { uploadId, updated: false };
}
