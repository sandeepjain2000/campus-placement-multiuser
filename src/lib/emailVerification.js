import { randomBytes } from 'crypto';
import { sendMail } from '@/lib/mailer';

function appOrigin() {
  const u = process.env.NEXTAUTH_URL;
  if (u) return u.replace(/\/$/, '');
  const v = process.env.VERCEL_URL;
  if (v) return (v.startsWith('http') ? v : `https://${v}`).replace(/\/$/, '');
  return '';
}

export function newEmailVerificationToken() {
  return randomBytes(32).toString('hex');
}

/**
 * @param {{ to: string, firstName: string, token: string, role: string }} opts
 */
export async function sendSignupVerificationEmail({ to, firstName, token, role }) {
  const base = appOrigin();
  const link = base ? `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}` : '';

  const roleLine =
    role === 'student'
      ? 'After verification, you will be able to sign in and set up your placement profile.'
      : 'After verification, our team will review and approve your registration details.';

  const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="background-color: #f8fafc; padding: 24px; border-bottom: 1px solid #f1f5f9; text-align: center;">
          <h2 style="margin: 0; color: #1e3a8a; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">Verify your registration</h2>
        </div>
        <div style="padding: 24px; line-height: 1.5;">
          <p style="margin-top: 0; font-size: 16px;">Hello ${firstName || 'there'},</p>
          <p style="font-size: 15px; color: #374151;">Thank you for starting your registration on PlacementHub. To complete the setup process and confirm your email address, please click the link below:</p>
          
          ${
            link
              ? `<div style="margin: 28px 0; text-align: center;">
                   <a href="${link}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Confirm Email Address</a>
                 </div>
                 <p style="font-size: 13px; color: #4b5563;">${roleLine}</p>
                 <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                   This link is valid for 48 hours. If the button above does not work, copy and paste this URL into your browser:
                   <br/>
                   <span style="word-break: break-all; color: #2563eb;">${link}</span>
                 </p>`
              : '<p style="color: #dc2626;"><strong>Note:</strong> Email verification link could not be built (missing NEXTAUTH_URL / VERCEL_URL). Please contact your administrator.</p>'
          }
          
          <div style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; line-height: 1.45;">
            This is an automated transactional message regarding your PlacementHub registration request. 
            If you did not request this, please disregard this email or contact support.
            <br/>
            © PlacementHub. All rights reserved.
          </div>
        </div>
      </div>
    `;

  await sendMail({
    to,
    subject: `Confirm your registration on PlacementHub`,
    text: `Hello ${firstName || 'there'},\n\nThank you for starting your registration on PlacementHub. To complete the setup process and confirm your email address, please visit the verification link below (expires in 48 hours):\n\n${link || '(link unavailable — set NEXTAUTH_URL)'}\n\n${roleLine}\n\nIf you did not initiate this request, you can safely ignore this email.\n\nBest regards,\nPlacementHub Team`,
    html,
    context: 'email_verification',
  });
}
