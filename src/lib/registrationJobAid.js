import { isDemoLoginsEnabled } from '@/lib/demoLogins';

/** Sample student rows for QA — must exist on master list before self-registration. */
export const REGISTRATION_JOB_AID_SAMPLES = [
  {
    slug: 'iit-madras',
    sampleEmail: 'arjun.verma@iitm.edu',
    sampleRoll: 'CS2021001',
    label: 'IIT Madras',
  },
  {
    slug: 'nit-trichy',
    sampleEmail: 'sneha.rao@nitt.edu',
    sampleRoll: 'CS2021101',
    label: 'NIT Trichy',
  },
  {
    slug: 'bits-pilani',
    sampleEmail: 'rohan.mehta@bits.edu',
    sampleRoll: 'CS2021201',
    label: 'BITS Pilani',
  },
];

/**
 * Show campus enrollment keys on `/register` (right-side job aid).
 * Off when demo logins are hidden unless explicitly enabled for QA builds.
 */
export function isRegistrationJobAidEnabled() {
  if (process.env.NEXT_PUBLIC_HIDE_REGISTRATION_JOB_AID === 'true') return false;
  if (process.env.NEXT_PUBLIC_SHOW_REGISTRATION_JOB_AID === 'true') return true;
  if (isDemoLoginsEnabled()) return true;
  return process.env.NODE_ENV !== 'production';
}

export function sampleForCollegeSlug(slug) {
  return REGISTRATION_JOB_AID_SAMPLES.find((s) => s.slug === slug) || null;
}
