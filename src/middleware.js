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
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
} from '@/lib/securityHeaders';

const IS_PROD = process.env.NODE_ENV === 'production';
const IS_DEV = process.env.NODE_ENV !== 'production';

function resolveAppOrigin(request) {
  const fromEnv = String(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (fromEnv.startsWith('http://') || fromEnv.startsWith('https://')) return fromEnv;
  try {
    return request.nextUrl.origin;
  } catch {
    return 'https://campus-placement-omega.vercel.app';
  }
}

function createNonce() {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

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

function withNoStore(response) {
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

function seal(response, request, nonce) {
  applySecurityHeaders(response, {
    nonce,
    isDev: IS_DEV,
    isProd: IS_PROD,
    appOrigin: resolveAppOrigin(request),
  });
  return appendLegacyCookieClearance(response);
}

/**
 * Continue the request with a fresh CSP nonce so Next can stamp framework scripts.
 */
function passThrough(request, nonce, { noStore = false } = {}) {
  const csp = buildContentSecurityPolicy({ nonce, isDev: IS_DEV });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // Next extracts the nonce from the request CSP during SSR.
  requestHeaders.set('Content-Security-Policy', csp);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  if (noStore) response = withNoStore(response);
  return seal(response, request, nonce);
}

function redirectTo(url, request, nonce) {
  return seal(NextResponse.redirect(url), request, nonce);
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

/**
 * Middleware enforces:
 *  1. Per-request CSP nonce + security headers (all matched routes)
 *  2. Placement APIs — no-store so purge/list screens refresh immediately
 *  3. /developer & /data-entry — shared team-password gate (unlock cookie)
 *  4. /login — authenticated users are redirected to their home
 *  5. /dashboard/* — each role can only reach its own prefix (or shared routes)
 */
export default async function proxy(request) {
  const { pathname } = request.nextUrl;
  const nonce = createNonce();

  if (isPlacementApiPath(pathname)) {
    return passThrough(request, nonce, { noStore: true });
  }

  // ── /developer & /data-entry — shared password gate (bcrypt + signed cookie) ─
  if (requiresDevNotesUnlock(pathname)) {
    const token = request.cookies.get(DEV_NOTES_COOKIE)?.value;
    const ok = await verifyDevNotesSessionToken(token);
    if (!ok) {
      const unlock = new URL('/developer/unlock', request.url);
      unlock.searchParams.set('from', pathname);
      return redirectTo(unlock, request, nonce);
    }
    return passThrough(request, nonce);
  }

  if (isDeveloperNotesPublicPath(pathname)) {
    return passThrough(request, nonce);
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
        return redirectTo(new URL(dest, request.url), request, nonce);
      }
    }
    return passThrough(request, nonce);
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
      return redirectTo(new URL('/login', request.url), request, nonce);
    }

    const role = token.role;

    if (role === 'student') {
      if (!token.isAlumni && isAlumniStudentJobPath(pathname)) {
        const dest = campusStudentJobRedirectPath(pathname);
        return redirectTo(new URL(dest, request.url), request, nonce);
      }
      if (token.isAlumni && pathname === LEGACY_STUDENT_JOBS_PATH) {
        return redirectTo(new URL(ALUMNI_BROWSE_JOBS_PATH, request.url), request, nonce);
      }
      if (token.isAlumni && pathname === LEGACY_STUDENT_APPLICATIONS_JOBS_PATH) {
        return redirectTo(new URL(ALUMNI_MY_JOBS_PATH, request.url), request, nonce);
      }
    }

    const ownedPrefix = ROLE_OWNED_PREFIX[role];

    if (
      role === 'student' &&
      token.isAlumni &&
      pathname === LEGACY_STUDENT_GETTING_STARTED_PATH
    ) {
      return redirectTo(new URL(ALUMNI_GETTING_STARTED_PATH, request.url), request, nonce);
    }

    if (role === 'student' && token.isAlumni && pathname === '/dashboard/student/clarifications') {
      return redirectTo(new URL(ALUMNI_BROWSE_JOBS_PATH, request.url), request, nonce);
    }

    if (role === 'employer' && pathname === LEGACY_EMPLOYER_JOBS_PATH) {
      return redirectTo(new URL(EMPLOYER_ALUMNI_JOBS_PATH, request.url), request, nonce);
    }

    // Allow shared routes for all authenticated users
    const isShared = SHARED_DASHBOARD_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
    if (isShared) return passThrough(request, nonce);

    // Students (including alumni) use /dashboard/alumni for lateral job flows
    if (
      role === 'student' &&
      (pathname === '/dashboard/alumni' || pathname.startsWith('/dashboard/alumni/'))
    ) {
      return passThrough(request, nonce);
    }

    // Allow the role's own dashboard subtree
    if (ownedPrefix && (pathname === ownedPrefix || pathname.startsWith(ownedPrefix + '/'))) {
      if (role === 'placement_committee' && !isPlacementCommitteePathAllowed(pathname)) {
        return redirectTo(new URL('/dashboard/college/students', request.url), request, nonce);
      }
      return passThrough(request, nonce);
    }

    // Block cross-role access — redirect to the role's own home
    const dest = ROLE_HOME_PATHS[role] || '/dashboard';
    return redirectTo(new URL(dest, request.url), request, nonce);
  }

  // Public pages and other matched routes — security headers + CSP nonce only
  return passThrough(request, nonce);
}

export const config = {
  matcher: [
    /*
     * Apply CSP nonce + security headers to document/API routes.
     * Skip static assets and image optimizer (headers still set via next.config for /_next/static).
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
