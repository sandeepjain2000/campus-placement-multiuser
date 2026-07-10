/**
 * Compare student CGPA to posting minimum (supports CGPA vs percentage scale mismatch).
 * @param {number | null | undefined} requiredMin
 * @param {number | null | undefined} studentCgpa
 * @returns {{ eligible: boolean, reason?: string }}
 */
export function evaluateCgpaEligibility(requiredMin, studentCgpa) {
  if (requiredMin == null || requiredMin === '') {
    return { eligible: true };
  }

  const reqCgpa = Number(requiredMin);
  const myCgpa = Number(studentCgpa);

  if (Number.isNaN(reqCgpa)) {
    return { eligible: true };
  }

  if (Number.isNaN(myCgpa)) {
    return {
      eligible: false,
      reason: 'Please update your CGPA in your profile to apply.',
    };
  }

  let isEligible = false;
  if (reqCgpa > 10 && myCgpa <= 10) {
    isEligible = myCgpa * 9.5 >= reqCgpa;
  } else if (reqCgpa <= 10 && myCgpa > 10) {
    isEligible = myCgpa >= reqCgpa * 9.5;
  } else {
    isEligible = myCgpa >= reqCgpa;
  }

  if (!isEligible) {
    return {
      eligible: false,
      reason: `Your CGPA (${myCgpa}) is below the minimum required (${reqCgpa}).`,
    };
  }

  return { eligible: true };
}
