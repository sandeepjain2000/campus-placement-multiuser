/** Demo / seed resume URLs that must not override a real student upload. */
const DEMO_RESUME_URL_MARKERS = [
  'wai/er/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'testfiles/resources/pdf/dummy.pdf',
];

export function isPlaceholderResumeUrl(url) {
  const value = String(url || '').trim().toLowerCase();
  return (
    !value
    || value.includes('campus-placement.local')
    || value.includes('/student-documents/')
    || value.includes('example-bucket.local')
  );
}

export function isDemoResumeUrl(url) {
  const value = String(url || '').trim().toLowerCase();
  if (!value) return true;
  return DEMO_RESUME_URL_MARKERS.some((marker) => value.includes(marker));
}

/** True when the URL is a real uploaded resume (not seed/demo/placeholder). */
export function isAuthoritativeResumeUrl(url) {
  const value = String(url || '').trim();
  if (!/^https?:\/\//i.test(value)) return false;
  if (isPlaceholderResumeUrl(value)) return false;
  if (isDemoResumeUrl(value)) return false;
  return true;
}

/** @deprecated Use isAuthoritativeResumeUrl */
export function isUsableResumeUrl(url) {
  return isAuthoritativeResumeUrl(url);
}

function resumeDocumentUrl(doc) {
  return String(doc?.url || doc?.file_url || '').trim();
}

function resumeDocumentUploadedAt(doc) {
  const raw = doc?.uploadedAt ?? doc?.uploaded_at;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function sortResumeDocumentsNewestFirst(documents) {
  return documents
    .filter((doc) => String(doc?.type || doc?.document_type || '').toLowerCase() === 'resume')
    .slice()
    .sort((a, b) => resumeDocumentUploadedAt(b) - resumeDocumentUploadedAt(a));
}

/**
 * Pick the resume URL colleges/employers should show.
 * Profile CV (student_profiles.resume_url) is primary; extra resume rows in student_documents are kept but not used until selection exists.
 */
export function resolveStudentResumeUrl({ resumeUrl, documents } = {}) {
  const profileUrl = String(resumeUrl || '').trim();
  const docs = Array.isArray(documents) ? documents : [];
  const authoritativeResumes = sortResumeDocumentsNewestFirst(docs).filter((doc) =>
    isAuthoritativeResumeUrl(resumeDocumentUrl(doc)),
  );

  if (isAuthoritativeResumeUrl(profileUrl)) {
    if (authoritativeResumes.length === 0) return '';
    if (authoritativeResumes.some((doc) => resumeDocumentUrl(doc) === profileUrl)) return profileUrl;
  }

  for (const doc of authoritativeResumes.length ? authoritativeResumes : sortResumeDocumentsNewestFirst(docs)) {
    const url = resumeDocumentUrl(doc);
    if (isAuthoritativeResumeUrl(url)) return url;
  }

  return '';
}

export function filterDisplayDocuments(documents) {
  const docs = Array.isArray(documents) ? documents : [];
  return docs.filter((doc) => {
    if (String(doc?.type || doc?.document_type || '').toLowerCase() !== 'resume') return true;
    return isAuthoritativeResumeUrl(resumeDocumentUrl(doc));
  });
}

/** Seed/demo labels that must not override a real uploaded document name. */
export function isStaleSeedCvFileName(name) {
  const n = String(name || '').trim().toLowerCase();
  return (
    !n
    || n === 'dummy.pdf'
    || n === 'resume.pdf'
    || n === 'cv.pdf'
    || n === 'view résumé'
    || n === 'view resume'
  );
}

export function resolveStudentResumeFileName({ resumeUrl, documents, cvFileName } = {}) {
  const fromName = String(cvFileName || '').trim();
  if (fromName && !isStaleSeedCvFileName(fromName)) return fromName;

  const docs = sortResumeDocumentsNewestFirst(Array.isArray(documents) ? documents : []);
  for (const doc of docs) {
    const url = resumeDocumentUrl(doc);
    if (!isAuthoritativeResumeUrl(url)) continue;
    const name = String(doc?.name || doc?.document_name || '').trim();
    if (name) return name;
  }

  const url = resolveStudentResumeUrl({ resumeUrl, documents });
  if (!url) return '';
  try {
    const path = new URL(url).pathname;
    const base = path.split('/').pop() || '';
    return decodeURIComponent(base) || 'Resume';
  } catch {
    return 'Resume';
  }
}
