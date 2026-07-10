'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPasswordValidationError, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_HINT } from '@/lib/validators';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      const t = q.get('token');
      if (t) setToken(t);
      else setError('Invalid or missing reset token.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const passwordErr = getPasswordValidationError(password);
    if (passwordErr) {
      setError(passwordErr);
      return;
    }
    
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        setMessage('Your password has been successfully reset. You can now sign in.');
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Set new password</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Enter your new password below.</p>
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

          {!message && token && !error.includes('missing') && (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="reset-pwd">New Password</label>
                <input
                  id="reset-pwd"
                  type="password"
                  className="form-input"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                />
                <span className="form-hint" style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {PASSWORD_REQUIREMENTS_HINT}
                </span>
              </div>
              
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="reset-confirm-pwd">Confirm New Password</label>
                <input
                  id="reset-confirm-pwd"
                  type="password"
                  className="form-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !password || !confirmPassword}
                style={{ width: '100%', padding: '0.625rem', fontSize: '1rem', justifyContent: 'center' }}
              >
                {loading ? 'Saving...' : 'Reset Password'}
              </button>
            </form>
          )}

          {message && (
            <Link href="/login" className="btn btn-primary" style={{ width: '100%', padding: '0.625rem', fontSize: '1rem', justifyContent: 'center', display: 'flex' }}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
