import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { LEGACY_SESSION_COOKIE_NAMES, SESSION_COOKIE_NAME } from '@/lib/sessionPolicy';
import { isPlacementApiPath } from '@/lib/placementReadRoute';
import {
  ALUMNI_BROWSE_JOBS_PATH,
  ALUMNI_GETTING_STARTED_PATH,
  ALUMNI_MY_JOBS_PATH,
  LEGACY_STUDENT_APPLICATIONS_JOBS_PATH,
  LEGACY_STUDENT_GETTING_STARTED_PATH,
  LEGACY_STUDENT_JOBS_PATH,
  campusStudentJobRedirectPath,
  isAlumniStudentJobPath,
} from '@/lib/alumniRoutes';
import {
  EMPLOYER_ALUMNI_JOBS_PATH,
  LEGACY_EMPLOYER_JOBS_PATH,
} from '@/lib/employerAlumniRoutes';
import {
  isPlacementCommitteePathAllowed,
} from '@/lib/collegeAccess';
import {
  DEV_NOTES_COOKIE,
  isDeveloperNotesPublicPath,
  requiresDevNotesUnlock,
  verifyDevNotesSessionToken,
} from '@/lib/developerNotesAuth';

const IS_PROD = process.env.NODE_ENV === 'production';

function appendLegacyCookieClearance(response) {
  for (const name of LEGACY_SESSION_COOKIE_NAMES) {
    response.cookies.set(name, '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD,
    });
  }
  return response;
}

/** Keep in sync with ROLE_HOME_PATHS in config/dashboardMenu.js (no lucide import here — Edge-safe). */
const ROLE_HOME_PATHS = {
  student:      '/dashboard/student',
  employer:     '/dashboard/employer',
  college_admin:'/dashboard/college',
  placement_committee: '/dashboard/college',
  super_admin:  '/dashboard/admin',
};

/** Role → the dashboard path prefix that role OWNS. Cross-role access is blocked. */
const ROLE_OWNED_PREFIX = {
  student:      '/dashboard/student',
  employer:     '/dashboard/employer',
  college_admin:'/dashboard/college',
  placement_committee: '/dashboard/college',
  super_admin:  '/dashboard/admin',
};

/** Dashboard path prefixes that are open to ALL authenticated roles. */
const SHARED_DASHBOARD_ROUTES = [
  '/dashboard/alerts',
  '/dashboard/feedback',
  '/dashboard/my-exports',
  '/dashboard/help',
];

function withNoStore(response) {
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

/**
 * Middleware enforces:
 *  1. Placement APIs — no-store so purge/list screens refresh immediately
 *  2. /developer & /data-entry — shared team-password gate (unlock cookie)
 *  3. /login — authenticated users are redirected to their home
 *  4. /dashboard/* — each role can only reach its own prefix (or shared routes)
 */
export default async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (isPlacementApiPath(pathname)) {
    return appendLegacyCookieClearance(withNoStore(NextResponse.next()));
  }

  // ── /developer & /data-entry — shared password gate (bcrypt + signed cookie) ─
  if (requiresDevNotesUnlock(pathname)) {
    const token = request.cookies.get(DEV_NOTES_COOKIE)?.value;
    const ok = await verifyDevNotesSessionToken(token);
    if (!ok) {
      const unlock = new URL('/developer/unlock', request.url);
      unlock.searchParams.set('from', pathname);
      return appendLegacyCookieClearance(NextResponse.redirect(unlock));
    }
    return appendLegacyCookieClearance(NextResponse.next());
  }

  if (isDeveloperNotesPublicPath(pathname)) {
    return appendLegacyCookieClearance(NextResponse.next());
  }

  // ── /login & /sign-in — bounce already-authenticated users (unless ?force=1) ──────────
  if (pathname === '/login' || pathname === '/sign-in') {
    const force = request.nextUrl.searchParams.get('force');
    if (!force) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: SESSION_COOKIE_NAME,
        secureCookie: SESSION_COOKIE_NAME.startsWith('__Secure-'),
      });
      if (token?.role) {
        const dest = ROLE_HOME_PATHS[token.role] || '/dashboard';
        return appendLegacyCookieClearance(NextResponse.redirect(new URL(dest, request.url)));
      }
    }
    return appendLegacyCookieClearance(NextResponse.next());
  }

  // ── /dashboard/* — per-role path enforcement ─────────────────────────────
  if (pathname.startsWith('/dashboard/')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: SESSION_COOKIE_NAME,
      secureCookie: SESSION_COOKIE_NAME.startsWith('__Secure-'),
    });

    // Unauthenticated → login
    if (!token?.role) {
      return appendLegacyCookieClearance(NextResponse.redirect(new URL('/login', request.url)));
    }

    const role = token.role;

    if (role === 'student') {
      if (!token.isAlumni && isAlumniStudentJobPath(pathname)) {
        const dest = campusStudentJobRedirectPath(pathname);
        return appendLegacyCookieClearance(NextResponse.redirect(new URL(dest, request.url)));
      }
      if (token.isAlumni && pathname === LEGACY_STUDENT_JOBS_PATH) {
        return appendLegacyCookieClearance(
          NextResponse.redirect(new URL(ALUMNI_BROWSE_JOBS_PATH, request.url)),
        );
      }
      if (token.isAlumni && pathname === LEGACY_STUDENT_APPLICATIONS_JOBS_PATH) {
        return appendLegacyCookieClearance(
          NextResponse.redirect(new URL(ALUMNI_MY_JOBS_PATH, request.url)),
        );
      }
    }

    const ownedPrefix = ROLE_OWNED_PREFIX[role];

    if (
      role === 'student' &&
      token.isAlumni &&
      pathname === LEGACY_STUDENT_GETTING_STARTED_PATH
    ) {
      return appendLegacyCookieClearance(
        NextResponse.redirect(new URL(ALUMNI_GETTING_STARTED_PATH, request.url)),
      );
    }

    if (role === 'student' && token.isAlumni && pathname === '/dashboard/student/clarifications') {
      return appendLegacyCookieClearance(
        NextResponse.redirect(new URL(ALUMNI_BROWSE_JOBS_PATH, request.url)),
      );
    }

    if (role === 'employer' && pathname === LEGACY_EMPLOYER_JOBS_PATH) {
      return appendLegacyCookieClearance(
        NextResponse.redirect(new URL(EMPLOYER_ALUMNI_JOBS_PATH, request.url)),
      );
    }

    // Allow shared routes for all authenticated users
    const isShared = SHARED_DASHBOARD_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
    if (isShared) return appendLegacyCookieClearance(NextResponse.next());

    // Students (including alumni) use /dashboard/alumni for lateral job flows
    if (
      role === 'student' &&
      (pathname === '/dashboard/alumni' || pathname.startsWith('/dashboard/alumni/'))
    ) {
      return appendLegacyCookieClearance(NextResponse.next());
    }

    // Allow the role's own dashboard subtree
    if (ownedPrefix && (pathname === ownedPrefix || pathname.startsWith(ownedPrefix + '/'))) {
      if (role === 'placement_committee' && !isPlacementCommitteePathAllowed(pathname)) {
        return appendLegacyCookieClearance(
          NextResponse.redirect(new URL('/dashboard/college/students', request.url)),
        );
      }
      return appendLegacyCookieClearance(NextResponse.next());
    }

    // Block cross-role access — redirect to the role's own home
    const dest = ROLE_HOME_PATHS[role] || '/dashboard';
    return appendLegacyCookieClearance(NextResponse.redirect(new URL(dest, request.url)));
  }

  return appendLegacyCookieClearance(NextResponse.next());
}

export const config = {
  matcher: [
    '/api/student/:path*',
    '/api/employer/:path*',
    '/api/college/:path*',
    '/api/admin/:path*',
    '/api/demo/:path*',
    '/api/notifications/:path*',
    '/api/user/data-export/:path*',
    '/api/hiring-assessment/:path*',
    '/login',
    '/sign-in',
    '/data-entry',
    '/data-entry/:path*',
    '/developer',
    '/developer/:path*',
    '/dashboard/:path*',
  ],
};
