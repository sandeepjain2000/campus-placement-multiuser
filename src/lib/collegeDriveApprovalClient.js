/**
 * Approve a placement drive; prompts when academic calendar clashes are detected.
 * @returns {{ ok: boolean, status?: string, error?: string }}
 */
export async function approveCollegeDriveWithClashCheck(driveId, { force = false } = {}) {
  const res = await fetch('/api/college/drives', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driveId, action: 'approve', force }),
  });
  const json = await res.json().catch(() => ({}));

  if (res.status === 409 && json.code === 'CALENDAR_CLASH' && !force) {
    const summary = json.summary || 'This drive clashes with a college exam, holiday, or imported blocked date.';
    const proceed = window.confirm(
      `${summary}\n\nApprove this drive anyway?`,
    );
    if (!proceed) {
      return { ok: false, error: 'Approval cancelled due to calendar clash.' };
    }
    return approveCollegeDriveWithClashCheck(driveId, { force: true });
  }

  if (!res.ok) {
    return { ok: false, error: json?.error || 'Failed to approve drive' };
  }

  return { ok: true, status: json.drive?.status || 'approved' };
}
