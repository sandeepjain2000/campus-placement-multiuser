import { validateFieldOrError, FIELD_IDS } from '@/lib/inputConstraints';
import { validateAndResolveEmployerJobSubmit } from '@/lib/employerJobSubmitValidation';
import {
  resolveMaxBacklogsInput,
  validateInternshipBatchYearField,
  validateInternshipDateFields,
} from '@/lib/internshipPostingMeta';

/** Map API / server error strings to internship form field keys. */
export function mapEmployerInternshipApiError(error, field) {
  const msg = String(error || '').trim();
  if (!msg) return { fieldErrors: {}, formError: 'Save failed.' };

  const fieldKey = String(field || '').trim();
  if (fieldKey && fieldKey !== 'dates') {
    return { fieldErrors: { [fieldKey]: msg }, formError: msg };
  }

  const lower = msg.toLowerCase();

  if (lower.includes('start date') && lower.includes('end date')) {
    return {
      fieldErrors: {
        startDate: 'Internship start date is required.',
        endDate: 'Internship end date is required.',
      },
      formError: msg,
    };
  }
  if (lower.includes('start date')) return { fieldErrors: { startDate: msg }, formError: msg };
  if (lower.includes('end date') || lower.includes('after the start')) {
    return { fieldErrors: { endDate: msg }, formError: msg };
  }
  if (lower.includes('backlog')) return { fieldErrors: { maxBacklogs: msg }, formError: msg };
  if (lower.includes('batch year') || lower.includes('batch')) {
    return { fieldErrors: { batchYear: msg }, formError: msg };
  }
  if (lower.includes('cgpa')) return { fieldErrors: { minCgpa: msg }, formError: msg };
  if (lower.includes('campus') || lower.includes('tie-up') || lower.includes('tenant')) {
    return { fieldErrors: { _campuses: msg }, formError: msg };
  }
  if (lower.includes('title')) return { fieldErrors: { title: msg }, formError: msg };

  return { fieldErrors: {}, formError: msg };
}

/**
 * Client-side validation for employer internship create/edit.
 * @returns {{ fieldErrors: Record<string, string>, formError: string | null, minCgpa: number | null, maxBacklogs: number | null, batchYear: number | null }}
 */
export function validateEmployerInternshipForm({
  title,
  startDate,
  endDate,
  batchYear,
  maxBacklogs,
  minCgpa,
  stipend,
  stipendMax,
  vacancies,
  tenantIds,
  asDraft,
}) {
  const fieldErrors = {};

  const titleErr = validateFieldOrError(FIELD_IDS.COMMON_TITLE, title, { label: 'Internship title' });
  if (titleErr) fieldErrors.title = titleErr;

  const batchResolved = validateInternshipBatchYearField(batchYear, { required: !asDraft });
  Object.assign(fieldErrors, batchResolved.fieldErrors);

  if (!asDraft) {
    const dates = validateInternshipDateFields(startDate, endDate, { required: true });
    Object.assign(fieldErrors, dates.fieldErrors);

    if (!tenantIds?.length) {
      fieldErrors._campuses = 'Select at least one approved campus before publishing.';
    }
  }

  const backlogErr = validateFieldOrError(FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS, maxBacklogs, {
    label: 'Max active backlogs',
  });
  if (backlogErr) fieldErrors.maxBacklogs = backlogErr;

  const validated = validateAndResolveEmployerJobSubmit({
    salaryMin: stipend,
    salaryMax: stipendMax,
    minCgpa,
    vacancies,
    jobType: 'internship',
  });
  if (validated.error) {
    const lower = validated.error.toLowerCase();
    if (lower.includes('cgpa')) fieldErrors.minCgpa = validated.error;
    else if (lower.includes('stipend') || lower.includes('salary')) fieldErrors.stipend = validated.error;
    else if (lower.includes('vacanc') || lower.includes('opening')) fieldErrors.vacancies = validated.error;
    else fieldErrors._form = validated.error;
  }

  const formError =
    fieldErrors._form ||
    fieldErrors._campuses ||
    Object.values(fieldErrors).find(Boolean) ||
    null;

  return {
    fieldErrors,
    formError,
    minCgpa: validated.minCgpa,
    maxBacklogs: resolveMaxBacklogsInput(maxBacklogs === '' ? '0' : maxBacklogs),
    batchYear: batchResolved.value,
  };
}
