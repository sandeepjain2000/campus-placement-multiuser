/**
 * Production-safe student CV URLs.
 * Vercel may omit App Router routes whose path contains `cvs/` — use these paths in UI code.
 * Legacy `/api/student/cvs/*` URLs are rewritten in next.config.mjs for older clients.
 */

export const STUDENT_CV_LIST_PATH = '/api/student/cv-list';
export const STUDENT_MY_CVS_PATH = '/dashboard/student/my-cvs';

export async function fetchStudentCvList(query = '') {
  const suffix = query ? (query.startsWith('?') ? query : `?${query}`) : '';
  let res = await fetch(`${STUDENT_CV_LIST_PATH}${suffix}`);
  if (res.status === 404) {
    res = await fetch(`/api/student/cvs${suffix}`);
  }
  return res;
}

export function studentCvItemUrl(id) {
  return `/api/student/cv-item/${encodeURIComponent(id)}`;
}

export function studentCvViewUrl(id) {
  return `/api/student/cv-view/${encodeURIComponent(id)}`;
}

export function studentCvDownloadUrl(id) {
  return `${studentCvViewUrl(id)}?download=1`;
}

export function collegeStudentCvViewUrl(studentId, cvId) {
  return `/api/college/students/${encodeURIComponent(studentId)}/student-cv-view/${encodeURIComponent(cvId)}`;
}

export function collegeStudentCvDownloadUrl(studentId, cvId) {
  return `${collegeStudentCvViewUrl(studentId, cvId)}?download=1`;
}

export function appendCvDownloadParam(url) {
  if (!url) return '';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}download=1`;
}

export async function postStudentCvUpload(formData) {
  let res = await fetch('/api/student/cv-upload', { method: 'POST', body: formData });
  if (res.status === 404) {
    res = await fetch('/api/student/cvs/upload', { method: 'POST', body: formData });
  }
  return res;
}

export async function patchStudentCv(id, body) {
  let res = await fetch(studentCvItemUrl(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 404) {
    res = await fetch(`/api/student/cvs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  return res;
}
