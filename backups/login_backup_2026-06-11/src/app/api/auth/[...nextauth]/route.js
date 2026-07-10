import { authOptions } from '@/lib/auth';
import { applySessionCookiePolicy } from '@/lib/sessionPolicy';
import NextAuth from 'next-auth';

const nextAuthHandler = NextAuth(authOptions);

async function handler(req, context) {
  const response = await nextAuthHandler(req, context);
  return applySessionCookiePolicy(response);
}

export { handler as GET, handler as POST };
