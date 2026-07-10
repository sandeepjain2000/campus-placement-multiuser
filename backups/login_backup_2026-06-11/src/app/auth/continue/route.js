import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/sessionPolicy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ROLE_HOME_PATHS = {
  student: '/dashboard/student',
  employer: '/dashboard/employer',
  college_admin: '/dashboard/college',
  super_admin: '/dashboard/admin',
};

/**
 * Post–sign-in redirect: read JWT from cookie on the server (no client SessionProvider race).
 */
export async function GET(request) {
  console.log('[Auth Continue] GET endpoint invoked. Parsing next-auth JWT token...');
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
  });

  if (token?.role && ROLE_HOME_PATHS[token.role]) {
    const dest = ROLE_HOME_PATHS[token.role];
    console.log(`[Auth Continue] JWT token found. User ID: ${token.id}, Role: ${token.role}. Redirecting to dashboard home: ${dest}`);
    return NextResponse.redirect(new URL(dest, request.url));
  }

  console.warn('[Auth Continue] Token verification failed or role is missing/invalid. Redirecting back to /login?error=session. Token:', token ? { id: token.id, email: token.email, role: token.role } : null);
  return NextResponse.redirect(new URL('/login?error=session', request.url));
}
