/**
 * Employer job / internship posting helpers (min CGPA display & persistence).
 */

import { FIELD_IDS, validateFieldOrError } from '@/lib/inputConstraints';

/** Floor used when min CGPA is zero or invalid (legacy seed / bad input). */
export const DEFAULT_EMPLOYER_MIN_CGPA = 5;

/** Coerce zero/negative before validation; empty stays optional. */
export function coerceEmployerMinCgpaInput(raw) {
  if (raw == null || raw === '') return raw;
  const n = Number(raw);
  if (Number.isFinite(n) && n <= 0) return DEFAULT_EMPLOYER_MIN_CGPA;
  return raw;
}

/** @param {unknown} raw */
export function normalizeEmployerMinCgpa(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_EMPLOYER_MIN_CGPA;
  return n;
}

/**
 * Validate then normalize min CGPA for create/update payloads.
 * Zero is coerced to {@link DEFAULT_EMPLOYER_MIN_CGPA}; empty is stored as null.
 * @returns {{ error: string | null, value: number | null }}
 */
export function resolveEmployerMinCgpaForSubmit(minCgpa) {
  const input = coerceEmployerMinCgpaInput(minCgpa);
  const err = validateFieldOrError(FIELD_IDS.EMPLOYER_MIN_CGPA, input);
  if (err) return { error: err, value: null };
  return { error: null, value: parseEmployerMinCgpaForDb(input) };
}

/** @param {unknown} raw */
export function formatEmployerMinCgpa(raw) {
  const n = normalizeEmployerMinCgpa(raw);
  if (n == null) return '—';
  return String(n);
}

/** @param {unknown} minCgpa */
export function parseEmployerMinCgpaForDb(minCgpa) {
  return normalizeEmployerMinCgpa(minCgpa);
}

/** @param {{ cgpa?: unknown, minCgpa?: unknown }} job */
export function resolveEmployerJobMinCgpa(job) {
  return normalizeEmployerMinCgpa(job?.minCgpa ?? job?.cgpa);
}

/** Employer-facing label for job_postings.status (cancelled → Withdrawn). */
export function formatJobPostingStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'cancelled') return 'Withdrawn';
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
