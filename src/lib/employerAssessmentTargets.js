/**
 * Load drive/job targets for Assessment uploads and Assessment update online.
 */

/** Keep prior selection when still valid; auto-pick when only one target exists. */
export function pickDefaultAssessmentTargetId(list, previousId) {
  const items = Array.isArray(list) ? list : [];
  if (previousId && items.some((t) => String(t.id) === String(previousId))) return String(previousId);
  if (items.length === 1) return String(items[0].id);
  return '';
}

/**
 * @param {string} tenantId
 * @param {'internship' | 'jobs' | 'drive' | 'projects'} kindTab
 * @returns {Promise<Array<{ id: string, label: string }>>}
 */
export async function fetchEmployerAssessmentTargets(tenantId, kindTab) {
  if (!tenantId) return [];

  const qs = new URLSearchParams({
    tenantId: String(tenantId),
    kind: String(kindTab),
  });
  const res = await fetch(`/api/employer/assessments/targets?${qs}`, { credentials: 'same-origin' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to load targets');
  return Array.isArray(json.targets) ? json.targets : [];
}

/** @param {string} tenantId */
export async function fetchEmployerAssessmentTargetCounts(tenantId) {
  const kinds = ['internship', 'jobs', 'drive', 'projects'];
  const entries = await Promise.all(
    kinds.map(async (kind) => {
      try {
        const targets = await fetchEmployerAssessmentTargets(tenantId, kind);
        return [kind, targets.length];
      } catch {
        return [kind, 0];
      }
    }),
  );
  return Object.fromEntries(entries);
}
