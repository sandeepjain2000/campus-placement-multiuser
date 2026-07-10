import { query } from '@/lib/db';
import {
  assertCollegeStaff,
  isCollegeWriterRole,
  isPlacementCommitteeRole,
} from '@/lib/collegeAccess';
import { STUDENT_CV_VERIFICATION_REQUIRED_APPLY_MESSAGE } from '@/lib/studentApplyMessages';

/** @typedef {{ requireCvVerification: boolean, delegateCvVerificationToCommittee: boolean }} CollegeCvVerificationSettings */

/**
 * @param {string | null | undefined} tenantId
 * @returns {Promise<CollegeCvVerificationSettings>}
 */
export async function getCollegeCvVerificationSettings(tenantId) {
  if (!tenantId) {
    return { requireCvVerification: false, delegateCvVerificationToCommittee: false };
  }
  const res = await query(`SELECT settings FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
  const settings = res.rows[0]?.settings || {};
  return {
    requireCvVerification: Boolean(settings.requireCvVerification),
    delegateCvVerificationToCommittee: Boolean(settings.delegateCvVerificationToCommittee),
  };
}

/**
 * @param {{ user?: { role?: string } } | null | undefined} session
 * @param {CollegeCvVerificationSettings} settings
 */
export function canVerifyStudentCvs(session, settings) {
  const role = session?.user?.role;
  if (isCollegeWriterRole(role)) return true;
  if (isPlacementCommitteeRole(role) && settings.delegateCvVerificationToCommittee) return true;
  return false;
}

/**
 * @param {{ user?: { role?: string } } | null | undefined} session
 * @param {string | null | undefined} tenantId
 */
export async function assertCollegeCvVerifier(session, tenantId) {
  const staff = assertCollegeStaff(session);
  if (!staff.ok) return staff;

  const settings = await getCollegeCvVerificationSettings(tenantId);
  if (!canVerifyStudentCvs(session, settings)) {
    return {
      ok: false,
      status: 403,
      error: isPlacementCommitteeRole(session?.user?.role)
        ? 'CV verification is not delegated to the placement committee.'
        : 'You do not have permission to verify student CVs.',
    };
  }
  return { ok: true, settings };
}

/**
 * Merge campus CV verification into drives / internship apply gates.
 * @param {{ canApply: boolean, applyBlockedReason?: string | null }} applyGate
 * @param {{ required: boolean, hasVerifiedCv: boolean, applyBlockedReason?: string | null }} cvGate
 */
export function mergeCampusCvVerificationApplyGate(applyGate, cvGate) {
  if (!cvGate.required || applyGate.canApply === false) {
    return applyGate;
  }
  if (cvGate.hasVerifiedCv) {
    return applyGate;
  }
  return {
    ...applyGate,
    canApply: false,
    applyBlockedReason: cvGate.applyBlockedReason || STUDENT_CV_VERIFICATION_REQUIRED_APPLY_MESSAGE,
  };
}
