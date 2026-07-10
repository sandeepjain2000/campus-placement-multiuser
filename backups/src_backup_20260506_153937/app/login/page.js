'use client';
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EntityLogo from '@/components/EntityLogo';
import { useToast } from '@/components/ToastProvider';
import { getDashboardPath } from '@/lib/utils';
import { DEMO_LOGINS, DEMO_SEED_PASSWORD, isDemoLoginsEnabled } from '@/lib/demoLogins';

export default function LoginPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filledFrom, setFilledFrom] = useState(''); // tracks which card was clicked
  const [registeredBanner, setRegisteredBanner] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const email = new URLSearchParams(window.location.search).get('email');
    if (email) {
      const match = DEMO_LOGINS.find((d) => d.email === email && !d.isDummy);
      if (match) {
        setFormData((prev) => ({
          ...prev,
          email: match.email,
          password: DEMO_SEED_PASSWORD,
        }));
        setFilledFrom(match.email);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('registered');
    if (q === 'pending-platform') {
      setRegisteredBanner(
        'Registration received. Your account will be activated after platform approval — watch your inbox for email confirmation.',
      );
    } else if (q === 'true') {
      setRegisteredBanner('Account created. You can sign in below.');
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.role) return;
    router.replace(getDashboardPath(session.user.role));
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="skeleton" style={{ width: 220, height: 28 }} />
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="skeleton" style={{ width: 220, height: 28 }} />
      </div>
    );
  }

  const showDemoLogins = isDemoLoginsEnabled();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        const res = await fetch('/api/auth/session');
        const sess = await res.json();
        const role = sess?.user?.role;
        const path = getDashboardPath(role);
        if (typeof window !== 'undefined') {
          window.location.replace(`${window.location.origin}${path}`);
        } else {
          router.replace(path);
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Card click: prefill seed email + password (user clicks Sign In)
  const handleDemoCardClick = (demo) => {
    if (demo.isDummy) {
      toast.info("Placement Committee is coming soon. It's currently in design.");
      return;
    }
    setError('');
    setFilledFrom(demo.email);
    setFormData((prev) => ({ ...prev, email: demo.email, password: DEMO_SEED_PASSWORD }));
    toast.info('Demo email and password filled — click Sign In.');
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-card animate-slideUp">
          <Link href="/" className="auth-logo">
            <div className="sidebar-logo-icon">P</div>
            PlacementHub
          </Link>

          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your account to continue</p>

          {registeredBanner && !error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-lg)',
                color: '#166534',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}
            >
              {registeredBanner}
            </div>
          )}

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'var(--danger-50)',
              border: '1px solid var(--danger-100)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--danger-600)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          {filledFrom && !error && (
            <div style={{
              padding: '0.6rem 1rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-lg)',
              color: '#166534',
              fontSize: '0.82rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              ✅ Demo credentials filled — click <strong>Sign In</strong>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFilledFrom(''); }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setFilledFrom(''); }}
                required
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          {showDemoLogins ? (
            <>
              <div className="auth-divider">or use a quick account</div>
              <div
                style={{
                  background: 'linear-gradient(135deg, #fef9c3, #fef3c7)',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.6rem 0.9rem',
                  fontSize: '0.75rem',
                  color: '#92400e',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.4rem',
                }}
              >
                <span>💡</span>
                <span>
                  <strong>Demo accounts:</strong> Quick-fill seeded roles (same password as <code className="font-mono">db/seed.sql</code>).
                  To hide this block on a private deployment, set{' '}
                  <code className="font-mono">NEXT_PUBLIC_HIDE_DEMO_LOGINS=true</code>.
                </span>
              </div>
              <div className="role-select-grid">
                {DEMO_LOGINS.map((demo) => {
                  const isSelected = filledFrom === demo.email;
                  return (
                    <button
                      key={demo.email}
                      type="button"
                      className="role-card"
                      onClick={() => handleDemoCardClick(demo)}
                      style={{
                        textAlign: 'left',
                        cursor: 'pointer',
                        outline: isSelected ? '2px solid var(--primary-500)' : 'none',
                        background: isSelected ? 'var(--primary-50)' : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <EntityLogo name={demo.name} size="xs" shape="rounded" />
                        <span className="role-card-name" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                          {demo.label}
                          {isSelected && <span style={{ color: 'var(--primary-500)', marginLeft: '0.3rem' }}>✓</span>}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', marginTop: '0.25rem' }}>
                        <div style={{ fontSize: '0.75rem', lineHeight: 1.4, color: 'var(--gray-500)', wordBreak: 'break-all' }}>
                          📧 {demo.email}
                        </div>
                        <div style={{ fontSize: '0.75rem', lineHeight: 1.4, color: 'var(--gray-500)' }}>
                          🔑 Auto-fills email &amp; password
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          <div className="auth-footer">
            Don&apos;t have an account? <Link href="/register">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
