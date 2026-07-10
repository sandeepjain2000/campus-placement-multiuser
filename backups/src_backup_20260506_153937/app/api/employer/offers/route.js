import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { refreshOfferLatestFlagsForStudent } from '@/lib/offersLatestFlag';
import { isMissingReportedCompanyColumnError } from '@/lib/offerReportedColumn';

function isMissingIsLatestError(e) {
  return e?.code === '42703' && String(e?.message || '').includes('is_latest');
}

async function getEmployerId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const employerResult = await query(
    `SELECT id FROM employer_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return employerResult.rows[0]?.id || null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerId(session);

    if (!employerId) {
      return NextResponse.json({ offers: [] });
    }

    const baseSql = (latestOnly) => {
      const clause = latestOnly ? 'AND o.is_latest = 1' : '';
      return `SELECT
         o.id,
         COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.email, 'Unknown Student') AS student_name,
         t.name AS college_name,
         o.job_title,
         o.salary,
         o.location,
         o.joining_date,
         o.drive_id,
         o.deadline AS deadline_at,
         o.status,
         o.created_at,
         o.is_latest AS is_latest
       FROM offers o
       LEFT JOIN student_profiles sp ON sp.id = o.student_id
       LEFT JOIN users u ON u.id = sp.user_id
       LEFT JOIN tenants t ON t.id = sp.tenant_id
       WHERE o.employer_id = $1 ${clause}
       ORDER BY o.created_at DESC
       LIMIT 500`;
    };

    let offersResult;
    try {
      offersResult = await query(baseSql(true), [employerId]);
    } catch (e) {
      if (isMissingIsLatestError(e)) {
        offersResult = await query(
          `SELECT
             o.id,
             COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.email, 'Unknown Student') AS student_name,
             t.name AS college_name,
             o.job_title,
             o.salary,
             o.location,
             o.joining_date,
             o.drive_id,
             o.deadline AS deadline_at,
             o.status,
             o.created_at
           FROM offers o
           LEFT JOIN student_profiles sp ON sp.id = o.student_id
           LEFT JOIN users u ON u.id = sp.user_id
           LEFT JOIN tenants t ON t.id = sp.tenant_id
           WHERE o.employer_id = $1
           ORDER BY o.created_at DESC
           LIMIT 500`,
          [employerId],
        );
      } else {
        throw e;
      }
    }

    return NextResponse.json({ offers: offersResult.rows });
  } catch (error) {
    console.error('Failed to load employer offers:', error);
    return NextResponse.json(
      { error: 'Failed to load employer offers' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const body = await request.json();
    const studentId = String(body?.studentId || '').trim();
    const driveId = String(body?.driveId || '').trim() || null;
    const jobTitle = String(body?.jobTitle || '').trim();
    const salary = Number(body?.salary || 0);
    const location = String(body?.location || '').trim() || null;
    const joiningDate = String(body?.joiningDate || '').trim() || null;
    const deadlineAt = String(body?.deadlineAt || '').trim() || null;

    if (!studentId || !jobTitle) {
      return NextResponse.json({ error: 'studentId and jobTitle are required' }, { status: 400 });
    }

    const insertParams = [
      studentId,
      driveId,
      employerId,
      jobTitle,
      Number.isFinite(salary) ? salary : 0,
      location,
      joiningDate,
      deadlineAt,
    ];
    let created;
    try {
      created = await query(
        `INSERT INTO offers (
         student_id, drive_id, employer_id, job_title, salary, location, status, joining_date, deadline, salary_currency,
         reported_company_name
       ) VALUES (
         $1, $2, $3, $4, $5, $6, 'pending', $7, $8, 'INR',
         (SELECT company_name FROM employer_profiles WHERE id = $3::uuid LIMIT 1)
       )
       RETURNING id`,
        insertParams,
      );
    } catch (e) {
      if (!isMissingReportedCompanyColumnError(e)) throw e;
      created = await query(
        `INSERT INTO offers (
         student_id, drive_id, employer_id, job_title, salary, location, status, joining_date, deadline, salary_currency
       ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, 'INR')
       RETURNING id`,
        insertParams,
      );
    }

    await refreshOfferLatestFlagsForStudent(studentId);

    return NextResponse.json({ offer: created.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create employer offer:', error);
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
  }
}

const REOPEN_FROM_STATUSES = new Set(['accepted', 'rejected', 'revoked', 'expired']);

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const body = await request.json();
    const id = String(body?.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const meta = await query(
      `SELECT student_id, status FROM offers WHERE id = $1::uuid AND employer_id = $2::uuid`,
      [id, employerId],
    );
    if (!meta.rows[0]) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }
    const studentId = meta.rows[0].student_id;
    const currentStatus = String(meta.rows[0].status || '');

    const statusRaw = body.status != null ? String(body.status).trim().toLowerCase() : '';
    const statusIn = statusRaw || null;

    const sets = [];
    const params = [];
    const push = (frag, val) => {
      params.push(val);
      sets.push(`${frag}$${params.length}`);
    };

    if (statusIn === 'revoked') {
      if (currentStatus !== 'pending') {
        return NextResponse.json({ error: 'Only pending offers can be revoked' }, { status: 400 });
      }
      push('status =', 'revoked');
    } else if (statusIn === 'pending' && REOPEN_FROM_STATUSES.has(currentStatus)) {
      push('status =', 'pending');
      push('accepted_at =', null);
      push('rejected_at =', null);
      push('rejection_reason =', null);
    } else if (statusIn != null && statusIn !== 'pending') {
      return NextResponse.json(
        { error: 'Unsupported status. Use pending to reopen, or revoked to withdraw a pending offer.' },
        { status: 400 },
      );
    }

    if (body.jobTitle != null || body.job_title != null) {
      push('job_title =', String(body.jobTitle ?? body.job_title ?? '').trim());
    }
    if (body.salary != null) {
      const n = Number(body.salary);
      push('salary =', Number.isFinite(n) ? n : 0);
    }
    if (body.location !== undefined) {
      push('location =', body.location ? String(body.location).trim() : null);
    }
    if (body.joiningDate !== undefined || body.joining_date !== undefined) {
      const j = body.joiningDate ?? body.joining_date;
      push('joining_date =', j ? String(j).trim() : null);
    }
    if (body.deadlineAt !== undefined || body.deadline !== undefined) {
      const dRaw = body.deadlineAt ?? body.deadline;
      if (!dRaw) {
        push('deadline =', null);
      } else {
        const d = String(dRaw).trim();
        const dt = new Date(d.includes('T') ? d : `${d}T23:59:59`);
        push('deadline =', Number.isNaN(dt.getTime()) ? null : dt.toISOString());
      }
    }
    if (body.driveId !== undefined || body.drive_id !== undefined) {
      const raw = body.driveId ?? body.drive_id;
      if (raw == null || raw === '') {
        push('drive_id =', null);
      } else {
        const driveId = String(raw).trim();
        const dr = await query(
          `SELECT id FROM placement_drives WHERE id = $1::uuid AND employer_id = $2::uuid LIMIT 1`,
          [driveId, employerId],
        );
        if (!dr.rows[0]) {
          return NextResponse.json({ error: 'drive_id is not one of your drives' }, { status: 400 });
        }
        push('drive_id =', driveId);
      }
    }
    if (body.syncReportedCompanyFromProfile === true) {
      const ep = await query(`SELECT company_name FROM employer_profiles WHERE id = $1::uuid LIMIT 1`, [employerId]);
      push('reported_company_name =', ep.rows[0]?.company_name ?? null);
    } else if (body.reportedCompanyName !== undefined || body.company_name !== undefined) {
      const v = String(body.reportedCompanyName ?? body.company_name ?? '').trim();
      push('reported_company_name =', v || null);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No changes to apply' }, { status: 400 });
    }

    params.push(id, employerId);
    await query(
      `UPDATE offers SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length - 1}::uuid AND employer_id = $${params.length}::uuid`,
      params,
    );

    await refreshOfferLatestFlagsForStudent(studentId);

    const out = await query(
      `SELECT id, status, job_title, salary, location, deadline AS deadline_at, joining_date
       FROM offers WHERE id = $1::uuid AND employer_id = $2::uuid`,
      [id, employerId],
    );
    return NextResponse.json({ offer: out.rows[0] });
  } catch (error) {
    console.error('Failed to update employer offer:', error);
    if (isMissingReportedCompanyColumnError(error)) {
      return NextResponse.json(
        {
          error:
            'Database is missing offers.reported_company_name. Apply migration 018_college_offers_reported_company.sql, then retry.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const del = await query(
      `DELETE FROM offers WHERE id = $1::uuid AND employer_id = $2::uuid RETURNING student_id`,
      [id, employerId],
    );
    if (!del.rows[0]) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }
    await refreshOfferLatestFlagsForStudent(del.rows[0].student_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete employer offer:', error);
    return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
  }
}
