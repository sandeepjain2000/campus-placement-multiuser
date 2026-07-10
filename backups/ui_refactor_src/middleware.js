import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/** Keep in sync with ROLE_HOME_PATHS in config/dashboardMenu.js (no lucide import here — Edge-safe). */
const ROLE_HOME_PATHS = {
  student: '/dashboard/student',
  employer: '/dashboard/employer',
  college_admin: '/dashboard/college',
  super_admin: '/dashboard/admin',
};

const DATA_ENTRY_ROLES = new Set(['super_admin', 'college_admin']);

/**
 * Authenticated users must not use /login (back button or direct URL). Only signOut should end the session there.
 * /data-entry is restricted to operations roles (matches API enforcement).
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/data-entry')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (!DATA_ENTRY_ROLES.has(token.role)) {
      const dest = ROLE_HOME_PATHS[token.role] || '/dashboard';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (pathname !== '/login') {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.role) {
    return NextResponse.next();
  }

  const dest = ROLE_HOME_PATHS[token.role] || '/dashboard';
  return NextResponse.redirect(new URL(dest, request.url));
}

export const config = {
  matcher: ['/login', '/data-entry', '/data-entry/:path*'],
};
