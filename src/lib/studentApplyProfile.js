import { query } from '@/lib/db';
import { getApplyBlockReason } from '@/lib/getApplyBlockReason';
import {
  resolveStudentEligibilityGroupCode,
  resolveStudentEligibilityGroupName,
} from '@/lib/academicTaxonomy/mapProgram';
import {
  getStudentPlacementApplyLock,
  getStudentResumeApplyState,
} from '@/lib/studentApplyEligibility';
import { getStudentCampusCvVerificationGate } from '@/lib/studentCv';

async function queryStudentProfileRow(studentId) {
  try {
    return await query(
      `SELECT cgpa, branch, department, batch_year, backlogs_active, placement_status, tenant_id, aux_profile
       FROM student_profiles WHERE id = $1::uuid LIMIT 1`,
      [studentId],
    );
  } catch (e) {
    if (e?.code !== '42703') throw e;
    try {
      return await query(
        `SELECT cgpa, branch, department, batch_year, backlogs_active, placement_status, tenant_id
         FROM student_profiles WHERE id = $1::uuid LIMIT 1`,
        [studentId],
      );
    } catch (e2) {
      if (e2?.code !== '42703') throw e2;
      return query(
        `SELECT cgpa, branch, department, batch_year, placement_status, tenant_id
         FROM student_profiles WHERE id = $1::uuid LIMIT 1`,
        [studentId],
      );
    }
  }
}

/**
 * Load student fields needed for posting eligibility checks.
 * @param {string} studentId
 * @param {string | null} [tenantId]
 */
export async function loadStudentApplyProfile(studentId, tenantId = null) {
  if (!studentId) {
    return {
      cgpa: null,
      branch: '',
      department: '',
      batchYear: null,
      backlogsActive: 0,
      hasResume: false,
      isPlacementLocked: false,
      cvVerificationRequired: false,
      hasVerifiedCv: true,
      eligibilityGroupCode: null,
      eligibilityGroupName: null,
    };
  }

  const [profileRes, resumeState, placementLock, cvVerificationGate] = await Promise.all([
    queryStudentProfileRow(studentId),
    getStudentResumeApplyState(studentId),
    getStudentPlacementApplyLock(studentId, tenantId),
    getStudentCampusCvVerificationGate(studentId, tenantId),
  ]);

  const row = profileRes.rows[0] || {};
  const cgpaRaw = row.cgpa;
  const cgpa =
    cgpaRaw != null && cgpaRaw !== '' && !Number.isNaN(Number(cgpaRaw)) ? Number(cgpaRaw) : null;
  const aux =
    row.aux_profile && typeof row.aux_profile === 'object' && !Array.isArray(row.aux_profile)
      ? row.aux_profile
      : {};

  return {
    cgpa,
    branch: row.branch || '',
    department: row.department || '',
    batchYear: row.batch_year != null && row.batch_year !== '' ? Number(row.batch_year) : null,
    backlogsActive: Number(row.backlogs_active ?? 0),
    hasResume: resumeState.hasResume,
    isPlacementLocked: Boolean(placementLock.locked),
    cvVerificationRequired: Boolean(cvVerificationGate.required),
    hasVerifiedCv: Boolean(cvVerificationGate.hasVerifiedCv),
    eligibilityGroupCode: resolveStudentEligibilityGroupCode(aux),
    eligibilityGroupName: resolveStudentEligibilityGroupName(aux),
  };
}

/**
 * @param {import('@/lib/getApplyBlockReason').OpportunityLike | null | undefined} opportunity
 * @param {import('@/lib/getApplyBlockReason').StudentLike | null | undefined} student
 * @param {import('@/lib/getApplyBlockReason').ApplyBlockOptions} [options]
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function assertStudentMayApplyToPosting(opportunity, student, options = {}) {
  const reason = getApplyBlockReason(opportunity, student, options);
  if (reason) return { ok: false, error: reason };
  return { ok: true };
}
