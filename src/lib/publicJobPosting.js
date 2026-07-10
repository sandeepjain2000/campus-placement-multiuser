import { query } from '@/lib/db';
import {
  jobPostingNotDeletedSql,
  jobVisibilityCollegeApprovedSql,
} from '@/lib/migrationReady';
import { ALUMNI_JOB_TYPES } from '@/lib/studentAlumni';

/**
 * Load a published job for public sharing (external applicants).
 * @param {string} jobId
 */
export async function loadPublicJobPosting(jobId) {
  const id = String(jobId || '').trim();
  if (!id) return null;

  const jpNotDeleted = await jobPostingNotDeletedSql('jp');
  const collegeApproved = await jobVisibilityCollegeApprovedSql();

  const sql = `SELECT
      jp.id,
      jp.title,
      jp.description,
      jp.job_type,
      jp.salary_min,
      jp.salary_max,
      jp.vacancies,
      jp.skills_required,
      jp.application_deadline,
      jp.work_mode,
      jp.status,
      ep.company_name,
      ep.website
    FROM job_postings jp
    INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
    WHERE jp.id = $1::uuid
      AND jp.status = 'published'
      ${jpNotDeleted}
      AND jp.job_type = ANY($2::text[])
      AND EXISTS (
        SELECT 1
        FROM job_posting_visibility jpv
        WHERE jpv.job_id = jp.id
        ${collegeApproved}
      )
    LIMIT 1`;

  try {
    const res = await query(sql, [id, ALUMNI_JOB_TYPES]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      jobType: row.job_type,
      salaryMin: row.salary_min != null ? Number(row.salary_min) : null,
      salaryMax: row.salary_max != null ? Number(row.salary_max) : null,
      vacancies: row.vacancies,
      skillsRequired: row.skills_required || [],
      applicationDeadline: row.application_deadline,
      workMode: row.work_mode,
      companyName: row.company_name,
      website: row.website,
    };
  } catch (e) {
    if (e?.code === '42P01' || e?.code === '42703') {
      const fallback = await query(
        `SELECT
          jp.id,
          jp.title,
          jp.description,
          jp.job_type,
          jp.salary_min,
          jp.salary_max,
          jp.vacancies,
          jp.skills_required,
          jp.application_deadline,
          jp.work_mode,
          jp.status,
          ep.company_name,
          ep.website
        FROM job_postings jp
        INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
        WHERE jp.id = $1::uuid
          AND jp.status = 'published'
          AND jp.job_type = ANY($2::text[])
        LIMIT 1`,
        [id, ALUMNI_JOB_TYPES],
      );
      const row = fallback.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        jobType: row.job_type,
        salaryMin: row.salary_min != null ? Number(row.salary_min) : null,
        salaryMax: row.salary_max != null ? Number(row.salary_max) : null,
        vacancies: row.vacancies,
        skillsRequired: row.skills_required || [],
        applicationDeadline: row.application_deadline,
        workMode: row.work_mode,
        companyName: row.company_name,
        website: row.website,
      };
    }
    throw e;
  }
}

/**
 * Resolve tenant + company for a public job question.
 * @param {string} jobId
 */
export async function resolvePublicJobQuestionContext(jobId) {
  const id = String(jobId || '').trim();
  if (!id) return null;

  const collegeApproved = await jobVisibilityCollegeApprovedSql();
  const jpNotDeleted = await jobPostingNotDeletedSql('jp');

  const res = await query(
    `SELECT
       ep.company_name,
       jpv.tenant_id
     FROM job_postings jp
     INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
     INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id
     WHERE jp.id = $1::uuid
       AND jp.status = 'published'
       ${jpNotDeleted}
       ${collegeApproved}
     ORDER BY jpv.updated_at DESC NULLS LAST
     LIMIT 1`,
    [id],
  ).catch(async (e) => {
    if (e?.code !== '42P01' && e?.code !== '42703') throw e;
    return query(
      `SELECT ep.company_name, jpv.tenant_id
       FROM job_postings jp
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id
       WHERE jp.id = $1::uuid AND jp.status = 'published'
       LIMIT 1`,
      [id],
    );
  });

  const row = res.rows[0];
  if (!row?.tenant_id || !row?.company_name) return null;
  return {
    tenantId: row.tenant_id,
    companyName: String(row.company_name).trim(),
  };
}
