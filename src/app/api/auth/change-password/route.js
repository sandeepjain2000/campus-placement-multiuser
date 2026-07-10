import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getPasswordValidationError } from '@/lib/validators';

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }
    const passwordErr = getPasswordValidationError(newPassword);
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 });
    }
    if (String(currentPassword) === String(newPassword)) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 });
    }

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1::uuid LIMIT 1', [userId]);
    const user = userRes.rows[0];
    if (!user?.password_hash) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const nextHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2::uuid', [nextHash, userId]);

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('POST /api/auth/change-password', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_auth_change_password' });
export const POST = __platformApiHandlers.POST;
