import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { DEV_NOTES_COOKIE, devNotesCookieOptions } from '@/lib/developerNotesAuth';

async function __platform_POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEV_NOTES_COOKIE, '', { ...devNotesCookieOptions(), maxAge: 0 });
  return response;
}

export const { POST } = withApiHandlers({ POST: __platform_POST });
