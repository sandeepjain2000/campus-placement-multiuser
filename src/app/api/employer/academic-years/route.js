import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  findAcademicYearForDate,
  mapYearRowFromDb,
} from '@/lib/academicYearTenant';
import { assertEmployerApprovedCampus } from '@/lib/employerAcademicYear';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function loadYearsBundle(tenantId) {
  const yearsRes = await query(
    `SELECT id, tenant_id, label, sequence_number, period_start, period_end, semester_count
     FROM tenant_academic_years
     WHERE tenant_id = $1::uuid
     ORDER BY sequence_number ASC`,
    [tenantId],
  );
  const semRes = await query(
    `SELECT id, academic_year_id, sequence_number, period_start, period_end
     FROM tenant_academic_year_semesters
     WHERE academic_year_id IN (
       SELECT id FROM tenant_academic_years WHERE tenant_id = $1::uuid
     )
     ORDER BY academic_year_id, sequence_number`,
    [tenantId],
  );
  const years = yearsRes.rows.map((row) => mapYearRowFromDb(row, semRes.rows));
  const current = findAcademicYearForDate(new Date(), yearsRes.rows) || yearsRes.rows[yearsRes.rows.length - 1];
  const currentMapped = current ? mapYearRowFromDb(current, semRes.rows) : null;
  return { years, current: currentMapped };
}

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campusId = new URL(request.url).searchParams.get('campusId')?.trim();
    if (!campusId) {
      return NextResponse.json({ error: 'campusId is required' }, { status: 400 });
    }

    const empRes = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [
      session.user.id,
    ]);
    const employerId = empRes.rows[0]?.id;
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    await assertEmployerApprovedCampus(employerId, campusId);

    const bundle = await loadYearsBundle(campusId);
    return NextResponse.json(bundle);
  } catch (error) {
    console.error('GET /api/employer/academic-years', error);
    const status = error?.statusCode === 403 || error?.statusCode === 400 ? error.statusCode : 500;
    return NextResponse.json(
      { error: status >= 500 ? 'Failed to load academic years' : error.message },
      { status },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_academic_years' });
export const GET = __platformApiHandlers.GET;
