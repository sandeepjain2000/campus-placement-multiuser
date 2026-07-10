/**
 * Resolve employer active campus from session/local storage or first approved partnership.
 * Mirrors overview page behaviour so hub and inner pages stay consistent.
 */

/** Employer login is all-campuses; "Use campus" selection is disabled in the UI. */
export const EMPLOYER_USE_CAMPUS_DISABLED_TITLE =
  'Employer accounts include all approved campuses. Campus selection is not used.';

export function campusPayloadFromRow(campus) {
  if (!campus?.id) return null;
  return {
    id: campus.id,
    name: campus.name,
    slug: campus.slug,
    city: campus.city,
    state: campus.state,
  };
}

export function readStoredActiveCampus() {
  if (typeof window === 'undefined') return null;
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem('activeCampus');
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function persistActiveCampus(campus) {
  if (typeof window === 'undefined' || !campus?.id) return;
  const payload = JSON.stringify(campus);
  sessionStorage.setItem('activeCampus', payload);
  try {
    localStorage.setItem('activeCampus', payload);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event('placementhub-active-campus'));
  } catch {
    /* ignore */
  }
}

export function clearStoredActiveCampus() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('activeCampus');
  try {
    localStorage.removeItem('activeCampus');
  } catch {
    /* ignore */
  }
}

/** @returns {Promise<{ active: object | null, approvedCount: number }>} */
export async function resolveEmployerActiveCampus() {
  const stored = readStoredActiveCampus();
  if (stored?.id) {
    return { active: stored, approvedCount: 1 };
  }

  const res = await fetch('/api/employer/campuses', { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  const approved = Array.isArray(json?.colleges)
    ? json.colleges.filter((c) => String(c?.approval_status || '').toLowerCase() === 'approved')
    : [];

  if (approved.length >= 1) {
    const campus = campusPayloadFromRow(approved[0]);
    if (campus) {
      persistActiveCampus(campus);
      return { active: campus, approvedCount: approved.length };
    }
  }

  return { active: null, approvedCount: approved.length };
}
