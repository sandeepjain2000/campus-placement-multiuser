import { NextResponse } from 'next/server';

/** Lateral alumni job types (experienced hire — not campus internships or PPO). */
export const ALUMNI_JOB_TYPES = ['full_time', 'contract'];

/** Campus placement program types (current students only). */
export const CAMPUS_PROGRAM_JOB_TYPES = ['internship', 'short_project', 'hackathon'];

export function isAlumniStudent(userOrSession) {
  return Boolean(userOrSession?.isAlumni ?? userOrSession?.is_alumni);
}

export function isAlumniJobType(jobType) {
  return ALUMNI_JOB_TYPES.includes(String(jobType || '').trim());
}

export function isCampusProgramJobType(jobType) {
  return CAMPUS_PROGRAM_JOB_TYPES.includes(String(jobType || '').trim());
}

export function alumniJobsForbiddenResponse() {
  return NextResponse.json(
    { error: 'Alumni job listings are only available to alumni accounts.' },
    { status: 403 },
  );
}

export function campusProgramsForbiddenForAlumniResponse() {
  return NextResponse.json(
    { error: 'Campus placement programs are not available to alumni accounts.' },
    { status: 403 },
  );
}

/**
 * Gate student opportunity list APIs by account type.
 * @param {'internship' | 'job' | 'project' | 'hackathon'} kind
 * @param {object} user
 * @returns {import('next/server').NextResponse | null}
 */
export function guardStudentOpportunityKind(kind, user) {
  const isAlumni = isAlumniStudent(user);
  if (kind === 'job' && !isAlumni) return alumniJobsForbiddenResponse();
  if (kind !== 'job' && isAlumni) return campusProgramsForbiddenForAlumniResponse();
  return null;
}
