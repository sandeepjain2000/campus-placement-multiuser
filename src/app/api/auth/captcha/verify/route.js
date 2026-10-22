import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { captchaFailureMessage, explainCaptchaFailure } from '@/lib/simpleCaptcha';

async function __platform_POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const captchaFailure = explainCaptchaFailure(body.captchaToken, body.captchaAnswer);
    if (captchaFailure) {
      return NextResponse.json(
        { ok: false, error: captchaFailureMessage(captchaFailure), code: captchaFailure },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/auth/captcha/verify', e);
    return NextResponse.json(
      { ok: false, error: 'Could not verify. Please try again.' },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_auth_captcha_verify' });
export const POST = __platformApiHandlers.POST;
