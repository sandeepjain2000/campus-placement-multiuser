/**
 * Campus–employer tie-up lifecycle: active partnership, revocation (on hold), reinstate.
 * No rows are deleted; only status and audit columns change.
 */

import { query } from '@/lib/db';
import {
  EMPLOYER_TIE_UP_ACTIVE,
  EMPLOYER_TIE_UP_REVOKED,
  TIE_UP_REVOKE_CONFIRM_REQUIRED,
  TIE_UP_REVOKE_MESSAGES,
  canReinstateEmployerTieUp,
  canRequestEmployerTieUp,
  displayEmployerTieUpStatus,
  isEmployerTieUpActive,
  isEmployerTieUpRevoked,
  sqlEmployerTieUpIsActive,
} from '@/lib/employerTieUpShared';
import {
  fetchCollegeAdminUserIds,
  notifyUsersOneAtATime,
} from '@/lib/notificationService';

export {
  EMPLOYER_TIE_UP_ACTIVE,
  EMPLOYER_TIE_UP_REVOKED,
  TIE_UP_REVOKE_CONFIRM_REQUIRED,
  TIE_UP_REVOKE_MESSAGES,
  canReinstateEmployerTieUp,
  canRequestEmployerTieUp,
  displayEmployerTieUpStatus,
  isEmployerTieUpActive,
  isEmployerTieUpRevoked,
  sqlEmployerTieUpIsActive,
};

export async function fetchEmployerUserId(employerId, client = null) {
  const q = client ? client.query.bind(client) : query;
  const r = await q(
    `SELECT user_id FROM employer_profiles WHERE id = $1::uuid LIMIT 1`,
    [employerId],
  );
  return r.rows[0]?.user_id || null;
}

export async function getEmployerTieUpRecord(tenantId, employerId, client = null) {
  const q = client ? client.query.bind(client) : query;
  const r = await q(
    `SELECT id, status, status_before_revoke, rejection_reason, approved_at, revoked_at, revoked_by_role
     FROM employer_approvals
     WHERE tenant_id = $1::uuid AND employer_id = $2::uuid
     LIMIT 1`,
    [tenantId, employerId],
  );
  return r.rows[0] || null;
}

export async function assertActiveEmployerTieUp(tenantId, employerId, client = null) {
  const row = await getEmployerTieUpRecord(tenantId, employerId, client);
  if (!row) {
    return { ok: false, error: 'No campus partnership exists for this employer.', code: 'no_tie_up' };
  }
  if (isEmployerTieUpRevoked(row.status)) {
    return {
      ok: false,
      error:
        'The campus–employer tie-up has been revoked. New applications and contact are paused until the partnership is restored.',
      code: 'tie_up_revoked',
    };
  }
  if (!isEmployerTieUpActive(row.status)) {
    return {
      ok: false,
      error: 'This employer is not approved for your campus.',
      code: 'tie_up_not_active',
    };
  }
  return { ok: true, record: row };
}

/**
 * Resolve employer id by company name on a tenant (clarifications).
 * @returns {Promise<string|null>}
 */
export async function resolveEmployerIdByCompanyName(tenantId, companyName, client = null) {
  const name = String(companyName || '').trim();
  if (!name) return null;
  const q = client ? client.query.bind(client) : query;
  const r = await q(
    `SELECT ep.id
     FROM employer_profiles ep
     INNER JOIN employer_approvals ea
       ON ea.employer_id = ep.id AND ea.tenant_id = $1::uuid
     WHERE lower(trim(ep.company_name)) = lower(trim($2))
     LIMIT 1`,
    [tenantId, name],
  );
  return r.rows[0]?.id || null;
}

export async function revokeEmployerTieUp({
  tenantId,
  employerId,
  revokedByUserId,
  revokedByRole,
  reason = null,
  notify = true,
}) {
  const existing = await getEmployerTieUpRecord(tenantId, employerId);
  if (!existing) {
    return { ok: false, error: 'No partnership record found', status: 404 };
  }
  if (!isEmployerTieUpActive(existing.status)) {
    return {
      ok: false,
      error: 'Only an active (approved) tie-up can be revoked.',
      status: 409,
    };
  }

  const defaultReason =
    revokedByRole === 'college_admin'
      ? 'Campus tie-up revoked by college'
      : 'Campus tie-up revoked by employer';

  const result = await query(
    `UPDATE employer_approvals
     SET status_before_revoke = status,
         status = $4,
         revoked_at = NOW(),
         revoked_by = $5::uuid,
         revoked_by_role = $6,
         rejection_reason = COALESCE($7, $8)
     WHERE tenant_id = $1::uuid AND employer_id = $2::uuid AND status = $3
     RETURNING id, status, status_before_revoke`,
    [
      tenantId,
      employerId,
      EMPLOYER_TIE_UP_ACTIVE,
      EMPLOYER_TIE_UP_REVOKED,
      revokedByUserId,
      revokedByRole,
      reason,
      defaultReason,
    ],
  );

  if (result.rowCount === 0) {
    return { ok: false, error: 'Tie-up is no longer active', status: 409 };
  }

  if (notify) {
    const [collegeRow, employerRow, employerUserId] = await Promise.all([
      query(`SELECT name FROM tenants WHERE id = $1::uuid`, [tenantId]),
      query(`SELECT company_name FROM employer_profiles WHERE id = $1::uuid`, [employerId]),
      fetchEmployerUserId(employerId),
    ]);
    const collegeName = collegeRow.rows[0]?.name || 'the campus';
    const companyName = employerRow.rows[0]?.company_name || 'An employer';
    const reasonText = reason || defaultReason;

    if (revokedByRole === 'college_admin') {
      if (employerUserId) {
        await notifyUsersOneAtATime([employerUserId], {
          title: `Tie-up revoked — ${collegeName}`,
          message: `${collegeName} has revoked the campus tie-up. All new applications and campus access are on hold until the partnership is restored. Reason: ${reasonText}`,
          type: 'warning',
          link: '/dashboard/employer/select-campus',
        });
      }
    } else if (revokedByRole === 'employer') {
      const adminIds = await fetchCollegeAdminUserIds(tenantId);
      await notifyUsersOneAtATime(adminIds, {
        title: `Tie-up revoked — ${companyName}`,
        message: `${companyName} has revoked the campus tie-up. Student applications and employer access for this partnership are on hold. Reason: ${reasonText}`,
        type: 'warning',
        link: '/dashboard/college/employers',
      });
    }
  }

  return { ok: true, row: result.rows[0] };
}

export async function reinstateEmployerTieUp({ tenantId, employerId, reinstatedByUserId, notify = true }) {
  const existing = await getEmployerTieUpRecord(tenantId, employerId);
  if (!existing) {
    return { ok: false, error: 'No partnership record found', status: 404 };
  }
  if (!canReinstateEmployerTieUp(existing.status)) {
    return { ok: false, error: 'This tie-up is not in a revoked state.', status: 409 };
  }

  const result = await query(
    `UPDATE employer_approvals
     SET status = $4,
         status_before_revoke = NULL,
         revoked_at = NULL,
         revoked_by = NULL,
         revoked_by_role = NULL,
         rejection_reason = NULL,
         approved_by = COALESCE(approved_by, $5::uuid),
         approved_at = COALESCE(approved_at, NOW())
     WHERE tenant_id = $1::uuid AND employer_id = $2::uuid
       AND status IN ('revoked', 'blacklisted')
     RETURNING id, status`,
    [tenantId, employerId, EMPLOYER_TIE_UP_ACTIVE, reinstatedByUserId],
  );

  if (result.rowCount === 0) {
    return { ok: false, error: 'Could not restore tie-up', status: 409 };
  }

  if (notify) {
    const [collegeRow, employerRow, employerUserId] = await Promise.all([
      query(`SELECT name FROM tenants WHERE id = $1::uuid`, [tenantId]),
      query(`SELECT company_name FROM employer_profiles WHERE id = $1::uuid`, [employerId]),
      fetchEmployerUserId(employerId),
    ]);
    const collegeName = collegeRow.rows[0]?.name || 'the campus';
    const companyName = employerRow.rows[0]?.company_name || 'An employer';

    const adminIds = await fetchCollegeAdminUserIds(tenantId);
    await notifyUsersOneAtATime(adminIds, {
      title: `Tie-up restored — ${companyName}`,
      message: `The campus tie-up with ${companyName} has been restored. Employer access and student applications may resume.`,
      type: 'success',
      link: '/dashboard/college/employers',
    });
    if (employerUserId) {
      await notifyUsersOneAtATime([employerUserId], {
        title: `Tie-up restored — ${collegeName}`,
        message: `Your tie-up with ${collegeName} has been restored. You can resume campus recruiting activity.`,
        type: 'success',
        link: '/dashboard/employer/select-campus',
      });
    }
  }

  return { ok: true, row: result.rows[0] };
}
