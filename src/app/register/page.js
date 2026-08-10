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
import AdminFilterSelect from '@/components/AdminFilterSelect';
import LoginCaptchaField from '@/components/auth/LoginCaptchaField';
import { verifyCaptchaAnswer } from '@/lib/captchaClient';
import { redirectToLoginAfterRegistration } from '@/lib/postRegistrationRedirect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';

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
        <Card
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
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
              {error}
              {showSignInLink ? (
                <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>
                  <Link href="/login" style={{ fontWeight: 700, color: 'var(--primary-600)' }}>
                    Sign in
                  </Link>
                  {' if you already have an account.'}
                </p>
              ) : null}
              </AlertDescription>
            </Alert>
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
              <div className="mb-6 flex flex-col gap-3">
                {roles.map((role) => (
                  <Button
                    key={role.id}
                    type="button"
                    variant={formData.role === role.id ? 'secondary' : 'outline'}
                    onClick={() => selectRegisterRole(role.id)}
                    aria-pressed={formData.role === role.id}
                    className="h-auto justify-start gap-4 px-5 py-4 text-left whitespace-normal"
                  >
                    <span className="text-2xl" aria-hidden="true">{role.icon}</span>
                    <div>
                      <div className="text-sm font-semibold">{role.label}</div>
                      <div className="text-muted-foreground mt-0.5 text-xs font-normal">{role.desc}</div>
                    </div>
                  </Button>
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
              <Button
                className="w-full"
                disabled={!formData.role || !captchaReady || captchaChecking}
                onClick={async () => {
                  const ok = await ensureCaptchaVerified();
                  if (ok) setStep(2);
                }}
              >
                {captchaChecking ? 'Verifying…' : captchaVerified ? 'Continue →' : 'Verify & continue →'}
              </Button>
            </div>
          )}

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <FieldGroup className="gap-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field data-invalid={Boolean(fieldErrors.firstName)}>
                  <FieldLabel htmlFor="register-first-name">First Name <span aria-hidden="true">*</span></FieldLabel>
                  <Input
                    id="register-first-name"
                    name="firstName"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => {
                      clearFieldError('firstName');
                      setFormData({ ...formData, firstName: e.target.value.replace(/\d/g, '') });
                    }}
                    aria-invalid={Boolean(fieldErrors.firstName)}
                    required
                  />
                  <FieldError>{fieldErrors.firstName}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="register-last-name">Last Name</FieldLabel>
                  <Input id="register-last-name" name="lastName" placeholder="Last name" value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value.replace(/\d/g, '') })} />
                </Field>
              </div>

              <Field data-invalid={Boolean(fieldErrors.email)}>
                <FieldLabel htmlFor="register-email">Email <span aria-hidden="true">*</span></FieldLabel>
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    clearFieldError('email');
                    setFormData({ ...formData, email: e.target.value.trim() });
                  }}
                  onBlur={validateEmailField}
                  aria-invalid={Boolean(fieldErrors.email)}
                  required
                />
                <FieldError>{fieldErrors.email}</FieldError>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.phone)}>
                <FieldLabel htmlFor="register-phone">Mobile <span className="text-muted-foreground text-xs">(optional)</span></FieldLabel>
                <InputGroup>
                  <InputGroupAddon className="p-0">
                    <AdminFilterSelect
                      className="h-9 min-w-[5.5rem] border-0 bg-transparent shadow-none"
                      value={formData.phoneDialCode}
                      onValueChange={(v) => {
                        clearFieldError('phone');
                        setFormData({ ...formData, phoneDialCode: v, phoneNational: '' });
                      }}
                      aria-label="Country calling code"
                      emptyMapsToAll={false}
                      items={PHONE_DIAL_CODES.map((o) => ({ label: o.label, value: o.code }))}
                    />
                  </InputGroupAddon>
                  {formData.phoneDialCode !== PHONE_FULL_E164 ? (
                    <InputGroupInput
                      id="register-phone"
                      name="phoneNational"
                      placeholder="National number (no leading 0)"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={formData.phoneNational}
                      onChange={(e) => {
                        clearFieldError('phone');
                        setFormData({ ...formData, phoneNational: e.target.value.replace(/\D/g, '') });
                      }}
                      onBlur={validatePhoneField}
                      aria-invalid={Boolean(fieldErrors.phone)}
                    />
                  ) : (
                    <InputGroupInput
                      id="register-phone"
                      name="phoneNational"
                      placeholder="e.g. +44 7911 123456"
                      inputMode="tel"
                      autoComplete="tel"
                      value={formData.phoneNational}
                      onChange={(e) => {
                        clearFieldError('phone');
                        setFormData({ ...formData, phoneNational: e.target.value });
                      }}
                      onBlur={validatePhoneField}
                      aria-invalid={Boolean(fieldErrors.phone)}
                    />
                  )}
                </InputGroup>
                {fieldErrors.phone ? <FieldError>{fieldErrors.phone}</FieldError> : (
                  <FieldDescription>
                    Defaults to <strong>India (+91)</strong>; change the country if needed, or pick <strong>Other</strong> for any region not listed.
                  </FieldDescription>
                )}
              </Field>

              {/* Role-specific fields */}
              {formData.role === 'student' && (
                <>
                  <Field>
                    <FieldLabel htmlFor="campus-binding-token">Campus enrollment key <span aria-hidden="true">*</span></FieldLabel>
                    <Input
                      id="campus-binding-token"
                      name="campusBindingToken"
                      className="font-mono"
                      placeholder="Provided by your placement office"
                      autoComplete="off"
                      value={formData.campusBindingToken}
                      onChange={(e) => setFormData({ ...formData, campusBindingToken: e.target.value })}
                    />
                    <FieldDescription>
                      Paste the full enrollment key from your college (spaces are ignored; typically 15 characters). Not your roll number.
                    </FieldDescription>
                  </Field>
                  <Field data-invalid={Boolean(fieldErrors.departmentId)}>
                    <FieldLabel htmlFor="register-department">Department <span aria-hidden="true">*</span></FieldLabel>
                    <AdminFilterSelect
                      id="register-department"
                      className="w-full"
                      value={formData.departmentId}
                      onValueChange={(v) => {
                        clearFieldError('departmentId');
                        setFormData({ ...formData, departmentId: v });
                      }}
                      items={[
                        { label: 'Select department', value: 'all' },
                        ...departments.map((d) => ({ label: d.name, value: String(d.id) })),
                      ]}
                    />
                    <FieldError>{fieldErrors.departmentId}</FieldError>
                    <FieldDescription>Choose the program that matches your official enrollment.</FieldDescription>
                  </Field>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="register-roll-number">Roll Number</FieldLabel>
                      <Input id="register-roll-number" name="rollNumber" placeholder="CS2021001" value={formData.rollNumber}
                        onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} />
                    </Field>
                    <Field data-invalid={Boolean(fieldErrors.batchYear)}>
                      <FieldLabel htmlFor="register-batch-year">Batch Year <span aria-hidden="true">*</span></FieldLabel>
                      <Input
                        id="register-batch-year"
                        name="batchYear"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="2025"
                        autoComplete="off"
                        value={formData.batchYear}
                        onChange={(e) => {
                          clearFieldError('batchYear');
                          setFormData({ ...formData, batchYear: e.target.value.replace(/\D/g, '').slice(0, 4) });
                        }}
                        aria-invalid={Boolean(fieldErrors.batchYear)}
                      />
                      <FieldError>{fieldErrors.batchYear}</FieldError>
                      <FieldDescription>4-digit admission batch year (validated on continue).</FieldDescription>
                    </Field>
                  </div>
                </>
              )}

              {formData.role === 'employer' && (
                <>
                  <Field data-invalid={Boolean(fieldErrors.companyName)}>
                    <FieldLabel htmlFor="register-company-name">Company Name <span aria-hidden="true">*</span></FieldLabel>
                    <Input
                      id="register-company-name"
                      name="companyName"
                      placeholder="TechCorp Solutions"
                      value={formData.companyName}
                      onChange={(e) => {
                        clearFieldError('companyName');
                        setFormData({ ...formData, companyName: e.target.value });
                      }}
                      aria-invalid={Boolean(fieldErrors.companyName)}
                      required
                    />
                    <FieldError>{fieldErrors.companyName}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="register-industry">Industry</FieldLabel>
                    <AdminFilterSelect
                      id="register-industry"
                      className="w-full"
                      value={formData.industry}
                      onValueChange={(v) => setFormData({ ...formData, industry: v })}
                      items={[
                        { label: 'Select Industry', value: 'all' },
                        { label: 'Information Technology', value: 'Information Technology' },
                        { label: 'Finance & Banking', value: 'Finance' },
                        { label: 'Consulting', value: 'Consulting' },
                        { label: 'Manufacturing', value: 'Manufacturing' },
                        { label: 'Healthcare', value: 'Healthcare' },
                        { label: 'Education', value: 'Education' },
                        { label: 'E-commerce', value: 'E-commerce' },
                        { label: 'Other', value: 'Other' },
                      ]}
                    />
                  </Field>
                </>
              )}

              {formData.role === 'college_admin' && (
                <>
                  <Field data-invalid={Boolean(fieldErrors.collegeFullName)}>
                    <FieldLabel htmlFor="register-college-name">College Name <span aria-hidden="true">*</span></FieldLabel>
                    <Input
                      id="register-college-name"
                      name="collegeFullName"
                      placeholder="Indian Institute of Technology"
                      value={formData.collegeFullName}
                      onChange={(e) => {
                        clearFieldError('collegeFullName');
                        setFormData({ ...formData, collegeFullName: e.target.value });
                      }}
                      aria-invalid={Boolean(fieldErrors.collegeFullName)}
                      required
                    />
                    <FieldError>{fieldErrors.collegeFullName}</FieldError>
                  </Field>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="register-city">City</FieldLabel>
                      <Input id="register-city" name="city" placeholder="Mumbai" value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="register-state">State</FieldLabel>
                      <Input id="register-state" name="state" placeholder="Maharashtra" value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                    </Field>
                  </div>
                </>
              )}

              <div className="mt-2 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">← Back</Button>
                <Button
                  type="button"
                  className="flex-[2]"
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
                </Button>
              </div>
            </FieldGroup>
          )}

          {/* Step 3: Password */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel htmlFor="register-password">Password <span aria-hidden="true">*</span></FieldLabel>
                  <Input id="register-password" name="password" type="password" placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`} value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={PASSWORD_MIN_LENGTH} />
                  <FieldDescription>{PASSWORD_REQUIREMENTS_HINT}</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="register-confirm-password">Confirm Password <span aria-hidden="true">*</span></FieldLabel>
                  <Input id="register-confirm-password" name="confirmPassword" type="password" placeholder="Re-enter password" value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required />
                </Field>

              <div className="mt-2 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">← Back</Button>
                <Button type="submit" className="flex-[2]" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </div>
              </FieldGroup>
            </form>
          )}

          <div className="auth-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </Card>
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
