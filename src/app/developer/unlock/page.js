'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Lock } from 'lucide-react';

function UnlockForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/developer';
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json?.error === 'Invalid password' ? 'Incorrect password' : (json?.error || 'Incorrect password'));
        return;
      }
      const safeFrom =
        from.startsWith('/developer') || from.startsWith('/data-entry') ? from : '/developer';
      // Full navigation so the unlock cookie is always sent on the next request
      // (client soft-nav can race ahead of Set-Cookie).
      window.location.assign(safeFrom);
    } catch {
      setError('Could not verify password. Try again.');
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
          <div className="dev-notes-unlock-password-wrap">
            <input
              id="dev-notes-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              autoFocus
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              disabled={loading}
              className="btn btn-ghost btn-sm dev-notes-unlock-password-toggle"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
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
        .dev-notes-unlock-password-wrap {
          position: relative;
          margin-bottom: 0.85rem;
        }
        .dev-notes-unlock-form .form-input {
          width: 100%;
          padding-right: 2.4rem;
          margin-bottom: 0;
        }
        .dev-notes-unlock-password-toggle {
          position: absolute;
          right: 0.45rem;
          top: 50%;
          transform: translateY(-50%);
          min-width: 28px;
          width: 28px;
          height: 28px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }
        .dev-notes-unlock-password-toggle:hover:not(:disabled) {
          color: var(--text-primary);
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
