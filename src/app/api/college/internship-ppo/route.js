import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveCollegeAdminTenantFromSession } from '@/lib/sessionTenant';
import { mapInternshipPpoRow, ppoStatusLabel } from '@/lib/internshipPpo';
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
              jp.internship_start_date,
              ep.company_name,
              ip.id AS ppo_id,
              ip.status AS ppo_status,
              ip.employer_notes,
              ip.confirmed_at,
              ip.student_responded_at,
              ip.offer_id,
              ip.revoked_at,
              ip.updated_at AS ppo_updated_at,
              o.status AS offer_status
       FROM internship_ppo ip
       INNER JOIN program_applications pa ON pa.id = ip.program_application_id
       INNER JOIN student_profiles sp ON sp.id = pa.student_id AND sp.tenant_id = $1::uuid AND ${SP_ACTIVE_CLAUSE}
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id AND jpv.tenant_id = $1::uuid
       INNER JOIN users u ON u.id = sp.user_id
       LEFT JOIN tenants t ON t.id = sp.tenant_id
       LEFT JOIN offers o ON o.id = ip.offer_id
       WHERE ip.status != 'revoked'
         ${AND_PA_NOT_DELETED}
         ${AND_JP_NOT_DELETED}
       ORDER BY ip.confirmed_at DESC
       LIMIT 2000`,
      [tenantId],
    );

    const items = res.rows.map((row) => {
      const first = row.first_name || '';
      const last = row.last_name || '';
      const ppo = mapInternshipPpoRow({
        id: row.ppo_id,
        program_application_id: row.program_application_id,
        status: row.ppo_status,
        employer_notes: row.employer_notes,
        confirmed_at: row.confirmed_at,
        student_responded_at: row.student_responded_at,
        offer_id: row.offer_id,
        revoked_at: row.revoked_at,
        updated_at: row.ppo_updated_at,
      });
      return {
        programApplicationId: String(row.program_application_id),
        applicationStatus: row.application_status,
        studentName: `${first} ${last}`.trim() || 'Student',
        rollNumber: row.roll_number || '',
        branch: row.branch || row.department || '—',
        batchYear: row.batch_year != null ? Number(row.batch_year) : null,
        companyName: row.company_name || '—',
        openingTitle: row.opening_title || '—',
        internshipStartDate: row.internship_start_date,
        ppoStatusLabel: ppoStatusLabel(ppo?.status),
        ppo,
        jobOfferStatus: row.offer_status || null,
      };
    });

    return NextResponse.json({
      items,
      summary: {
        total: items.length,
        awaitingStudent: items.filter((i) => i.ppo?.status === 'pending_student').length,
        accepted: items.filter((i) => i.ppo?.status === 'accepted').length,
        withJobOffer: items.filter((i) => i.ppo?.offerId).length,
      },
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship PPO is not available yet. Apply migration 093_internship_ppo.sql.' },
        { status: 503 },
      );
    }
    console.error('GET /api/college/internship-ppo', error);
    return NextResponse.json({ error: 'Failed to load internship PPO' }, { status: 500 });
  }
}

const handlers = withApiHandlers({ GET: __platform_GET }, { context: 'api_college_internship_ppo' });
export const GET = handlers.GET;
