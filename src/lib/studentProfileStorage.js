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
    diplomaPercentage: '',
    backlogsActive: 0,
    backlogsHistory: 0,
    educationDetails: {
      graduation: { institution: '', board: '', year: '', notes: '' },
      diploma: { institution: '', board: '', year: '', notes: '' },
      twelfth: { institution: '', board: '', year: '', notes: '' },
      tenth: { institution: '', board: '', year: '', notes: '' },
    },
    gender: '',
    collegeEmail: email,
    personalEmail: '',
    phones: [{ label: 'Primary', value: '' }],
    emails: [
      { label: 'College', value: email },
      { label: 'Personal', value: '' },
    ],
    address: {
      line1: '',
      city: '',
      state: '',
      pincode: '',
    },
    bio: '',
    skills: [],
    expectedSalaryMin: 0,
    expectedSalaryMax: 0,
    preferredLocations: '',
    willingToRelocate: true,
    /** @type {{ id: string, kind: string, url: string, title: string, description: string }[]} */
    profileLinks: [],
    /** URL from server after upload (also on users.avatar_url) */
    avatarUrl: sessionUser?.avatar || '',
    avatarDataUrl: '',
    avatarName: '',
    resumeUrl: '',
    cvFileName: '',
    cvDataUrl: '',
    projects: [],
    internships: [],
    otherWork: [],
    workExperience: [],
    responsibilities: [],
    accomplishments: [],
    volunteering: [],
    extracurriculars: [],
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
