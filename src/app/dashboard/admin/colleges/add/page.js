'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { getPasswordValidationError, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_HINT } from '@/lib/validators';

const INITIAL_FORM = {
  collegeName: '',
  city: '',
  state: '',
  naacGrade: '',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminPassword: '',
};

export default function AdminAddCollegePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const copyEnrollmentKey = async () => {
    if (!created?.enrollmentKey) return;
    try {
      await navigator.clipboard.writeText(created.enrollmentKey);
      setCopiedKey(true);
      addToast('Enrollment key copied', 'success');
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      addToast('Could not copy to clipboard', 'error');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const passwordErr = getPasswordValidationError(form.adminPassword);
    if (passwordErr) {
      setError(passwordErr);
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create college');
      setCreated(json);
      addToast('College created and admin account activated', 'success');
    } catch (e) {
      setError(e.message || 'Failed to create college');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Add College</h1>
            <p>{created.college?.name} is live on the platform.</p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-header">
            <h3 className="card-title">College provisioned</h3>
          </div>
          <dl className="text-sm" style={{ display: 'grid', gap: '0.75rem', margin: 0 }}>
            <div>
              <dt className="text-secondary">College</dt>
              <dd style={{ margin: '0.15rem 0 0', fontWeight: 600 }}>{created.college?.name}</dd>
            </div>
            <div>
              <dt className="text-secondary">Location</dt>
              <dd style={{ margin: '0.15rem 0 0' }}>
                {[created.college?.city, created.college?.state].filter(Boolean).join(', ')}
              </dd>
            </div>
            <div>
              <dt className="text-secondary">College admin</dt>
              <dd style={{ margin: '0.15rem 0 0' }}>
                {created.admin?.firstName} · {created.admin?.email}
              </dd>
            </div>
            <div>
              <dt className="text-secondary">Student enrollment key</dt>
              <dd style={{ margin: '0.5rem 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <code
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '1.125rem',
                    letterSpacing: '0.06em',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  {created.enrollmentKey}
                </code>
                <button type="button" className="btn btn-secondary btn-sm" onClick={copyEnrollmentKey}>
                  {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                  {copiedKey ? 'Copied' : 'Copy'}
                </button>
              </dd>
            </div>
          </dl>
          <p className="text-sm text-secondary" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
            The admin received approval and enrollment-key emails. Share the login password you set using your official channel.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/admin/colleges" className="btn btn-primary">
              Back to Colleges
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setCreated(null);
                setForm(INITIAL_FORM);
              }}
            >
              Add another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/dashboard/admin/colleges"
          className="btn btn-ghost btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            marginBottom: '0.75rem',
            paddingLeft: 0,
          }}
        >
          <ArrowLeft size={16} />
          Back to Colleges
        </Link>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.35rem',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              display: 'flex',
              padding: '0.35rem',
              background: 'var(--primary-50)',
              borderRadius: '8px',
              color: 'var(--primary-600)',
            }}
          >
            <Building2 size={22} />
          </span>
          Add College
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 640 }}>
          Provision a college workspace and an active college admin account. Self-service sign-ups still go through{' '}
          <Link href="/dashboard/admin/pending-registrations">Onboard colleges & employers</Link>.
        </p>
      </div>

      <form
        className="card"
        onSubmit={handleSubmit}
        style={{ maxWidth: 720, border: '1px solid var(--border-default)' }}
      >
        <div className="card-header">
          <h3 className="card-title">Institution</h3>
        </div>
        <div className="grid grid-2" style={{ gap: '1rem', padding: '0 1.5rem' }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="collegeName">College name</label>
            <input
              id="collegeName"
              className="form-input"
              value={form.collegeName}
              onChange={onChange('collegeName')}
              required
              autoComplete="organization"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="city">City</label>
            <input id="city" className="form-input" value={form.city} onChange={onChange('city')} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="state">State</label>
            <input id="state" className="form-input" value={form.state} onChange={onChange('state')} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="naacGrade">NAAC grade (optional)</label>
            <input
              id="naacGrade"
              className="form-input"
              value={form.naacGrade}
              onChange={onChange('naacGrade')}
              placeholder="e.g. A+"
            />
          </div>
        </div>

        <div className="card-header" style={{ marginTop: '1rem' }}>
          <h3 className="card-title">College administrator</h3>
        </div>
        <div className="grid grid-2" style={{ gap: '1rem', padding: '0 1.5rem 1.5rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="adminFirstName">First name</label>
            <input
              id="adminFirstName"
              className="form-input"
              value={form.adminFirstName}
              onChange={onChange('adminFirstName')}
              required
              autoComplete="given-name"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="adminLastName">Last name</label>
            <input
              id="adminLastName"
              className="form-input"
              value={form.adminLastName}
              onChange={onChange('adminLastName')}
              autoComplete="family-name"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="adminEmail">Email</label>
            <input
              id="adminEmail"
              type="email"
              className="form-input"
              value={form.adminEmail}
              onChange={onChange('adminEmail')}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="adminPassword">Initial password</label>
            <input
              id="adminPassword"
              type="password"
              className="form-input"
              value={form.adminPassword}
              onChange={onChange('adminPassword')}
              required
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              placeholder={PASSWORD_REQUIREMENTS_HINT}
            />
            <span className="form-hint">{PASSWORD_REQUIREMENTS_HINT}</span>
          </div>
        </div>

        {error ? (
          <p className="text-sm" style={{ color: 'var(--danger-600)', padding: '0 1.5rem 1rem', margin: 0 }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1.5rem 1.5rem', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create college'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.push('/dashboard/admin/colleges')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
