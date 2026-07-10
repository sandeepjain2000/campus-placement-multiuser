import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { loadEmployerInterviewApplicantRecipients } from '@/lib/employerInterviewApplicants';
import {
  buildEmployerInterviewApplicantEmailBody,
  buildEmployerInterviewApplicantEmailSubject,
} from '@/lib/employerInterviewEmail';
import { toDateOnlyString } from '@/lib/dateOnly';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';

const MAX_RECIPIENTS_PER_RUN = 200;

async function getEmployer(userId) {
  const res = await query(
    `SELECT id, company_name FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`,
    [userId],
  );
  return res.rows[0] || null;
}

async function getTenant(tenantId) {
  const res = await query(`SELECT id, name, settings FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
  return res.rows[0] || null;
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const employer = await getEmployer(userId);
    if (!employer) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const campusId = String(body?.campusId || '').trim();
    const planId = String(body?.planId || '').trim();
    if (!campusId || !planId) {
      return NextResponse.json({ error: 'campusId and planId are required' }, { status: 400 });
    }

    const tenant = await getTenant(campusId);
    if (!tenant) return NextResponse.json({ error: 'Campus not found' }, { status: 404 });

    const rows = Array.isArray(tenant.settings?.employerInterviewPlans) ? tenant.settings.employerInterviewPlans : [];
    const slot = rows.find((r) => r.id === planId && r.employerUserId === userId);
    if (!slot) {
      return NextResponse.json({ error: 'Interview slot not found' }, { status: 404 });
    }
    if (!slot.opportunityId || !slot.opportunityKind) {
      return NextResponse.json(
        { error: 'Link this slot to a specific job, internship, project, or placement drive before emailing applicants.' },
        { status: 400 },
      );
    }

    const recipients = await loadEmployerInterviewApplicantRecipients({
      employerId: employer.id,
      campusId,
      opportunityKind: slot.opportunityKind,
      opportunityId: slot.opportunityId,
    });

    const unique = [];
    const seen = new Set();
    for (const r of recipients) {
      if (!r.email || seen.has(r.email)) continue;
      seen.add(r.email);
      unique.push(r);
    }

    if (!unique.length) {
      return NextResponse.json(
        { error: 'No applicants with email addresses found for this opening at the selected campus.' },
        { status: 404 },
      );
    }
    if (unique.length > MAX_RECIPIENTS_PER_RUN) {
      return NextResponse.json(
        { error: `Too many applicants (${unique.length}). Contact support or notify in smaller batches.` },
        { status: 400 },
      );
    }

    const slotForEmail = {
      ...slot,
      date: toDateOnlyString(slot.date) || slot.date,
      companyName: slot.companyName || employer.company_name,
      campus: slot.campus || tenant.name,
    };

    const senderEmail = String(session.user.email || '').trim().toLowerCase();
    const senderName = String(session.user.name || employer.company_name || 'Employer').trim();
    let sent = 0;
    const failed = [];

    for (const person of unique) {
      const subject = buildEmployerInterviewApplicantEmailSubject(slotForEmail, {
        companyName: employer.company_name,
        campusName: tenant.name,
      });
      const text = buildEmployerInterviewApplicantEmailBody(slotForEmail, {
        companyName: employer.company_name,
        campusName: tenant.name,
        recipientName: person.name,
      });

      const result = await sendMail({
        to: person.email,
        subject,
        text,
        html: text.replace(/\n/g, '<br/>'),
        replyTo: senderEmail || undefined,
        context: 'employer_interview_slot',
        userId,
        skipCommunicationRouting: false,
        skipRecipientRedirect: false,
      });

      if (result.skipped) {
        return NextResponse.json(
          {
            error:
              result.reason === 'daily_limit_reached'
                ? 'Daily email send limit reached. Try again tomorrow.'
                : 'Outbound email is not configured. Ask your platform admin to set SMTP settings.',
            reason: result.reason,
            sent,
          },
          { status: 503 },
        );
      }
      if (result.ok) sent += 1;
      else failed.push(person.email);
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      totalApplicants: unique.length,
      fromLabel: senderName,
    });
  } catch (e) {
    console.error('POST /api/employer/interviews/notify', e);
    return NextResponse.json({ error: 'Failed to email applicants' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_employer_interviews_notify' });
export const POST = __platformApiHandlers.POST;
