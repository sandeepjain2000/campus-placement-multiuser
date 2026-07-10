/**
 * Shared create/edit validation for employer job, internship, and project postings.
 */

import { validateEmployerJobPayload } from '@/lib/apiInputValidation';
import { resolveEmployerMinCgpaForSubmit } from '@/lib/employerJobDisplay';

/**
 * @param {{ salaryMin: unknown, salaryMax: unknown, minCgpa: unknown, vacancies: unknown, jobType: string }} fields
 * @returns {{ error: string | null, minCgpa: number | null }}
 */
export function validateAndResolveEmployerJobSubmit(fields) {
  const jobErr = validateEmployerJobPayload(fields);
  if (jobErr) return { error: jobErr, minCgpa: null };

  const minCgpaResolved = resolveEmployerMinCgpaForSubmit(fields.minCgpa);
  if (minCgpaResolved.error) return { error: minCgpaResolved.error, minCgpa: null };

  return { error: null, minCgpa: minCgpaResolved.value };
}
