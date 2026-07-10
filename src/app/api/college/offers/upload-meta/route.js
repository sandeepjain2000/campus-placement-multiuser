import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { queryCollegeOffersForTenant } from '@/lib/collegeOffersListQuery';
import { fetchAssessmentRowsForView, pickRepresentativeAssessmentRows } from '@/lib/assessmentHiringView';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




function getTenantId(session) {
  return session?.user?.tenantId || session?.user?.tenant_id || null;
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    let studentsWithRoll = 0;
    try {
      const sr = await query(
        `SELECT COUNT(*)::int AS n
         FROM student_profiles sp
         WHERE sp.tenant_id = $1::uuid
           AND sp.roll_number IS NOT NULL
           AND TRIM(sp.roll_number) <> ''
           AND ${SP_ACTIVE_CLAUSE}`,
        [tenantId],
      );
      studentsWithRoll = Number(sr.rows[0]?.n) || 0;
    } catch (e) {
      if (e?.code !== '42703') throw e;
      const sr = await query(
        `SELECT COUNT(*)::int AS n
         FROM student_profiles sp
         WHERE sp.tenant_id = $1::uuid
           AND sp.roll_number IS NOT NULL
           AND TRIM(sp.roll_number) <> ''`,
        [tenantId],
      );
      studentsWithRoll = Number(sr.rows[0]?.n) || 0;
    }

    const offersRes = await queryCollegeOffersForTenant(tenantId);
    const offers = offersRes.rows || [];
    const accepted = offers.filter((o) => o.status === 'accepted').length;
    const pending = offers.filter((o) => o.status === 'pending').length;
    const rejected = offers.filter((o) => o.status === 'rejected').length;

    let assessmentPrefillCount = 0;
    try {
      const assessRows = await fetchAssessmentRowsForView({ tenantId });
      const rep = pickRepresentativeAssessmentRows(assessRows);
      const masterIds = new Set(
        (
          await query(
            `SELECT id FROM student_profiles sp
             WHERE sp.tenant_id = $1::uuid
               AND sp.roll_number IS NOT NULL
               AND TRIM(sp.roll_number) <> ''
               AND ${SP_ACTIVE_CLAUSE}`,
            [tenantId],
          )
        ).rows.map((r) => r.id),
      );
      assessmentPrefillCount = rep.filter((r) => masterIds.has(r.student_profile_id)).length;
    } catch {
      assessmentPrefillCount = 0;
    }

    const recentOffers = offers.slice(0, 10).map((o) => ({
      id: o.id,
      student_name: o.student_name,
      roll_number: o.roll_number,
      company_name: o.company_name,
      job_title: o.job_title,
      status: o.status,
      salary: o.salary,
      created_at: o.created_at,
    }));

    return NextResponse.json({
      studentsWithRoll,
      assessmentPrefillCount,
      summary: {
        total: offers.length,
        accepted,
        pending,
        rejected,
      },
      recentOffers,
    });
  } catch (error) {
    console.error('GET /api/college/offers/upload-meta', error);
    return NextResponse.json({ error: 'Failed to load upload context' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_offers_upload_meta' });
export const GET = __platformApiHandlers.GET;
