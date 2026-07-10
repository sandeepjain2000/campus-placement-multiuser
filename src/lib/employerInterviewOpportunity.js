import { isAssessmentRoundKind } from '@/lib/assessmentRoundMap';

/** Campus student-program interview tabs (excludes alumni jobs). */
export const EMPLOYER_CAMPUS_INTERVIEW_TABS = [
  { id: 'internship', label: 'Internships' },
  { id: 'projects', label: 'Projects' },
  { id: 'drive', label: 'Placement drives' },
];

/** @deprecated Use EMPLOYER_CAMPUS_INTERVIEW_TABS + alumni jobs route instead. */
export const EMPLOYER_INTERVIEW_TABS = [
  ...EMPLOYER_CAMPUS_INTERVIEW_TABS,
  { id: 'jobs', label: 'Alumni jobs' },
];

export function interviewTabLabel(kind) {
  if (kind === 'jobs') return 'Alumni jobs';
  return EMPLOYER_CAMPUS_INTERVIEW_TABS.find((t) => t.id === kind)?.label
    || EMPLOYER_INTERVIEW_TABS.find((t) => t.id === kind)?.label
    || 'Opening';
}

export function normalizeInterviewOpportunityKind(value) {
  const k = String(value || '').trim();
  return isAssessmentRoundKind(k) ? k : '';
}

export function interviewSlotMatchesKind(slot, kind) {
  const tab = normalizeInterviewOpportunityKind(kind);
  if (!tab) return true;
  const slotKind = normalizeInterviewOpportunityKind(slot?.opportunityKind);
  if (!slotKind && !slot?.opportunityId) return tab === 'jobs';
  return slotKind === tab;
}
