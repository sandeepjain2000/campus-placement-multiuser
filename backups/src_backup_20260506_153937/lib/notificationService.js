import { query } from '@/lib/db';

const MAX_TITLE = 250;

function clipTitle(s) {
  const t = String(s ?? '').trim();
  if (t.length <= MAX_TITLE) return t;
  return `${t.slice(0, MAX_TITLE - 1)}…`;
}

/**
 * Insert one notification row per college admin for a tenant (single INSERT … SELECT).
 * @param {import('pg').PoolClient | null} client — optional transaction client
 */
export async function notifyCollegeAdminsOfTenant(tenantId, { title, message, type = 'info', link = null }, client = null) {
  const q = client ? client.query.bind(client) : query;
  await q(
    `INSERT INTO notifications (user_id, title, message, type, link)
     SELECT id, $2, $3, $4, $5
     FROM users
     WHERE tenant_id = $1::uuid AND role = 'college_admin' AND is_active = true`,
    [tenantId, clipTitle(title), message, type, link],
  );
}

/** One row per active student on the tenant (e.g. new internship published). */
export async function notifyStudentsOfTenant(tenantId, { title, message, type = 'info', link = null }, client = null) {
  const q = client ? client.query.bind(client) : query;
  await q(
    `INSERT INTO notifications (user_id, title, message, type, link)
     SELECT id, $2, $3, $4, $5
     FROM users
     WHERE tenant_id = $1::uuid AND role = 'student' AND is_active = true`,
    [tenantId, clipTitle(title), message, type, link],
  );
}

/**
 * Optional: insert notifications one user at a time (smaller bursts; same outcome as batch).
 * Used when you want strict sequential DB writes per recipient.
 */
export async function notifyUsersOneAtATime(userIds, { title, message, type = 'info', link = null }, client = null) {
  const q = client ? client.query.bind(client) : query;
  const t = clipTitle(title);
  for (const userId of userIds) {
    await q(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
      [userId, t, message, type, link],
    );
  }
}

export async function fetchCollegeAdminUserIds(tenantId, client = null) {
  const q = client ? client.query.bind(client) : query;
  const r = await q(
    `SELECT id FROM users WHERE tenant_id = $1::uuid AND role = 'college_admin' AND is_active = true`,
    [tenantId],
  );
  return r.rows.map((row) => row.id);
}
