import { IITM_TENANT_NAME, IITM_TENANT_SLUG } from '@/lib/iitmConstants';

/** True when a campus row is Indian Institute of Technology, Madras. */
export function isIitmCampus(campus) {
  const name = String(campus?.name || '').trim();
  const slug = String(campus?.slug || '').trim();
  return slug === IITM_TENANT_SLUG || name === IITM_TENANT_NAME || name.includes('Indian Institute of Technology, Madras');
}

/**
 * Build checkbox map for employer campus pickers.
 * @param {Array<{ id: string, name?: string, slug?: string }>} approvedCampuses
 * @param {string[] | null | undefined} savedTenantIds - when editing, restore saved selection
 */
export function buildDefaultTenantSelection(approvedCampuses, savedTenantIds = null) {
  const saved = Array.isArray(savedTenantIds)
    ? savedTenantIds.map((id) => String(id).trim()).filter(Boolean)
    : null;

  const sel = {};
  for (const campus of approvedCampuses || []) {
    if (saved?.length) {
      sel[campus.id] = saved.includes(String(campus.id));
    } else {
      sel[campus.id] = isIitmCampus(campus);
    }
  }

  if (!Object.values(sel).some(Boolean)) {
    const iitm = (approvedCampuses || []).find(isIitmCampus);
    if (iitm) sel[iitm.id] = true;
    else if (approvedCampuses?.[0]) sel[approvedCampuses[0].id] = true;
  }

  return sel;
}
