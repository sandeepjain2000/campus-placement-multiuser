import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveCollegeAdminTenantFromSession } from '@/lib/sessionTenant';
import { formatStudentSystemId } from '@/lib/studentSystemId';
import { AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await resolveCollegeAdminTenantFromSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const res = await query(
      `SELECT pa.id AS program_application_id,
              pa.status AS application_status,
              sp.roll_number,
              sp.branch,
              sp.department,
              sp.batch_year,
              t.short_code,
              u.first_name,
              u.last_name,
              jp.title AS opening_title,
              ep.company_name,
              sf.rating AS student_rating,
              sf.feedback_text AS student_feedback_text,
              sf.updated_at AS student_feedback_at,
              ef.rating AS employer_rating,
              ef.feedback_text AS employer_feedback_text,
              ef.updated_at AS employer_feedback_at
       FROM program_applications pa
       INNER JOIN student_profiles sp ON sp.id = pa.student_id AND sp.tenant_id = $1::uuid AND ${SP_ACTIVE_CLAUSE}
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id AND jpv.tenant_id = $1::uuid
       INNER JOIN users u ON u.id = sp.user_id
       LEFT JOIN tenants t ON t.id = sp.tenant_id
       LEFT JOIN internship_feedback sf
         ON sf.program_application_id = pa.id AND sf.author_role = 'student'
       LEFT JOIN internship_feedback ef
         ON ef.program_application_id = pa.id AND ef.author_role = 'employer'
       WHERE pa.status = ANY($2::text[])
         ${AND_PA_NOT_DELETED}
         ${AND_JP_NOT_DELETED}
         AND (sf.id IS NOT NULL OR ef.id IS NOT NULL)
       ORDER BY COALESCE(sf.updated_at, ef.updated_at) DESC NULLS LAST
       LIMIT 2000`,
      [tenantId, ['selected', 'in_progress']],
    );

    const items = res.rows.map((row) => {
      const first = row.first_name || '';
      const last = row.last_name || '';
      const studentAt = row.student_feedback_at ? new Date(row.student_feedback_at).getTime() : 0;
      const employerAt = row.employer_feedback_at ? new Date(row.employer_feedback_at).getTime() : 0;
      const latestAt = Math.max(studentAt, employerAt) || null;
      return {
        programApplicationId: String(row.program_application_id),
        applicationStatus: row.application_status,
        studentName: `${first} ${last}`.trim() || 'Student',
        rollNumber: row.roll_number || '',
        systemId: formatStudentSystemId(row.short_code, row.roll_number),
        branch: row.branch || row.department || '—',
        batchYear: row.batch_year != null ? Number(row.batch_year) : null,
        companyName: row.company_name || '—',
        openingTitle: row.opening_title || '—',
        updatedAt: latestAt ? new Date(latestAt).toISOString() : null,
        studentFeedback: row.student_feedback_text
          ? {
              rating: row.student_rating != null ? Number(row.student_rating) : null,
              feedbackText: row.student_feedback_text,
              updatedAt: row.student_feedback_at,
            }
          : null,
        employerFeedback: row.employer_feedback_text
          ? {
              rating: row.employer_rating != null ? Number(row.employer_rating) : null,
              feedbackText: row.employer_feedback_text,
              updatedAt: row.employer_feedback_at,
            }
          : null,
      };
    });

    return NextResponse.json({
      items,
      summary: {
        total: items.length,
        withStudentFeedback: items.filter((i) => i.studentFeedback).length,
        withEmployerFeedback: items.filter((i) => i.employerFeedback).length,
      },
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship Progress Reviews is not available yet. Apply migration 090_internship_feedback.sql.' },
        { status: 503 },
      );
    }
    console.error('GET /api/college/internship-feedback', error);
    return NextResponse.json({ error: 'Failed to load internship progress reviews' }, { status: 500 });
  }
}

const handlers = withApiHandlers({ GET: __platform_GET }, { context: 'api_college_internship_feedback' });
export const GET = handlers.GET;
