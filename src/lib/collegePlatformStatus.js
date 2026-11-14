/**
 * College "on platform" status must not show Active when the college admin
 * cannot sign in (verified but still awaiting Super Admin approval, or deactivated).
 */

/**
 * @param {{ tenantActive: boolean, hasCollegeAdmin?: boolean, hasActiveCollegeAdmin: boolean, hasPendingCollegeAdmin?: boolean }} p
 * @returns {{ active: boolean, platformStatus: 'active' | 'pending_approval' | 'inactive', pendingAdminApproval: boolean }}
 */
export function resolveCollegePlatformStatus({
  tenantActive,
  hasCollegeAdmin = true,
  hasActiveCollegeAdmin,
  hasPendingCollegeAdmin = false,
}) {
  const tenantOn = Boolean(tenantActive);
  const activeAdmin = Boolean(hasActiveCollegeAdmin);
  const pendingAdmin = Boolean(hasPendingCollegeAdmin);

  // Login-capable: tenant on + at least one active college admin.
  if (tenantOn && activeAdmin) {
    return { active: true, platformStatus: 'active', pendingAdminApproval: false };
  }

  // Verified admin awaiting Super Admin approval (tenant may already be healed off).
  if (pendingAdmin) {
    return { active: false, platformStatus: 'pending_approval', pendingAdminApproval: true };
  }

  // Tenant still flagged on but no active admin (edge before heal / no pending row).
  if (tenantOn && hasCollegeAdmin && !activeAdmin) {
    return { active: false, platformStatus: 'pending_approval', pendingAdminApproval: true };
  }

  return { active: false, platformStatus: 'inactive', pendingAdminApproval: false };
}

export function collegePlatformStatusLabel(status) {
  if (status === 'active') return 'Active';
  if (status === 'pending_approval') return 'Pending approval';
  return 'Inactive';
}

export function collegePlatformStatusTone(status) {
  if (status === 'active') return 'green';
  if (status === 'pending_approval') return 'amber';
  return 'gray';
}
