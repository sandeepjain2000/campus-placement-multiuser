import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { queryCollegeOffersForTenant } from '@/lib/collegeOffersListQuery';
import { refreshOfferLatestFlagsForStudent } from '@/lib/offersLatestFlag';
import { notifyStudentFormalOfferByOfferId } from '@/lib/studentFormalOfferNotify';
import { offerDecisionTimestampsForInsert } from '@/lib/offerStatusTimestamps';
import { toDateOnlyString, validateOfferDates } from '@/lib/dateOnly';
import { validateCollegeOfferPayload, validateTitlePayload } from '@/lib/apiInputValidation';
import { normalizeTitle } from '@/lib/validators';
import { AND_OFFER_NOT_DELETED } from '@/lib/softDeleteSql';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




const OFFER_STATUSES = new Set(['pending', 'accepted', 'rejected', 'expired', 'revoked']);
const REOPEN_FROM_STATUSES = new Set(['accepted', 'rejected', 'revoked', 'expired']);

function getTenantId(session) {
  return session.user.tenantId || session.user.tenant_id;
}

async function assertOfferInTenant(offerId, tenantId) {
  const r = await query(
    `SELECT o.id FROM offers o
     JOIN student_profiles sp ON sp.id = o.student_id
     WHERE o.id = $1::uuid AND sp.tenant_id = $2::uuid ${AND_OFFER_NOT_DELETED}
     LIMIT 1`,
    [offerId, tenantId],
  );
  return r.rows[0]?.id || null;
}

async function __platform_GET() {
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
async function __platform_POST(request) {
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
    const jobTitle = normalizeTitle(body?.jobTitle || body?.job_title);
    const salary = Number(body?.salary ?? 0);
    const location = String(body?.location || '').trim() || null;
    const deadlineRaw = body?.deadline != null ? String(body.deadline).trim() : '';
    const deadlineYmd = deadlineRaw ? toDateOnlyString(deadlineRaw) : '';
    const joiningDateYmd =
      body?.joiningDate || body?.joining_date
        ? toDateOnlyString(String(body.joiningDate || body.joining_date).trim())
        : '';
    const offerInputErr = validateCollegeOfferPayload({
      salary: body?.salary,
      deadline: deadlineYmd,
      joiningDate: joiningDateYmd,
    });
    if (offerInputErr) {
      return NextResponse.json({ error: offerInputErr }, { status: 400 });
    }
    const offerDatesCheck = validateOfferDates(deadlineYmd || null, joiningDateYmd || null);
    if (!offerDatesCheck.ok) {
      return NextResponse.json({ error: offerDatesCheck.error }, { status: 400 });
    }
    const deadline = deadlineYmd ? new Date(`${deadlineYmd}T23:59:59`) : null;
    const joiningDate = joiningDateYmd || null;
    let status = String(body?.status || 'pending').trim().toLowerCase();
    if (status === 'declined') status = 'rejected';
    if (!OFFER_STATUSES.has(status)) status = 'pending';

    const jobTitleErr = validateTitlePayload(jobTitle, { label: 'Job title' });
    if (jobTitleErr) {
      return NextResponse.json({ error: jobTitleErr }, { status: 400 });
    }
    if (!reportedCompanyName) {
      return NextResponse.json({ error: 'company name is required (employer name as text)' }, { status: 400 });
    }

    let studentId = studentIdIn;
    if (!studentId && rollNumber) {
      const sr = await query(
        `SELECT id FROM student_profiles
         WHERE tenant_id = $1::uuid AND TRIM(roll_number) = $2 AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
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
      `SELECT id FROM student_profiles WHERE id = $1::uuid AND tenant_id = $2::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}`,
      [studentId, tenantId],
    );
    if (!own.rows[0]) {
      return NextResponse.json({ error: 'Student is not in your campus master list' }, { status: 403 });
    }

    const { acceptedAt, rejectedAt } = offerDecisionTimestampsForInsert(status);

    const ins = await query(
      `INSERT INTO offers (
         student_id, employer_id, job_title, salary, location, status,
         joining_date, deadline, salary_currency, reported_company_name,
         accepted_at, rejected_at
       ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, 'INR', $8, $9, $10)
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
        acceptedAt,
        rejectedAt,
      ],
    );

    await refreshOfferLatestFlagsForStudent(studentId);

    const newOfferId = ins.rows[0]?.id;
    if (newOfferId && status === 'pending') {
      notifyStudentFormalOfferByOfferId(String(newOfferId)).catch((err) => {
        console.error('Formal offer notification after college create:', err);
      });
    }

    return NextResponse.json({ id: newOfferId }, { status: 201 });
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

async function __platform_PATCH(request) {
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

    const metaRow = await query(
      `SELECT employer_id, student_id, status FROM offers o WHERE o.id = $1::uuid ${AND_OFFER_NOT_DELETED}`,
      [id],
    );
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
      const nextJobTitle = normalizeTitle(body.jobTitle ?? body.job_title);
      const patchTitleErr = validateTitlePayload(nextJobTitle, { label: 'Job title' });
      if (patchTitleErr) {
        return NextResponse.json({ error: patchTitleErr }, { status: 400 });
      }
      push('job_title =', nextJobTitle);
    }
    if (body.salary != null) {
      const n = Number(body.salary);
      push('salary =', Number.isFinite(n) ? n : 0);
    }
    if (body.location !== undefined) {
      push('location =', body.location ? String(body.location).trim() : null);
    }
    if (
      body.deadline !== undefined ||
      body.joiningDate !== undefined ||
      body.joining_date !== undefined
    ) {
      const curDates = await query(
        `SELECT deadline, joining_date FROM offers o WHERE o.id = $1::uuid ${AND_OFFER_NOT_DELETED}`,
        [id],
      );
      const cur = curDates.rows[0] || {};
      let deadlineYmd =
        body.deadline !== undefined
          ? body.deadline
            ? toDateOnlyString(String(body.deadline).trim())
            : ''
          : cur.deadline
            ? toDateOnlyString(cur.deadline)
            : '';
      let joiningYmd =
        body.joiningDate !== undefined || body.joining_date !== undefined
          ? body.joiningDate ?? body.joining_date
            ? toDateOnlyString(String(body.joiningDate ?? body.joining_date).trim())
            : ''
          : cur.joining_date
            ? toDateOnlyString(cur.joining_date)
            : '';
      const offerDatesCheck = validateOfferDates(deadlineYmd || null, joiningYmd || null);
      if (!offerDatesCheck.ok) {
        return NextResponse.json({ error: offerDatesCheck.error }, { status: 400 });
      }
      if (body.deadline !== undefined) {
        if (!deadlineYmd) push('deadline =', null);
        else {
          const dt = new Date(`${deadlineYmd}T23:59:59`);
          push('deadline =', Number.isNaN(dt.getTime()) ? null : dt.toISOString());
        }
      }
      if (body.joiningDate !== undefined || body.joining_date !== undefined) {
        push('joining_date =', joiningYmd || null);
      }
    }
    if (body.status != null) {
      let st = String(body.status).trim().toLowerCase();
      if (st === 'declined') st = 'rejected';
      if (OFFER_STATUSES.has(st)) {
        const prev = String(metaRow.rows[0]?.status || '');
        push('status =', st);
        if (st === 'pending' && REOPEN_FROM_STATUSES.has(prev)) {
          push('accepted_at =', null);
          push('rejected_at =', null);
          push('rejection_reason =', null);
        } else if (st !== prev) {
          const t = new Date().toISOString();
          if (st === 'accepted') {
            push('accepted_at =', t);
            push('rejected_at =', null);
          } else if (st === 'rejected') {
            push('rejected_at =', t);
            push('accepted_at =', null);
          }
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

async function __platform_DELETE(request) {
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


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
  PATCH: __platform_PATCH,
  DELETE: __platform_DELETE,
}, { context: 'api_college_offers' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
export const PATCH = __platformApiHandlers.PATCH;
export const DELETE = __platformApiHandlers.DELETE;
