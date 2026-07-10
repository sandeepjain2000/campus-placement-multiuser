import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import {


  findAcademicYearForDate,
  mapYearRowFromDb,
  validateAcademicYearsPayload,
  parseAcademicYearLabel,
} from '@/lib/academicYearTenant';
import { resolveCollegeStaffTenantFromSession, resolveCollegeAdminTenantFromSession } from '@/lib/sessionTenant';
import { assertCollegeStaff, assertCollegeWriter } from '@/lib/collegeAccess';

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

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    const gate = assertCollegeStaff(session);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }
    const tenantId = await resolveCollegeStaffTenantFromSession(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const bundle = await loadYearsBundle(tenantId);
    return NextResponse.json(bundle);
  } catch (error) {
    console.error('Failed to load academic years:', error);
    return NextResponse.json({ error: 'Failed to load academic years' }, { status: 500 });
  }
}

async function __platform_PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    const gate = assertCollegeWriter(session);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }
    const tenantId = await resolveCollegeAdminTenantFromSession(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const years = body?.years;
    const validation = validateAcademicYearsPayload(years);
    if (!validation.ok) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    await transaction(async (client) => {
      const existing = await client.query(
        `SELECT id FROM tenant_academic_years WHERE tenant_id = $1::uuid`,
        [tenantId],
      );
      const keepIds = new Set(
        years.filter((y) => y.id).map((y) => String(y.id)),
      );

      for (const row of existing.rows) {
        if (!keepIds.has(String(row.id))) {
          await client.query(`DELETE FROM tenant_academic_years WHERE id = $1::uuid`, [row.id]);
        }
      }

      for (const year of years) {
        const parsed = parseAcademicYearLabel(year.label);
        const label = parsed.label;
        const periodStart = year.periodStart;
        const periodEnd = year.periodEnd;
        const seq = Number(year.sequenceNumber);
        const semCount = Number(year.semesterCount);

        let yearId = year.id;
        if (yearId) {
          await client.query(
            `UPDATE tenant_academic_years
             SET label = $1, sequence_number = $2, period_start = $3::date, period_end = $4::date,
                 semester_count = $5, updated_at = NOW()
             WHERE id = $6::uuid AND tenant_id = $7::uuid`,
            [label, seq, periodStart, periodEnd, semCount, yearId, tenantId],
          );
          await client.query(`DELETE FROM tenant_academic_year_semesters WHERE academic_year_id = $1::uuid`, [
            yearId,
          ]);
        } else {
          const ins = await client.query(
            `INSERT INTO tenant_academic_years (tenant_id, label, sequence_number, period_start, period_end, semester_count)
             VALUES ($1, $2, $3, $4::date, $5::date, $6)
             RETURNING id`,
            [tenantId, label, seq, periodStart, periodEnd, semCount],
          );
          yearId = ins.rows[0].id;
        }

        for (const sem of year.semesters || []) {
          await client.query(
            `INSERT INTO tenant_academic_year_semesters (academic_year_id, sequence_number, period_start, period_end)
             VALUES ($1, $2, $3::date, $4::date)`,
            [yearId, Number(sem.sequenceNumber), sem.periodStart, sem.periodEnd],
          );
        }
      }
    });

    const bundle = await loadYearsBundle(tenantId);
    return NextResponse.json({ success: true, ...bundle });
  } catch (error) {
    console.error('Failed to save academic years:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save academic years' },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PUT: __platform_PUT,
}, { context: 'api_college_academic_years' });
export const GET = __platformApiHandlers.GET;
export const PUT = __platformApiHandlers.PUT;
