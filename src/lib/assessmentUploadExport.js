import { fetchAssessmentRowsForView, pickRepresentativeAssessmentRows } from '@/lib/assessmentHiringView';
import { isAssessmentRoundKind } from '@/lib/assessmentRoundMap';
import {
  ASSESSMENT_UPLOAD_CSV_HEADERS,
  buildAssessmentUploadStarterCsv,
  defaultHiringResultCells,
} from '@/lib/assessmentUploadStarterCsv';
import { excludeWithdrawnStudents, getWithdrawnStudentProfileIdsForTarget } from '@/lib/applicationWithdrawal';
import { query } from '@/lib/db';
import { listTenantStudentsForAssessment, resolveCurrentAcademicYearLabel } from '@/lib/assessmentCampusStudents';
import {
  filterStudentsByAssessmentPostingEligibility,
  loadAssessmentPostingOpportunity,
} from '@/lib/assessmentExportEligibility';
import { loadAppliedStudentProfileIds } from '@/lib/assessmentApplicationStatus';
import { formatStudentSystemId } from '@/lib/studentSystemId';

async function buildAssessmentIndex(employerId, { tenantId, driveId, jobId }) {
  const rows = await fetchAssessmentRowsForView({ employerId, tenantId });
  const rep = pickRepresentativeAssessmentRows(rows);
  const map = new Map();
  for (const r of rep) {
    const matchesDrive = driveId && r.upload_drive_id === driveId;
    const matchesJob = jobId && r.upload_job_id === jobId;
    if (!matchesDrive && !matchesJob) continue;
    map.set(r.student_profile_id, r);
  }
  return map;
}

/**
 * Build import-ready CSV with all campus students for tenant + current academic year.
 * @param {string} employerId
 * @param {'internship' | 'jobs' | 'drive' | 'projects'} kind
 * @param {{ tenantId: string, driveId?: string | null, jobId?: string | null, academicYearLabel?: string | null }} context
 */
export async function buildAssessmentExportCsv(employerId, kind, context) {
  if (!isAssessmentRoundKind(kind)) {
    throw new Error('Invalid kind');
  }
  const tenantId = String(context?.tenantId || '').trim();
  if (!tenantId) throw new Error('tenantId is required for export');

  const defaultDriveId = String(context?.driveId || '').trim();
  const defaultJobId = String(context?.jobId || '').trim();
  if (kind === 'drive' && !defaultDriveId) {
    throw new Error('Select a placement drive before exporting the CSV template');
  }
  if (kind !== 'drive' && !defaultJobId) {
    throw new Error('Select a job posting before exporting the CSV template');
  }

  const academicYearLabel =
    context?.academicYearLabel !== undefined
      ? context.academicYearLabel
      : await resolveCurrentAcademicYearLabel(tenantId);

  const studentsAll = await listTenantStudentsForAssessment(tenantId, { academicYearLabel });
  const withdrawnIds = await getWithdrawnStudentProfileIdsForTarget(
    { query },
    { driveId: defaultDriveId || null, jobId: defaultJobId || null },
  );
  const afterWithdrawal = excludeWithdrawnStudents(studentsAll, withdrawnIds);

  const opportunity = await loadAssessmentPostingOpportunity(employerId, kind, {
    tenantId,
    driveId: defaultDriveId || null,
    jobId: defaultJobId || null,
  });
  const { students, excludedCount: eligibilityExcludedCount } =
    await filterStudentsByAssessmentPostingEligibility(
      afterWithdrawal,
      opportunity,
      tenantId,
      kind,
      { jobId: defaultJobId || null },
    );

  const assessmentIndex = await buildAssessmentIndex(employerId, {
    tenantId,
    driveId: defaultDriveId || null,
    jobId: defaultJobId || null,
  });
  const profileIds = students.map((s) => s.student_profile_id).filter(Boolean);
  const appliedProfileIds = await loadAppliedStudentProfileIds(profileIds, {
    driveId: defaultDriveId || null,
    jobId: defaultJobId || null,
  });

  const csvRows = students.map((row) => {
    const placementDriveId = kind === 'drive' ? defaultDriveId : defaultJobId;
    const jobId = kind !== 'drive' ? defaultJobId : '';
    const assessment = assessmentIndex.get(row.student_profile_id);
    const cells = defaultHiringResultCells(assessment, {
      hasApplied: appliedProfileIds.has(row.student_profile_id),
    });
    const systemIdVal = formatStudentSystemId(row.short_code, row.roll_number);
    return {
      system_id: systemIdVal,
      student_system_id: systemIdVal,
      college_roll_no: row.roll_number,
      placement_drive_id: placementDriveId,
      job_id: jobId,
      tenant_id: row.tenant_id || '',
      college_id: row.tenant_id || '',
      employer_id: employerId || '',
      candidate_name: String(assessment?.candidate_name || row.student_name || '').trim(),
      ...cells,
    };
  });

  return {
    csv: `\uFEFF${buildAssessmentUploadStarterCsv(csvRows)}`,
    rowCount: csvRows.length,
    headers: ASSESSMENT_UPLOAD_CSV_HEADERS,
    academicYearLabel,
    eligibilityExcludedCount,
  };
}
