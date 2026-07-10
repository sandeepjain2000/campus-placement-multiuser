import { query, transaction } from '@/lib/db';
import { DEMO_SCREEN_SQL_PARAMS } from '@/lib/demoScreenAllowlist';
import { IITM_TENANT_ID, IITM_TENANT_NAME, IITM_TENANT_SLUG } from '@/lib/iitmConstants';

export { IITM_TENANT_ID, IITM_TENANT_NAME, IITM_TENANT_SLUG };

const APPROVAL_UPSERT_SQL = `
  INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_at, created_at)
  VALUES ($1::uuid, $2::uuid, 'approved', NOW(), NOW())
  ON CONFLICT (tenant_id, employer_id) DO UPDATE SET
    status = 'approved',
    approved_at = COALESCE(employer_approvals.approved_at, NOW()),
    rejection_reason = NULL,
    approved_by = COALESCE(
      employer_approvals.approved_by,
      (SELECT id FROM users WHERE email = 'admin@iitm.edu' LIMIT 1)
    )
  RETURNING id, tenant_id, employer_id, status
`;

/**
 * Resolve IIT Madras tenant row (slug first, then fixed seed id, then name).
 * @param {import('pg').PoolClient} client
 */
export async function resolveIitmTenant(client) {
  const res = await client.query(
    `SELECT id, name, slug
     FROM tenants
     WHERE is_active = true
       AND type = 'college'
       AND (
         slug = $1
         OR id = $2::uuid
         OR name ILIKE $3
       )
     ORDER BY CASE
       WHEN slug = $1 THEN 0
       WHEN id = $2::uuid THEN 1
       ELSE 2
     END
     LIMIT 1`,
    [IITM_TENANT_SLUG, IITM_TENANT_ID, `%${IITM_TENANT_NAME}%`],
  );
  return res.rows[0] || null;
}

/**
 * Ensure one employer has an approved tie-up with IIT Madras.
 * @param {import('pg').PoolClient} client
 * @param {string} employerId
 */
export async function ensureIitmTieUpForEmployer(client, employerId) {
  const tenant = await resolveIitmTenant(client);
  if (!tenant) {
    return { ok: false, error: `${IITM_TENANT_NAME} tenant not found` };
  }

  const emp = await client.query(
    `SELECT id, company_name FROM employer_profiles WHERE id = $1::uuid LIMIT 1`,
    [employerId],
  );
  if (!emp.rows.length) {
    return { ok: false, error: 'Employer not found' };
  }

  const row = (
    await client.query(APPROVAL_UPSERT_SQL, [tenant.id, employerId])
  ).rows[0];

  return {
    ok: true,
    approvalId: row.id,
    employerId,
    companyName: emp.rows[0].company_name,
    collegeId: tenant.id,
    college: tenant.name,
    status: row.status,
  };
}

/**
 * Approve IIT Madras tie-up for login-screen demo employers only.
 * @param {import('pg').PoolClient} client
 */
export async function ensureIitmTieUpForDemoScreenEmployers(client) {
  const tenant = await resolveIitmTenant(client);
  if (!tenant) {
    return { ok: false, error: `${IITM_TENANT_NAME} tenant not found`, results: [] };
  }

  const employers = await client.query(
    `SELECT ep.id, ep.company_name
     FROM employer_profiles ep
     JOIN users u ON u.id = ep.user_id
     WHERE LOWER(u.email) = ANY($1::text[])
     ORDER BY ep.company_name`,
    [DEMO_SCREEN_SQL_PARAMS.employerEmails],
  );

  const results = [];
  for (const emp of employers.rows) {
    const row = (await client.query(APPROVAL_UPSERT_SQL, [tenant.id, emp.id])).rows[0];
    results.push({
      ok: true,
      approvalId: row.id,
      employerId: emp.id,
      companyName: emp.company_name,
      collegeId: tenant.id,
      college: tenant.name,
      status: row.status,
    });
  }

  return {
    ok: true,
    collegeId: tenant.id,
    college: tenant.name,
    ensured: results.length,
    results,
  };
}

/**
 * Approve IIT Madras tie-up for every employer profile.
 * @param {import('pg').PoolClient} client
 */
export async function ensureIitmTieUpForAllEmployers(client) {
  const tenant = await resolveIitmTenant(client);
  if (!tenant) {
    return { ok: false, error: `${IITM_TENANT_NAME} tenant not found`, results: [] };
  }

  const employers = await client.query(
    `SELECT ep.id, ep.company_name FROM employer_profiles ep ORDER BY ep.company_name`,
  );

  const results = [];
  for (const emp of employers.rows) {
    const row = (
      await client.query(APPROVAL_UPSERT_SQL, [tenant.id, emp.id])
    ).rows[0];
    results.push({
      ok: true,
      approvalId: row.id,
      employerId: emp.id,
      companyName: emp.company_name,
      collegeId: tenant.id,
      college: tenant.name,
      status: row.status,
    });
  }

  return {
    ok: true,
    collegeId: tenant.id,
    college: tenant.name,
    ensured: results.length,
    results,
  };
}

/** Demo data API entry: ensure IIT Madras for one employer or all. */
export async function ensureDemoIitmTieUps(options = {}) {
  const employerId = options.employerId ? String(options.employerId).trim() : null;

  return transaction(async (client) => {
    if (employerId) {
      const result = await ensureIitmTieUpForEmployer(client, employerId);
      return {
        action: 'ensure-iitm-tieup',
        ...result,
        results: result.ok ? [result] : [],
      };
    }
    return {
      action: 'ensure-iitm-tieup',
      ...(await ensureIitmTieUpForDemoScreenEmployers(client)),
    };
  });
}

/** Best-effort IIT Madras tie-up outside an existing transaction. */
export async function ensureIitmTieUpForEmployerId(employerId) {
  return transaction((client) => ensureIitmTieUpForEmployer(client, employerId));
}

/** Count employers missing an approved IIT Madras tie-up. */
export async function countMissingIitmTieUps() {
  const res = await query(
    `SELECT COUNT(*)::int AS missing
     FROM employer_profiles ep
     WHERE NOT EXISTS (
       SELECT 1
       FROM employer_approvals ea
       JOIN tenants t ON t.id = ea.tenant_id
       WHERE ea.employer_id = ep.id
         AND ea.status = 'approved'
         AND (
           t.slug = $1
           OR t.id = $2::uuid
           OR t.name ILIKE $3
         )
     )`,
    [IITM_TENANT_SLUG, IITM_TENANT_ID, `%${IITM_TENANT_NAME}%`],
  );
  return res.rows[0]?.missing ?? 0;
}
