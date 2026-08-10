import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { jsonError, jsonOk } from '@/lib/apiAuth';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError('Sign in required', 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (newPassword.length < 8) return jsonError('New password must be at least 8 characters');

  const result = await query(`SELECT id, password_hash FROM ip_users WHERE id = $1 LIMIT 1`, [session.user.id]);
  const user = result.rows[0];
  if (!user) return jsonError('User not found', 404);

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return jsonError('Current password is incorrect', 400);

  const hash = await bcrypt.hash(newPassword, 10);
  await query(`UPDATE ip_users SET password_hash = $2, updated_at = now() WHERE id = $1`, [user.id, hash]);

  return jsonOk({ ok: true });
}
