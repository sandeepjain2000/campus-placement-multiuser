/** Shared copy for college placement-drive reject confirmation. */

export const REJECT_DRIVE_CONFIRM_PHRASE = 'REJECT';

/**
 * @param {{ company?: string, role?: string, date?: string } | null | undefined} drive
 */
export function buildRejectDriveConfirmMessage(drive) {
  const company = String(drive?.company || 'this employer').trim() || 'this employer';
  const role = String(drive?.role || '').trim();
  const date = String(drive?.date || '').trim();
  const lines = [
    `You are about to reject the placement drive for ${company}.`,
    role ? `Role: ${role}` : null,
    date ? `Date: ${date}` : null,
    '',
    'This cannot be undone from this screen. The listing will move to Rejected, and Approve/Reject will no longer be available.',
    'The employer will need to submit a new drive request if this was a mistake.',
  ].filter((line) => line !== null);
  return lines.join('\n');
}
