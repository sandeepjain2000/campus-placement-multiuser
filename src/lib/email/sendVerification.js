import { dispatchTemplatedEmail } from '@/lib/email/emailService';
import { appOrigin } from '@/lib/email/appOrigin';
import { VerificationEmail } from '@/lib/email/templates/VerificationEmail';

/**
 * @param {{ to: string, firstName?: string, token: string, role: string }} opts
 */
export async function sendVerification(opts) {
  const { to, firstName, token, role } = opts;
  const base = appOrigin();
  const verifyLink = base ? `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}` : '';
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
