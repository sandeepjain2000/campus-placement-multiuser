'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

function UnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/developer';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/developer-notes/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError('Incorrect password');
        return;
      }
      const safeFrom =
        from.startsWith('/developer') || from.startsWith('/data-entry') ? from : '/developer';
      router.replace(safeFrom);
      router.refresh();
    } catch {
      setError('Could not verify password. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dev-notes-unlock-page">
      <div className="dev-notes-unlock-card">
        <div className="dev-notes-unlock-icon" aria-hidden>
          <Lock size={28} strokeWidth={1.5} />
        </div>
        <h1>Internal tools</h1>
        <p className="dev-notes-unlock-lead">
          Enter the team password to open Developer Notes or the legacy data-entry hub.
        </p>
        <form onSubmit={onSubmit} className="dev-notes-unlock-form">
          <label htmlFor="dev-notes-password">Password</label>
          <input
            id="dev-notes-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
          {error ? <p className="dev-notes-unlock-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={loading || !password}>
            {loading ? 'Checking…' : 'Unlock'}
          </button>
        </form>
        <p className="dev-notes-unlock-meta">
          <Link href="/">← Back to landing</Link>
        </p>
      </div>
      <style jsx global>{`
        .dev-notes-unlock-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          background: var(--bg-primary);
        }
        .dev-notes-unlock-card {
          width: 100%;
          max-width: 24rem;
          padding: 2rem 1.75rem;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          background: var(--bg-secondary);
          box-shadow: var(--shadow-md);
        }
        .dev-notes-unlock-icon {
          width: 3rem;
          height: 3rem;
          border-radius: var(--radius-lg);
          background: var(--primary-50);
          border: 1px solid var(--primary-200);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-600);
          margin-bottom: 1rem;
        }
        .dev-notes-unlock-card h1 {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          font-weight: 800;
        }
        .dev-notes-unlock-lead {
          margin: 0 0 1.25rem;
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--text-secondary);
        }
        .dev-notes-unlock-form label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          margin-bottom: 0.35rem;
          color: var(--text-secondary);
        }
        .dev-notes-unlock-form .form-input {
          width: 100%;
          margin-bottom: 0.85rem;
        }
        .dev-notes-unlock-error {
          margin: 0 0 0.75rem;
          font-size: 0.8125rem;
          color: var(--danger-600);
        }
        .dev-notes-unlock-form .btn {
          width: 100%;
        }
        .dev-notes-unlock-meta {
          margin: 1.25rem 0 0;
          font-size: 0.8125rem;
        }
        .dev-notes-unlock-meta a {
          color: var(--text-link);
          font-weight: 600;
          text-decoration: none;
        }
        .dev-notes-unlock-meta a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default function DeveloperNotesUnlockPage() {
  return (
    <Suspense fallback={<div className="dev-notes-unlock-page" style={{ minHeight: '100vh' }} />}>
      <UnlockForm />
    </Suspense>
  );
}
