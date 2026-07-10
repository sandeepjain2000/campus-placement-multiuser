/**
 * Publish/draft visibility for job_postings (internships, jobs, programs).
 * Student listings filter on status = 'published' (not is_visible alone).
 */

import {
  resolveBatchYearInput,
  resolveEligibleBranchesInput,
  resolveInternshipDateInput,
  resolveInternshipDatesFromRow,
  resolveMaxBacklogsInput,
} from '@/lib/internshipPostingMeta';

/** SQL fragment: job posting row is open for new student discovery. */
export const JOB_POSTING_STUDENT_LISTED_SQL = "jp.status = 'published'";

const listCache = new Map();

function cacheKey(tenantIds, kind) {
  const tenants = [...(tenantIds || [])].map(String).sort().join(',');
  return `${kind || 'all'}:${tenants}`;
}

export function getStudentOpportunityListCache(tenantIds, kind) {
  return listCache.get(cacheKey(tenantIds, kind)) ?? null;
}

export function setStudentOpportunityListCache(tenantIds, kind, payload) {
  listCache.set(cacheKey(tenantIds, kind), {
    payload,
    cachedAt: Date.now(),
  });
}

/** Clear cached student opportunity lists after employer publish/draft changes. */
export function invalidateStudentOpportunityListCache() {
  listCache.clear();
}

async function runJobPostingVisibilityUpdate(client, sqlWithVisibility, sqlStatusOnly, params) {
  try {
    await client.query(sqlWithVisibility, params);
  } catch (err) {
    if (err?.code !== '42703') throw err;
    await client.query(sqlStatusOnly, params);
  }
}

/**
 * Close a published posting (employer Close action).
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }} db
 */
const EMPLOYER_WITHDRAW_NOTE = 'Employer withdrew this posting.';

/**
 * Withdraw a published posting: cancel listing and mark active applications withdrawn.
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }} db
 */
export async function withdrawPublishedJobPosting(db, jobId, employerId) {
  const params = [jobId, employerId];
  const where =
    "WHERE id = $1::uuid AND employer_id = $2::uuid AND status = 'published' RETURNING id, title, job_type, status";

  let jobRes;
  try {
    jobRes = await db.query(
      `UPDATE job_postings SET status = 'cancelled', is_visible = false, updated_at = NOW() ${where}`,
      params,
    );
  } catch (err) {
    if (err?.code !== '42703') throw err;
    jobRes = await db.query(
      `UPDATE job_postings SET status = 'cancelled', updated_at = NOW() ${where}`,
      params,
    );
  }

  if (!jobRes.rows.length) {
    return { job: null, applicationsWithdrawn: 0 };
  }

  const appRes = await db.query(
    `UPDATE program_applications
     SET status = 'withdrawn',
         notes = CASE
           WHEN COALESCE(TRIM(notes), '') = '' THEN $2
           WHEN POSITION($2 IN notes) > 0 THEN notes
           ELSE notes || E'\\n' || $2
         END,
         updated_at = NOW()
     WHERE job_id = $1::uuid
       AND status NOT IN ('withdrawn', 'rejected')`,
    [jobId, EMPLOYER_WITHDRAW_NOTE],
  );

  return {
    job: jobRes.rows[0],
    applicationsWithdrawn: appRes.rowCount ?? 0,
  };
}

export async function closePublishedJobPosting(db, jobId, employerId) {
  const params = [jobId, employerId];
  const where =
    'WHERE id = $1::uuid AND employer_id = $2::uuid AND status = \'published\' RETURNING id, title, job_type, status';

  try {
    return await db.query(
      `UPDATE job_postings SET status = 'closed', is_visible = false, updated_at = NOW() ${where}`,
      params,
    );
  } catch (err) {
    if (err?.code !== '42703') throw err;
    return db.query(`UPDATE job_postings SET status = 'closed', updated_at = NOW() ${where}`, params);
  }
}

/**
 * Apply status transition side effects (is_visible is also enforced by DB trigger when migrated).
 * @param {import('pg').PoolClient} client
 */
export async function applyJobPostingStatusTransition(client, jobId, nextStatus) {
  if (nextStatus === 'published') {
    await runJobPostingVisibilityUpdate(
      client,
      `UPDATE job_postings
       SET is_visible = true,
           published_at = COALESCE(published_at, NOW()),
           updated_at = NOW()
       WHERE id = $1::uuid`,
      `UPDATE job_postings SET updated_at = NOW() WHERE id = $1::uuid`,
      [jobId],
    );
  } else if (nextStatus === 'draft' || nextStatus === 'closed' || nextStatus === 'cancelled') {
    await runJobPostingVisibilityUpdate(
      client,
      `UPDATE job_postings
       SET is_visible = false,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      `UPDATE job_postings SET updated_at = NOW() WHERE id = $1::uuid`,
      [jobId],
    );
  }
}

export function assertEmployerMaySetJobStatus(currentStatus, nextStatus) {
  if (currentStatus === 'published' && nextStatus === 'draft') {
    const err = new Error(
      'Published postings cannot be moved back to draft. Add details under Additional information, or ask the college to update core requirements.',
    );
    err.statusCode = 400;
    throw err;
  }
}

/**
 * When published, employers may only update narrative fields (additional_info / description).
 */
export function buildPublishedEmployerPatchSql(existing, body) {
  const nextAdditional =
    body.additionalInfo !== undefined
      ? String(body.additionalInfo ?? '')
      : existing.additional_info ?? '';
  const nextDescription =
    body.description !== undefined ? String(body.description ?? '') : existing.description ?? '';

  return {
    sql: `UPDATE job_postings
          SET additional_info = $1,
              description = $2,
              updated_at = NOW()
          WHERE id = $3::uuid AND employer_id = $4::uuid
          RETURNING id, title, job_type, status, additional_info`,
    sqlWithoutAdditional: `UPDATE job_postings
          SET description = $1,
              updated_at = NOW()
          WHERE id = $2::uuid AND employer_id = $3::uuid
          RETURNING id, title, job_type, status`,
    params: [nextAdditional, nextDescription, existing.id, existing.employer_id],
    paramsWithoutAdditional: [nextDescription, existing.id, existing.employer_id],
    lockedCore: true,
  };
}

/**
 * Patch narrative fields on a published posting; omits additional_info when column is missing.
 * @param {import('pg').PoolClient} client
 */
export async function runPublishedEmployerPatch(client, existing, body) {
  const patch = buildPublishedEmployerPatchSql(existing, body);
  try {
    return await client.query(patch.sql, patch.params);
  } catch (err) {
    if (err?.code !== '42703') throw err;
    return client.query(patch.sqlWithoutAdditional, patch.paramsWithoutAdditional);
  }
}

export function publishedCoreFieldsChanged(existing, body, skillsRequired) {
  const title = body.title?.trim() ?? existing.title;
  const jobType = body.jobType ?? existing.job_type;
  const salaryMin =
    body.salaryMin != null && body.salaryMin !== ''
      ? Number(body.salaryMin)
      : existing.salary_min != null
        ? Number(existing.salary_min)
        : null;
  const salaryMax =
    body.salaryMax != null && body.salaryMax !== ''
      ? Number(body.salaryMax)
      : existing.salary_max != null
        ? Number(existing.salary_max)
        : null;
  const minCgpa =
    body.minCgpa !== undefined && body.minCgpa !== null && body.minCgpa !== ''
      ? body.minCgpa
      : existing.min_cgpa;
  const vacancies =
    body.vacancies !== undefined
      ? Math.max(1, parseInt(String(body.vacancies), 10) || 1)
      : existing.vacancies;
  const skills = skillsRequired ?? existing.skills_required;
  const branches =
    body.eligibleBranches !== undefined
      ? resolveEligibleBranchesInput(body.eligibleBranches)
      : existing.eligible_branches;
  const maxBacklogs =
    body.maxBacklogs !== undefined ? resolveMaxBacklogsInput(body.maxBacklogs) : existing.max_backlogs;
  const batchYear =
    body.batchYear !== undefined ? resolveBatchYearInput(body.batchYear) : existing.batch_year;
  const existingDates = resolveInternshipDatesFromRow(existing);
  const nextStartDate =
    body.startDate !== undefined ? resolveInternshipDateInput(body.startDate) : existingDates.startDate;
  const nextEndDate =
    body.endDate !== undefined ? resolveInternshipDateInput(body.endDate) : existingDates.endDate;
  const internshipDatesChanged =
    (existing.job_type === 'internship' || jobType === 'internship') &&
    (String(nextStartDate ?? '') !== String(existingDates.startDate ?? '') ||
      String(nextEndDate ?? '') !== String(existingDates.endDate ?? ''));

  return (
    title !== (existing.title || '').trim() ||
    jobType !== existing.job_type ||
    salaryMin !== (existing.salary_min != null ? Number(existing.salary_min) : null) ||
    salaryMax !== (existing.salary_max != null ? Number(existing.salary_max) : null) ||
    String(minCgpa) !== String(existing.min_cgpa ?? '') ||
    vacancies !== existing.vacancies ||
    JSON.stringify(skills || []) !== JSON.stringify(existing.skills_required || []) ||
    JSON.stringify(branches || []) !== JSON.stringify(existing.eligible_branches || []) ||
    String(maxBacklogs ?? '') !== String(existing.max_backlogs ?? '') ||
    String(batchYear ?? '') !== String(existing.batch_year ?? '') ||
    internshipDatesChanged
  );
}
