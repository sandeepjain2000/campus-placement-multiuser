import { AlertTriangle } from 'lucide-react';

export default function PageError({ error, reset }) {
  return (
    <div className="empty-state animate-fadeIn" style={{ minHeight: '60vh' }}>
      <div className="empty-state-icon" style={{ background: 'var(--danger-50)', color: 'var(--danger-600)' }}>
        <AlertTriangle size={32} />
      </div>
      <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        Failed to load data
      </h3>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        {error?.message || "There was an unexpected issue retrieving this information. Please try again."}
      </p>
      {reset && (
        <button className="btn btn-primary" onClick={reset}>
          Try Again
        </button>
      )}
    </div>
  );
}
