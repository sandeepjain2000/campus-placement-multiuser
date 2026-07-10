import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { smtpErrorForUser } from '@/lib/smtpErrors';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




const SUBJECT_MAX = 500;
const BODY_MAX = 50_000;

async function __platform_POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: listingId } = await params;
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listing id' }, { status: 400 });
    }

    const body = await request.json();
    const subject = String(body.subject || '').trim();
    const text = String(body.body || body.text || '').trim();

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
    }
    if (subject.length > SUBJECT_MAX) {
      return NextResponse.json({ error: `Subject must be at most ${SUBJECT_MAX} characters` }, { status: 400 });
    }
    if (text.length > BODY_MAX) {
      return NextResponse.json({ error: `Body must be at most ${BODY_MAX} characters` }, { status: 400 });
    }

    const employerUserId = session.user.id;

    const listingRes = await query(
      `SELECT
         cel.id,
         cel.status,
         COALESCE(NULLIF(TRIM(t.communication_email), ''), t.email) AS college_email,
         cgs.sent_at AS confirmation_sent_at
       FROM campus_engagement_listings cel
       INNER JOIN tenants t ON t.id = cel.tenant_id
       LEFT JOIN campus_guest_confirmation_sends cgs
         ON cgs.listing_id = cel.id AND cgs.employer_user_id = $2::uuid
       WHERE cel.id = $1::uuid`,
      [listingId, employerUserId],
    );

    const row = listingRes.rows[0];
    if (!row || row.status !== 'published') {
      return NextResponse.json({ error: 'Listing not found or not published' }, { status: 404 });
    }

    if (row.confirmation_sent_at) {
      return NextResponse.json(
        { error: 'Confirmation email was already sent for this listing.' },
        { status: 409 },
      );
    }

    const toEmail = String(row.college_email || '').trim();
    if (!toEmail) {
      return NextResponse.json(
        { error: 'This college has no contact email on file.' },
        { status: 400 },
      );
    }

    let sendRowId = null;
    try {
      const ins = await query(
        `INSERT INTO campus_guest_confirmation_sends
           (listing_id, employer_user_id, to_email, subject, body)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5)
         RETURNING id`,
        [listingId, employerUserId, toEmail, subject, text],
      );
      sendRowId = ins.rows[0]?.id || null;

      const mailResult = await sendMail({
        to: toEmail,
        subject,
        text,
        context: 'guest_confirmation',
        userId: employerUserId,
      });

      if (mailResult.skipped) {
        throw Object.assign(
          new Error(
            'Outbound email is not configured. Set SMTP_USER, SMTP_PASS, and EMAIL_FROM (or SMTP as in server docs).',
          ),
          { code: 'MAIL_SKIPPED' },
        );
      }
    } catch (e) {
      if (sendRowId) {
        await query(`DELETE FROM campus_guest_confirmation_sends WHERE id = $1::uuid`, [sendRowId]).catch(() => {});
      }
      if (e.code === '23505') {
        return NextResponse.json(
          { error: 'Confirmation email was already sent for this listing.' },
          { status: 409 },
        );
      }
      if (e.code === 'MAIL_SKIPPED') {
        return NextResponse.json({ error: e.message }, { status: 503 });
      }
      throw e;
    }

    return NextResponse.json({ ok: true, toEmail });
  } catch (e) {
    console.error('POST /api/employer/engagement-listings/[id]/send-confirmation', e);
    const message = smtpErrorForUser(e);
    if (/timeout exceeded when trying to connect/i.test(String(e?.message || ''))) {
      return NextResponse.json(
        {
          error:
            'Database connection timed out while sending. Please try again in a few seconds.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message || e.message || 'Failed to send email' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_employer_engagement_listings_id_send_confirmation' });
export const POST = __platformApiHandlers.POST;
