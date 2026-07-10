/** Super-admin institution type flags (Yes/No). Not exposed to college admin login. */

export const UNIVERSITY_TYPE_CLASSIFICATIONS = [
  {
    key: 'isCentralUniversity',
    column: 'is_central_university',
    label: 'Central University',
    hint: 'Established by Act of Parliament; funded by the Central Government.',
  },
  {
    key: 'isStateUniversity',
    column: 'is_state_university',
    label: 'State University',
    hint: 'Established by State Legislature Act; funded and managed by the State Government.',
  },
  {
    key: 'isDeemedUniversity',
    column: 'is_deemed_university',
    label: 'Deemed-to-be University',
    hint: 'High-performing institute granted university status by the Central Government (UGC).',
  },
  {
    key: 'isPrivateUniversity',
    column: 'is_private_university',
    label: 'Private University',
    hint: 'Established by a private trust/society; approved by UGC.',
  },
  {
    key: 'isInstitutionNationalImportance',
    column: 'is_institution_national_importance',
    label: 'Institution of National Importance (INI)',
    hint: 'Created by Special Act of Parliament (e.g. IITs, IIMs, NITs, AIIMS).',
  },
  {
    key: 'isInstituteStateLegislature',
    column: 'is_institute_state_legislature',
    label: 'Institute under State Legislature Act',
    hint: 'Similar to INIs but created by State Government.',
  },
];

export const COLLEGE_TYPE_CLASSIFICATIONS = [
  {
    key: 'isAffiliatedCollege',
    column: 'is_affiliated_college',
    label: 'Affiliated College',
    hint: 'Follows the parent university syllabus, exams, and fee structure.',
  },
  {
    key: 'isAutonomousCollege',
    column: 'is_autonomous_college',
    label: 'Autonomous College',
    hint: 'Affiliated but with freedom to design curriculum, exams, and assessment.',
  },
  {
    key: 'isConstituentCollege',
    column: 'is_constituent_college',
    label: 'Constituent College',
    hint: 'Part of the university itself (often on the main campus).',
  },
  {
    key: 'isGovernmentCollege',
    column: 'is_government_college',
    label: 'Government College',
    hint: 'Owned and operated by State or Central Government.',
  },
  {
    key: 'isPrivateAidedCollege',
    column: 'is_private_aided_college',
    label: 'Private Aided College',
    hint: 'Privately managed but receives government funding (aid).',
  },
  {
    key: 'isPrivateUnaidedCollege',
    column: 'is_private_unaided_college',
    label: 'Private Unaided College',
    hint: 'Fully private funding; no government grant.',
  },
];

export const ALL_INSTITUTION_CLASSIFICATIONS = [
  ...UNIVERSITY_TYPE_CLASSIFICATIONS,
  ...COLLEGE_TYPE_CLASSIFICATIONS,
];

export const INSTITUTION_CLASSIFICATION_SELECT_SQL = ALL_INSTITUTION_CLASSIFICATIONS.map(
  (f) => `t.${f.column}`,
).join(',\n        ');

export function emptyInstitutionClassifications() {
  return Object.fromEntries(ALL_INSTITUTION_CLASSIFICATIONS.map((f) => [f.key, false]));
}

export function mapInstitutionClassificationsFromRow(row) {
  if (!row) return emptyInstitutionClassifications();
  const out = {};
  for (const f of ALL_INSTITUTION_CLASSIFICATIONS) {
    out[f.key] = Boolean(row[f.column]);
  }
  return out;
}

export function parseInstitutionClassificationsFromBody(body) {
  if (!body || typeof body !== 'object') return null;
  const src = body.institutionClassifications ?? body;
  const out = {};
  for (const f of ALL_INSTITUTION_CLASSIFICATIONS) {
    if (src[f.key] === undefined) continue;
    out[f.key] = Boolean(src[f.key]);
  }
  return Object.keys(out).length ? out : null;
}

export function institutionClassificationPatchEntries(values) {
  const entries = [];
  for (const f of ALL_INSTITUTION_CLASSIFICATIONS) {
    if (values[f.key] === undefined) continue;
    entries.push({ column: f.column, value: Boolean(values[f.key]) });
  }
  return entries;
}
