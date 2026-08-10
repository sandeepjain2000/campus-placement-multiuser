import { query } from '@/lib/db';
import { newId } from '@/lib/ids';

/** Insert a notification for one ip_users row. Never throws — callers should fire-and-forget. */
export async function notifyUser({ userId, title, body = '', link = '#', client }) {
  if (!userId || !title) return null;
  const id = newId('ip_notif');
  const sql = `INSERT INTO ip_notifications (id, user_id, title, body, link) VALUES ($1,$2,$3,$4,$5)`;
  const params = [id, userId, title, body, link];
  try {
    if (client) await client.query(sql, params);
    else await query(sql, params);
  } catch (e) {
    console.error('[ipNotify]', e.message);
  }
  return id;
}

export async function notifyRole({ role, title, body = '', link = '#' }) {
  try {
    const users = await query(`SELECT id FROM ip_users WHERE role = $1 AND active = true`, [role]);
    await Promise.all(users.rows.map((u) => notifyUser({ userId: u.id, title, body, link })));
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
