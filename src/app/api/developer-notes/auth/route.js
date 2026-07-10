import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import {
  DEV_NOTES_COOKIE,
  createDevNotesSessionToken,
  devNotesCookieOptions,
} from '@/lib/developerNotesAuth';
import { verifyDevNotesPassword } from '@/lib/developerNotesPassword';

async function __platform_POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const password = body?.password;
  const ok = await verifyDevNotesPassword(password);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = await createDevNotesSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEV_NOTES_COOKIE, token, devNotesCookieOptions());
  return response;
}

export const { POST } = withApiHandlers({ POST: __platform_POST });
