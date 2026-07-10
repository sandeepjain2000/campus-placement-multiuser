import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { verifyLoginCaptcha } from '@/lib/simpleCaptcha';

async function __platform_POST(request) {
  try {
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
