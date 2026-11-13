import { query } from '@/lib/db';
import { evaluateStudentProfileForBrowse } from '@/lib/studentProfileCompletion';
import { getStudentApplyGate, STUDENT_RESUME_REQUIRED_APPLY_MESSAGE } from '@/lib/studentApplyEligibility';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const STUDENT_BROWSE_PROFILE_MESSAGE =
  'Complete your academic profile (roll number, phone, branch, course, and CGPA) before you can browse jobs, internships, projects, hackathons, and placement drives.';

/**
 * @param {{ profileComplete: boolean, hasResume: boolean, profileMissingLabels?: string[] }} state
 */
export function buildStudentBrowseGateCopy({ profileComplete, hasResume, profileMissingLabels = [] }) {
  const needsProfile = !profileComplete;
  const needsCv = !hasResume;
  const missing = (Array.isArray(profileMissingLabels) ? profileMissingLabels : []).filter(Boolean);

  if (needsProfile && needsCv) {
    const profileHint =
      missing.length === 1
        ? `Add your ${missing[0].toLowerCase()} in Profile and upload your primary CV`
        : missing.length > 1
          ? `Complete your profile (add ${missing.join(', ')}) and upload your primary CV`
          : 'Finish your academic profile and upload your primary CV';
    return {
      browseGateTitle: 'Complete your profile and upload your CV',
      browseGateMessage: `${profileHint} before campus listings (including projects and hackathons) can appear.`,
    };
  }
  if (needsProfile) {
    const browseGateMessage =
      missing.length === 1
        ? `Please add your ${missing[0].toLowerCase()} in Profile before you can browse projects, hackathons, and other campus listings.`
        : missing.length > 1
          ? `Please complete your profile in Profile — add ${missing.join(', ')} — before you can browse projects, hackathons, and other campus listings.`
          : STUDENT_BROWSE_PROFILE_MESSAGE;
    return {
      browseGateTitle: 'Complete your profile to browse opportunities',
      browseGateMessage,
    };
  }
  if (needsCv) {
    return {
      browseGateTitle: 'Upload your CV to browse opportunities',
      browseGateMessage: STUDENT_RESUME_REQUIRED_APPLY_MESSAGE,
    };
  }
  return { browseGateTitle: null, browseGateMessage: null };
}

/**
 * Students must have a complete profile and primary CV before browse lists are shown.
 * @param {string | null} studentId
 * @param {string | null} tenantId
 */
export async function getStudentBrowseGate(studentId, tenantId = null) {
  const applyGate = studentId
    ? await getStudentApplyGate(studentId, tenantId)
    : {
        hasResume: false,
        placementLocked: false,
        canApply: false,
        applyBlockedReason: STUDENT_RESUME_REQUIRED_APPLY_MESSAGE,
      };

  let profileEval = { profileComplete: false, missingLabels: ['Profile'] };
  if (studentId) {
    let profileRes;
    try {
      profileRes = await query(
        `SELECT sp.roll_number, sp.branch, sp.department, sp.cgpa,
                u.phone AS user_phone
         FROM student_profiles sp
         INNER JOIN users u ON u.id = sp.user_id
         WHERE sp.id = $1::uuid AND ${SP_ACTIVE_CLAUSE}
         LIMIT 1`,
        [studentId],
      );
    } catch (e) {
      if (e?.code !== '42703') throw e;
      profileRes = await query(
        `SELECT sp.roll_number, sp.branch, sp.department, sp.cgpa,
                u.phone AS user_phone
         FROM student_profiles sp
         INNER JOIN users u ON u.id = sp.user_id
         WHERE sp.id = $1::uuid
         LIMIT 1`,
        [studentId],
      );
    }
    profileEval = evaluateStudentProfileForBrowse(profileRes.rows[0]);
  }

  const hasResume = applyGate.hasResume;
  const profileComplete = profileEval.profileComplete;
  const canBrowseListings = profileComplete && hasResume;
  const copy = buildStudentBrowseGateCopy({
    profileComplete,
    hasResume,
    profileMissingLabels: profileEval.missingLabels,
  });

  return {
    canBrowseListings,
    profileComplete,
    hasResume,
    profileMissingLabels: profileEval.missingLabels,
    browseGateTitle: copy.browseGateTitle,
    browseGateMessage: copy.browseGateMessage,
    placementLocked: applyGate.placementLocked,
    canApply: applyGate.canApply,
    applyBlockedReason: applyGate.applyBlockedReason,
  };
}
