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
