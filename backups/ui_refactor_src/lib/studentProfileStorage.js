/**
 * Client helpers for student profile UI shape and applied-drives local cache.
 * Profile fields are loaded/saved via GET/PUT /api/student/profile — not localStorage.
 */

export function appliedDrivesStorageKey(email) {
  if (!email) return null;
  return `ph_student_applied_drives:${email.toLowerCase()}`;
}

/** Empty shell before API load or when session has no email yet. */
export function defaultStudentProfile(sessionUser) {
  const email = sessionUser?.email || '';
  return {
    department: '',
    branch: '',
    rollNumber: '',
    batchYear: '',
    graduationYear: '',
    cgpa: '',
    tenthPercentage: '',
    twelfthPercentage: '',
    gender: '',
    collegeEmail: email,
    personalEmail: '',
    phones: [{ label: 'Primary', value: '' }],
    emails: [
      { label: 'College', value: email },
      { label: 'Personal', value: '' },
    ],
    bio: '',
    skills: [],
    expectedSalaryMin: 0,
    expectedSalaryMax: 0,
    preferredLocations: '',
    willingToRelocate: true,
    /** @type {{ id: string, kind: string, url: string, title: string, description: string }[]} */
    profileLinks: [],
    /** HTTPS URL from S3 after upload (also on users.avatar_url) */
    avatarUrl: sessionUser?.avatar || '',
    avatarDataUrl: '',
    avatarName: '',
    cvFileName: '',
    cvDataUrl: '',
  };
}

export function loadAppliedDriveIds(email) {
  const key = appliedDrivesStorageKey(email);
  if (!key || typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveAppliedDriveIds(email, idsSet) {
  const key = appliedDrivesStorageKey(email);
  if (!key || typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify([...idsSet]));
}
