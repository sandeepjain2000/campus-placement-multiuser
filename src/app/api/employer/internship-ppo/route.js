import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getEmployerProfileId } from '@/lib/employerApplicationAccess';
import { generatePpoJobOffer } from '@/lib/generatePpoJobOffer';
import {
  canEmployerConfirmPpo,
  canEmployerGeneratePpoJobOffer,
  canEmployerRevokePpo,
  INTERNSHIP_PPO_ELIGIBLE_STATUSES,
  INTERNSHIP_PPO_REVOKED,
  INTERNSHIP_PPO_STUDENT_PENDING,
  isEligibleInternshipPpoApplicationStatus,
  isInternshipStartDateReached,
  mapInternshipPpoRow,
  validateInternshipPpoEmployerNotes,
} from '@/lib/internshipPpo';
import { notifyStudentInternshipPpoConfirmed } from '@/lib/internshipPpoNotify';
import { formatStudentSystemId } from '@/lib/studentSystemId';
import { AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ELIGIBLE_LIST = INTERNSHIP_PPO_ELIGIBLE_STATUSES;

async function loadInternRows(employerId) {
  const res = await query(
    `SELECT pa.id AS program_application_id,
            pa.status AS application_status,
            pa.applied_at,
            sp.roll_number,
            t.short_code,
            u.first_name,
            u.last_name,
            u.id AS user_id,
            COALESCE(NULLIF(TRIM(u.communication_email), ''), u.email) AS email,
            jp.id AS job_id,
            jp.title AS opening_title,
            jp.internship_start_date,
            ip.id AS ppo_id,
            ip.status AS ppo_status,
            ip.employer_notes,
            ip.confirmed_at,
            ip.student_responded_at,
            ip.offer_id,
            ip.revoked_at,
            ip.updated_at AS ppo_updated_at
     FROM program_applications pa
     INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship' AND jp.employer_id = $1::uuid
     INNER JOIN student_profiles sp ON sp.id = pa.student_id AND ${SP_ACTIVE_CLAUSE}
     INNER JOIN users u ON u.id = sp.user_id
     LEFT JOIN tenants t ON t.id = sp.tenant_id
     LEFT JOIN internship_ppo ip ON ip.program_application_id = pa.id
     WHERE pa.status = ANY($2::text[])
       ${AND_PA_NOT_DELETED}
       ${AND_JP_NOT_DELETED}
     ORDER BY jp.title, u.first_name
     LIMIT 2000`,
    [employerId, ELIGIBLE_LIST],
  );

  return res.rows.map((row) => {
    const first = row.first_name || '';
    const last = row.last_name || '';
    const startReached = isInternshipStartDateReached(row.internship_start_date);
    const ppo = mapInternshipPpoRow(
      row.ppo_id
        ? {
            id: row.ppo_id,
            program_application_id: row.program_application_id,
            status: row.ppo_status,
            employer_notes: row.employer_notes,
            confirmed_at: row.confirmed_at,
            student_responded_at: row.student_responded_at,
            offer_id: row.offer_id,
            revoked_at: row.revoked_at,
            updated_at: row.ppo_updated_at,
          }
        : null,
    );
    return {
      programApplicationId: String(row.program_application_id),
      applicationStatus: row.application_status,
      studentName: `${first} ${last}`.trim() || 'Student',
      rollNumber: row.roll_number || '',
      systemId: formatStudentSystemId(row.short_code, row.roll_number),
      jobId: String(row.job_id),
      openingTitle: row.opening_title || 'Internship',
      internshipStartDate: row.internship_start_date,
      canConfirmPpo: startReached && canEmployerConfirmPpo(ppo) && (!ppo || !ppo.offerId),
      canRevokePpo: canEmployerRevokePpo(ppo),
      canGenerateJobOffer: canEmployerGeneratePpoJobOffer(ppo),
      ppoNotAvailableReason: !row.internship_start_date
        ? 'Internship start date is not set on the posting.'
        : !startReached
          ? 'PPO is available on or after the internship start date.'
          : null,
      ppo,
    };
  });
}

async function loadApplicationForPpo(programApplicationId, employerId) {
  const res = await query(
    `SELECT pa.id, pa.status, pa.student_id, sp.tenant_id, pa.job_id,
            jp.title AS opening_title, jp.internship_start_date,
            ep.company_name,
            u.id AS user_id,
            u.first_name,
            COALESCE(NULLIF(TRIM(u.communication_email), ''), u.email) AS email
     FROM program_applications pa
     INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship' AND jp.employer_id = $2::uuid
     INNER JOIN student_profiles sp ON sp.id = pa.student_id AND ${SP_ACTIVE_CLAUSE}
     INNER JOIN users u ON u.id = sp.user_id
     INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
     WHERE pa.id = $1::uuid ${AND_PA_NOT_DELETED}`,
    [programApplicationId, employerId],
  );
  return res.rows[0] || null;
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerProfileId(session.user.id || session.user.sub);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const items = await loadInternRows(employerId);
    return NextResponse.json({
      items,
      summary: {
        total: items.length,
        withPpo: items.filter((i) => i.ppo).length,
        awaitingStudent: items.filter((i) => i.ppo?.status === INTERNSHIP_PPO_STUDENT_PENDING).length,
        accepted: items.filter((i) => i.ppo?.status === 'accepted').length,
        jobOfferIssued: items.filter((i) => i.ppo?.offerId).length,
      },
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship PPO is not available yet. Apply migration 093_internship_ppo.sql.' },
        { status: 503 },
      );
    }
    console.error('GET /api/employer/internship-ppo', error);
    return NextResponse.json({ error: 'Failed to load internship PPO' }, { status: 500 });
  }
}

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id || session.user.sub;
    const employerId = await getEmployerProfileId(userId);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'confirm').trim().toLowerCase();
    const programApplicationId = String(body.programApplicationId || '').trim();

    if (!programApplicationId) {
      return NextResponse.json({ error: 'Internship application is required.' }, { status: 400 });
    }

    if (action === 'generate-offer') {
      const templateId = String(body.templateId || '').trim();
      if (!templateId) {
        return NextResponse.json({ error: 'Job offer template is required.' }, { status: 400 });
      }
      try {
        const result = await generatePpoJobOffer({ employerId, programApplicationId, templateId });
        return NextResponse.json({
          success: true,
          message: `Job offer generated from template "${result.templateName}". Student notified on My Offers.`,
          offerId: result.offerId,
        });
      } catch (e) {
        if (e.message === 'PPO_NOT_FOUND') {
          return NextResponse.json({ error: 'PPO record not found.' }, { status: 404 });
        }
        if (e.message === 'PPO_NOT_ACCEPTED') {
          return NextResponse.json({ error: 'Generate job offer only after the student accepts the PPO.' }, { status: 400 });
        }
        if (e.message === 'OFFER_ALREADY_GENERATED') {
          return NextResponse.json({ error: 'A job offer was already generated for this intern.' }, { status: 400 });
        }
        if (e.message === 'TEMPLATE_NOT_FOUND') {
          return NextResponse.json({ error: 'Offer template not found or inactive.' }, { status: 400 });
        }
        throw e;
      }
    }

    const app = await loadApplicationForPpo(programApplicationId, employerId);
    if (!app) {
      return NextResponse.json({ error: 'Internship application not found.' }, { status: 404 });
    }
    if (!isEligibleInternshipPpoApplicationStatus(app.status)) {
      return NextResponse.json({ error: 'PPO applies only to selected interns.' }, { status: 400 });
    }
    if (!isInternshipStartDateReached(app.internship_start_date)) {
      return NextResponse.json(
        {
          error: app.internship_start_date
            ? 'PPO can be confirmed on or after the internship start date.'
            : 'Set an internship start date on the posting before confirming PPO.',
        },
        { status: 400 },
      );
    }

    const existingRes = await query(
      `SELECT id, status, offer_id FROM internship_ppo WHERE program_application_id = $1::uuid`,
      [programApplicationId],
    );
    const existing = existingRes.rows[0];

    if (action === 'revoke') {
      if (!existing || !canEmployerRevokePpo({ status: existing.status, offer_id: existing.offer_id })) {
        return NextResponse.json({ error: 'PPO can be revoked only before a job offer is generated.' }, { status: 400 });
      }
      await query(
        `UPDATE internship_ppo
         SET status = $2, revoked_by = $3::uuid, revoked_at = NOW(), updated_at = NOW()
         WHERE id = $1::uuid`,
        [existing.id, INTERNSHIP_PPO_REVOKED, userId],
      );
      return NextResponse.json({ success: true, message: 'PPO revoked.' });
    }

    if (action !== 'confirm') {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    }

    if (existing && !canEmployerConfirmPpo({ status: existing.status, offer_id: existing.offer_id })) {
      return NextResponse.json(
        { error: 'PPO is already in progress or a job offer was issued. Revoke first if allowed.' },
        { status: 400 },
      );
    }

    const notesErr = validateInternshipPpoEmployerNotes(body.employerNotes);
    if (notesErr) {
      return NextResponse.json({ error: notesErr }, { status: 400 });
    }
    const employerNotes = String(body.employerNotes || '').trim() || null;

    let ppoRow;
    if (existing) {
      const upd = await query(
        `UPDATE internship_ppo
         SET status = $2, employer_notes = $3, confirmed_by = $4::uuid, confirmed_at = NOW(),
             student_responded_at = NULL, revoked_by = NULL, revoked_at = NULL, updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, program_application_id, status, employer_notes, confirmed_at, student_responded_at, offer_id, revoked_at, updated_at`,
        [existing.id, INTERNSHIP_PPO_STUDENT_PENDING, employerNotes, userId],
      );
      ppoRow = upd.rows[0];
    } else {
      const ins = await query(
        `INSERT INTO internship_ppo (
           program_application_id, tenant_id, student_profile_id, job_id, employer_id,
           status, employer_notes, confirmed_by, confirmed_at, updated_at
         ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8::uuid, NOW(), NOW())
         RETURNING id, program_application_id, status, employer_notes, confirmed_at, student_responded_at, offer_id, revoked_at, updated_at`,
        [
          app.id,
          app.tenant_id,
          app.student_id,
          app.job_id,
          employerId,
          INTERNSHIP_PPO_STUDENT_PENDING,
          employerNotes,
          userId,
        ],
      );
      ppoRow = ins.rows[0];
    }

    notifyStudentInternshipPpoConfirmed({
      studentUserId: String(app.user_id),
      email: String(app.email || ''),
      firstName: app.first_name,
      companyName: app.company_name || 'Company',
      internshipTitle: app.opening_title || 'Internship',
      employerNotes,
    }).catch((err) => console.error('PPO notify failed:', err));

    return NextResponse.json({
      success: true,
      message: 'PPO confirmed. Student notified to accept or decline.',
      ppo: mapInternshipPpoRow(ppoRow),
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship PPO is not available yet. Apply migration 093_internship_ppo.sql.' },
        { status: 503 },
      );
    }
    console.error('POST /api/employer/internship-ppo', error);
    return NextResponse.json({ error: 'Failed to process PPO action' }, { status: 500 });
  }
}

const handlers = withApiHandlers(
  { GET: __platform_GET, POST: __platform_POST },
  { context: 'api_employer_internship_ppo' },
);
export const GET = handlers.GET;
export const POST = handlers.POST;
