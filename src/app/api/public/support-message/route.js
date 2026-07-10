import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getPlatformSettings } from '@/lib/platformSettings';
import { deliverLoginSupportMessage } from '@/lib/loginSupportDelivery';
import { validateEmail } from '@/lib/validators';

export const runtime = 'nodejs';

const MAX_SUBJECT = 200;
const MAX_MESSAGE = 4000;

/**
 * Public pre-login support message → SMTP to system notification inbox (YOPmail in demo).
 * POST { replyEmail, subject, message }
 */
async function __platform_POST(request) {
  try {
    const body = await request.json();
    const replyEmail = String(body.replyEmail || '').trim().toLowerCase();
    const subject = String(body.subject || '').trim().slice(0, MAX_SUBJECT);
    const message = String(body.message || '').trim().slice(0, MAX_MESSAGE);

    if (!validateEmail(replyEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address so we can reply.' }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json({ error: 'Please enter at least 10 characters in your message.' }, { status: 400 });
    }

    const platform = await getPlatformSettings();
    const result = await deliverLoginSupportMessage({ replyEmail, subject, message, platform });

    if (!result.ok || !result.smtpDelivered) {
      return NextResponse.json(
        {
          error: result.message,
          deliveredTo: result.deliveredTo,
          smtpDelivered: false,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      smtpDelivered: true,
      deliveredTo: result.deliveredTo,
      message: result.message,
    });
  } catch (error) {
    console.error('POST /api/public/support-message', error);
    return NextResponse.json(
      {
        error:
          'Could not send your message. Check that SMTP is configured on the server, then try again or call support.',
      },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_public_support_message' });
export const POST = __platformApiHandlers.POST;
