import { NextResponse } from 'next/server';
import { createLoginCaptcha } from '@/lib/simpleCaptcha';

export async function GET() {
  try {
    const challenge = createLoginCaptcha();
    return NextResponse.json(challenge);
  } catch (e) {
    console.error('GET /api/auth/captcha', e);
    return NextResponse.json({ error: 'Could not create verification challenge' }, { status: 500 });
  }
}
