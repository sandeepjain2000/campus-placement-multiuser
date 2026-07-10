/**
 * Campus–employer tie-up helpers safe for client bundles (no DB).
 */

export const EMPLOYER_TIE_UP_ACTIVE = 'approved';
export const EMPLOYER_TIE_UP_REVOKED = 'revoked';

/** When false, revoke buttons stay visible but cannot be used (college + employer UIs). */
export const TIE_UP_REVOKE_ENABLED = false;

export const TIE_UP_REVOKE_DISABLED_TITLE =
  'Tie-up cancellation is temporarily disabled. Contact your placement office if you need changes.';

/** SQL fragment: alias must be the employer_approvals table alias (e.g. ea). */
export function sqlEmployerTieUpIsActive(alias = 'ea') {
  return `${alias}.status = '${EMPLOYER_TIE_UP_ACTIVE}'`;
}

export function isEmployerTieUpActive(status) {
  return String(status || '').trim().toLowerCase() === EMPLOYER_TIE_UP_ACTIVE;
}

export function isEmployerTieUpRevoked(status) {
  const s = String(status || '').trim().toLowerCase();
  return s === EMPLOYER_TIE_UP_REVOKED || s === 'blacklisted';
}

/** UI / filters: legacy blacklisted → revoked */
export function displayEmployerTieUpStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'blacklisted') return EMPLOYER_TIE_UP_REVOKED;
  return s || 'pending';
}

export function canRequestEmployerTieUp(status) {
  const s = status == null || status === '' ? null : String(status).trim().toLowerCase();
  return s === null || s === 'rejected' || s === EMPLOYER_TIE_UP_REVOKED || s === 'blacklisted';
}

export function canReinstateEmployerTieUp(status) {
  return isEmployerTieUpRevoked(status);
}

export const TIE_UP_REVOKE_CONFIRM_REQUIRED = 'confirmed';

export const TIE_UP_REVOKE_MESSAGES = {
  collegeConfirmTitle: 'Revoke employer tie-up?',
  collegeConfirmBody: (employerName) =>
    `You are about to revoke the tie-up with ${employerName}.\n\n` +
    '• All new applications, clarifications, and employer access for this campus will be paused.\n' +
    '• Existing data is kept; nothing is deleted.\n' +
    '• The employer will be notified immediately.\n' +
    '• You can restore the tie-up later if this was a mistake.',
  employerConfirmTitle: 'Revoke campus tie-up?',
  employerConfirmBody: (collegeName) =>
    `You are about to revoke your tie-up with ${collegeName}.\n\n` +
    '• You will not see students from this campus, create postings for them, or receive new applications.\n' +
    '• Existing data is kept; nothing is deleted.\n' +
    '• The college will be notified immediately.\n' +
    '• You may request a new tie-up later, or the college can restore access.',
};
