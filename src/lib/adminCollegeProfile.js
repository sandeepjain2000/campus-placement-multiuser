/** Shared college profile helpers for super-admin screens. */

import { emptyInstitutionClassifications } from '@/lib/tenantInstitutionClassifications';

export function collegeToForm(c) {
  return {
    name: c?.name || '',
    city: c?.city || '',
    state: c?.state || '',
    pincode: c?.pincode || '',
    website: c?.website || '',
    email: c?.email || '',
    phone: c?.phone || '',
    naac: c?.naac || '',
    nirfRank: c?.nirfRank != null ? String(c.nirfRank) : '',
    active: c?.active !== false,
    institutionClassifications: {
      ...emptyInstitutionClassifications(),
      ...(c?.institutionClassifications || {}),
    },
  };
}

export function collegePlacementRate(students, placed) {
  const s = Number(students || 0);
  const p = Number(placed || 0);
  if (s <= 0) return 0;
  return Math.round((p / s) * 100);
}
