/** @typedef {'internship' | 'jobs' | 'drive' | 'projects'} AssessmentRoundKind */

export const ASSESSMENT_ROUND_KINDS = [
  { id: 'internship', label: 'Internships' },
  { id: 'jobs', label: 'Alumni Jobs' },
  { id: 'drive', label: 'Drives' },
  { id: 'projects', label: 'Projects' },
];

const KIND_SET = new Set(ASSESSMENT_ROUND_KINDS.map((k) => k.id));

/** Built-in defaults for every employer until they save overrides. */
export const DEFAULT_ROUND_LABELS_BY_KIND = {
  internship: ['Resume screening', 'Online test', 'Technical round', 'HR round', 'Offer discussion'],
  jobs: ['Aptitude test', 'Technical test', 'Technical interview', 'HR interview', 'Final review'],
  drive: ['Aptitude test', 'Technical test', 'Technical interview', 'HR interview', 'Final review'],
  projects: ['Proposal review', 'Skill assessment', 'Task review', 'Presentation', 'Final evaluation'],
};

export function isAssessmentRoundKind(value) {
  return KIND_SET.has(String(value || '').trim());
}

export function defaultRoundLabelsForKind(kind) {
  const defaults = DEFAULT_ROUND_LABELS_BY_KIND[kind] || DEFAULT_ROUND_LABELS_BY_KIND.jobs;
  return [1, 2, 3, 4, 5].map((roundNo, i) => ({
    roundNo,
    column: `round_${roundNo}`,
    label: defaults[i] || `Round ${roundNo}`,
  }));
}

export function normalizeRoundLabelInput(value, roundNo, kind) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    const defaults = DEFAULT_ROUND_LABELS_BY_KIND[kind] || DEFAULT_ROUND_LABELS_BY_KIND.jobs;
    return defaults[roundNo - 1] || `Round ${roundNo}`;
  }
  if (trimmed.toUpperCase() === 'NA') return 'NA';
  return trimmed.slice(0, 120);
}

export function mergeStoredRoundLabels(kind, storedRows) {
  const base = defaultRoundLabelsForKind(kind);
  const byNo = new Map((storedRows || []).map((r) => [Number(r.round_no), r.round_label]));
  return base.map((row) => ({
    ...row,
    label: byNo.has(row.roundNo) ? String(byNo.get(row.roundNo) ?? row.label) : row.label,
  }));
}
