'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { verifyCaptchaAnswer } from '@/lib/captchaClient';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Login / register captcha.
 * Only the latest /api/auth/captcha response may update token+question — avoids
 * Strict Mode / double-fetch races where the UI shows Q2 but token is still Q1
 * (first submit fails; refresh+retry works).
 */
export default function LoginCaptchaField({
  token,
  answer,
  onTokenChange,
  onAnswerChange,
  disabled = false,
  inputId = 'login-captcha',
  /** When true, verifies with the server on blur / Enter (registration). */
  verifyEarly = false,
  onVerifiedChange,
}) {
  const [question, setQuestion] = useState('');
  const [dummyHint, setDummyHint] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifyState, setVerifyState] = useState('idle');
  const [verifyMessage, setVerifyMessage] = useState('');
  const verifyingRef = useRef(false);
  const loadSeqRef = useRef(0);
  const abortRef = useRef(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const onAnswerChangeRef = useRef(onAnswerChange);
  const onVerifiedChangeRef = useRef(onVerifiedChange);

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);
  useEffect(() => {
    onAnswerChangeRef.current = onAnswerChange;
  }, [onAnswerChange]);
  useEffect(() => {
    onVerifiedChangeRef.current = onVerifiedChange;
  }, [onVerifiedChange]);

  const setVerified = useCallback((ok) => {
    onVerifiedChangeRef.current?.(ok);
  }, []);

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
    const seq = ++loadSeqRef.current;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    resetVerification();
    try {
      const res = await fetch('/api/auth/captcha', { cache: 'no-store', signal: ac.signal });
      const data = await res.json().catch(() => ({}));
      if (seq !== loadSeqRef.current) return;

      if (!res.ok) {
        setQuestion('Verification unavailable — refresh the page');
        setDummyHint('');
        onTokenChangeRef.current('');
        return;
      }
      setQuestion(data.question || 'Answer the question below');
      // Never surface CAPTCHA shortcuts in the UI.
      setDummyHint('');
      onTokenChangeRef.current(data.token || '');
      if (process.env.NODE_ENV === 'development' && data.dummyAnswer != null) {
        onAnswerChangeRef.current(String(data.dummyAnswer));
      } else {
        onAnswerChangeRef.current('');
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (seq !== loadSeqRef.current) return;
      setQuestion('Verification unavailable — refresh the page');
      onTokenChangeRef.current('');
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [resetVerification]);

  // Mount once (plus remount when parent bumps key=). Do NOT depend on loadChallenge
  // identity — that used to re-fetch and race with an in-flight token.
  useEffect(() => {
    void loadChallenge();
    return () => {
      loadSeqRef.current += 1;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only load
  }, []);

  useEffect(() => {
    if (!verifyEarly) return;
    resetVerification();
  }, [answer, token, verifyEarly, resetVerification]);

  const handleAnswerChange = (value) => {
    onAnswerChange(value);
    if (verifyEarly) resetVerification();
  };

  return (
    <Field
      className={cn(
        'bg-muted/40 gap-2 rounded-lg border p-3.5',
        verifyState === 'valid' && 'border-green-600/30',
        verifyState === 'invalid' && 'border-destructive/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={inputId} className="m-0 flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Verification
        </FieldLabel>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => void loadChallenge()}
          disabled={disabled || loading}
          aria-label="New verification question"
          title="New question"
        >
          <RefreshCw />
        </Button>
      </div>
      <FieldDescription className="m-0">{loading ? 'Loading question…' : question}</FieldDescription>
      {dummyHint ? <p className="text-primary m-0 text-sm font-semibold">{dummyHint}</p> : null}
      <Input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
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
          className={cn(
            'm-0 flex items-start gap-1.5 text-sm leading-relaxed',
            verifyState === 'valid' && 'text-green-700 dark:text-green-400',
            verifyState === 'invalid' && 'text-destructive',
            verifyState !== 'valid' && verifyState !== 'invalid' && 'text-muted-foreground',
          )}
          role="status"
        >
          {verifyState === 'valid' ? (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          ) : verifyState === 'invalid' ? (
            <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          ) : null}
          {verifyMessage}
        </p>
      ) : null}
    </Field>
  );
}
