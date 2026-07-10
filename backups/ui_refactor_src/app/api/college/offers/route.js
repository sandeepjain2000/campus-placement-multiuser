import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { queryCollegeOffersForTenant } from '@/lib/collegeOffersListQuery';
import { refreshOfferLatestFlagsForStudent } from '@/lib/offersLatestFlag';

const OFFER_STATUSES = new Set(['pending', 'accepted', 'rejected', 'expired', 'revoked']);
const REOPEN_FROM_STATUSES = new Set(['accepted', 'rejected', 'revoked', 'expired']);

function getTenantId(session) {
  return session.user.tenantId || session.user.tenant_id;
}

async function assertOfferInTenant(offerId, tenantId) {
  const r = await query(
    `SELECT o.id FROM offers o
     JOIN student_profiles sp ON sp.id = o.student_id
     WHERE o.id = $1::uuid AND sp.tenant_id = $2::uuid
     LIMIT 1`,
    [offerId, tenantId],
  );
  return r.rows[0]?.id || null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const offersRes = await queryCollegeOffersForTenant(tenantId);

    const offers = offersRes.rows;
    const accepted = offers.filter((o) => o.status === 'accepted').length;
    const pending = offers.filter((o) => o.status === 'pending').length;
    const rejected = offers.filter((o) => o.status === 'rejected').length;
    const avgSalary = accepted
      ? Math.round(
          offers
            .filter((o) => o.status === 'accepted' && Number(o.salary) > 0)
            .reduce((sum, o) => sum + Number(o.salary), 0) / Math.max(1, accepted),
        )
      : 0;

    return NextResponse.json({
      offers,
      summary: {
        total: offers.length,
        accepted,
        pending,
        rejected,
        avgSalary,
      },
    });
  } catch (error) {
    console.error('GET /api/college/offers', error);
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 500 });
  }
}

/** Manual create: student must belong to college master list (student_profiles.tenant_id). */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const rollNumber = String(body?.rollNumber || body?.roll_number || '').trim();
    const studentIdIn = String(body?.studentId || body?.student_id || '').trim();
    const reportedCompanyName = String(body?.reportedCompanyName || body?.company_name || '').trim();
    const jobTitle = String(body?.jobTitle || body?.job_title || '').trim();
    const salary = Number(body?.salary ?? 0);
    const location = String(body?.location || '').trim() || null;
    const deadlineRaw = body?.deadline != null ? String(body.deadline).trim() : '';
    const deadline = deadlineRaw ? new Date(deadlineRaw.includes('T') ? deadlineRaw : `${deadlineRaw}T23:59:59`) : null;
    const joiningDate = body?.joiningDate || body?.joining_date ? String(body.joiningDate || body.joining_date).trim() || null : null;
    let status = String(body?.status || 'pending').trim().toLowerCase();
    if (status === 'declined') status = 'rejected';
    if (!OFFER_STATUSES.has(status)) status = 'pending';

    if (!jobTitle) {
      return NextResponse.json({ error: 'jobTitle is required' }, { status: 400 });
    }
    if (!reportedCompanyName) {
      return NextResponse.json({ error: 'company name is required (employer name as text)' }, { status: 400 });
    }

    let studentId = studentIdIn;
    if (!studentId && rollNumber) {
      const sr = await query(
        `SELECT id FROM student_profiles
         WHERE tenant_id = $1::uuid AND TRIM(roll_number) = $2
         LIMIT 1`,
        [tenantId, rollNumber],
      );
      studentId = sr.rows[0]?.id || '';
    }
    if (!studentId) {
      return NextResponse.json(
        { error: 'Student not found for this campus. Use a roll number from your master student list.' },
        { status: 400 },
      );
    }

    const own = await query(
      `SELECT id FROM student_profiles WHERE id = $1::uuid AND tenant_id = $2::uuid`,
      [studentId, tenantId],
    );
    if (!own.rows[0]) {
      return NextResponse.json({ error: 'Student is not in your campus master list' }, { status: 403 });
    }

    const ins = await query(
      `INSERT INTO offers (
         student_id, employer_id, job_title, salary, location, status,
         joining_date, deadline, salary_currency, reported_company_name
       ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, 'INR', $8)
       RETURNING id`,
      [
        studentId,
        jobTitle,
        Number.isFinite(salary) ? salary : 0,
        location,
        status,
        joiningDate || null,
        deadline && !Number.isNaN(deadline.getTime()) ? deadline.toISOString() : null,
        reportedCompanyName,
      ],
    );

    await refreshOfferLatestFlagsForStudent(studentId);

    return NextResponse.json({ id: ins.rows[0].id }, { status: 201 });
  } catch (error) {
    console.error('POST /api/college/offers', error);
    if (error?.code === '42703' || String(error?.message || '').includes('reported_company_name')) {
      return NextResponse.json(
        {
          error:
            'Database is missing offers.reported_company_name. Apply migration 018_college_offers_reported_company.sql, then retry.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const ok = await assertOfferInTenant(id, tenantId);
    if (!ok) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });

    const metaRow = await query(`SELECT employer_id, student_id, status FROM offers WHERE id = $1::uuid`, [id]);
    const hasEmployer = metaRow.rows[0]?.employer_id != null;

    const sets = [];
    const params = [];
    const push = (frag, val) => {
      params.push(val);
      sets.push(`${frag} $${params.length}`);
    };

    if (!hasEmployer && (body.reportedCompanyName != null || body.company_name != null)) {
      const v = String(body.reportedCompanyName ?? body.company_name ?? '').trim();
      push('reported_company_name =', v || null);
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
    if (body.deadline !== undefined) {
      const d = body.deadline ? String(body.deadline).trim() : '';
      if (!d) push('deadline =', null);
      else {
        const dt = new Date(d.includes('T') ? d : `${d}T23:59:59`);
        push('deadline =', Number.isNaN(dt.getTime()) ? null : dt.toISOString());
      }
    }
    if (body.joiningDate !== undefined || body.joining_date !== undefined) {
      const j = body.joiningDate ?? body.joining_date;
      push('joining_date =', j ? String(j).trim() : null);
    }
    if (body.status != null) {
      let st = String(body.status).trim().toLowerCase();
      if (st === 'declined') st = 'rejected';
      if (OFFER_STATUSES.has(st)) {
        push('status =', st);
        const prev = String(metaRow.rows[0]?.status || '');
        if (st === 'pending' && REOPEN_FROM_STATUSES.has(prev)) {
          push('accepted_at =', null);
          push('rejected_at =', null);
          push('rejection_reason =', null);
        }
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(id);
    await query(`UPDATE offers SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}::uuid`, params);

    await refreshOfferLatestFlagsForStudent(metaRow.rows[0]?.student_id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/college/offers', error);
    if (error?.code === '42703' || String(error?.message || '').includes('reported_company_name')) {
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
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const del = await query(
      `DELETE FROM offers o
       USING student_profiles sp
       WHERE o.id = $1::uuid AND o.student_id = sp.id AND sp.tenant_id = $2::uuid
       RETURNING o.student_id`,
      [id, tenantId],
    );
    if (!del.rows[0]) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    await refreshOfferLatestFlagsForStudent(del.rows[0].student_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/college/offers', error);
    return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
  }
}
