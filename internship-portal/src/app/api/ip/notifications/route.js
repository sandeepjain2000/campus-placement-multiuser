import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';

export async function GET() {
  const { session, error } = await requireSession(['candidate', 'employer', 'superadmin']);
  if (error) return error;
  const result = await query(
    `SELECT * FROM ip_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [session.user.id],
  );
  return jsonOk({ items: result.rows });
}

export async function PATCH(request) {
  const { session, error } = await requireSession(['candidate', 'employer', 'superadmin']);
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }
  if (body.markAllRead) {
    await query(`UPDATE ip_notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [session.user.id]);
    return jsonOk({ ok: true });
  }
  if (body.id) {
    await query(`UPDATE ip_notifications SET read_at = now() WHERE id = $1 AND user_id = $2`, [body.id, session.user.id]);
    return jsonOk({ ok: true });
  }
  return jsonError('id or markAllRead is required');
}
