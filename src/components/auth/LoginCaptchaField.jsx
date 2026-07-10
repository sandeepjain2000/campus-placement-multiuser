'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { verifyCaptchaAnswer } from '@/lib/captchaClient';

export default function LoginCaptchaField({
  token,
  answer,
  onTokenChange,
  onAnswerChange,
  disabled = false,
  inputId = 'login-captcha',
  /** When true, verifies with the server on blur / Enter (registration step 1). */
  verifyEarly = false,
  onVerifiedChange,
}) {
  const [question, setQuestion] = useState('');
  const [dummyHint, setDummyHint] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifyState, setVerifyState] = useState('idle');
  const [verifyMessage, setVerifyMessage] = useState('');
  const verifyingRef = useRef(false);

  const setVerified = useCallback(
    (ok) => {
      onVerifiedChange?.(ok);
    },
    [onVerifiedChange],
  );

  const resetVerification = useCallback(() => {
    setVerifyState('idle');
    setVerifyMessage('');
    setVerified(false);
  }, [setVerified]);

  const runVerify = useCallback(async () => {
    if (!verifyEarly || !token) {
      resetVerification();
      return false;
    }
    if (verifyingRef.current) return false;
    verifyingRef.current = true;
    setVerifyState('checking');
    setVerifyMessage('Checking answer…');
    const result = await verifyCaptchaAnswer(token, answer);
    verifyingRef.current = false;
    if (result.ok) {
      setVerifyState('valid');
      setVerifyMessage('Verified — you can continue.');
      setVerified(true);
      return true;
    }
    setVerifyState('invalid');
    setVerifyMessage(result.error || 'Incorrect answer. Try again or refresh the question.');
    setVerified(false);
    return false;
  }, [verifyEarly, token, answer, resetVerification, setVerified]);

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    resetVerification();
    try {
      const res = await fetch('/api/auth/captcha', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQuestion('Verification unavailable — refresh the page');
        setDummyHint('');
        onTokenChange('');
        return;
      }
      setQuestion(data.question || 'Answer the question below');
      setDummyHint(
        data.dummyAnswer != null ? `Dev test: answer is always ${data.dummyAnswer}.` : '',
      );
      onTokenChange(data.token || '');
      if (data.dummyAnswer != null) {
        onAnswerChange(String(data.dummyAnswer));
      } else {
        onAnswerChange('');
      }
    } catch {
      setQuestion('Verification unavailable — refresh the page');
      onTokenChange('');
    } finally {
      setLoading(false);
    }
  }, [onAnswerChange, onTokenChange, resetVerification]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  useEffect(() => {
    if (!verifyEarly) return;
    resetVerification();
  }, [answer, token, verifyEarly, resetVerification]);

  const handleAnswerChange = (value) => {
    onAnswerChange(value);
    if (verifyEarly) resetVerification();
  };

  const verifyBorderColor =
    verifyState === 'valid'
      ? 'var(--success-200)'
      : verifyState === 'invalid'
        ? 'var(--danger-200)'
        : 'var(--border-default)';

  return (
    <div
      className="form-group"
      style={{
        marginBottom: '1.25rem',
        padding: '0.875rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${verifyBorderColor}`,
        background: 'var(--bg-secondary)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <label className="form-label" htmlFor={inputId} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <ShieldCheck size={14} aria-hidden="true" />
          Verification
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={loadChallenge}
          disabled={disabled || loading}
          aria-label="New verification question"
          title="New question"
          style={{ padding: '0.25rem 0.5rem', minHeight: 0 }}
        >
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </div>
      <p className="text-sm text-secondary" style={{ margin: '0 0 0.5rem', lineHeight: 1.4 }}>
        {loading ? 'Loading question…' : question}
      </p>
      {dummyHint ? (
        <p className="text-sm" style={{ margin: '0 0 0.5rem', color: 'var(--primary-700)', fontWeight: 600 }}>
          {dummyHint}
        </p>
      ) : null}
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="form-input"
        placeholder="Your answer"
        value={answer}
        onChange={(e) => handleAnswerChange(e.target.value.replace(/[^\d-]/g, ''))}
        onBlur={() => {
          if (verifyEarly) void runVerify();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && verifyEarly) {
            e.preventDefault();
            void runVerify();
          }
        }}
        disabled={disabled || loading || !token}
        aria-invalid={verifyState === 'invalid'}
        aria-describedby={verifyEarly && verifyMessage ? `${inputId}-verify-status` : undefined}
      />
      {verifyEarly && verifyMessage ? (
        <p
          id={`${inputId}-verify-status`}
          className="text-sm"
          role="status"
          style={{
            margin: '0.5rem 0 0',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.35rem',
            lineHeight: 1.4,
            color:
              verifyState === 'valid'
                ? 'var(--success-700)'
                : verifyState === 'invalid'
                  ? 'var(--danger-600)'
                  : 'var(--text-secondary)',
          }}
        >
          {verifyState === 'valid' ? (
            <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          ) : verifyState === 'invalid' ? (
            <XCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          ) : null}
          {verifyMessage}
        </p>
      ) : null}
    </div>
  );
}
