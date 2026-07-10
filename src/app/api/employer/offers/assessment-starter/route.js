import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/tenantContext';
import { fetchAssessmentRowsForView, pickRepresentativeAssessmentRows } from '@/lib/assessmentHiringView';
import {


  buildEmployerOffersAllStudentsCsv,
  EMPLOYER_OFFERS_ALL_STUDENTS_CSV_FILENAME,
} from '@/lib/offersAssessmentStarterCsv';
import { formatStudentSystemId } from '@/lib/studentSystemId';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;


async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

async function employerHasApprovedTenant(userId, tenantId) {
  const emp = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  const eid = emp.rows[0]?.id;
  if (!eid) return false;
  const r = await query(
    `SELECT 1 FROM employer_approvals
     WHERE employer_id = $1::uuid AND tenant_id = $2::uuid AND status = 'approved'
     LIMIT 1`,
    [eid, tenantId],
  );
  return r.rows.length > 0;
}

/**
 * GET — offers-import CSV for all master-list students on approved campus(es).
 * Optional `tenantId` = one campus; omit = every approved campus (includes tenant_id per row).
 */
async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const url = new URL(request.url);
    const tenantParam = url.searchParams.get('tenantId');
    const tenantFilter =
      tenantParam && isUuid(tenantParam) && (await employerHasApprovedTenant(session.user.id, tenantParam))
        ? tenantParam
        : null;

    if (tenantParam && !tenantFilter) {
      return NextResponse.json({ error: 'Invalid or unapproved campus' }, { status: 403 });
    }

    const approvals = await query(
      `SELECT tenant_id FROM employer_approvals
       WHERE employer_id = $1::uuid AND status = 'approved'
       ORDER BY tenant_id`,
      [employerId],
    );
    const campusList = tenantFilter ? [{ tenant_id: tenantFilter }] : approvals.rows;

    const flat = [];
    for (const { tenant_id: tid } of campusList) {
      const tenantRes = await query(`SELECT short_code FROM tenants WHERE id = $1::uuid LIMIT 1`, [tid]);
      const shortCode = tenantRes.rows[0]?.short_code || '';
      const students = await query(
        `SELECT sp.id AS student_profile_id, sp.roll_number
         FROM student_profiles sp
         WHERE sp.tenant_id = $1::uuid AND ${SP_ACTIVE_CLAUSE}
           AND sp.roll_number IS NOT NULL
           AND TRIM(sp.roll_number) <> ''
         ORDER BY TRIM(sp.roll_number) ASC NULLS LAST`,
        [tid],
      );
      const assessRows = await fetchAssessmentRowsForView({ employerId, tenantId: tid });
      const rep = pickRepresentativeAssessmentRows(assessRows);
      const byP = new Map(rep.map((r) => [r.student_profile_id, r]));
      for (const s of students.rows) {
        const a = byP.get(s.student_profile_id);
        flat.push({
          system_id: formatStudentSystemId(shortCode, s.roll_number),
          roll_number: s.roll_number,
          tenant_id: tid,
          upload_drive_id: a?.upload_drive_id ?? null,
          employer_id: employerId,
        });
      }
    }

    const csv = buildEmployerOffersAllStudentsCsv(flat);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${EMPLOYER_OFFERS_ALL_STUDENTS_CSV_FILENAME}"`,
      },
    });
  } catch (e) {
    console.error('GET /api/employer/offers/assessment-starter', e);
    return NextResponse.json({ error: 'Failed to build starter CSV' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_offers_assessment_starter' });
export const GET = __platformApiHandlers.GET;
