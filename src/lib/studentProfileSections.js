/** Profile completion buckets (6 areas on the student profile). */

export const PROFILE_SECTION_TOTAL = 6;

export const SECTION_FILTER_LTE4 = 'lte4';
export const SECTION_FILTER_GTE5 = 'gte5';

export const SECTION_COMPLETION_FILTER_OPTIONS = [
  { value: SECTION_FILTER_LTE4, label: '4 sections or fewer' },
  { value: SECTION_FILTER_GTE5, label: '5 sections or more' },
];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function present(value) {
  return value !== null && value !== undefined && value !== '';
}

export function getCompletedSectionCount(student) {
  if (student?.sectionCompletion?.completed != null) {
    return student.sectionCompletion.completed;
  }
  const sections = student?.sections || {};
  return [
    student?.email || student?.phone || student?.bio,
    list(sections.education?.records).length || present(student?.cgpa),
    list(sections.skills?.skills).length ||
      list(sections.skills?.languages).length ||
      list(sections.skills?.subjects).length,
    list(sections.projects).length,
    list(sections.documents?.documents).length ||
      sections.documents?.resumeUrl ||
      student?.resumeUrl,
    list(sections.activities?.workExperience).length ||
      list(sections.activities?.responsibilities).length ||
      list(sections.activities?.accomplishments).length ||
      list(sections.activities?.volunteering).length ||
      list(sections.activities?.extracurriculars).length,
  ].filter(Boolean).length;
}

export function getProfileSectionTotal(student) {
  return student?.sectionCompletion?.total ?? PROFILE_SECTION_TOTAL;
}

export function formatProfileSectionsCell(student) {
  const completed = getCompletedSectionCount(student);
  const total = getProfileSectionTotal(student);
  return `${completed}/${total}`;
}

export function studentMatchesSectionFilters(student, sectionFilters) {
  if (!sectionFilters?.length) return true;
  const completed = getCompletedSectionCount(student);
  return sectionFilters.some((f) => {
    if (f === SECTION_FILTER_LTE4) return completed <= 4;
    if (f === SECTION_FILTER_GTE5) return completed >= 5;
    return false;
  });
}

export function countStudentsBySectionRange(students) {
  let lte4 = 0;
  let gte5 = 0;
  for (const s of students) {
    const n = getCompletedSectionCount(s);
    if (n <= 4) lte4 += 1;
    if (n >= 5) gte5 += 1;
  }
  return { lte4, gte5 };
}
