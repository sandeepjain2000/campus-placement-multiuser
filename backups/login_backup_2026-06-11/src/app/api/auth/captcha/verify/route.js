import { NextResponse } from 'next/server';
import { verifyLoginCaptcha } from '@/lib/simpleCaptcha';

export async function POST(request) {
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
