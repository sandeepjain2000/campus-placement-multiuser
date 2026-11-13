import { dispatchTemplatedEmail } from '@/lib/email/emailService';
import { appOrigin } from '@/lib/email/appOrigin';
import { VerificationEmail } from '@/lib/email/templates/VerificationEmail';

/**
 * Build an absolute email-verification URL, or '' when origin is unknown.
 * @param {string} token
 * @param {string} [originOverride]
 */
export function buildVerificationLink(token, originOverride) {
  const base = String(originOverride || '').trim().replace(/\/$/, '') || appOrigin();
  if (!base || !token) return '';
  return `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * @param {{ to: string, firstName?: string, token: string, role: string, origin?: string }} opts
 */
export async function sendVerification(opts) {
  const { to, firstName, token, role, origin } = opts;
  const verifyLink = buildVerificationLink(token, origin);
  if (!verifyLink) {
    const err = new Error(
      'Cannot build email verification link (set NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, or VERCEL_URL).',
    );
    err.code = 'VERIFY_LINK_ORIGIN_MISSING';
    throw err;
  }
  const roleLine =
    role === 'student'
      ? 'After verification, you will be able to sign in and set up your placement profile.'
      : 'After verification, our team will review and approve your registration details.';

  return dispatchTemplatedEmail({
    template: VerificationEmail,
    props: {
      firstName: firstName || 'there',
      verifyLink,
      roleLine,
    },
    to,
    subject: 'Confirm your registration on PlacementHub',
    context: 'email_verification',
  });
}

/** @deprecated Use sendVerification */
export const sendSignupVerificationEmail = sendVerification;
