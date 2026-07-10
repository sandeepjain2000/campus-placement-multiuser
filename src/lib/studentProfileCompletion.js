/**
 * Student profile completeness — browse gate and overview dashboard.
 */

function present(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function validCgpa(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

/** Overview checklist buckets (must match student dashboard UI). */
export const STUDENT_OVERVIEW_COMPLETION_BUCKETS = [
  { id: 'skills', label: 'Skills', incompleteLabel: 'Add Skills' },
  { id: 'resume', label: 'Resume', incompleteLabel: 'Upload Resume' },
  { id: 'education', label: 'Education', incompleteLabel: 'Add Education' },
  { id: 'personalInfo', label: 'Personal Info', incompleteLabel: 'Complete Personal Info' },
];

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {{ skillsCount?: number }} [options]
 */
export function evaluateStudentOverviewCompletion(row, { skillsCount = 0 } = {}) {
  const skillsComplete = Number(skillsCount) > 0;
  const resumeComplete = present(row?.resume_url);

  const educationComplete =
    validCgpa(row?.cgpa) && present(row?.tenth_percentage) && present(row?.twelfth_percentage);

  const phone = row?.phone ?? row?.user_phone;
  const department = row?.department ?? row?.course;
  const personalInfoComplete =
    present(row?.roll_number) &&
    present(phone) &&
    present(row?.branch) &&
    present(department);

  const completeById = {
    skills: skillsComplete,
    resume: resumeComplete,
    education: educationComplete,
    personalInfo: personalInfoComplete,
  };

  const completedCount = STUDENT_OVERVIEW_COMPLETION_BUCKETS.filter((b) => completeById[b.id]).length;
  const total = STUDENT_OVERVIEW_COMPLETION_BUCKETS.length;
  const profileCompletion = total ? Math.round((completedCount / total) * 100) : 0;

  const items = STUDENT_OVERVIEW_COMPLETION_BUCKETS.map((bucket) => ({
    id: bucket.id,
    label: bucket.label,
    incompleteLabel: bucket.incompleteLabel,
    complete: completeById[bucket.id],
  }));

  return { profileCompletion, items };
}

/**
 * @param {Record<string, unknown> | null | undefined} row — student_profiles + users.phone join
 * @returns {{ profileComplete: boolean, missingLabels: string[] }}
 */
export function evaluateStudentProfileForBrowse(row) {
  const missingLabels = [];
  if (!row) {
    return {
      profileComplete: false,
      missingLabels: ['Roll number', 'Phone number', 'Branch', 'Course / department', 'CGPA'],
    };
  }

  if (!present(row.roll_number)) missingLabels.push('Roll number');
  if (!present(row.phone) && !present(row.user_phone)) missingLabels.push('Phone number');
  if (!present(row.branch)) missingLabels.push('Branch');
  if (!present(row.department) && !present(row.course)) missingLabels.push('Course / department');
  if (!validCgpa(row.cgpa)) missingLabels.push('CGPA');

  return { profileComplete: missingLabels.length === 0, missingLabels };
}
