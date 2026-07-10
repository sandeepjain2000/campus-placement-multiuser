import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getPasswordValidationError } from '@/lib/validators';

async function __platform_POST(req) {
  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    const passwordErr = getPasswordValidationError(newPassword);
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 });
    }

    // Find the token
    const res = await query(
      'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = $1',
      [token]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    const { user_id, expires_at } = res.rows[0];

    // Check expiration
    if (new Date() > new Date(expires_at)) {
      await query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
      return NextResponse.json({ error: 'Reset token has expired. Please request a new one.' }, { status: 400 });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, user_id]);

    // Delete token
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user_id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_auth_reset_password' });
export const POST = __platformApiHandlers.POST;
