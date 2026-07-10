'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { reportClientError } from '@/lib/clientErrorReport';

export default function Error({ error, reset }) {
  useEffect(() => {
    reportClientError(error?.message || 'Application error', { source: 'next.error' });
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', height: '3.5rem', width: '3.5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', backgroundColor: 'var(--danger-50)', color: 'var(--danger-600)', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--danger-100)' }}>
            !
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Something went wrong!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>We apologize for the inconvenience. An unexpected error occurred.</p>
          {process.env.NODE_ENV !== 'production' && error?.message ? (
            <p style={{ color: 'var(--danger-700)', fontSize: '0.8rem', marginTop: '0.75rem', wordBreak: 'break-word' }}>
              {error.message}
            </p>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            className="btn btn-primary"
          >
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}
