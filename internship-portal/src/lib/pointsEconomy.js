/**
 * Provisional economy rates (DOCX §20 exact rates TBD).
 * Used until product lock; keep in one place.
 */
export const POINTS_PER_FREE_POST_CREDIT = 50;
export const POINTS_PER_APPLICATION_BUCKET = 25;
export const APPLICATION_BUCKET_SIZE = 5;
/** Points charged per internship application when no free application credits remain. */
export const POINTS_PER_APPLICATION = Math.ceil(POINTS_PER_APPLICATION_BUCKET / APPLICATION_BUCKET_SIZE);
export const REFERRAL_POINTS = 25;
export const REFERRAL_EMPLOYER_CREDITS = 1;
export const REFERRAL_CANDIDATE_ALLOWANCE = 2;
export const LINKEDIN_PROMO_POINTS = 30;
export const LINKEDIN_PROMO_CREDITS = 1;

export function referrerRewardsForRole(role) {
  if (role === 'employer') {
    return { points: REFERRAL_POINTS, freePostCredits: REFERRAL_EMPLOYER_CREDITS, applicationAllowance: 0 };
  }
  return { points: REFERRAL_POINTS, freePostCredits: 0, applicationAllowance: REFERRAL_CANDIDATE_ALLOWANCE };
}
