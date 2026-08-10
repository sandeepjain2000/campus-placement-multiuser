import { query } from '@/lib/db';
import { requireSession, jsonOk } from '@/lib/apiAuth';

export async function GET(request) {
  const { error } = await requireSession(['superadmin']);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const where = status ? `WHERE e.approval_status = $1` : '';
  const params = status ? [status] : [];
  const result = await query(
    `SELECT e.*, u.email as account_email
     FROM ip_employers e JOIN ip_users u ON u.id = e.user_id
     ${where} ORDER BY e.created_at DESC`,
    params,
  );
  return jsonOk({ items: result.rows });
}
