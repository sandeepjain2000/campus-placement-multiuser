'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/clientErrorReport';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    reportClientError(error?.message || 'Critical application error', { source: 'next.global-error' });
  }, [error]);
  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: 'sans-serif' }}>
          <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'inline-flex', height: '3.5rem', width: '3.5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
                !
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Critical System Error</h1>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>We encountered a critical problem processing your request.</p>
              <button
                onClick={() => reset()}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
