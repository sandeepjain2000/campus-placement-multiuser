import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireDataEntrySession, resolveDataEntryTenantId } from '@/lib/dataEntryAccess';
import { refreshOfferLatestFlagsForStudent } from '@/lib/offersLatestFlag';
import { isMissingReportedCompanyColumnError } from '@/lib/offerReportedColumn';

function isMissingIsLatestError(e) {
  return e?.code === '42703' && String(e?.message || '').includes('is_latest');
}

const ALLOWED_STATUS = new Set(['pending', 'accepted', 'rejected', 'expired', 'revoked']);

function tenantFromRequest(gateSession, request, body) {
  if (body && typeof body === 'object' && 'tenantId' in body) {
    return resolveDataEntryTenantId(gateSession, body.tenantId);
  }
  return resolveDataEntryTenantId(gateSession, request.nextUrl.searchParams.get('tenantId'));
}

export async function GET(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const tenantId = resolveDataEntryTenantId(gate.session, request.nextUrl.searchParams.get('tenantId'));
    if (!tenantId) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });

    const sql = (latestOnly) => {
      const clause = latestOnly ? 'AND o.is_latest = 1' : '';
      return `SELECT o.id, o.student_id, o.drive_id, o.employer_id, o.job_title, o.location, o.salary, o.status, o.joining_date,
              u.first_name, u.last_name, u.email, d.title AS drive_title, e.company_name
       FROM offers o
       LEFT JOIN student_profiles sp ON sp.id = o.student_id
       LEFT JOIN users u ON u.id = sp.user_id
       LEFT JOIN placement_drives d ON d.id = o.drive_id
       LEFT JOIN employer_profiles e ON e.id = o.employer_id
       WHERE sp.tenant_id = $1 ${clause}
       ORDER BY o.created_at DESC
       LIMIT 300`;
    };
    let result;
    try {
      result = await query(sql(true), [tenantId]);
    } catch (e) {
      if (isMissingIsLatestError(e)) {
        result = await query(sql(false), [tenantId]);
      } else {
        throw e;
      }
    }
    return NextResponse.json({ offers: result.rows });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const tenantId = tenantFromRequest(gate.session, request, body);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });

    const studentId = String(body?.studentId || '').trim();
    const driveId = String(body?.driveId || '').trim() || null;
    const employerId = String(body?.employerId || '').trim() || null;
    const jobTitle = String(body?.jobTitle || '').trim();
    const location = String(body?.location || '').trim();
    const salary = Number(body?.salary || 0);
    const status = String(body?.status || 'accepted').trim();
    const joiningDate = body?.joiningDate || null;

    if (!studentId || !jobTitle) {
      return NextResponse.json({ error: 'studentId and jobTitle are required' }, { status: 400 });
    }
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'Invalid offer status' }, { status: 400 });
    }

    const studentOk = await query(
      `SELECT 1 FROM student_profiles WHERE id = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
      [studentId, tenantId]
    );
    if (!studentOk.rows.length) {
      return NextResponse.json({ error: 'Student profile not in this tenant' }, { status: 400 });
    }

    const insertParams = [
      studentId,
      driveId,
      employerId,
      jobTitle,
      location || null,
      Number.isFinite(salary) ? salary : 0,
      status,
      joiningDate || null,
    ];
    let created;
    try {
      created = await query(
        `INSERT INTO offers (
        student_id, drive_id, employer_id, job_title, location, salary, status, joining_date, salary_currency,
        reported_company_name
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'INR',
        CASE
          WHEN $3::uuid IS NOT NULL THEN (SELECT company_name FROM employer_profiles WHERE id = $3::uuid LIMIT 1)
          ELSE NULL
        END
      )
      RETURNING id, student_id, drive_id, employer_id, job_title, salary, status`,
        insertParams,
      );
    } catch (e) {
      if (!isMissingReportedCompanyColumnError(e)) throw e;
      created = await query(
        `INSERT INTO offers (
        student_id, drive_id, employer_id, job_title, location, salary, status, joining_date, salary_currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'INR')
      RETURNING id, student_id, drive_id, employer_id, job_title, salary, status`,
        insertParams,
      );
    }

    await refreshOfferLatestFlagsForStudent(studentId);

    return NextResponse.json({ offer: created.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create offer from data-entry:', error);
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const tenantId = tenantFromRequest(gate.session, request, body);
    if (!tenantId) return NextResponse.json({ error: 'No tenant available for update' }, { status: 400 });

    const id = String(body?.id || '').trim();
    const driveId = String(body?.driveId || '').trim() || null;
    const employerId = String(body?.employerId || '').trim() || null;
    const jobTitle = String(body?.jobTitle || '').trim();
    const location = String(body?.location || '').trim();
    const salary = Number(body?.salary || 0);
    const status = String(body?.status || 'accepted').trim();
    const joiningDate = body?.joiningDate || null;
    if (!id || !jobTitle || !ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'id, jobTitle and valid status are required' }, { status: 400 });
    }
    const updated = await query(
      `UPDATE offers
       SET drive_id = $1, employer_id = $2, job_title = $3, location = $4, salary = $5, status = $6, joining_date = $7, updated_at = NOW()
       WHERE id = $8
         AND student_id IN (SELECT id FROM student_profiles WHERE tenant_id = $9)
       RETURNING id, student_id, drive_id, employer_id, job_title, salary, status`,
      [driveId, employerId, jobTitle, location || null, Number.isFinite(salary) ? salary : 0, status, joiningDate || null, id, tenantId]
    );
    if (!updated.rows[0]) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    return NextResponse.json({ offer: updated.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const tenantId = tenantFromRequest(gate.session, request, body);
    if (!tenantId) return NextResponse.json({ error: 'No tenant available for delete' }, { status: 400 });

    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const del = await query(
      `DELETE FROM offers
       WHERE id = $1
         AND student_id IN (SELECT id FROM student_profiles WHERE tenant_id = $2)
       RETURNING id`,
      [id, tenantId]
    );
    if (!del.rows?.length) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
  }
}
