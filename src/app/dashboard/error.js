'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { reportClientError } from '@/lib/clientErrorReport';

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    reportClientError(error?.message || 'Dashboard error', { source: 'next.dashboard.error' });
  }, [error]);

  return (
    <div
      className="animate-fadeIn"
      style={{
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Something went wrong
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          This dashboard page hit an unexpected error. You can retry or return to your home screen.
        </p>
        {process.env.NODE_ENV !== 'production' && error?.message ? (
          <p
            style={{
              color: 'var(--danger-700)',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              wordBreak: 'break-word',
            }}
          >
            {error.message}
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/dashboard" className="btn btn-secondary">
            Dashboard home
          </Link>
        </div>
      </div>
    </div>
  );
}
