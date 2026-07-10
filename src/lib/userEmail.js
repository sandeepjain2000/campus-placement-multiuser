const ROLE_LABELS = {
  student: 'student',
  college_admin: 'college administrator',
  placement_committee: 'placement committee',
  super_admin: 'platform administrator',
};

export function normalizeUserEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function roleAccountLabel(role) {
  return ROLE_LABELS[role] || 'account';
}

/** Find any user by email (case-insensitive), with student roll when applicable. */
export async function findUserByEmail(client, email) {
  const normalized = normalizeUserEmail(email);
  if (!normalized) return null;

  const result = await client.query(
    `SELECT u.id, u.email, u.role, u.tenant_id, sp.roll_number
     FROM users u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE LOWER(TRIM(u.email)) = $1
     LIMIT 1`,
    [normalized]
  );
  return result.rows[0] || null;
}

/**
 * Reject if email is already on another user (any role).
 * @param {{ excludeUserId?: string, tenantId?: string }} options
 */
export async function assertEmailAvailable(client, email, options = {}) {
  const { excludeUserId, tenantId } = options;
  const existing = await findUserByEmail(client, email);
  if (!existing) return;

  if (excludeUserId && String(existing.id) === String(excludeUserId)) {
    return;
  }

  if (
    tenantId != null &&
    existing.tenant_id != null &&
    String(existing.tenant_id) !== String(tenantId)
  ) {
    const err = new Error('EMAIL_DIFFERENT_TENANT');
    err.existing = existing;
    throw err;
  }

  const err = new Error('EMAIL_EXISTS');
  err.existing = existing;
  throw err;
}

export function formatEmailInUseMessage(existing, { email } = {}) {
  const addr = email || existing?.email || 'This email';
  const label = roleAccountLabel(existing?.role);

  if (existing?.role === 'student' && existing?.roll_number) {
    return `${addr} is already registered to a student with Roll No "${existing.roll_number}" (including demo or seeded accounts). Sign in instead of registering again.`;
  }

  return `${addr} is already registered to a ${label} account. Sign in or use a different email.`;
}

export function formatEmailDifferentTenantMessage(email) {
  return `Email "${email}" is already registered under a different institution.`;
}
