/**
 * Public share URLs for job/internship postings (external applicants & Q&A).
 */

export function publicJobPostPath(jobId) {
  const id = String(jobId || '').trim();
  return id ? `/jobs/${encodeURIComponent(id)}` : '';
}

export function publicJobQuestionsPath(jobId) {
  const id = String(jobId || '').trim();
  return id ? `/jobs/${encodeURIComponent(id)}/questions` : '';
}

export function publicJobPostUrl(jobId, origin) {
  const path = publicJobPostPath(jobId);
  if (!path) return '';
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return base ? `${base}${path}` : path;
}

export function publicJobQuestionsUrl(jobId, origin) {
  const path = publicJobQuestionsPath(jobId);
  if (!path) return '';
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return base ? `${base}${path}` : path;
}

/** Alumni clarifications screen with company pre-filter (signed-in campus users). */
export function clarificationsDeepPath(companyName) {
  const company = String(companyName || '').trim();
  if (!company) return '/dashboard/student/clarifications';
  return `/dashboard/student/clarifications?company=${encodeURIComponent(company)}`;
}

export function clarificationsDeepUrl(companyName, origin) {
  const path = clarificationsDeepPath(companyName);
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return base ? `${base}${path}` : path;
}
