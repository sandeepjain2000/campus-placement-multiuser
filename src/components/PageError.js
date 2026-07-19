import { AlertTriangle } from 'lucide-react';

/** Hide raw Postgres / SQL plumbing from end users; keep support Ref if present. */
export function friendlyPageErrorMessage(raw, fallback) {
  const text = String(raw || '').trim();
  const defaultMsg =
    fallback || 'There was an unexpected issue retrieving this information. Please try again.';
  if (!text) return defaultMsg;

  const refMatch = text.match(/\[Ref:\s*[A-Z0-9]+\]/i);
  const ref = refMatch ? ` ${refMatch[0]}` : '';

  if (
    /column .+ does not exist/i.test(text)
    || /relation .+ does not exist/i.test(text)
    || /database column is missing/i.test(text)
    || /run pending migrations/i.test(text)
    || /schema\/query mismatch/i.test(text)
    || /\b42703\b/.test(text)
    || /\b42P01\b/.test(text)
  ) {
    return `Unable to load this page right now. Please try again shortly.${ref}`;
  }

  return text;
}

export default function PageError({
  error,
  reset,
  title = 'Failed to load data',
  fallbackMessage,
}) {
  const detail = friendlyPageErrorMessage(
    error?.message,
    fallbackMessage || 'Unable to load dashboard statistics at this time. Please try again.',
  );

  return (
    <div className="empty-state animate-fadeIn" style={{ minHeight: '60vh' }}>
      <div className="empty-state-icon" style={{ background: 'var(--danger-50)', color: 'var(--danger-600)' }}>
        <AlertTriangle size={32} />
      </div>
      <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        {detail}
      </p>
      {reset && (
        <button className="btn btn-primary" onClick={reset}>
          Try Again
        </button>
      )}
    </div>
  );
}
