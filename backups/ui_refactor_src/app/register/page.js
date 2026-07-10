'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PHONE_DIAL_CODES, PHONE_FULL_E164 } from '@/lib/phoneDialCodes';
import { validatePhone } from '@/lib/validators';

function buildRegisterPhone(formData) {
  if (formData.phoneDialCode === PHONE_FULL_E164) {
    const raw = String(formData.phoneNational || '').trim().replace(/[\s-]/g, '');
    if (!raw) return '';
    return raw.startsWith('+') ? raw : `+${raw.replace(/^\++/, '')}`;
  }
  const digits = String(formData.phoneNational || '').replace(/\D/g, '');
  const dial = String(formData.phoneDialCode || '').trim() || '+';
  if (!digits) return '';
  return `${dial.startsWith('+') ? dial : `+${dial}`}${digits}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneDialCode: '+1',
    phoneNational: '',
    // Student fields
    collegeName: '',
    department: '',
    rollNumber: '',
    batchYear: '',
    // Employer fields
    companyName: '',
    industry: '',
    companyWebsite: '',
    // College admin fields
    collegeFullName: '',
    city: '',
    state: '',
    campusBindingToken: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    try {
      const locale = (navigator.language || '').toLowerCase();
      let dial = '+1';
      if (locale.endsWith('-in')) dial = '+91';
      else if (locale === 'en-gb') dial = '+44';
      setFormData((f) => ({ ...f, phoneDialCode: dial }));
    } catch {
      /* ignore */
    }
  }, []);

  const roles = [
    { id: 'student', label: 'Student', icon: '🎓', desc: 'Looking for placement opportunities' },
    { id: 'employer', label: 'Employer', icon: '🏢', desc: 'Hire talent from campuses' },
    { id: 'college_admin', label: 'College Admin', icon: '🏫', desc: 'Manage your institution\'s placements' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const phone = buildRegisterPhone(formData);
    if (phone && !validatePhone(phone)) {
      setError('Check your mobile number: use a country code above, or pick “Other” and type a full number starting with +.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { phoneDialCode, phoneNational, confirmPassword, ...rest } = formData;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, phone }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        setError(data.error || `Registration failed (${res.status}). Please try again.`);
        return;
      }

      if (data.pendingPlatformApproval) {
        router.push('/login?registered=pending-platform');
      } else {
        router.push('/login?registered=true');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-card animate-slideUp" style={{ maxWidth: '520px' }}>
          <Link href="/" className="auth-logo">
            <div className="sidebar-logo-icon">P</div>
            PlacementHub
          </Link>

          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Join thousands of students and employers on PlacementHub</p>

          {/* Steps indicator */}
          <div className="steps" style={{ marginBottom: '1.5rem' }}>
            <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="step-number">{step > 1 ? '✓' : '1'}</div>
              <span className="step-label">Role</span>
            </div>
            <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <div className="step-number">{step > 2 ? '✓' : '2'}</div>
              <span className="step-label">Details</span>
            </div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <span className="step-label">Finish</span>
            </div>
          </div>

          {error && (
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: 'var(--danger-50)', 
              border: '1px solid var(--danger-100)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--danger-600)',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className={`role-card ${formData.role === role.id ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, role: role.id })}
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left', padding: '1.25rem' }}
                  >
                    <div style={{ fontSize: '2rem' }}>{role.icon}</div>
                    <div>
                      <div className="role-card-name" style={{ fontSize: '0.9375rem' }}>{role.label}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>{role.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={!formData.role}
                onClick={() => setStep(2)}
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name <span className="required">*</span></label>
                  <input className="form-input" placeholder="First name" value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" placeholder="Last name" value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input type="email" className="form-input" placeholder="you@example.com" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile <span className="text-xs text-tertiary">(optional)</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    className="form-select"
                    style={{ width: 'auto', minWidth: '10rem', maxWidth: '100%' }}
                    value={formData.phoneDialCode}
                    onChange={(e) => setFormData({ ...formData, phoneDialCode: e.target.value, phoneNational: '' })}
                    aria-label="Country calling code"
                  >
                    {PHONE_DIAL_CODES.map((o) => (
                      <option key={o.code || o.label} value={o.code}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {formData.phoneDialCode !== PHONE_FULL_E164 ? (
                    <input
                      className="form-input"
                      style={{ flex: '1', minWidth: '140px' }}
                      placeholder="National number (no leading 0)"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={formData.phoneNational}
                      onChange={(e) => setFormData({ ...formData, phoneNational: e.target.value })}
                    />
                  ) : (
                    <input
                      className="form-input"
                      style={{ flex: '1', minWidth: '180px' }}
                      placeholder="e.g. +44 7911 123456"
                      inputMode="tel"
                      autoComplete="tel"
                      value={formData.phoneNational}
                      onChange={(e) => setFormData({ ...formData, phoneNational: e.target.value })}
                    />
                  )}
                </div>
                <span className="form-hint">
                  Country defaults from your browser where possible; pick <strong>Other</strong> for any region not listed.
                </span>
              </div>

              {/* Role-specific fields */}
              {formData.role === 'student' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Campus enrollment key <span className="required">*</span></label>
                    <input
                      className="form-input font-mono"
                      placeholder="Provided by your placement office"
                      autoComplete="off"
                      value={formData.campusBindingToken}
                      onChange={(e) => setFormData({ ...formData, campusBindingToken: e.target.value })}
                    />
                    <span className="form-hint">
                      Paste the full enrollment key from your college (spaces are ignored; typically 32+ characters). Not your roll number.
                    </span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department <span className="required">*</span></label>
                    <input
                      className="form-input"
                      placeholder="Enter your department (e.g. Aerospace, Chemical, Pharmacy)"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                    <span className="form-hint">Department names vary by institution, so this is entered as free text.</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Roll Number</label>
                      <input className="form-input" placeholder="CS2021001" value={formData.rollNumber}
                        onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Batch Year</label>
                      <input
                        className="form-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="2025"
                        autoComplete="off"
                        value={formData.batchYear}
                        onChange={(e) => setFormData({ ...formData, batchYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      />
                    </div>
                  </div>
                </>
              )}

              {formData.role === 'employer' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Company Name <span className="required">*</span></label>
                    <input className="form-input" placeholder="TechCorp Solutions" value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Industry</label>
                    <select className="form-select" value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}>
                      <option value="">Select Industry</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Finance">Finance & Banking</option>
                      <option value="Consulting">Consulting</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Education">Education</option>
                      <option value="E-commerce">E-commerce</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </>
              )}

              {formData.role === 'college_admin' && (
                <>
                  <div className="form-group">
                    <label className="form-label">College Name <span className="required">*</span></label>
                    <input className="form-input" placeholder="Indian Institute of Technology" value={formData.collegeFullName}
                      onChange={(e) => setFormData({ ...formData, collegeFullName: e.target.value })} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input className="form-input" placeholder="Mumbai" value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input className="form-input" placeholder="Maharashtra" value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 2 }}
                  disabled={
                    !formData.firstName ||
                    !formData.email ||
                    (formData.role === 'student' &&
                      (formData.campusBindingToken.trim().replace(/\s+/g, '').length < 16 ||
                        !formData.department ||
                        formData.department.trim().length < 2)) ||
                    (formData.role === 'employer' && !String(formData.companyName || '').trim()) ||
                    (formData.role === 'college_admin' && !String(formData.collegeFullName || '').trim())
                  }
                  onClick={() => setStep(3)}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Password */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Password <span className="required">*</span></label>
                <input type="password" className="form-input" placeholder="Min 8 characters" value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                <span className="form-hint">Must contain uppercase, lowercase, and a number</span>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password <span className="required">*</span></label>
                <input type="password" className="form-input" placeholder="Re-enter password" value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>← Back</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <div className="auth-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
