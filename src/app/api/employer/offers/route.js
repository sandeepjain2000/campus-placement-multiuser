import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { refreshOfferLatestFlagsForStudent } from '@/lib/offersLatestFlag';
import { notifyStudentFormalOfferByOfferId } from '@/lib/studentFormalOfferNotify';
import { validateEmployerOfferPayload, validateTitlePayload } from '@/lib/apiInputValidation';
import { normalizeTitle } from '@/lib/validators';
import { toDateOnlyString } from '@/lib/dateOnly';
import { isMissingReportedCompanyColumnError } from '@/lib/offerReportedColumn';
import { OfferService } from '@/lib/domain/offers/service';
import { AND_DRIVE_NOT_DELETED, AND_OFFER_NOT_DELETED } from '@/lib/softDeleteSql';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




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

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerId(session);

    if (!employerId) {
      return NextResponse.json({ offers: [] });
    }

    const offers = await OfferService.getEmployerOffers(employerId);
    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Failed to load employer offers:', error);
    return NextResponse.json(
      { error: 'Failed to load employer offers' },
      { status: 500 }
    );
  }
}

async function __platform_POST(request) {
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
    const jobTitle = normalizeTitle(body?.jobTitle);
    const salary = Number(body?.salary || 0);
    const location = String(body?.location || '').trim() || null;
    const joiningDate = String(body?.joiningDate || '').trim() || null;
    const deadlineAt = String(body?.deadlineAt || '').trim() || null;
    const offerLetterUrl = String(body?.offerLetterUrl || '').trim() || null;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }
    const jobTitleErr = validateTitlePayload(jobTitle, { label: 'Job title' });
    if (jobTitleErr) {
      return NextResponse.json({ error: jobTitleErr }, { status: 400 });
    }

    const offerErr = validateEmployerOfferPayload({
      salary,
      deadline: deadlineAt ? toDateOnlyString(deadlineAt) : '',
      joiningDate: joiningDate ? toDateOnlyString(joiningDate) : '',
    });
    if (offerErr) {
      return NextResponse.json({ error: offerErr }, { status: 400 });
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
      offerLetterUrl,
    ];
    let created;
    try {
      created = await query(
        `INSERT INTO offers (
         student_id, drive_id, employer_id, job_title, salary, location, status, joining_date, deadline, salary_currency,
         reported_company_name, offer_letter_url
       ) VALUES (
         $1, $2, $3, $4, $5, $6, 'pending', $7, $8, 'INR',
         (SELECT company_name FROM employer_profiles WHERE id = $3::uuid LIMIT 1),
         $9
       )
       RETURNING id`,
        insertParams,
      );
    } catch (e) {
      if (!isMissingReportedCompanyColumnError(e)) throw e;
      created = await query(
        `INSERT INTO offers (
         student_id, drive_id, employer_id, job_title, salary, location, status, joining_date, deadline, salary_currency,
         offer_letter_url
       ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, 'INR', $9)
       RETURNING id`,
        insertParams,
      );
    }

    await refreshOfferLatestFlagsForStudent(studentId);

    const offerId = created.rows[0]?.id;
    if (offerId) {
      notifyStudentFormalOfferByOfferId(String(offerId)).catch((err) => {
        console.error('Formal offer notification after employer create:', err);
      });
    }

    return NextResponse.json({ offer: created.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create employer offer:', error);
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
  }
}

const REOPEN_FROM_STATUSES = new Set(['accepted', 'rejected', 'revoked', 'expired']);

async function __platform_PATCH(request) {
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
      `SELECT student_id, status FROM offers o WHERE o.id = $1::uuid AND o.employer_id = $2::uuid ${AND_OFFER_NOT_DELETED}`,
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
    if (body.offerLetterUrl !== undefined || body.offer_letter_url !== undefined) {
      const u = body.offerLetterUrl ?? body.offer_letter_url;
      push('offer_letter_url =', u ? String(u).trim() : null);
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
          `SELECT id FROM placement_drives d WHERE d.id = $1::uuid AND d.employer_id = $2::uuid ${AND_DRIVE_NOT_DELETED} LIMIT 1`,
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
       WHERE id = $${params.length - 1}::uuid AND employer_id = $${params.length}::uuid ${AND_OFFER_NOT_DELETED}`,
      params,
    );

    await refreshOfferLatestFlagsForStudent(studentId);

    const out = await query(
      `SELECT id, status, job_title, salary, location, deadline AS deadline_at, joining_date
       FROM offers o WHERE o.id = $1::uuid AND o.employer_id = $2::uuid ${AND_OFFER_NOT_DELETED}`,
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

async function __platform_DELETE(request) {
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

    const success = await OfferService.deleteEmployerOffer(id, employerId);
    if (!success) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete employer offer:', error);
    return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
  PATCH: __platform_PATCH,
  DELETE: __platform_DELETE,
}, { context: 'api_employer_offers' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
export const PATCH = __platformApiHandlers.PATCH;
export const DELETE = __platformApiHandlers.DELETE;
