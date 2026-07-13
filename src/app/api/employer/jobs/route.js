import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { validateEmployerJobPayload, validateInternshipBatchYearPayload, validateMaxBacklogsPayload, validateTitlePayload } from '@/lib/apiInputValidation';
import { normalizeTitle } from '@/lib/validators';
import { jobPostingNotDeletedSql } from '@/lib/migrationReady';
import {
  PROGRAM_JOB_TYPES,
  resolvePublishTenantIds,
  syncJobPostingVisibility,
} from '@/lib/jobPostingVisibility';
import {
  normalizeEmployerMinCgpa,
  resolveEmployerMinCgpaForSubmit,
} from '@/lib/employerJobDisplay';
import { JOB_APPLICANT_COUNT_SUBQUERY } from '@/lib/employerApplicationCounts';
import {
  applyJobPostingStatusTransition,
  assertEmployerMaySetJobStatus,
  closePublishedJobPosting,
  withdrawPublishedJobPosting,
  invalidateStudentOpportunityListCache,
  publishedCoreFieldsChanged,
  runPublishedEmployerPatch,
} from '@/lib/jobPostingPublishState';
import {
  isAlumniEmploymentType,
  mapAlumniJobApiRow,
  resolveEmployerJobsListFilter,
  validateAlumniJobPostingPayload,
} from '@/lib/alumniJobPosting';
import { sqlJobAcademicYearFilter } from '@/lib/employerAcademicYear';
import { respondPlatformError , withApiHandlers } from '@/lib/platformErrorRoute';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';
import {
  buildInternshipAdditionalInfo,
  parseInternshipAdditionalInfo,
  resolveEligibleBranchesInput,
  resolveInternshipDateInput,
  resolveInternshipDatesFromRow,
  resolveMaxBacklogsInput,
  validateInternshipBatchYearField,
  validateInternshipDateFields,
} from '@/lib/internshipPostingMeta';

export const dynamic = 'force-dynamic';
export const revalidate = 0;





/** Avoid stale lists after posting (Next may cache GET route handlers). */

async function getEmployerId(userId) {
  const r = await query(`SELECT id, company_name FROM employer_profiles WHERE user_id = $1::uuid`, [userId]);
  return r.rows[0] || null;
}

function parseKeywords(keywords) {
  return String(keywords || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const JOB_TYPES = new Set(['full_time', 'internship', 'contract', 'ppo', 'hackathon', 'short_project', 'mentorship', 'guest_faculty']);

const ALUMNI_LATERAL_SELECT = `
              jp.min_experience_years, jp.max_experience_years, jp.work_mode,
              jp.notice_period_days, jp.seniority_level, jp.education_level,`;

function mapEmployerJobRows(rows) {
  return rows.map((j) => {
    const { specializations } = parseInternshipAdditionalInfo(j.additional_info);
    const { startDate, endDate } = resolveInternshipDatesFromRow(j);
    return {
      id: j.id,
      title: j.title,
      description: j.description || '',
      keywords: (j.skills_required || []).join(', '),
      type: j.job_type,
      salaryMin: j.salary_min != null ? Number(j.salary_min) : null,
      salaryMax: j.salary_max != null ? Number(j.salary_max) : null,
      status: j.status,
      vacancies: j.vacancies,
      applications: Number(j.application_count) || 0,
      branches: j.eligible_branches?.length ? j.eligible_branches : [],
      eligibleBranches: j.eligible_branches?.length ? j.eligible_branches : [],
      maxBacklogs: j.max_backlogs != null ? Number(j.max_backlogs) : null,
      batchYear: j.batch_year != null ? Number(j.batch_year) : null,
      additionalInfo: j.additional_info || '',
      specializations,
      startDate,
      endDate,
      cgpa: normalizeEmployerMinCgpa(j.min_cgpa),
      minCgpa: normalizeEmployerMinCgpa(j.min_cgpa),
      createdAt: j.created_at ? new Date(j.created_at).toISOString().slice(0, 10) : '',
      tenantIds: Array.isArray(j.tenant_ids) ? j.tenant_ids.filter(Boolean) : [],
      ...mapAlumniJobApiRow(j),
    };
  });
}

async function queryEmployerJobs(empId, listTypes, { campusId = null, academicYearId = null } = {}) {
  const params = [empId];
  let typeClause = '';
  if (listTypes?.length) {
    params.push(listTypes);
    typeClause = ` AND jp.job_type = ANY($${params.length}::text[])`;
  }
  let campusJoin = '';
  if (campusId) {
    params.push(campusId);
    campusJoin = ` INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id AND jpv.tenant_id = $${params.length}::uuid`;
  }
  let yearFilter = '';
  if (academicYearId) {
    params.push(academicYearId);
    yearFilter = sqlJobAcademicYearFilter('jp', params.length);
  }
  const notDeletedSql = await jobPostingNotDeletedSql('jp');
  const baseFrom = `
       FROM job_postings jp${campusJoin}
       WHERE jp.employer_id = $1::uuid${typeClause}${yearFilter} ${notDeletedSql}
       ORDER BY jp.created_at DESC`;

  const tenantIdsSelect = `COALESCE(
                (SELECT array_agg(jpv.tenant_id::text)
                 FROM job_posting_visibility jpv
                 WHERE jpv.job_id = jp.id),
                ARRAY[]::text[]
              ) AS tenant_ids`;

  const selectVariants = [
    `SELECT jp.id, jp.title, jp.description, jp.job_type, jp.status, jp.salary_min, jp.salary_max,
            jp.min_cgpa, jp.vacancies, jp.skills_required, jp.eligible_branches, jp.max_backlogs,
            jp.batch_year, jp.internship_start_date, jp.internship_end_date, jp.additional_info, jp.created_at,
            jp.category, jp.locations,
            ${ALUMNI_LATERAL_SELECT}
            ${JOB_APPLICANT_COUNT_SUBQUERY} AS application_count,
            ${tenantIdsSelect}`,
    `SELECT jp.id, jp.title, jp.description, jp.job_type, jp.status, jp.salary_min, jp.salary_max,
            jp.min_cgpa, jp.vacancies, jp.skills_required, jp.eligible_branches, jp.max_backlogs,
            jp.batch_year, jp.internship_start_date, jp.internship_end_date, jp.additional_info, jp.created_at,
            jp.category, jp.locations,
            ${JOB_APPLICANT_COUNT_SUBQUERY} AS application_count,
            ${tenantIdsSelect}`,
    `SELECT jp.id, jp.title, jp.description, jp.job_type, jp.status, jp.salary_min, jp.salary_max,
            jp.min_cgpa, jp.vacancies, jp.skills_required, jp.eligible_branches, jp.max_backlogs,
            jp.batch_year, NULL::date AS internship_start_date, NULL::date AS internship_end_date,
            jp.additional_info, jp.created_at,
            jp.category, jp.locations,
            ${JOB_APPLICANT_COUNT_SUBQUERY} AS application_count,
            ${tenantIdsSelect}`,
    `SELECT jp.id, jp.title, jp.description, jp.job_type, jp.status, jp.salary_min, jp.salary_max,
            jp.min_cgpa, jp.vacancies, jp.skills_required, jp.eligible_branches, jp.created_at,
            jp.category, jp.locations,
            ${JOB_APPLICANT_COUNT_SUBQUERY} AS application_count,
            ${tenantIdsSelect}`,
    `SELECT jp.id, jp.title, jp.description, jp.job_type, jp.status, jp.salary_min, jp.salary_max,
            jp.min_cgpa, jp.vacancies, jp.skills_required, jp.eligible_branches, jp.created_at,
            ${JOB_APPLICANT_COUNT_SUBQUERY} AS application_count,
            ${tenantIdsSelect}`,
  ];

  let lastErr;
  for (const selectSql of selectVariants) {
    try {
      const jobs = await query(`${selectSql} ${baseFrom}`, params);
      return jobs.rows;
    } catch (err) {
      if (err?.code !== '42703') throw err;
      lastErr = err;
    }
  }

  throw lastErr || new Error('Could not query job_postings');
}

async function insertAlumniJobPosting(client, values) {
  const [
    empId,
    title,
    description,
    jobType,
    categoryText,
    locationsArr,
    salaryMin,
    salaryMax,
    skillsRequired,
    vacancies,
    status,
    minExperience,
    maxExperience,
    workMode,
    noticePeriodDays,
    seniorityLevel,
    educationLevel,
  ] = values;

  try {
    return await client.query(
      `INSERT INTO job_postings (
         employer_id, title, description, job_type, category, locations,
         salary_min, salary_max, skills_required, vacancies, status,
         min_experience_years, max_experience_years, work_mode,
         notice_period_days, seniority_level, education_level,
         min_cgpa, max_backlogs, batch_year, eligible_branches
       ) VALUES (
         $1::uuid, $2, $3, $4, $5, $6::text[],
         $7, $8, $9::text[], $10, $11,
         $12, $13, $14, $15, $16, $17,
         NULL, 0, NULL, NULL
       )
       RETURNING id, title, job_type, status, salary_min, salary_max, min_cgpa, vacancies, skills_required, created_at`,
      values,
    );
  } catch (err) {
    if (err?.code !== '42703') throw err;
    return client.query(
      `INSERT INTO job_postings (
         employer_id, title, description, job_type, category, locations,
         salary_min, salary_max, skills_required, vacancies, status,
         min_cgpa, max_backlogs, batch_year, eligible_branches
       ) VALUES (
         $1::uuid, $2, $3, $4, $5, $6::text[],
         $7, $8, $9::text[], $10, $11,
         NULL, 0, NULL, NULL
       )
       RETURNING id, title, job_type, status, salary_min, salary_max, min_cgpa, vacancies, skills_required, created_at`,
      [
        empId,
        title,
        description,
        jobType,
        categoryText,
        locationsArr,
        salaryMin,
        salaryMax,
        skillsRequired,
        vacancies,
        status,
      ],
    );
  }
}

async function updateAlumniJobPosting(client, params) {
  const {
    title,
    description,
    jobType,
    status,
    salaryMin,
    salaryMax,
    vacancies,
    skillsRequired,
    categoryText,
    locationsArr,
    minExperience,
    maxExperience,
    workMode,
    noticePeriodDays,
    seniorityLevel,
    educationLevel,
    jobId,
    empId,
  } = params;

  const baseValues = [
    title.trim(),
    description || '',
    jobType,
    status,
    salaryMin != null && salaryMin !== '' ? Number(salaryMin) : null,
    salaryMax != null && salaryMax !== '' ? Number(salaryMax) : null,
    Math.max(1, parseInt(String(vacancies), 10) || 1),
    skillsRequired,
    categoryText,
    locationsArr,
    jobId,
    empId,
  ];

  try {
    return await client.query(
      `UPDATE job_postings
       SET title = $1,
           description = $2,
           job_type = $3,
           status = $4,
           salary_min = $5,
           salary_max = $6,
           vacancies = $7,
           skills_required = $8::text[],
           category = $9,
           locations = $10::text[],
           min_experience_years = $11,
           max_experience_years = $12,
           work_mode = $13,
           notice_period_days = $14,
           seniority_level = $15,
           education_level = $16,
           min_cgpa = NULL,
           batch_year = NULL,
           eligible_branches = NULL,
           updated_at = NOW()
       WHERE id = $17::uuid AND employer_id = $18::uuid
       RETURNING id, title, job_type, status`,
      [
        ...baseValues.slice(0, 10),
        minExperience != null && minExperience !== '' ? Number(minExperience) : null,
        maxExperience != null && maxExperience !== '' ? Number(maxExperience) : null,
        workMode || null,
        noticePeriodDays != null && noticePeriodDays !== '' ? Number(noticePeriodDays) : null,
        seniorityLevel || null,
        educationLevel || 'any',
        ...baseValues.slice(10),
      ],
    );
  } catch (err) {
    if (err?.code !== '42703') throw err;
    return client.query(
      `UPDATE job_postings
       SET title = $1,
           description = $2,
           job_type = $3,
           status = $4,
           salary_min = $5,
           salary_max = $6,
           vacancies = $7,
           skills_required = $8::text[],
           category = $9,
           locations = $10::text[],
           min_cgpa = NULL,
           batch_year = NULL,
           eligible_branches = NULL,
           updated_at = NOW()
       WHERE id = $11::uuid AND employer_id = $12::uuid
       RETURNING id, title, job_type, status`,
      baseValues,
    );
  }
}

async function fetchEmployerJobForPatch(client, jobId, empId) {
  const notDeleted = await jobPostingNotDeletedSql('jp');
  const params = [jobId, empId];
  const selects = [
    `SELECT id, employer_id, title, description, job_type, status, salary_min, salary_max,
            min_cgpa, vacancies, skills_required, additional_info, eligible_branches,
            max_backlogs, batch_year, internship_start_date, internship_end_date
     FROM job_postings jp
     WHERE id = $1::uuid AND employer_id = $2::uuid ${notDeleted}`,
    `SELECT id, employer_id, title, description, job_type, status, salary_min, salary_max,
            min_cgpa, vacancies, skills_required, additional_info, eligible_branches,
            max_backlogs, batch_year, NULL::date AS internship_start_date, NULL::date AS internship_end_date
     FROM job_postings jp
     WHERE id = $1::uuid AND employer_id = $2::uuid ${notDeleted}`,
    `SELECT id, employer_id, title, description, job_type, status, salary_min, salary_max,
            min_cgpa, vacancies, skills_required, NULL::text AS additional_info, eligible_branches,
            max_backlogs, batch_year, NULL::date AS internship_start_date, NULL::date AS internship_end_date
     FROM job_postings jp
     WHERE id = $1::uuid AND employer_id = $2::uuid ${notDeleted}`,
    `SELECT id, employer_id, title, description, job_type, status, salary_min, salary_max,
            min_cgpa, vacancies, skills_required, NULL::text AS additional_info, eligible_branches,
            NULL::integer AS max_backlogs, NULL::integer AS batch_year,
            NULL::date AS internship_start_date, NULL::date AS internship_end_date
     FROM job_postings jp
     WHERE id = $1::uuid AND employer_id = $2::uuid ${notDeleted}`,
    `SELECT id, employer_id, title, description, job_type, status, salary_min, salary_max,
            min_cgpa, vacancies, skills_required, NULL::text AS additional_info,
            NULL::text[] AS eligible_branches, NULL::integer AS max_backlogs, NULL::integer AS batch_year,
            NULL::date AS internship_start_date, NULL::date AS internship_end_date
     FROM job_postings jp
     WHERE id = $1::uuid AND employer_id = $2::uuid ${notDeleted}`,
  ];

  let lastErr;
  for (const sql of selects) {
    try {
      return await client.query(sql, params);
    } catch (err) {
      if (err?.code !== '42703') throw err;
      lastErr = err;
    }
  }
  throw lastErr || new Error('Could not load job_postings row');
}

async function insertInternshipJobPosting(client, values) {
  const [
    empId,
    title,
    description,
    jobType,
    categoryText,
    salaryMin,
    salaryMax,
    branchesResolved,
    minCgpaResolved,
    maxBacklogsResolved,
    batchYearResolved,
    skillsRequired,
    vacancies,
    status,
    startDateResolved,
    endDateResolved,
    additionalInfoResolved,
  ] = values;

  const baseTail = [
    empId,
    title,
    description,
    jobType,
    categoryText,
    salaryMin,
    salaryMax,
    branchesResolved,
    minCgpaResolved,
    maxBacklogsResolved,
    batchYearResolved,
    skillsRequired,
    vacancies,
    status,
  ];

  const attempts = [
    {
      sql: `INSERT INTO job_postings (
              employer_id, title, description, job_type, category, locations,
              salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year,
              skills_required, vacancies, status, internship_start_date, internship_end_date, additional_info
            ) VALUES (
              $1::uuid, $2, $3, $4, $5, ARRAY['India']::text[],
              $6, $7, $8::text[], $9, $10, $11, $12::text[], $13, $14, $15::date, $16::date, $17
            )
            RETURNING id, title, job_type, status, salary_min, salary_max, min_cgpa, vacancies, skills_required, created_at`,
      params: [...baseTail, startDateResolved, endDateResolved, additionalInfoResolved],
    },
    {
      sql: `INSERT INTO job_postings (
              employer_id, title, description, job_type, category, locations,
              salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year,
              skills_required, vacancies, status, additional_info
            ) VALUES (
              $1::uuid, $2, $3, $4, $5, ARRAY['India']::text[],
              $6, $7, $8::text[], $9, $10, $11, $12::text[], $13, $14, $15
            )
            RETURNING id, title, job_type, status, salary_min, salary_max, min_cgpa, vacancies, skills_required, created_at`,
      params: [...baseTail, additionalInfoResolved],
    },
    {
      sql: `INSERT INTO job_postings (
              employer_id, title, description, job_type, category, locations,
              salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year,
              skills_required, vacancies, status
            ) VALUES (
              $1::uuid, $2, $3, $4, $5, ARRAY['India']::text[],
              $6, $7, $8::text[], $9, $10, $11, $12::text[], $13, $14
            )
            RETURNING id, title, job_type, status, salary_min, salary_max, min_cgpa, vacancies, skills_required, created_at`,
      params: baseTail,
    },
  ];

  let lastErr;
  for (const attempt of attempts) {
    try {
      return await client.query(attempt.sql, attempt.params);
    } catch (err) {
      if (err?.code !== '42703') throw err;
      lastErr = err;
    }
  }
  throw lastErr || new Error('Could not insert job_postings row');
}

async function updateInternshipJobPosting(client, values) {
  const [
    title,
    description,
    jobType,
    status,
    salaryMin,
    salaryMax,
    minCgpaResolved,
    vacancies,
    skillsRequired,
    branchesForUpdate,
    maxBacklogsForUpdate,
    batchYearForUpdate,
    startDateForUpdate,
    endDateForUpdate,
    additionalForUpdate,
    jobId,
    empId,
  ] = values;

  const returning = 'RETURNING id, title, job_type, status';
  const whereFull = 'WHERE id = $16::uuid AND employer_id = $17::uuid';
  const whereDatesOnly = 'WHERE id = $15::uuid AND employer_id = $16::uuid';
  const whereAdditionalOnly = 'WHERE id = $14::uuid AND employer_id = $15::uuid';
  const whereShort = 'WHERE id = $13::uuid AND employer_id = $14::uuid';
  const whereShorter = 'WHERE id = $12::uuid AND employer_id = $13::uuid';

  const attempts = [
    {
      sql: `UPDATE job_postings
            SET title = $1, description = $2, job_type = $3, status = $4,
                salary_min = $5, salary_max = $6, min_cgpa = $7, vacancies = $8,
                skills_required = $9::text[], eligible_branches = $10::text[],
                max_backlogs = $11, batch_year = $12,
                internship_start_date = $13::date, internship_end_date = $14::date,
                additional_info = $15, updated_at = NOW()
            ${whereFull} ${returning}`,
      params: values,
    },
    {
      sql: `UPDATE job_postings
            SET title = $1, description = $2, job_type = $3, status = $4,
                salary_min = $5, salary_max = $6, min_cgpa = $7, vacancies = $8,
                skills_required = $9::text[], eligible_branches = $10::text[],
                max_backlogs = $11, batch_year = $12,
                internship_start_date = $13::date, internship_end_date = $14::date, updated_at = NOW()
            ${whereDatesOnly} ${returning}`,
      params: [
        title,
        description,
        jobType,
        status,
        salaryMin,
        salaryMax,
        minCgpaResolved,
        vacancies,
        skillsRequired,
        branchesForUpdate,
        maxBacklogsForUpdate,
        batchYearForUpdate,
        startDateForUpdate,
        endDateForUpdate,
        jobId,
        empId,
      ],
    },
    {
      sql: `UPDATE job_postings
            SET title = $1, description = $2, job_type = $3, status = $4,
                salary_min = $5, salary_max = $6, min_cgpa = $7, vacancies = $8,
                skills_required = $9::text[], eligible_branches = $10::text[],
                max_backlogs = $11, batch_year = $12, additional_info = $13, updated_at = NOW()
            ${whereAdditionalOnly} ${returning}`,
      params: [
        title,
        description,
        jobType,
        status,
        salaryMin,
        salaryMax,
        minCgpaResolved,
        vacancies,
        skillsRequired,
        branchesForUpdate,
        maxBacklogsForUpdate,
        batchYearForUpdate,
        additionalForUpdate,
        jobId,
        empId,
      ],
    },
    {
      sql: `UPDATE job_postings
            SET title = $1, description = $2, job_type = $3, status = $4,
                salary_min = $5, salary_max = $6, min_cgpa = $7, vacancies = $8,
                skills_required = $9::text[], eligible_branches = $10::text[],
                max_backlogs = $11, batch_year = $12, updated_at = NOW()
            ${whereShort} ${returning}`,
      params: [
        title,
        description,
        jobType,
        status,
        salaryMin,
        salaryMax,
        minCgpaResolved,
        vacancies,
        skillsRequired,
        branchesForUpdate,
        maxBacklogsForUpdate,
        batchYearForUpdate,
        jobId,
        empId,
      ],
    },
    {
      sql: `UPDATE job_postings
            SET title = $1, description = $2, job_type = $3, status = $4,
                salary_min = $5, salary_max = $6, min_cgpa = $7, vacancies = $8,
                skills_required = $9::text[], eligible_branches = $10::text[], updated_at = NOW()
            ${whereShorter} ${returning}`,
      params: [
        title,
        description,
        jobType,
        status,
        salaryMin,
        salaryMax,
        minCgpaResolved,
        vacancies,
        skillsRequired,
        branchesForUpdate,
        jobId,
        empId,
      ],
    },
  ];

  let lastErr;
  for (const attempt of attempts) {
    try {
      return await client.query(attempt.sql, attempt.params);
    } catch (err) {
      if (err?.code !== '42703') throw err;
      lastErr = err;
    }
  }
  throw lastErr || new Error('Could not update job_postings row');
}

async function __platform_GET(request) {
  let session = null;
  let emp = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    emp = await getEmployerId(userId);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const { types: listTypes } = resolveEmployerJobsListFilter(searchParams);
    // Own postings list: all campuses and seasons (matches employer top bar — no campus/AY scoping).
    const jobs = await queryEmployerJobs(emp.id, listTypes, { campusId: null, academicYearId: null });
    const rows = mapEmployerJobRows(jobs);

    return NextResponse.json({ jobs: rows, companyName: emp.company_name });
  } catch (e) {
    return respondPlatformError(e, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_JOB_LIST,
      request,
      sessionUser: session?.user,
      employerId: emp?.id || null,
      defaultMessage: 'Failed to load jobs',
      logLabel: 'GET /api/employer/jobs',
    });
  }
}

async function __platform_POST(request) {
  let session = null;
  let emp = null;
  let body = {};
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    emp = await getEmployerId(userId);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    body = await request.json().catch(() => ({}));
    const {
      title,
      description = '',
      jobType = 'full_time',
      status = 'draft',
      salaryMin = null,
      salaryMax = null,
      minCgpa = null,
      vacancies = 1,
      keywords = '',
      tenantIds = [],
      minExperience = null,
      maxExperience = null,
      workMode = null,
      noticePeriodDays = null,
      seniorityLevel = null,
      educationLevel = 'any',
      location = '',
      industry = '',
      eligibleBranches = null,
      maxBacklogs = null,
      batchYear = null,
      specializations = '',
      startDate = null,
      endDate = null,
    } = body;

    const titleNormalized = normalizeTitle(title);
    if (!titleNormalized) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const titleErr = validateTitlePayload(titleNormalized, { label: 'Job title' });
    if (titleErr) {
      return NextResponse.json({ error: titleErr }, { status: 400 });
    }

    if (!JOB_TYPES.has(jobType)) {
      return NextResponse.json({ error: 'Invalid jobType' }, { status: 400 });
    }

    const alumniJob = isAlumniEmploymentType(jobType);
    const startDateResolved = !alumniJob && jobType === 'internship' ? resolveInternshipDateInput(startDate) : null;
    const endDateResolved = !alumniJob && jobType === 'internship' ? resolveInternshipDateInput(endDate) : null;
    if (!alumniJob && jobType === 'internship') {
      const dates = validateInternshipDateFields(startDateResolved, endDateResolved, {
        required: status === 'published',
      });
      if (dates.formError) {
        const field = dates.fieldErrors.endDate ? 'endDate' : dates.fieldErrors.startDate ? 'startDate' : 'dates';
        return NextResponse.json({ error: dates.formError, field }, { status: 400 });
      }
    }
    let minCgpaResolved = { value: null };

    if (alumniJob) {
      const alumniErr = validateAlumniJobPostingPayload({
        jobType,
        salaryMin,
        salaryMax,
        minExperience,
        maxExperience,
        noticePeriodDays,
      });
      if (alumniErr.error) {
        return NextResponse.json({ error: alumniErr.error }, { status: 400 });
      }
    } else {
      const jobInputErr = validateEmployerJobPayload({
        salaryMin,
        salaryMax,
        minCgpa,
        vacancies,
        jobType,
      });
      if (jobInputErr) {
        return NextResponse.json({ error: jobInputErr }, { status: 400 });
      }
      minCgpaResolved = resolveEmployerMinCgpaForSubmit(minCgpa);
      if (minCgpaResolved.error) {
        return NextResponse.json({ error: minCgpaResolved.error }, { status: 400 });
      }
    }

    const allowedStatus = new Set(['draft', 'published', 'closed', 'cancelled']);
    if (!allowedStatus.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const skills = parseKeywords(keywords);
    const skillsRequired = skills.length ? skills : ['General'];
    const branchesResolved = alumniJob ? null : resolveEligibleBranchesInput(eligibleBranches);
    if (!alumniJob) {
      const backlogErr = validateMaxBacklogsPayload(maxBacklogs);
      if (backlogErr) {
        return NextResponse.json({ error: backlogErr, field: 'maxBacklogs' }, { status: 400 });
      }
    }
    if (!alumniJob && jobType === 'internship') {
      const batchErr = validateInternshipBatchYearPayload(batchYear, {
        required: status === 'published',
      });
      if (batchErr) {
        return NextResponse.json({ error: batchErr, field: 'batchYear' }, { status: 400 });
      }
    }
    const maxBacklogsResolved = alumniJob ? null : resolveMaxBacklogsInput(maxBacklogs);
    const batchYearResolved = alumniJob ? null : validateInternshipBatchYearField(batchYear).value;
    const additionalInfoResolved = alumniJob
      ? null
      : buildInternshipAdditionalInfo({
          specializations,
          startDate: startDateResolved,
          endDate: endDateResolved,
        });

    const result = await transaction(async (client) => {
      const tenantsToPublish = await resolvePublishTenantIds(client, emp.id, tenantIds, { status, jobType });

      if (status === 'published' && PROGRAM_JOB_TYPES.has(jobType) && tenantsToPublish.length === 0) {
        const err = new Error(
          'Cannot publish: none of the selected campuses have an approved employer tie-up. Ask the college to approve access, then try again.',
        );
        err.statusCode = 400;
        throw err;
      }

      const locationText = String(location || '').trim();
      const locationsArr = locationText ? [locationText] : [];
      const categoryText =
        String(industry || '').trim() ||
        (alumniJob ? 'Experienced hire' : jobType === 'internship' ? 'Internship' : 'Engineering');

      const alumniInsertValues = [
        emp.id,
        titleNormalized,
        description || '',
        jobType,
        categoryText,
        locationsArr,
        salaryMin != null && salaryMin !== '' ? Number(salaryMin) : null,
        salaryMax != null && salaryMax !== '' ? Number(salaryMax) : null,
        skillsRequired,
        Math.max(1, parseInt(String(vacancies), 10) || 1),
        status,
        minExperience != null && minExperience !== '' ? Number(minExperience) : null,
        maxExperience != null && maxExperience !== '' ? Number(maxExperience) : null,
        workMode || null,
        noticePeriodDays != null && noticePeriodDays !== '' ? Number(noticePeriodDays) : null,
        seniorityLevel || null,
        educationLevel || 'any',
      ];

      const ins = alumniJob
        ? await insertAlumniJobPosting(client, alumniInsertValues)
        : await insertInternshipJobPosting(client, [
            emp.id,
            titleNormalized,
            description || '',
            jobType,
            jobType === 'internship'
              ? 'Internship'
              : jobType === 'short_project' || jobType === 'hackathon'
                ? 'Student program'
                : 'Engineering',
            salaryMin != null && salaryMin !== '' ? Number(salaryMin) : null,
            salaryMax != null && salaryMax !== '' ? Number(salaryMax) : null,
            branchesResolved,
            minCgpaResolved.value,
            maxBacklogsResolved,
            batchYearResolved,
            skillsRequired,
            Math.max(1, parseInt(String(vacancies), 10) || 1),
            status,
            startDateResolved,
            endDateResolved,
            additionalInfoResolved,
          ]);

      const job = ins.rows[0];

      if (status === 'published' && tenantsToPublish.length) {
        await syncJobPostingVisibility(client, {
          jobId: job.id,
          employerId: emp.id,
          tenantIds: tenantsToPublish,
          jobType,
          jobTitle: job.title,
          companyName: emp.company_name,
          notifyAdmins: true,
        });
      }

      if (status !== job.status) {
        await applyJobPostingStatusTransition(client, job.id, status);
      }

      return { ok: true, job, tenantIds: tenantsToPublish };
    });

    invalidateStudentOpportunityListCache();
    return NextResponse.json(result);
  } catch (e) {
    return respondPlatformError(e, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_JOB_CREATE,
      request,
      sessionUser: session?.user,
      employerId: emp?.id || null,
      requestBody: body,
      defaultMessage: 'Failed to create job',
      logLabel: 'POST /api/employer/jobs',
    });
  }
}

async function __platform_PATCH(request) {
  let session = null;
  let emp = null;
  let body = {};
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    emp = await getEmployerId(userId);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    body = await request.json().catch(() => ({}));

    if (body?.action === 'close') {
      const closeId = String(body.id || '').trim();
      if (!closeId) {
        return NextResponse.json({ error: 'Job id is required' }, { status: 400 });
      }
      const closed = await closePublishedJobPosting({ query }, closeId, emp.id);
      if (!closed.rows.length) {
        return NextResponse.json(
          {
            error:
              'Job not found, or it is not published. Only published postings can be closed from this action.',
          },
          { status: 404 },
        );
      }
      invalidateStudentOpportunityListCache();
      return NextResponse.json({ ok: true, job: closed.rows[0] });
    }

    if (body?.action === 'withdraw') {
      const withdrawId = String(body.id || '').trim();
      if (!withdrawId) {
        return NextResponse.json({ error: 'Job id is required' }, { status: 400 });
      }
      const { job, applicationsWithdrawn } = await withdrawPublishedJobPosting({ query }, withdrawId, emp.id);
      if (!job) {
        return NextResponse.json(
          {
            error:
              'Job not found, or it is not published. Only published postings can be withdrawn from this action.',
          },
          { status: 404 },
        );
      }
      invalidateStudentOpportunityListCache();
      return NextResponse.json({ ok: true, job, applicationsWithdrawn });
    }

    const {
      id,
      title,
      description = '',
      jobType,
      status,
      salaryMin = null,
      salaryMax = null,
      minCgpa = null,
      vacancies = 1,
      keywords = '',
      tenantIds,
      additionalInfo,
      minExperience = null,
      maxExperience = null,
      workMode = null,
      noticePeriodDays = null,
      seniorityLevel = null,
      educationLevel = 'any',
      location = '',
      industry = '',
      eligibleBranches = null,
      maxBacklogs = null,
      batchYear = null,
      specializations = '',
      startDate = null,
      endDate = null,
    } = body;

    const jobId = String(id || '').trim();
    const titleNormalized = normalizeTitle(title);
    if (!jobId || !titleNormalized) {
      return NextResponse.json({ error: 'id and title are required' }, { status: 400 });
    }
    const titleErr = validateTitlePayload(titleNormalized, { label: 'Job title' });
    if (titleErr) {
      return NextResponse.json({ error: titleErr }, { status: 400 });
    }

    if (!JOB_TYPES.has(jobType)) {
      return NextResponse.json({ error: 'Invalid jobType' }, { status: 400 });
    }

    const alumniJob = isAlumniEmploymentType(jobType);
    let minCgpaResolved = { value: null };

    if (alumniJob) {
      const alumniErr = validateAlumniJobPostingPayload({
        jobType,
        salaryMin,
        salaryMax,
        minExperience,
        maxExperience,
        noticePeriodDays,
      });
      if (alumniErr.error) {
        return NextResponse.json({ error: alumniErr.error }, { status: 400 });
      }
    } else {
      const patchInputErr = validateEmployerJobPayload({
        salaryMin,
        salaryMax,
        minCgpa,
        vacancies,
        jobType,
      });
      if (patchInputErr) {
        return NextResponse.json({ error: patchInputErr }, { status: 400 });
      }
      minCgpaResolved = resolveEmployerMinCgpaForSubmit(minCgpa);
      if (minCgpaResolved.error) {
        return NextResponse.json({ error: minCgpaResolved.error }, { status: 400 });
      }
    }
    const allowedStatus = new Set(['draft', 'published', 'closed', 'cancelled']);
    if (!allowedStatus.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const skills = parseKeywords(keywords);
    const skillsRequired = skills.length ? skills : ['General'];

    const result = await transaction(async (client) => {
      const existingRes = await fetchEmployerJobForPatch(client, jobId, emp.id);
      if (!existingRes.rows.length) {
        const err = new Error('Job not found');
        err.statusCode = 404;
        throw err;
      }
      const existing = existingRes.rows[0];

      assertEmployerMaySetJobStatus(existing.status, status);

      const branchesForUpdate = alumniJob
        ? null
        : eligibleBranches !== undefined
          ? resolveEligibleBranchesInput(eligibleBranches)
          : existing.eligible_branches;
      if (!alumniJob && maxBacklogs !== undefined) {
        const backlogErr = validateMaxBacklogsPayload(maxBacklogs);
        if (backlogErr) {
          const err = new Error(backlogErr);
          err.statusCode = 400;
          err.field = 'maxBacklogs';
          throw err;
        }
      }
      const maxBacklogsForUpdate = alumniJob
        ? null
        : maxBacklogs !== undefined
          ? resolveMaxBacklogsInput(maxBacklogs)
          : existing.max_backlogs;
      const batchYearForUpdate = alumniJob
        ? null
        : batchYear !== undefined
          ? validateInternshipBatchYearField(batchYear).value
          : existing.batch_year;
      const existingDates = resolveInternshipDatesFromRow(existing);
      const startDateForUpdate =
        alumniJob || jobType !== 'internship'
          ? null
          : startDate !== undefined
            ? resolveInternshipDateInput(startDate)
            : existingDates.startDate;
      const endDateForUpdate =
        alumniJob || jobType !== 'internship'
          ? null
          : endDate !== undefined
            ? resolveInternshipDateInput(endDate)
            : existingDates.endDate;
      if (!alumniJob && jobType === 'internship') {
        const dates = validateInternshipDateFields(startDateForUpdate, endDateForUpdate, {
          required: status === 'published',
        });
        if (dates.formError) {
          const err = new Error(dates.formError);
          err.statusCode = 400;
          err.field = dates.fieldErrors.endDate ? 'endDate' : dates.fieldErrors.startDate ? 'startDate' : 'dates';
          throw err;
        }
        const batchErr = validateInternshipBatchYearPayload(batchYearForUpdate, {
          required: status === 'published',
        });
        if (batchErr) {
          const err = new Error(batchErr);
          err.statusCode = 400;
          err.field = 'batchYear';
          throw err;
        }
      }
      const additionalForUpdate = alumniJob
        ? additionalInfo !== undefined
          ? String(additionalInfo ?? '')
          : existing.additional_info
        : buildInternshipAdditionalInfo({
            specializations:
              specializations !== undefined
                ? specializations
                : parseInternshipAdditionalInfo(existing.additional_info).specializations,
            startDate: startDateForUpdate,
            endDate: endDateForUpdate,
          });

      let updated;
      if (existing.status === 'published' && status === 'published') {
        if (publishedCoreFieldsChanged(existing, body, skillsRequired)) {
          const err = new Error(
            'Core requirements cannot be changed after publish. Use Additional information, or ask the college to update the listing.',
          );
          err.statusCode = 400;
          throw err;
        }
        updated = await runPublishedEmployerPatch(client, existing, {
          additionalInfo: additionalForUpdate,
          description,
        });
      } else if (alumniJob) {
        const locationText = String(location || '').trim();
        const locationsArr = locationText ? [locationText] : [];
        const categoryText = String(industry || '').trim() || 'Experienced hire';
        updated = await updateAlumniJobPosting(client, {
          title: titleNormalized,
          description,
          jobType,
          status,
          salaryMin,
          salaryMax,
          vacancies,
          skillsRequired,
          categoryText,
          locationsArr,
          minExperience,
          maxExperience,
          workMode,
          noticePeriodDays,
          seniorityLevel,
          educationLevel,
          jobId,
          empId: emp.id,
        });
      } else {
        updated = await updateInternshipJobPosting(client, [
          titleNormalized,
          description || '',
          jobType,
          status,
          salaryMin != null && salaryMin !== '' ? Number(salaryMin) : null,
          salaryMax != null && salaryMax !== '' ? Number(salaryMax) : null,
          minCgpaResolved.value,
          Math.max(1, parseInt(String(vacancies), 10) || 1),
          skillsRequired,
          branchesForUpdate,
          maxBacklogsForUpdate,
          batchYearForUpdate,
          startDateForUpdate,
          endDateForUpdate,
          additionalForUpdate,
          jobId,
          emp.id,
        ]);
      }

      if (!updated.rows.length) {
        const err = new Error('Job not found');
        err.statusCode = 404;
        throw err;
      }

      if (existing.status !== status) {
        await applyJobPostingStatusTransition(client, jobId, status);
      }

      let syncedTenantIds = [];
      if (status === 'published') {
        const visRes = await client.query(
          `SELECT tenant_id::text AS id FROM job_posting_visibility WHERE job_id = $1::uuid`,
          [jobId],
        );
        const savedTenantIds = visRes.rows.map((r) => r.id);
        const tenantInput = tenantIds !== undefined ? tenantIds : savedTenantIds;
        syncedTenantIds = await resolvePublishTenantIds(client, emp.id, tenantInput, { status, jobType });
        if (PROGRAM_JOB_TYPES.has(jobType) && syncedTenantIds.length === 0) {
          const err = new Error(
            'Select at least one approved campus with an active employer tie-up before publishing.',
          );
          err.statusCode = 400;
          throw err;
        }
        if (syncedTenantIds.length) {
          await syncJobPostingVisibility(client, {
            jobId,
            employerId: emp.id,
            tenantIds: syncedTenantIds,
            jobType,
            jobTitle: titleNormalized,
            companyName: emp.company_name,
            notifyAdmins: tenantIds !== undefined,
          });
        }
      }

      return { ok: true, job: updated.rows[0], tenantIds: syncedTenantIds };
    });

    invalidateStudentOpportunityListCache();
    return NextResponse.json(result);
  } catch (e) {
    return respondPlatformError(e, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_JOB_UPDATE,
      request,
      sessionUser: session?.user,
      employerId: emp?.id || null,
      requestBody: body,
      defaultMessage: 'Failed to update job',
      logLabel: 'PATCH /api/employer/jobs',
    });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
  PATCH: __platform_PATCH,
}, { context: 'api_employer_jobs' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
export const PATCH = __platformApiHandlers.PATCH;
