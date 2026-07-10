import { ALUMNI_JOB_TYPES } from '@/lib/studentAlumni';

/**
 * Job type filters for Assessment uploads / update-online target dropdowns.
 * @typedef {'internship' | 'jobs' | 'drive' | 'projects'} AssessmentTargetKind
 */

const INTERNSHIP_TYPES = ['internship'];
const PROJECT_TYPES = ['short_project', 'hackathon'];
const NON_JOBS_TAB_TYPES = [...INTERNSHIP_TYPES, ...PROJECT_TYPES];

/**
 * SQL fragment + extra bind params for job_postings filtered by assessment tab.
 * @param {AssessmentTargetKind} kind
 * @param {{ alumniOnly?: boolean, paramIndex?: number }} [options]
 * @returns {{ clause: string, params: unknown[] }}
 */
export function jobTypesClauseForAssessmentKind(kind, options = {}) {
  const idx = Number(options.paramIndex) > 0 ? Number(options.paramIndex) : 3;
  const p = `$${idx}`;
  if (kind === 'internship') {
    return { clause: `AND jp.job_type = ${p}`, params: ['internship'] };
  }
  if (kind === 'projects') {
    return { clause: `AND jp.job_type = ANY(${p}::text[])`, params: [PROJECT_TYPES] };
  }
  if (kind === 'jobs') {
    if (options.alumniOnly) {
      return { clause: `AND jp.job_type = ANY(${p}::text[])`, params: [ALUMNI_JOB_TYPES] };
    }
    return {
      clause: `AND jp.job_type <> ALL(${p}::text[])`,
      params: [NON_JOBS_TAB_TYPES],
    };
  }
  return { clause: '', params: [] };
}
