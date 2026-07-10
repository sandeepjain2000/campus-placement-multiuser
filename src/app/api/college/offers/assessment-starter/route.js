import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSessionTenantId } from '@/lib/tenantContext';
import { query } from '@/lib/db';
import { fetchAssessmentRowsForView, pickRepresentativeAssessmentRows } from '@/lib/assessmentHiringView';
import {


  buildCollegeOffersAllStudentsCsv,
  COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME,
} from '@/lib/offersAssessmentStarterCsv';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;


/** GET — offers-import CSV: every campus master-list student; company prefilled from newest assessment row when any. */
async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getSessionTenantId(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const master = await query(
      `SELECT sp.id AS student_profile_id, sp.roll_number, sp.tenant_id
       FROM student_profiles sp
       WHERE sp.tenant_id = $1::uuid AND ${SP_ACTIVE_CLAUSE}
         AND sp.roll_number IS NOT NULL
         AND TRIM(sp.roll_number) <> ''
       ORDER BY TRIM(sp.roll_number) ASC NULLS LAST`,
      [tenantId],
    );

    const assessRows = await fetchAssessmentRowsForView({ tenantId });
    const rep = pickRepresentativeAssessmentRows(assessRows);
    const byProfile = new Map(rep.map((r) => [r.student_profile_id, r]));
    const csv = buildCollegeOffersAllStudentsCsv(master.rows, byProfile);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME}"`,
      },
    });
  } catch (e) {
    console.error('GET /api/college/offers/assessment-starter', e);
    return NextResponse.json({ error: 'Failed to build starter CSV' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_offers_assessment_starter' });
export const GET = __platformApiHandlers.GET;
