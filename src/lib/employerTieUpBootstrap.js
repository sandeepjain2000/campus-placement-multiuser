import { transaction } from '@/lib/db';
import { DEMO_SCREEN_SQL_PARAMS } from '@/lib/demoScreenAllowlist';

const APPROVE_UPSERT_TAIL = `
ON CONFLICT (tenant_id, employer_id) DO UPDATE SET
  status = 'approved',
  approved_at = COALESCE(employer_approvals.approved_at, NOW()),
  rejection_reason = NULL,
  status_before_revoke = NULL,
  revoked_at = NULL,
  revoked_by = NULL,
  revoked_by_role = NULL,
  approved_by = COALESCE(
    employer_approvals.approved_by,
    (SELECT id FROM users WHERE email = 'admin@iitm.edu' LIMIT 1)
  )
`;

/**
 * Approve tie-ups for every active college × every employer (re-run safe).
 * @param {import('pg').PoolClient} client
 */
export async function ensureAllActiveCollegeEmployerTieUps(client) {
  const res = await client.query(
    `INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_at, created_at)
     SELECT t.id, ep.id, 'approved', NOW(), NOW()
     FROM tenants t
     CROSS JOIN employer_profiles ep
     WHERE t.is_active = true
       AND t.type = 'college'
     ${APPROVE_UPSERT_TAIL}
     RETURNING id`,
  );
  return { ensured: res.rowCount };
}

/**
 * Demo login colleges (IITM, NITT, BITS) × demo login employers (TechCorp, GlobalSoft, Infosys, Innovent, FinEdge).
 * @param {import('pg').PoolClient} client
 */
export async function ensureDemoScreenCollegeEmployerTieUps(client) {
  const { collegeSlugs, employerEmails } = DEMO_SCREEN_SQL_PARAMS;
  const res = await client.query(
    `INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_at, created_at)
     SELECT t.id, ep.id, 'approved', NOW(), NOW()
     FROM tenants t
     CROSS JOIN employer_profiles ep
     INNER JOIN users u ON u.id = ep.user_id
     WHERE t.is_active = true
       AND t.type = 'college'
       AND t.slug = ANY($1::text[])
       AND LOWER(u.email) = ANY($2::text[])
     ${APPROVE_UPSERT_TAIL}
     RETURNING id, tenant_id, employer_id`,
    [collegeSlugs, employerEmails],
  );
  return {
    colleges: collegeSlugs,
    employers: employerEmails,
    ensured: res.rowCount,
    pairs: res.rows,
  };
}

/**
 * @param {{ scope?: 'demo' | 'all' }} [options]
 */
export async function ensureEmployerTieUpBootstrap(options = {}) {
  const scope = options.scope === 'all' ? 'all' : 'demo';
  return transaction(async (client) => {
    if (scope === 'all') {
      const result = await ensureAllActiveCollegeEmployerTieUps(client);
      return {
        ok: true,
        action: 'ensure-all-tieups',
        scope: 'all',
        ...result,
      };
    }
    const result = await ensureDemoScreenCollegeEmployerTieUps(client);
    return {
      ok: true,
      action: 'ensure-all-tieups',
      scope: 'demo',
      ...result,
    };
  });
}
