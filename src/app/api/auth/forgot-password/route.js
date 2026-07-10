import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';
import { sendMail } from '@/lib/mailer';

function appOrigin() {
  const u = process.env.NEXTAUTH_URL;
  if (u) return u.replace(/\/$/, '');
  const v = process.env.VERCEL_URL;
  if (v) return (v.startsWith('http') ? v : `https://${v}`).replace(/\/$/, '');
  return '';
}

async function __platform_POST(req) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const res = await query(
      `SELECT id, first_name FROM users
       WHERE lower(trim(email)) = lower(trim($1))
         AND is_active = true`,
      [email.trim().toLowerCase()],
    );
    if (res.rows.length === 0) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    const user = res.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const resetLink = `${appOrigin()}/reset-password?token=${token}`;
    
    const html = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f3f4f6; padding: 20px; border-bottom: 1px solid #e5e7eb;">
          <h2 style="margin: 0; color: #1f2937;">Password Reset Request</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hi ${user.first_name},</p>
          <p>We received a request to reset your PlacementHub password. Click the button below to choose a new password.</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; margin-bottom: 15px;">Reset Password</a>
          <p>This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      </div>
    `;

    try {
      await sendMail({
        to: email,
        subject: '[PlacementHub] Reset your password',
        text: `Hi ${user.first_name},\n\nClick the link below to reset your PlacementHub password:\n\n${resetLink}\n\nThis link will expire in 1 hour.`,
        html,
        context: 'password_reset',
        recipientUserId: user.id,
      });
    } catch (mailErr) {
      console.error('Forgot password mail error:', mailErr);
      if (!process.env.SMTP_USER && !process.env.SMTP_PASS && !process.env.EMAIL_FROM) {
        return NextResponse.json(
          {
            error: 'Email is not configured on this server. Contact your placement office for a password reset.',
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: 'Could not send reset email. Try again later or contact support.' },
        { status: 503 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    const msg = String(error?.message || '');
    if (error?.code === '42P01' && msg.includes('password_reset_tokens')) {
      return NextResponse.json(
        { error: 'Password reset is not available until database migrations are applied.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_auth_forgot_password' });
export const POST = __platformApiHandlers.POST;
