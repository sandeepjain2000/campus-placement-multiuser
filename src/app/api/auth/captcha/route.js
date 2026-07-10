import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { createLoginCaptcha } from '@/lib/simpleCaptcha';

async function __platform_GET() {
  try {
    const challenge = createLoginCaptcha();
    return NextResponse.json(challenge);
  } catch (e) {
    console.error('GET /api/auth/captcha', e);
    return NextResponse.json({ error: 'Could not create verification challenge' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_auth_captcha' });
export const GET = __platformApiHandlers.GET;
