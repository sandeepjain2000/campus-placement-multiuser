import { query } from '@/lib/db';
import { sendInAppAlertYopCopy } from '@/lib/mailer';

const MAX_TITLE = 250;

function clipTitle(s) {
  const t = String(s ?? '').trim();
  if (t.length <= MAX_TITLE) return t;
  return `${t.slice(0, MAX_TITLE - 1)}…`;
}

/**
 * Send a YOPmail/demo inbox copy for an in-app alert. Never throws.
 * @param {{ title: string, message: string, type?: string, link?: string | null, audience?: string, recipientEmail?: string | null, userId?: string }} payload
 */
export async function mirrorInAppAlertToYopmail(payload) {
  try {
    await sendInAppAlertYopCopy(payload);
  } catch (e) {
    console.error('mirrorInAppAlertToYopmail failed:', e.message);
  }
}

/**
 * Insert one notification row per college admin for a tenant (single INSERT … SELECT).
 * @param {import('pg').PoolClient | null} client — optional transaction client
 */
export async function notifyCollegeAdminsOfTenant(tenantId, { title, message, type = 'info', link = null }, client = null) {
  const q = client ? client.query.bind(client) : query;
  const t = clipTitle(title);
  const result = await q(
    `INSERT INTO notifications (user_id, title, message, type, link)
     SELECT id, $2, $3, $4, $5
     FROM users
     WHERE tenant_id = $1::uuid AND role = 'college_admin' AND is_active = true`,
    [tenantId, t, message, type, link],
  );
  await mirrorInAppAlertToYopmail({
    title: t,
    message,
    type,
    link,
    audience: `${result.rowCount || 0} college admin(s)`,
  });
}

/** One row per active student on the tenant (e.g. new internship published). */
export async function notifyStudentsOfTenant(tenantId, { title, message, type = 'info', link = null }, client = null) {
  const q = client ? client.query.bind(client) : query;
  const t = clipTitle(title);
  const result = await q(
    `INSERT INTO notifications (user_id, title, message, type, link)
     SELECT id, $2, $3, $4, $5
     FROM users
     WHERE tenant_id = $1::uuid AND role = 'student' AND is_active = true`,
    [tenantId, t, message, type, link],
  );
  await mirrorInAppAlertToYopmail({
    title: t,
    message,
    type,
    link,
    audience: `${result.rowCount || 0} student(s)`,
  });
}

/** One row per active alumni student on the tenant (lateral job postings). */
export async function notifyAlumniStudentsOfTenant(tenantId, { title, message, type = 'info', link = null }, client = null) {
  const q = client ? client.query.bind(client) : query;
  const t = clipTitle(title);
  const result = await q(
    `INSERT INTO notifications (user_id, title, message, type, link)
     SELECT u.id, $2, $3, $4, $5
     FROM users u
     INNER JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.tenant_id = $1::uuid
       AND u.role = 'student'
       AND u.is_active = true
       AND sp.is_alumni = true`,
    [tenantId, t, message, type, link],
  );
  await mirrorInAppAlertToYopmail({
    title: t,
    message,
    type,
    link,
    audience: `${result.rowCount || 0} alumni student(s)`,
  });
}

/**
 * Optional: insert notifications one user at a time (smaller bursts; same outcome as batch).
 * Used when you want strict sequential DB writes per recipient.
 */
export async function notifyUsersOneAtATime(userIds, { title, message, type = 'info', link = null }, client = null) {
  const q = client ? client.query.bind(client) : query;
  const t = clipTitle(title);
  const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [];
  for (const userId of ids) {
    await q(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
      [userId, t, message, type, link],
    );
  }
  if (ids.length > 0) {
    await mirrorInAppAlertToYopmail({
      title: t,
      message,
      type,
      link,
      audience: ids.length === 1 ? '1 user' : `${ids.length} users`,
      userId: ids.length === 1 ? ids[0] : undefined,
    });
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
