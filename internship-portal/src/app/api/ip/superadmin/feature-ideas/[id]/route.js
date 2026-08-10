import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';
import { notifyUser } from '@/lib/ipNotify';

const ALLOWED = ['Pending approval', 'Under review', 'Planned', 'Shipped', 'Declined'];

export async function PATCH(request, { params }) {
  const { error } = await requireSession(['superadmin']);
  if (error) return error;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }
  const status = String(body.status || '');
  if (!ALLOWED.includes(status)) return jsonError(`status must be one of ${ALLOWED.join(', ')}`);

  const result = await query(
    `UPDATE ip_feature_ideas SET status = $2, updated_at = now() WHERE id = $1 RETURNING author_user_id, title`,
    [id, status],
  );
  const row = result.rows[0];
  if (!row) return jsonError('Not found', 404);
  if (row.author_user_id) {
    await notifyUser({ userId: row.author_user_id, title: `Your idea is now "${status}"`, body: row.title, link: '/ideas' });
  }
  return jsonOk({ ok: true });
}
