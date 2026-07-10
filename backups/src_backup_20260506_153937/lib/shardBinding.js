import crypto from 'crypto';

/** 64-char lowercase hex — not derived from institution name */
export function generateSurfaceToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function normalizeSurfaceTokenInput(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, '');
}
