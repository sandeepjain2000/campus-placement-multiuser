import crypto from 'crypto';

/** 8-char friendly alphanumeric string (e.g. CAMPUS-A7X9) */
export function generateSurfaceToken() {
  const bytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CAMPUS-${bytes}`;
}

export function normalizeSurfaceTokenInput(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, '');
}
