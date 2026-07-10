import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/sessionPolicy';
import { getRequestIp, writePlatformErrorLog } from '@/lib/platformErrorLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ROLE_HOME_PATHS = {
  student: '/dashboard/student',
  employer: '/dashboard/employer',
  college_admin: '/dashboard/college',
  placement_committee: '/dashboard/college',
  super_admin: '/dashboard/admin',
};

/**
 * Post–sign-in redirect: read JWT from cookie on the server (no client SessionProvider race).
 */
export async function GET(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const hasSessionCookie = cookieHeader.includes(SESSION_COOKIE_NAME);

  let token = null;
  let tokenError = null;

  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: SESSION_COOKIE_NAME,
      secureCookie: SESSION_COOKIE_NAME.startsWith('__Secure-'),
    });
  } catch (err) {
    tokenError = err;
    console.error('[Auth Continue] Error reading session token:', err);
  }

  if (token?.role && ROLE_HOME_PATHS[token.role]) {
    const dest = ROLE_HOME_PATHS[token.role];
    return NextResponse.redirect(new URL(dest, request.url));
  }

  const failureMessage = tokenError
    ? 'Session token could not be read after sign-in'
    : 'Session token missing or role invalid after sign-in';

  await writePlatformErrorLog({
    context: 'auth_continue_failed',
    severity: 'warning',
    statusCode: 401,
    error: tokenError || new Error(failureMessage),
    userMessage: failureMessage,
    userId: token?.id || token?.sub || null,
    ipAddress: getRequestIp(request),
    details: {
      sessionCookieName: SESSION_COOKIE_NAME,
      sessionCookiePresent: hasSessionCookie,
      tokenFound: Boolean(token),
      tokenRole: token?.role || null,
      tokenEmail: token?.email || null,
      requestUrl: request.url,
    },
  });

  return NextResponse.redirect(new URL('/login?error=session', request.url));
}

