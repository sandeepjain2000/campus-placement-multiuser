'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LoginCaptchaField from '@/components/auth/LoginCaptchaField';
import { IpGeminiBrand } from '@/components/ip/IpGeminiBrand';
import { isGmailAddress } from '@/lib/authRegisterRules';
import { readCaptchaField } from '@/lib/captchaClient';
import '@/components/ip/ip-register-gemini.css';
import '@/components/ip/ip-login-gemini.css';

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

const GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];

/**
 * Candidate register: Google is separate from the email form.
 * Google → Gmail-only screen → dummy auth API → final screen.
 * Form path stays on this page (email + details + Complete register).
 * LinkedIn signup removed per agreed batch.
 */
export default function CandidateRegisterPage() {
  const sp = useSearchParams();
  const referralCode = sp.get('ref') || '';
  const [email, setEmail] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [graduationYear, setGraduationYear] = useState('2026');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const captchaFieldRef = useRef(null);
  const [step, setStep] = useState('ready'); // ready | google-gmail | done
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/ip/bootstrap', { method: 'POST' }).catch(() => {});
  }, []);

  function openGoogleGmail() {
    setError('');
    setMessage('');
    setStep('google-gmail');
  }

  function backToReady() {
    setError('');
    setMessage('');
    setStep('ready');
  }

  async function continueWithGoogle(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!googleEmail || !isGmailAddress(googleEmail)) {
      setError('Enter a Gmail address (@gmail.com).');
      return;
    }
    const challenge = readCaptchaField(captchaFieldRef, captchaToken, captchaAnswer);
    if (!challenge.token || !challenge.answer) {
      setError('Complete the security verification question.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/ip/auth/register-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'google',
          email: googleEmail,
          captchaToken: challenge.token,
          captchaAnswer: challenge.answer,
          referralCode: referralCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setStep('done');
      setMessage(data.message || 'Account created. Check Gmail for your temporary password.');
      if (data.warning) setMessage((m) => `${m} (${data.warning})`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function finishRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    if (!isGmailAddress(email)) {
      setError('Only Gmail addresses (@gmail.com) are allowed for candidate registration.');
      setLoading(false);
      return;
    }
    const challenge = readCaptchaField(captchaFieldRef, captchaToken, captchaAnswer);
    try {
      const res = await fetch('/api/ip/auth/register-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'form',
          email,
          name,
          university,
          graduationYear,
          password,
          captchaToken: challenge.token,
          captchaAnswer: challenge.answer,
          referralCode: referralCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setStep('done');
      setMessage(data.message || 'Submitted for SuperAdmin approval.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ip-gemini-register">
      <div className="ip-reg-page">
        <div className="mb-6">
          <IpGeminiBrand />
        </div>

        <div className="ip-reg-shell">
          <div className="ip-reg-shell__head">
            <div>
              {step === 'google-gmail' ? (
                <button type="button" className="ip-reg-back" onClick={backToReady}>
                  <ArrowLeft className="size-3.5" aria-hidden />
                  Back
                </button>
              ) : (
                <Link href="/register" className="ip-reg-back">
                  <ArrowLeft className="size-3.5" aria-hidden />
                  Change account type
                </Link>
              )}
              <h2>Candidate Registration</h2>
              <p>
                {step === 'google-gmail'
                  ? 'Enter your Gmail to continue'
                  : 'Join PlacementHub to start your internship search'}
              </p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/20 text-indigo-300">
              <GraduationCap className="size-5" aria-hidden />
            </span>
          </div>

          <div className="ip-reg-shell__body">
            {referralCode ? (
              <Alert>
                <AlertTitle>Referral</AlertTitle>
                <AlertDescription>
                  Registering with code <code>{referralCode}</code>
                </AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {message ? (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            {step === 'done' ? (
              <Link href="/" className="ip-reg-submit" style={{ textDecoration: 'none' }}>
                Go to login
              </Link>
            ) : null}

            {step === 'google-gmail' ? (
              <form className="flex flex-col gap-4" onSubmit={continueWithGoogle}>
                <div className="ip-reg-field">
                  <label htmlFor="google-email">Gmail</label>
                  <input
                    id="google-email"
                    className="ip-reg-input"
                    type="email"
                    required
                    autoFocus
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="you@gmail.com"
                  />
                  <p className="hint">Gmail (@gmail.com) only.</p>
                </div>
                <LoginCaptchaField
                  ref={captchaFieldRef}
                  variant="securityCard"
                  token={captchaToken}
                  answer={captchaAnswer}
                  onTokenChange={setCaptchaToken}
                  onAnswerChange={setCaptchaAnswer}
                  disabled={loading}
                />
                <button type="submit" className="ip-reg-submit" disabled={loading || !captchaToken}>
                  {loading ? 'Creating account…' : 'Continue'}
                </button>
              </form>
            ) : null}

            {step === 'ready' ? (
              <>
                <div className="ip-reg-social">
                  <button type="button" onClick={openGoogleGmail} disabled={loading}>
                    <GoogleMark />
                    Google
                  </button>
                </div>

                <div className="ip-reg-divider">
                  <span>Or with email</span>
                </div>

                <form className="flex flex-col gap-4" onSubmit={finishRegister}>
                  <div className="ip-reg-field">
                    <label htmlFor="name">Full Name</label>
                    <input
                      id="name"
                      className="ip-reg-input"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="ip-reg-field">
                      <label htmlFor="university">University / Institute</label>
                      <input
                        id="university"
                        className="ip-reg-input"
                        required
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        placeholder="e.g. MIT University"
                      />
                    </div>
                    <div className="ip-reg-field">
                      <label htmlFor="grad-year">Graduation Year</label>
                      <select
                        id="grad-year"
                        className="ip-reg-input"
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        required
                      >
                        {GRAD_YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="ip-reg-field">
                    <label htmlFor="email-form">Email Address</label>
                    <input
                      id="email-form"
                      className="ip-reg-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@gmail.com"
                    />
                    <p className="hint">Gmail (@gmail.com) only.</p>
                  </div>

                  <div className="ip-reg-field">
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      className="ip-reg-input"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </div>

                  <LoginCaptchaField
                    ref={captchaFieldRef}
                    variant="securityCard"
                    token={captchaToken}
                    answer={captchaAnswer}
                    onTokenChange={setCaptchaToken}
                    onAnswerChange={setCaptchaAnswer}
                    disabled={loading}
                  />

                  <button type="submit" className="ip-reg-submit" disabled={loading || !captchaToken}>
                    {loading ? 'Creating Candidate Account...' : 'Complete Candidate Registration'}
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <footer className="ip-reg-site-footer">PlacementHub Internship Portal © 2026. All rights reserved.</footer>
    </div>
  );
}
