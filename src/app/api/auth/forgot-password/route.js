import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/mailer';

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

    try {
      await sendPasswordResetEmail({
        loginEmail: email.trim().toLowerCase(),
        firstName: user.first_name,
        resetLink,
        userId: user.id,
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
