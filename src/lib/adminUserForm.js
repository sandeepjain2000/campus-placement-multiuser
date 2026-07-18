/** Editable platform roles for super-admin user management. */
export const ADMIN_USER_ROLES = Object.freeze([
  'super_admin',
  'college_admin',
  'placement_committee',
  'employer',
  'student',
]);

export const ADMIN_USER_ERRORS = Object.freeze({
  UNAUTHORIZED: 'You must be signed in as a platform admin to manage users.',
  NOT_FOUND: 'This user could not be found.',
  INVALID_ID: 'This user link is invalid.',
  LOAD_FAILED: 'We could not load this user right now. Please try again.',
  SAVE_FAILED: 'We could not save user changes. Please try again.',
  NAME_REQUIRED: 'First name is required.',
  INVALID_ROLE: 'Select a valid role.',
  INVALID_PHONE: 'Enter a valid phone number, or leave it blank.',
  CANNOT_DEACTIVATE_SELF: 'You cannot deactivate your own account.',
  CANNOT_CHANGE_OWN_ROLE: 'You cannot change your own role.',
  NETWORK: 'We could not reach the server. Check your connection and try again.',
});

/**
 * @param {{ firstName?: string; lastName?: string; phone?: string; role?: string; active?: boolean }} form
 */
export function validateAdminUserForm(form) {
  const firstName = String(form?.firstName || '').trim();
  if (!firstName) return { ok: false, error: ADMIN_USER_ERRORS.NAME_REQUIRED };

  const role = String(form?.role || '').trim();
  if (!ADMIN_USER_ROLES.includes(role)) return { ok: false, error: ADMIN_USER_ERRORS.INVALID_ROLE };

  const phone = String(form?.phone || '').trim();
  if (phone) {
    // Light check: allow digits, spaces, +, -, (); reject letters/emoji
    if (/[^\d\s+\-()]/.test(phone) || phone.replace(/\D/g, '').length < 7) {
      return { ok: false, error: ADMIN_USER_ERRORS.INVALID_PHONE };
    }
  }

  return { ok: true };
}

export function mapAdminUserRow(r) {
  return {
    id: String(r.id),
    firstName: r.first_name || '',
    lastName: r.last_name || '',
    name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email,
    email: r.email || '',
    phone: r.phone || '',
    role: r.role,
    active: Boolean(r.is_active),
    verified: Boolean(r.is_verified),
    lastLogin: r.last_login || null,
    createdAt: r.created_at || null,
  };
}
