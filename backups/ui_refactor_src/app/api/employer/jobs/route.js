import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { fetchCollegeAdminUserIds, notifyStudentsOfTenant, notifyUsersOneAtATime } from '@/lib/notificationService';

/** Avoid stale lists after posting (Next may cache GET route handlers). */
export const dynamic = 'force-dynamic';

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
const PROGRAM_JOB_TYPES = new Set(['internship', 'short_project', 'hackathon']);

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    const emp = await getEmployerId(userId);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const jobTypeFilter = searchParams.get('jobType');
    const typeClause =
      jobTypeFilter && JOB_TYPES.has(jobTypeFilter) ? ` AND job_type = $2` : '';
    const params = jobTypeFilter && JOB_TYPES.has(jobTypeFilter) ? [emp.id, jobTypeFilter] : [emp.id];

    const jobs = await query(
      `SELECT id, title, description, job_type, status, salary_min, salary_max, min_cgpa, vacancies,
              skills_required, eligible_branches, created_at
       FROM job_postings
       WHERE employer_id = $1::uuid${typeClause}
       ORDER BY created_at DESC`,
      params,
    );

    const rows = jobs.rows.map((j) => ({
      id: j.id,
      title: j.title,
      keywords: (j.skills_required || []).join(', '),
      type: j.job_type,
      salaryMin: j.salary_min != null ? Number(j.salary_min) : null,
      salaryMax: j.salary_max != null ? Number(j.salary_max) : null,
      status: j.status,
      vacancies: j.vacancies,
      applications: 0,
      branches: j.eligible_branches?.length ? j.eligible_branches : [],
      cgpa: j.min_cgpa != null ? Number(j.min_cgpa) : null,
      createdAt: j.created_at ? new Date(j.created_at).toISOString().slice(0, 10) : '',
      placementDriveId: '',
    }));

    return NextResponse.json({ jobs: rows, companyName: emp.company_name });
  } catch (e) {
    console.error('GET /api/employer/jobs', e);
    return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    const emp = await getEmployerId(userId);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
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
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (!JOB_TYPES.has(jobType)) {
      return NextResponse.json({ error: 'Invalid jobType' }, { status: 400 });
    }

    const allowedStatus = new Set(['draft', 'published', 'closed', 'cancelled']);
    if (!allowedStatus.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const skills = parseKeywords(keywords);
    const skillsRequired = skills.length ? skills : ['General'];

    const uniqueTenants = [...new Set((tenantIds || []).map((t) => String(t).trim()).filter(Boolean))];

    if (status === 'published' && PROGRAM_JOB_TYPES.has(jobType) && uniqueTenants.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one approved campus so students and the college can see this posting.' },
        { status: 400 },
      );
    }

    const result = await transaction(async (client) => {
      let tenantsToPublish = [];
      if (status === 'published' && uniqueTenants.length) {
        for (const tenantId of uniqueTenants) {
          const appr = await client.query(
            `SELECT 1 FROM employer_approvals
             WHERE tenant_id = $1::uuid AND employer_id = $2::uuid AND status = 'approved'`,
            [tenantId, emp.id],
          );
          if (appr.rows.length) tenantsToPublish.push(tenantId);
        }
        if (PROGRAM_JOB_TYPES.has(jobType) && tenantsToPublish.length === 0) {
          const err = new Error(
            'Cannot publish: none of the selected campuses have an approved employer tie-up. Ask the college to approve access, then try again.',
          );
          err.statusCode = 400;
          throw err;
        }
      }

      const ins = await client.query(
        `INSERT INTO job_postings (
           employer_id, title, description, job_type, category, locations,
           salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year,
           skills_required, vacancies, status
         ) VALUES (
           $1::uuid, $2, $3, $4, $5, ARRAY['India']::text[],
           $6, $7, ARRAY['Computer Science & Engineering', 'Information Technology']::text[],
           $8, 0, 2025, $9::text[], $10, $11
         )
         RETURNING id, title, job_type, status, salary_min, salary_max, min_cgpa, vacancies, skills_required, created_at`,
        [
          emp.id,
          title.trim(),
          description || '',
          jobType,
          jobType === 'internship'
            ? 'Internship'
            : jobType === 'short_project' || jobType === 'hackathon'
              ? 'Student program'
              : 'Engineering',
          salaryMin != null && salaryMin !== '' ? Number(salaryMin) : null,
          salaryMax != null && salaryMax !== '' ? Number(salaryMax) : null,
          minCgpa != null && minCgpa !== '' ? Number(minCgpa) : 0,
          skillsRequired,
          Math.max(1, parseInt(String(vacancies), 10) || 1),
          status,
        ],
      );

      const job = ins.rows[0];

      if (status === 'published' && tenantsToPublish.length) {
        for (const tenantId of tenantsToPublish) {
          await client.query(
            `INSERT INTO job_posting_visibility (job_id, tenant_id) VALUES ($1::uuid, $2::uuid)
             ON CONFLICT (job_id, tenant_id) DO NOTHING`,
            [job.id, tenantId],
          );

          const college = await client.query(`SELECT name FROM tenants WHERE id = $1::uuid`, [tenantId]);
          const collegeName = college.rows[0]?.name || 'Campus';

          const adminIds = await fetchCollegeAdminUserIds(tenantId, client);
          const isProgram =
            jobType === 'internship' || jobType === 'short_project' || jobType === 'hackathon';
          await notifyUsersOneAtATime(
            adminIds,
            {
              title:
                jobType === 'internship'
                  ? `${emp.company_name} posted an internship`
                  : isProgram
                    ? `${emp.company_name} posted a student program`
                    : `${emp.company_name} published a job`,
              message: `${emp.company_name} published "${job.title}" (${String(jobType).replace(/_/g, ' ')}) for ${collegeName}.`,
              type: jobType === 'internship' ? 'info' : 'application',
              link:
                jobType === 'internship'
                  ? '/dashboard/college/internships'
                  : isProgram
                    ? '/dashboard/college/internships'
                    : '/dashboard/college/drives',
            },
            client,
          );

          if (jobType === 'internship') {
            await notifyStudentsOfTenant(
              tenantId,
              {
                title: `New internship: ${job.title}`,
                message: `${emp.company_name} posted an internship. Open Internships under Placements to apply.`,
                type: 'drive',
                link: '/dashboard/student/internships',
              },
              client,
            );
          }
          if (jobType === 'short_project' || jobType === 'hackathon') {
            await notifyStudentsOfTenant(
              tenantId,
              {
                title: `New project: ${job.title}`,
                message: `${emp.company_name} posted a ${String(jobType).replace(/_/g, ' ')}. Open Projects under Placements to apply.`,
                type: 'info',
                link: '/dashboard/student/projects',
              },
              client,
            );
          }
        }
      }

      return { ok: true, job };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/employer/jobs', e);
    const status = e.statusCode === 400 ? 400 : 500;
    const safeMsg = status >= 500 ? 'Failed to create job' : (e.message || 'Failed to create job');
    return NextResponse.json({ error: safeMsg }, { status });
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    const emp = await getEmployerId(userId);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
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
    } = body;

    const jobId = String(id || '').trim();
    if (!jobId || !title?.trim()) {
      return NextResponse.json({ error: 'id and title are required' }, { status: 400 });
    }
    if (!JOB_TYPES.has(jobType)) {
      return NextResponse.json({ error: 'Invalid jobType' }, { status: 400 });
    }
    const allowedStatus = new Set(['draft', 'published', 'closed', 'cancelled']);
    if (!allowedStatus.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const skills = parseKeywords(keywords);
    const skillsRequired = skills.length ? skills : ['General'];

    const updated = await query(
      `UPDATE job_postings
       SET title = $1,
           description = $2,
           job_type = $3,
           status = $4,
           salary_min = $5,
           salary_max = $6,
           min_cgpa = $7,
           vacancies = $8,
           skills_required = $9::text[],
           updated_at = NOW()
       WHERE id = $10::uuid AND employer_id = $11::uuid
       RETURNING id, title, job_type, status`,
      [
        title.trim(),
        description || '',
        jobType,
        status,
        salaryMin != null && salaryMin !== '' ? Number(salaryMin) : null,
        salaryMax != null && salaryMax !== '' ? Number(salaryMax) : null,
        minCgpa != null && minCgpa !== '' ? Number(minCgpa) : 0,
        Math.max(1, parseInt(String(vacancies), 10) || 1),
        skillsRequired,
        jobId,
        emp.id,
      ],
    );

    if (!updated.rows.length) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, job: updated.rows[0] });
  } catch (e) {
    console.error('PATCH /api/employer/jobs', e);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}
