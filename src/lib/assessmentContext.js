import { query } from '@/lib/db';

/**
 * Resolve or create assessment context for draft/submitted tracking.
 * @param {import('pg').PoolClient} [client]
 */
export async function getOrCreateAssessmentContext(client, {
  employerId,
  tenantId,
  opportunityKind,
  driveId = null,
  jobId = null,
}) {
  const db = client || { query: (...args) => query(...args) };

  if (driveId) {
    const existing = await db.query(
      `SELECT id, submission_status, submitted_at
       FROM employer_assessment_contexts
       WHERE employer_id = $1::uuid AND tenant_id = $2::uuid
         AND opportunity_kind = $3 AND drive_id = $4::uuid
       LIMIT 1`,
      [employerId, tenantId, opportunityKind, driveId],
    );
    if (existing.rows[0]) return existing.rows[0];
    const ins = await db.query(
      `INSERT INTO employer_assessment_contexts
         (employer_id, tenant_id, opportunity_kind, drive_id, submission_status)
       VALUES ($1::uuid, $2::uuid, $3, $4::uuid, 'draft')
       RETURNING id, submission_status, submitted_at`,
      [employerId, tenantId, opportunityKind, driveId],
    );
    return ins.rows[0];
  }

  if (jobId) {
    const existing = await db.query(
      `SELECT id, submission_status, submitted_at
       FROM employer_assessment_contexts
       WHERE employer_id = $1::uuid AND tenant_id = $2::uuid
         AND opportunity_kind = $3 AND job_id = $4::uuid
       LIMIT 1`,
      [employerId, tenantId, opportunityKind, jobId],
    );
    if (existing.rows[0]) return existing.rows[0];
    const ins = await db.query(
      `INSERT INTO employer_assessment_contexts
         (employer_id, tenant_id, opportunity_kind, job_id, submission_status)
       VALUES ($1::uuid, $2::uuid, $3, $4::uuid, 'draft')
       RETURNING id, submission_status, submitted_at`,
      [employerId, tenantId, opportunityKind, jobId],
    );
    return ins.rows[0];
  }

  return { id: null, submission_status: 'draft', submitted_at: null };
}

export async function assertAssessmentContextEditable(client, {
  employerId,
  tenantId,
  opportunityKind,
  driveId = null,
  jobId = null,
}) {
  const ctx = await getOrCreateAssessmentContext(client, {
    employerId,
    tenantId,
    opportunityKind,
    driveId,
    jobId,
  });
  if (ctx.submission_status === 'submitted') {
    const err = new Error('Results are submitted and cannot be changed. Contact your campus partner if you need to reopen.');
    err.statusCode = 409;
    throw err;
  }
  return ctx;
}

export async function submitAssessmentContext(client, {
  employerId,
  tenantId,
  opportunityKind,
  driveId = null,
  jobId = null,
  userId = null,
}) {
  const ctx = await getOrCreateAssessmentContext(client, {
    employerId,
    tenantId,
    opportunityKind,
    driveId,
    jobId,
  });
  if (!ctx.id) {
    const err = new Error('Select a campus and opportunity target before submitting.');
    err.statusCode = 400;
    throw err;
  }
  if (ctx.submission_status === 'submitted') {
    return ctx;
  }
  const updated = await client.query(
    `UPDATE employer_assessment_contexts
     SET submission_status = 'submitted',
         submitted_at = NOW(),
         submitted_by = $2::uuid,
         updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING id, submission_status, submitted_at`,
    [ctx.id, userId || null],
  );
  return updated.rows[0];
}

/** Load submission status for employer UI (by kind + optional filters). */
export async function listAssessmentContextStatuses(employerId, { tenantId = null, opportunityKind = null } = {}) {
  const params = [employerId];
  let where = 'employer_id = $1::uuid';
  if (tenantId) {
    params.push(tenantId);
    where += ` AND tenant_id = $${params.length}::uuid`;
  }
  if (opportunityKind) {
    params.push(opportunityKind);
    where += ` AND opportunity_kind = $${params.length}`;
  }
  const res = await query(
    `SELECT id, tenant_id, opportunity_kind, drive_id, job_id, submission_status, submitted_at
     FROM employer_assessment_contexts
     WHERE ${where}
     ORDER BY updated_at DESC`,
    params,
  );
  return res.rows;
}
