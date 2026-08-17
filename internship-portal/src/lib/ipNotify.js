import { query } from '@/lib/db';
import { newId } from '@/lib/ids';
import { ensureIpNotificationCategorySchema } from '@/lib/ensureIpNotificationCategorySchema';

/**
 * Insert a notification for one ip_users row.
 * category: 'application' | 'referral' | 'system' (default)
 * Never throws — callers should fire-and-forget.
 */
export async function notifyUser({
  userId,
  title,
  body = '',
  link = '#',
  category = 'system',
  client,
}) {
  if (!userId || !title) return null;
  const id = newId('ip_notif');
  const cat = ['application', 'referral', 'system'].includes(category) ? category : 'system';
  const sql = `INSERT INTO ip_notifications (id, user_id, title, body, link, category) VALUES ($1,$2,$3,$4,$5,$6)`;
  const params = [id, userId, title, body, link, cat];
  try {
    if (!client) await ensureIpNotificationCategorySchema();
    if (client) await client.query(sql, params);
    else await query(sql, params);
  } catch (e) {
    // Retry without category if column missing on older deploys mid-rollout
    try {
      const fallback = `INSERT INTO ip_notifications (id, user_id, title, body, link) VALUES ($1,$2,$3,$4,$5)`;
      const fbParams = [id, userId, title, body, link];
      if (client) await client.query(fallback, fbParams);
      else await query(fallback, fbParams);
    } catch (e2) {
      console.error('[ipNotify]', e2.message || e.message);
    }
  }
  return id;
}

export async function notifyRole({ role, title, body = '', link = '#', category = 'system' }) {
  try {
    const users = await query(`SELECT id FROM ip_users WHERE role = $1 AND active = true`, [role]);
    await Promise.all(users.rows.map((u) => notifyUser({ userId: u.id, title, body, link, category })));
  } catch (e) {
    console.error('[ipNotify role]', e.message);
  }
}

export async function awardPoints({ userId, delta, reason, meta = {}, client }) {
  const runner = client || { query };
  await runner.query(`UPDATE ip_users SET points = points + $2 WHERE id = $1`, [userId, delta]);
  await runner.query(
    `INSERT INTO ip_points_ledger (id, user_id, delta, reason, meta) VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [newId('ip_pts'), userId, delta, reason, JSON.stringify(meta || {})],
  );
}
