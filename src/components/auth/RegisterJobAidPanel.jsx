'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Copy, Check } from 'lucide-react';
import { DEMO_SEED_PASSWORD } from '@/lib/demoLogins';
import { isRegistrationJobAidEnabled } from '@/lib/registrationJobAid';

/**
 * Right-rail QA helper for student registration (enrollment keys + sample rolls).
 */
export default function RegisterJobAidPanel({ onApplySample }) {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  const enabled = isRegistrationJobAidEnabled();

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/public/registration-job-aid');
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(json.colleges)) {
          setColleges(json.colleges);
        } else if (!cancelled) {
          setColleges([]);
        }
      } catch {
        if (!cancelled) setColleges([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) return null;

  const copyKey = async (key) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <aside className="auth-job-aid hidden-on-mobile" aria-label="Registration job aid for testing">
      <div className="auth-job-aid-inner">
        <div className="auth-job-aid-header">
          <KeyRound size={16} aria-hidden />
          <span>Dev / QA job aid</span>
        </div>
        <p className="auth-job-aid-lead">
          Campus enrollment keys and sample student rows for unit testing. Not shown in production unless explicitly enabled.
        </p>

        {loading ? (
          <p className="auth-job-aid-muted">Loading keys…</p>
        ) : colleges.length === 0 ? (
          <p className="auth-job-aid-muted">No colleges with enrollment keys found. Run seed or add a college in super admin.</p>
        ) : (
          <div className="auth-job-aid-list">
            {colleges.map((c) => (
              <div key={c.slug || c.name} className="auth-job-aid-card">
                <div className="auth-job-aid-card-title">{c.name}</div>
                <div className="auth-job-aid-row">
                  <span className="auth-job-aid-label">Enrollment key</span>
                  <code className="auth-job-aid-code">{c.enrollmentKey}</code>
                </div>
                <div className="auth-job-aid-actions">
                  <button
                    type="button"
                    className="auth-job-aid-btn auth-job-aid-btn-primary"
                    onClick={() => onApplySample?.({
                      enrollmentKey: c.enrollmentKey,
                      rollNumber: c.sampleRoll || '',
                      email: c.sampleEmail || '',
                    })}
                  >
                    Fill form
                  </button>
                  <button
                    type="button"
                    className="auth-job-aid-btn"
                    onClick={() => copyKey(c.enrollmentKey)}
                    title="Copy enrollment key"
                  >
                    {copiedKey === c.enrollmentKey ? <Check size={13} /> : <Copy size={13} />}
                    {copiedKey === c.enrollmentKey ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {c.sampleRoll || c.sampleEmail ? (
                  <div className="auth-job-aid-samples">
                    {c.sampleRoll ? (
                      <div>
                        <span className="auth-job-aid-label">Sample roll</span>
                        <code className="auth-job-aid-code-sm">{c.sampleRoll}</code>
                      </div>
                    ) : null}
                    {c.sampleEmail ? (
                      <div>
                        <span className="auth-job-aid-label">Master-list email</span>
                        <code className="auth-job-aid-code-sm">{c.sampleEmail}</code>
                      </div>
                    ) : null}
                    <p className="auth-job-aid-hint">
                      Use the master-list email and roll when testing self-registration.
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="auth-job-aid-footer">
          <span className="auth-job-aid-label">After sign-up (seeded accounts)</span>
          <p className="auth-job-aid-hint" style={{ margin: 0 }}>
            Login password for demo users:{' '}
            <code className="auth-job-aid-code-sm">{DEMO_SEED_PASSWORD}</code>
          </p>
        </div>
      </div>
    </aside>
  );
}
