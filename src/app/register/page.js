'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DEFAULT_PHONE_DIAL_CODE, PHONE_DIAL_CODES, PHONE_FULL_E164 } from '@/lib/phoneDialCodes';
import {
  validatePersonName,
  validateBatchYear,
  getPasswordValidationError,
  getEmailValidationError,
  getRegistrationPhoneValidationError,
  buildRegistrationPhoneE164,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_HINT,
} from '@/lib/validators';
import { isRegistrationJobAidEnabled } from '@/lib/registrationJobAid';
import RegisterJobAidPanel from '@/components/auth/RegisterJobAidPanel';
import LoginCaptchaField from '@/components/auth/LoginCaptchaField';
import { verifyCaptchaAnswer } from '@/lib/captchaClient';
import { redirectToLoginAfterRegistration } from '@/lib/postRegistrationRedirect';

function buildRegisterPhone(formData) {
  return buildRegistrationPhoneE164({
    phoneDialCode: formData.phoneDialCode,
    phoneNational: formData.phoneNational,
    PHONE_FULL_E164,
  });
}

function validateRegisterStep2Fields(formData) {
  const fieldErrors = {};
  const fnErr = validatePersonName(formData.firstName, { required: true, label: 'First name' });
  if (fnErr) fieldErrors.firstName = fnErr;
  const lnErr = validatePersonName(formData.lastName, { required: false, label: 'Last name' });
  if (lnErr) fieldErrors.lastName = lnErr;
  const emailErr = getEmailValidationError(formData.email, { required: true });
  if (emailErr) fieldErrors.email = emailErr;
  const phoneErr = getRegistrationPhoneValidationError(
    {
      phoneDialCode: formData.phoneDialCode,
      phoneNational: formData.phoneNational,
      PHONE_FULL_E164,
    },
    { required: false },
  );
  if (phoneErr) fieldErrors.phone = phoneErr;
  if (formData.role === 'student') {
    const bErr = validateBatchYear(formData.batchYear, { required: true });
    if (bErr) fieldErrors.batchYear = bErr;
    if (!formData.departmentId) fieldErrors.departmentId = 'Please select your department.';
  }
  if (formData.role === 'employer' && !String(formData.companyName || '').trim()) {
    fieldErrors.companyName = 'Company name is required.';
  }
  if (formData.role === 'college_admin' && !String(formData.collegeFullName || '').trim()) {
    fieldErrors.collegeFullName = 'College name is required.';
  }
  return fieldErrors;
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneDialCode: DEFAULT_PHONE_DIAL_CODE,
    phoneNational: '',
    // Student fields
    collegeName: '',
    departmentId: '',
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSignInLink, setShowSignInLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaChecking, setCaptchaChecking] = useState(false);
  const [departments, setDepartments] = useState([]);

  const captchaReady = Boolean(formData.role);

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateEmailField = () => {
    const message = getEmailValidationError(formData.email, { required: true });
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) next.email = message;
      else delete next.email;
      return next;
    });
    return !message;
  };

  const validatePhoneField = () => {
    const message = getRegistrationPhoneValidationError(
      {
        phoneDialCode: formData.phoneDialCode,
        phoneNational: formData.phoneNational,
        PHONE_FULL_E164,
      },
      { required: false },
    );
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) next.phone = message;
      else delete next.phone;
      return next;
    });
    return !message;
  };

  const selectRegisterRole = (roleId) => {
    setFormData((prev) => ({ ...prev, role: roleId }));
    setCaptchaToken('');
    setCaptchaAnswer('');
    setCaptchaKey((k) => k + 1);
    setCaptchaVerified(false);
    setError('');
    setFieldErrors({});
    setShowSignInLink(false);
  };

  const refreshCaptchaAfterFailure = () => {
    setCaptchaAnswer('');
    setCaptchaVerified(false);
    setCaptchaKey((k) => k + 1);
  };

  const ensureCaptchaVerified = async () => {
    if (!formData.role) {
      setError('Select an account type to continue.');
      return false;
    }
    if (captchaVerified) return true;
    setCaptchaChecking(true);
    setError('');
    const result = await verifyCaptchaAnswer(captchaToken, captchaAnswer);
    setCaptchaChecking(false);
    if (!result.ok) {
      setError(result.error || 'Verification failed. Check your answer and try again.');
      refreshCaptchaAfterFailure();
      return false;
    }
    setCaptchaVerified(true);
    return true;
  };
  const showStudentJobAid =
    isRegistrationJobAidEnabled() && formData.role === 'student' && step >= 2;

  useEffect(() => {
    let cancelled = false;
    const loadDepts = async () => {
      try {
        const res = await fetch('/api/public/departments');
        const data = await res.json().catch(() => ({}));
        if (!cancelled && Array.isArray(data.departments)) setDepartments(data.departments);
      } catch {
        if (!cancelled) setDepartments([]);
      }
    };
    void loadDepts();
    return () => {
      cancelled = true;
    };
  }, []);

  const roles = [
    { id: 'employer', label: 'Employer', icon: '🏢', desc: 'Hire talent from campuses' },
    { id: 'college_admin', label: 'College Admin', icon: '🏫', desc: 'Manage your institution\'s placements' },
  ];

  const clearRegistrationPasswords = () => {
    setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowSignInLink(false);

    const step2Errors = validateRegisterStep2Fields(formData);
    if (Object.keys(step2Errors).length > 0) {
      setFieldErrors(step2Errors);
      setStep(2);
      return;
    }
    setFieldErrors({});

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const passwordErr = getPasswordValidationError(formData.password);
    if (passwordErr) {
      setError(passwordErr);
      return;
    }

    const captchaOk = await verifyCaptchaAnswer(captchaToken, captchaAnswer);
    if (!captchaOk.ok) {
      setError(
        captchaOk.error ||
          'Verification expired or incorrect. Go back to step 1, answer the question again, then continue.',
      );
      refreshCaptchaAfterFailure();
      setStep(1);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { phoneDialCode, phoneNational, confirmPassword, ...rest } = formData;
      const phone = buildRegisterPhone(formData);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, phone, captchaToken, captchaAnswer }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        const isConflict = data.code === 'ACCOUNT_ALREADY_REGISTERED' || res.status === 409;
        const msg = data.error || 'Registration failed. Please try again.';
        clearRegistrationPasswords();
        setShowSignInLink(isConflict);
        setError(msg);
        const lower = String(msg).toLowerCase();
        if (lower.includes('email')) {
          setFieldErrors({ email: msg });
          setStep(2);
        } else if (lower.includes('mobile') || lower.includes('phone')) {
          setFieldErrors({ phone: msg });
          setStep(2);
        }
        if (res.status === 400 && String(msg).toLowerCase().includes('verification')) {
          refreshCaptchaAfterFailure();
          setStep(1);
        }
        return;
      }

      redirectToLoginAfterRegistration({
        pendingPlatformApproval: Boolean(data.pendingPlatformApproval),
        nextUrl: data.nextUrl,
      });
      return;
    } catch (err) {
      clearRegistrationPasswords();
      setShowSignInLink(false);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyJobAidSample = ({ enrollmentKey, rollNumber, email }) => {
    setFormData((prev) => ({
      ...prev,
      campusBindingToken: enrollmentKey || prev.campusBindingToken,
      rollNumber: rollNumber || prev.rollNumber,
      email: email || prev.email,
    }));
    setError('');
  };

  return (
    <div className={`auth-page${showStudentJobAid ? ' auth-page--with-job-aid' : ''}`}>
      <div className="auth-left">
        <div
          className="auth-card animate-slideUp"
          style={{ maxWidth: showStudentJobAid ? '520px' : undefined }}
        >
          <Link href="/login" className="auth-logo">
            <div className="sidebar-logo-icon">P</div>
            PlacementHub
          </Link>

          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Employers and college administrators can request an account here.</p>

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
              {showSignInLink ? (
                <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>
                  <Link href="/login" style={{ fontWeight: 700, color: 'var(--primary-600)' }}>
                    Sign in
                  </Link>
                  {' if you already have an account.'}
                </p>
              ) : null}
            </div>
          )}

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div>
              <div
                style={{
                  padding: '0.875rem 1rem',
                  marginBottom: '1rem',
                  background: 'var(--primary-50)',
                  border: '1px solid var(--primary-100)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <strong style={{ color: 'var(--text-primary)' }}>Students:</strong> self-registration is not used.
                Your college uploads the master student list and PlacementHub emails your login address when your account
                is ready. Use the password in that email (sandbox demo: <code>Admin@123</code>).
                {' '}
                <Link href="/login" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
                  Sign in
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className={`role-card ${formData.role === role.id ? 'selected' : ''}`}
                    onClick={() => selectRegisterRole(role.id)}
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
              {formData.role ? (
                <LoginCaptchaField
                  key={`${formData.role}-${captchaKey}`}
                  inputId="register-captcha"
                  token={captchaToken}
                  answer={captchaAnswer}
                  onTokenChange={setCaptchaToken}
                  onAnswerChange={setCaptchaAnswer}
                  verifyEarly
                  onVerifiedChange={setCaptchaVerified}
                  disabled={captchaChecking}
                />
              ) : null}
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={!formData.role || !captchaReady || captchaChecking}
                onClick={async () => {
                  const ok = await ensureCaptchaVerified();
                  if (ok) setStep(2);
                }}
              >
                {captchaChecking ? 'Verifying…' : captchaVerified ? 'Continue →' : 'Verify & continue →'}
              </button>
            </div>
          )}

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name <span className="required">*</span></label>
                  <input
                    className={`form-input${fieldErrors.firstName ? ' input-error' : ''}`}
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => {
                      clearFieldError('firstName');
                      setFormData({ ...formData, firstName: e.target.value.replace(/\d/g, '') });
                    }}
                    required
                  />
                  {fieldErrors.firstName ? <p className="form-error">{fieldErrors.firstName}</p> : null}
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" placeholder="Last name" value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value.replace(/\d/g, '') })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input
                  type="email"
                  className={`form-input${fieldErrors.email ? ' input-error' : ''}`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    clearFieldError('email');
                    setFormData({ ...formData, email: e.target.value.trim() });
                  }}
                  onBlur={validateEmailField}
                  required
                />
                {fieldErrors.email ? <p className="form-error">{fieldErrors.email}</p> : null}
              </div>

              <div className="form-group">
                <label className="form-label">Mobile <span className="text-xs text-tertiary">(optional)</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    className="form-select"
                    style={{ width: 'auto', minWidth: '10rem', maxWidth: '100%' }}
                    value={formData.phoneDialCode}
                    onChange={(e) => {
                      clearFieldError('phone');
                      setFormData({ ...formData, phoneDialCode: e.target.value, phoneNational: '' });
                    }}
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
                      className={`form-input${fieldErrors.phone ? ' input-error' : ''}`}
                      style={{ flex: '1', minWidth: '140px' }}
                      placeholder="National number (no leading 0)"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={formData.phoneNational}
                      onChange={(e) => {
                        clearFieldError('phone');
                        setFormData({ ...formData, phoneNational: e.target.value.replace(/\D/g, '') });
                      }}
                      onBlur={validatePhoneField}
                    />
                  ) : (
                    <input
                      className={`form-input${fieldErrors.phone ? ' input-error' : ''}`}
                      style={{ flex: '1', minWidth: '180px' }}
                      placeholder="e.g. +44 7911 123456"
                      inputMode="tel"
                      autoComplete="tel"
                      value={formData.phoneNational}
                      onChange={(e) => {
                        clearFieldError('phone');
                        setFormData({ ...formData, phoneNational: e.target.value });
                      }}
                      onBlur={validatePhoneField}
                    />
                  )}
                </div>
                {fieldErrors.phone ? (
                  <p className="form-error">{fieldErrors.phone}</p>
                ) : (
                  <span className="form-hint">
                    Defaults to <strong>India (+91)</strong>; change the country if needed, or pick <strong>Other</strong> for any region not listed.
                  </span>
                )}
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
                      Paste the full enrollment key from your college (spaces are ignored; typically 15 characters). Not your roll number.
                    </span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department <span className="required">*</span></label>
                    <select
                      className="form-select"
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      required
                    >
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <span className="form-hint">Choose the program that matches your official enrollment.</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Roll Number</label>
                      <input className="form-input" placeholder="CS2021001" value={formData.rollNumber}
                        onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Batch Year <span className="required">*</span></label>
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
                      <span className="form-hint">4-digit admission batch year (validated on continue).</span>
                    </div>
                  </div>
                </>
              )}

              {formData.role === 'employer' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Company Name <span className="required">*</span></label>
                    <input
                      className={`form-input${fieldErrors.companyName ? ' input-error' : ''}`}
                      placeholder="TechCorp Solutions"
                      value={formData.companyName}
                      onChange={(e) => {
                        clearFieldError('companyName');
                        setFormData({ ...formData, companyName: e.target.value });
                      }}
                      required
                    />
                    {fieldErrors.companyName ? <p className="form-error">{fieldErrors.companyName}</p> : null}
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
                    <input
                      className={`form-input${fieldErrors.collegeFullName ? ' input-error' : ''}`}
                      placeholder="Indian Institute of Technology"
                      value={formData.collegeFullName}
                      onChange={(e) => {
                        clearFieldError('collegeFullName');
                        setFormData({ ...formData, collegeFullName: e.target.value });
                      }}
                      required
                    />
                    {fieldErrors.collegeFullName ? <p className="form-error">{fieldErrors.collegeFullName}</p> : null}
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
                      (formData.campusBindingToken.trim().replace(/\s+/g, '').length < 15 ||
                        !formData.departmentId ||
                        !String(formData.batchYear || '').trim())) ||
                    (formData.role === 'employer' && !String(formData.companyName || '').trim()) ||
                    (formData.role === 'college_admin' && !String(formData.collegeFullName || '').trim())
                  }
                  onClick={() => {
                    setError('');
                    const nextErrors = validateRegisterStep2Fields(formData);
                    if (Object.keys(nextErrors).length > 0) {
                      setFieldErrors(nextErrors);
                      return;
                    }
                    setFieldErrors({});
                    setStep(3);
                  }}
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
                <input type="password" className="form-input" placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`} value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={PASSWORD_MIN_LENGTH} />
                <span className="form-hint">{PASSWORD_REQUIREMENTS_HINT}</span>
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

      {showStudentJobAid ? (
        <RegisterJobAidPanel onApplySample={applyJobAidSample} />
      ) : null}

      <style>{`
        @media (max-width: 960px) {
          .auth-page--with-job-aid .hidden-on-mobile {
            display: none !important;
          }
          .auth-page--with-job-aid .auth-left {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
