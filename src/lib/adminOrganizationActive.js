import { query as dbQuery } from './db';

/**
 * Super-admin activate / deactivate for employer accounts and college tenants.
 */

function getQueryExecutor(client) {
  if (typeof client === 'function') {
    return client;
  }
  if (client && typeof client.query === 'function') {
    return client.query.bind(client);
  }
  if (client && typeof client.default === 'function') {
    return client.default;
  }
  if (client && typeof client.default?.query === 'function') {
    return client.default.query.bind(client.default);
  }
  return dbQuery;
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 * @param {string} employerUserId
 * @param {boolean} active
 */
export async function setEmployerUserActive(client, employerUserId, active) {
  const q = getQueryExecutor(client);
  await q(
    `UPDATE users
     SET is_active = $2::boolean, updated_at = NOW()
     WHERE id = $1::uuid AND role = 'employer'`,
    [employerUserId, active],
  );
}

/**
 * When a college tenant is deactivated, college admins cannot sign in.
 * On reactivate, restore admins who were verified and not registration-rejected.
 *
 * @param {import('pg').PoolClient | { query: Function }} client
 * @param {string} tenantId
 * @param {boolean} active
 */
export async function syncCollegeAdminUsersActive(client, tenantId, active) {
  const q = getQueryExecutor(client);
  if (active) {
    await q(
      `UPDATE users
       SET is_active = true, updated_at = NOW()
       WHERE tenant_id = $1::uuid
         AND role = 'college_admin'
         AND email_verified_at IS NOT NULL
         AND registration_rejected_at IS NULL`,
      [tenantId],
    );
    return;
  }

  await q(
    `UPDATE users
     SET is_active = false, updated_at = NOW()
     WHERE tenant_id = $1::uuid AND role = 'college_admin'`,
    [tenantId],
  );
}

/**
 * Keep tenants.is_active aligned with college-admin login.
 * A college must not stay "Active" (or appear on employer campus lists) when
 * no college_admin can sign in — e.g. email-verified but still awaiting Super Admin approval.
 *
 * @param {import('pg').PoolClient | { query: Function } | typeof dbQuery} [client]
 * @returns {Promise<number>} rows updated
 */
export async function healCollegeTenantsWithoutActiveAdmin(client) {
  const q = getQueryExecutor(client);
  const result = await q(
    `UPDATE tenants t
     SET is_active = false, updated_at = NOW()
     WHERE t.type = 'college'
       AND t.is_active = true
       AND NOT EXISTS (
         SELECT 1
         FROM users u
         WHERE u.tenant_id = t.id
           AND u.role = 'college_admin'
           AND u.is_active = true
       )
     RETURNING t.id`,
  );
  return result?.rowCount || 0;
}
