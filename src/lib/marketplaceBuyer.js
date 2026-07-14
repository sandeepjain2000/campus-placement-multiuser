import { query } from '@/lib/db';

/**
 * Resolve college tenant or employer profile for marketplace purchase.
 * @param {{ id?: string, role?: string, tenantId?: string }} user
 */
export async function resolveMarketplaceBuyer(user) {
  if (!user?.id || !user?.role) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  if (user.role === 'college_admin') {
    const tenantId = user.tenantId;
    if (!tenantId) {
      return { ok: false, status: 400, error: 'College tenant is missing on your account' };
    }
    const t = await query(`SELECT id, name FROM tenants WHERE id = $1::uuid AND type = 'college'`, [
      tenantId,
    ]);
    if (!t.rows.length) {
      return { ok: false, status: 404, error: 'College not found' };
    }
    return {
      ok: true,
      buyerRole: 'college_admin',
      tenantId,
      employerId: null,
      buyerOrgName: t.rows[0].name,
      userId: user.id,
    };
  }

  if (user.role === 'employer') {
    const emp = await query(
      `SELECT id, company_name FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`,
      [user.id],
    );
    if (!emp.rows.length) {
      return { ok: false, status: 404, error: 'Employer profile not found' };
    }
    return {
      ok: true,
      buyerRole: 'employer',
      tenantId: null,
      employerId: emp.rows[0].id,
      buyerOrgName: emp.rows[0].company_name,
      userId: user.id,
    };
  }

  return { ok: false, status: 403, error: 'Only colleges and employers can purchase marketplace services' };
}
