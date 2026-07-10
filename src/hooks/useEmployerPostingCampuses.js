import { useMemo } from 'react';
import { campusesEligibleForPosting } from '@/lib/employerPostingCampusConstraints';

/**
 * Approved campuses eligible for a posting category (respects employer settings limits).
 * @param {object | null | undefined} campusData — /api/employer/campuses payload
 * @param {string} category — internship | projects | alumni_jobs | drives
 */
export function useEmployerPostingCampuses(campusData, category) {
  return useMemo(() => {
    const approved = (campusData?.colleges || []).filter(
      (c) => String(c.approval_status || '').toLowerCase() === 'approved',
    );
    return campusesEligibleForPosting(approved, campusData?.postingCampusConstraints, category);
  }, [campusData, category]);
}
