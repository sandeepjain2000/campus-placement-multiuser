/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  AUTHENTICATION CRITICAL PATH — DO NOT WRAP WITH withApiHandlers   ║
 * ║                                                                     ║
 * ║  NextAuth responses (redirects, CSRF tokens, session JSON) are NOT  ║
 * ║  standard API responses. Wrapping them with error-logging middleware ║
 * ║  corrupts auth flows and causes the "double login" bug.             ║
 * ║                                                                     ║
 * ║  If you need error logging for auth, add it INSIDE authHandler      ║
 * ║  with a try/catch, not as an outer wrapper.                         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import { authOptions } from '@/lib/auth';
import { applySessionCookiePolicy } from '@/lib/sessionPolicy';
import NextAuth from 'next-auth';

const nextAuthHandler = NextAuth(authOptions);

async function handler(req, context) {
  const response = await nextAuthHandler(req, context);
  return applySessionCookiePolicy(response);
}

export { handler as GET, handler as POST };
