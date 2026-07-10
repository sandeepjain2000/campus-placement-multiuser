'use client';
import { useState } from 'react';
import Link from 'next/link';


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        setMessage('If an account exists with that email, a password reset link has been sent.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', height: '2.5rem', width: '2.5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.75rem', backgroundColor: 'var(--primary-600)', color: '#ffffff', fontWeight: 'bold', fontSize: '1.125rem', boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)' }}>
              P
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>PlacementHub</span>
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Reset your password</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Enter your email and we&apos;ll send you a link to reset your password.</p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-default)' }}>
          {message && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--success-50)', border: '1px solid var(--success-100)', borderRadius: 'var(--radius-md)', color: 'var(--success-700)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-50)', border: '1px solid var(--danger-100)', borderRadius: 'var(--radius-md)', color: 'var(--danger-700)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="reset-email">Email address</label>
                <input
                  id="reset-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !email}
                style={{ width: '100%', padding: '0.625rem', fontSize: '1rem', justifyContent: 'center' }}
              >
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Remember your password? <Link href="/login" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
