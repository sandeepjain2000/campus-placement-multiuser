/** Matches `employer_profiles.company_type` CHECK in schema. */
export const EMPLOYER_COMPANY_TYPE_OPTIONS = [
  { value: 'mnc', label: 'MNC' },
  { value: 'startup', label: 'Startup' },
  { value: 'psu', label: 'PSU' },
  { value: 'private', label: 'Private' },
  { value: 'government', label: 'Government' },
  { value: 'ngo', label: 'NGO' },
  { value: 'other', label: 'Other' },
];

const BY_VALUE = Object.fromEntries(EMPLOYER_COMPANY_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export function labelEmployerCompanyType(value) {
  if (value == null || String(value).trim() === '') return '—';
  const key = String(value).toLowerCase().trim();
  return BY_VALUE[key] || String(value);
}

/** Common headcount bands (free text also allowed in DB). */
export const EMPLOYER_COMPANY_SIZE_OPTIONS = [
  { value: '1-10', label: '1–10' },
  { value: '11-50', label: '11–50' },
  { value: '51-200', label: '51–200' },
  { value: '201-500', label: '201–500' },
  { value: '501-1000', label: '501–1,000' },
  { value: '1001-5000', label: '1,001–5,000' },
  { value: '5000-10000', label: '5,000–10,000' },
  { value: '10000+', label: '10,000+' },
];
