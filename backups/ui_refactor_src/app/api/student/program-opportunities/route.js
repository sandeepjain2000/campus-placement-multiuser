import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveStudentPlacementTenantIds } from '@/lib/sessionTenant';
import { uuidInClause } from '@/lib/sqlPlaceholders';

export const dynamic = 'force-dynamic';

/**
 * Published internships or projects visible to the student's college (employer tie-up + campus selected at publish).
 * ?kind=internship | project (short_project + hackathon)
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const sessionTenant = session.user.tenantId || session.user.tenant_id;
    const tenantIds = await resolveStudentPlacementTenantIds(userId, sessionTenant);
    if (!userId || !tenantIds.length) {
      return NextResponse.json({ error: 'Missing student context' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind') === 'project' ? 'project' : 'internship';
    const types = kind === 'project' ? ['short_project', 'hackathon'] : ['internship'];

    const { sql: tenantInSql, params: tenantInParams } = uuidInClause(tenantIds, 1);
    const userIdx = 1 + tenantInParams.length;
    const typesIdx = userIdx + 1;

    const result = await query(
      `SELECT
         jp.id,
         jp.title,
         jp.description,
         jp.job_type,
         jp.salary_min,
         jp.salary_max,
         jp.min_cgpa,
         jp.vacancies,
         jp.skills_required,
         jp.application_deadline,
         jp.created_at,
         ep.id AS employer_id,
         ep.company_name,
         ep.website,
         pa.id AS application_id,
         pa.status AS application_status
       FROM job_postings jp
       INNER JOIN job_posting_visibility jpv
         ON jpv.job_id = jp.id AND jpv.tenant_id IN (${tenantInSql})
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       INNER JOIN employer_approvals ea
         ON ea.employer_id = ep.id AND ea.tenant_id = jpv.tenant_id AND ea.status = 'approved'
       LEFT JOIN student_profiles sp ON sp.user_id = $${userIdx}::uuid
       LEFT JOIN program_applications pa ON pa.job_id = jp.id AND pa.student_id = sp.id
       WHERE jp.status = 'published'
         AND jp.job_type = ANY($${typesIdx}::text[])
       ORDER BY jp.created_at DESC`,
      [...tenantInParams, userId, types],
    );

    return NextResponse.json({
      kind,
      items: result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        jobType: r.job_type,
        salaryMin: r.salary_min != null ? Number(r.salary_min) : null,
        salaryMax: r.salary_max != null ? Number(r.salary_max) : null,
        minCgpa: r.min_cgpa != null ? Number(r.min_cgpa) : null,
        vacancies: r.vacancies,
        skillsRequired: r.skills_required || [],
        applicationDeadline: r.application_deadline,
        createdAt: r.created_at,
        employerId: r.employer_id,
        companyName: r.company_name,
        website: r.website,
        hasApplied: Boolean(r.application_id),
        applicationStatus: r.application_status || null,
      })),
    });
  } catch (e) {
    console.error('GET /api/student/program-opportunities', e);
    return NextResponse.json({ error: 'Failed to load opportunities' }, { status: 500 });
  }
}
