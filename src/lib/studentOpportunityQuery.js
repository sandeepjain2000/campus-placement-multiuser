import { JOB_POSTING_STUDENT_LISTED_SQL } from '@/lib/jobPostingPublishState';

/**
 * WHERE fragment for student-facing discovery (status is authoritative).
 * @param {string} [alias='jp']
 */
export function studentListedJobPostingSql(alias = 'jp') {
  const col = alias.includes('.') ? alias : `${alias}.status`;
  return `${col} = 'published'`;
}

export { JOB_POSTING_STUDENT_LISTED_SQL };
