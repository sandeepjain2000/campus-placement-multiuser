import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendMail } from '@/lib/mailer';
import { normalizeEmailRecipients } from '@/lib/adminPlacementListingEmail';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';

const MAX_RECIPIENTS = 10;
const MAX_SUBJECT = 300;
const MAX_BODY = 12000;

function parseRecipientList(to) {
  return normalizeEmailRecipients(to)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const subject = String(body?.subject || '').trim();
    const text = String(body?.body || body?.text || '').trim();
    const recipients = parseRecipientList(body?.to);

    if (!recipients.length) {
      return NextResponse.json({ error: 'At least one recipient email is required' }, { status: 400 });
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `You can send to at most ${MAX_RECIPIENTS} recipients at once` },
        { status: 400 },
      );
    }
    const invalid = recipients.find((e) => !isValidEmail(e));
    if (invalid) {
      return NextResponse.json({ error: `Invalid email address: ${invalid}` }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (subject.length > MAX_SUBJECT) {
      return NextResponse.json({ error: 'Subject is too long' }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
    }
    if (text.length > MAX_BODY) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
    }

    const senderEmail = String(session.user.email || '').trim().toLowerCase();
    const senderName = String(session.user.name || 'PlacementHub admin').trim();
    const replyTo = senderEmail || undefined;

    const mailResult = await sendMail({
      to: recipients,
      subject,
      text,
      html: text.replace(/\n/g, '<br/>'),
      replyTo,
      context: 'admin_placement_listing_share',
      userId: session.user.id,
      skipCommunicationRouting: true,
      skipRecipientRedirect: true,
    });

    if (mailResult.skipped) {
      const reason = mailResult.reason || 'unknown';
      const message =
        reason === 'daily_limit_reached'
          ? 'Daily email send limit reached. Try again tomorrow or use Open in email app.'
          : 'Outbound email is not configured on this server. Use Open in email app, or configure SMTP in admin settings.';
      return NextResponse.json({ error: message, reason }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      sentTo: recipients,
      fromLabel: senderName,
    });
  } catch (e) {
    console.error('POST /api/admin/placement-listings/email', e);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_admin_placement_listings_email' });
export const POST = __platformApiHandlers.POST;
