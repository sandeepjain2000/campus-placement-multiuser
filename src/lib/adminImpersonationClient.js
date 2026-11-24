import { markBrowserSessionActive } from '@/lib/sessionPolicy';

/**
 * Start Super Admin proxy login. On success, hard-navigates to the tenant dashboard.
 * @param {{ type: 'college'|'employer', id: string }} input
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function startAdminImpersonation({ type, id }) {
  const res = await fetch('/api/admin/impersonate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, id }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, error: json?.error || 'Proxy login failed' };
  }
  markBrowserSessionActive();
  const dest = json.redirectTo || '/dashboard';
  window.location.assign(dest);
  return { ok: true };
}

/**
 * Exit proxy session and restore Super Admin. Hard-navigates to admin home.
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function stopAdminImpersonation() {
  const res = await fetch('/api/admin/impersonate/stop', { method: 'POST' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, error: json?.error || 'Unable to exit proxy session' };
  }
  markBrowserSessionActive();
  window.location.assign(json.redirectTo || '/dashboard/admin');
  return { ok: true };
}
