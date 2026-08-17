'use client';
import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { getDashboardPath, cn } from '@/lib/utils';
import { DEMO_LOGINS, DEMO_SEED_PASSWORD, isDemoLoginsEnabled, SEEDED_EMPLOYER_CREDENTIALS } from '@/lib/demoLogins';
import { ArrowRight, ChevronDown, ChevronUp, KeyRound, GraduationCap, Building2, School, ShieldCheck, Users, Eye, EyeOff, MessageCircleQuestion, BookOpen, ClipboardList } from 'lucide-react';
import LoginCaptchaField from '@/components/auth/LoginCaptchaField';
import DocumentationHelpWidget from '@/components/DocumentationHelpWidget';
import LoginSupportContact from '@/components/auth/LoginSupportContact';
import DevScreenTag from '@/components/DevScreenTag';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import {
  consumeLoginPrefillEmail,
  readLoginFormValues,
  writeLoginFormValues,
} from '@/lib/loginClient';
import { markBrowserSessionActive, SESSION_BROWSER_MARKER_KEY } from '@/lib/sessionPolicy';

/** Match `/demo-accounts` three-column grouping: Students | Employers | (Super + College admins). */
const DEMO_GROUP_META = {
  student: {
    label: 'Students',
    icon: GraduationCap,
    color: 'var(--primary-700)',
    bg: 'var(--primary-50)',
    border: 'var(--primary-200)',
  },
  alumni: {
    label: 'Alumni',
    icon: GraduationCap,
    color: 'var(--accent-700, #6d28d9)',
    bg: 'var(--accent-50, #f5f3ff)',
    border: 'var(--accent-200, #ddd6fe)',
  },
  employer: {
    label: 'Employers',
    icon: Building2,
    color: 'var(--success-700)',
    bg: 'var(--success-50)',
    border: 'var(--success-200)',
  },
  admin: {
    label: 'College Admins',
    icon: School,
    color: 'var(--warning-700)',
    bg: 'var(--warning-50)',
    border: 'var(--warning-200)',
  },
  placement_committee: {
    label: 'Placement Committees',
    icon: ClipboardList,
    color: '#0f766e',
    bg: '#f0fdfa',
    border: '#99f6e4',
  },
  superadmin: {
    label: 'Super Admins',
    icon: ShieldCheck,
    color: 'var(--danger-700)',
    bg: 'var(--danger-50)',
    border: 'var(--danger-200)',
  },
  dummy: {
    label: 'Coming Soon',
    icon: Users,
    color: 'var(--text-tertiary)',
    bg: 'var(--bg-secondary)',
    border: 'var(--border-default)',
  },
};

function getGroupKey(demo) {
  if (demo.isDummy) return 'dummy';
  if (demo.group === 'alumni') return 'alumni';
  if (demo.group === 'placement_committee' || demo.icon === '📋') return 'placement_committee';
  if (demo.icon === '🎓') return 'student';
  if (demo.icon === '🏢') return 'employer';
  if (demo.icon === '⚙️') return 'superadmin';
  if (demo.icon === '🏫') return 'admin';
  return 'admin';
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}><div className="skeleton" style={{ width: 220, height: 28 }} /></div>}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    try {
      sessionStorage.setItem('placementhub_login_source', '/login');
    } catch (e) {}
  }, []);
  const forceLogin = searchParams.get('force') === '1';
  const guidedAutoLogin = searchParams.get('guided') === '1';
  const guidedEmail = searchParams.get('email')?.trim() || '';
  const guidedLoginAttempted = useRef(false);
  const { status, data: session } = useSession();
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [registeredBanner, setRegisteredBanner] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const signingOut = useRef(false);
  const loggingInRef = useRef(false);
  const loginFormRef = useRef(null);
  /** After the user types or picks a saved login, do not overwrite with ?email= from the URL. */
  const userChoseCredentials = useRef(false);
  const urlPrefillApplied = useRef(false);
  const toast = useToast();
  const [emailReadOnly, setEmailReadOnly] = useState(true);
  const [passwordReadOnly, setPasswordReadOnly] = useState(true);

  // --- Login debug logging (per-browser, localStorage flag) ---
  const DEBUG_FLAG_KEY = 'placementhub_debug';
  const [debugMode, setDebugMode] = useState(false);
  const debugModeRef = useRef(false);
  const debugStepsRef = useRef([]);
  const debugSessionId = useRef(`dbg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    try {
      const enabled = localStorage.getItem(DEBUG_FLAG_KEY) === '1';
      setDebugMode(enabled);
      debugModeRef.current = enabled;
    } catch { /* ignore */ }
  }, []);

  const toggleDebugMode = (val) => {
    setDebugMode(val);
    debugModeRef.current = val;
    try {
      if (val) localStorage.setItem(DEBUG_FLAG_KEY, '1');
      else localStorage.removeItem(DEBUG_FLAG_KEY);
    } catch { /* ignore */ }
  };

  const debugLog = useRef((event, data = null) => {
    if (!debugModeRef.current) return;
    const step = { t: new Date().toISOString(), event, data };
    debugStepsRef.current.push(step);
    console.log('[login-debug]', step);
  });

  const flushDebugLog = useRef(async (email, { failed = false } = {}) => {
    if (!failed) return;
    let steps = [...debugStepsRef.current];
    debugStepsRef.current = [];
    if (!steps.length) {
      steps = [{ t: new Date().toISOString(), event: 'signin_failed', data: { email } }];
    }
    try {
      await fetch('/api/debug/login-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps,
          email,
          failed: true,
          userAgent: navigator.userAgent,
          sessionId: debugSessionId.current,
        }),
      });
    } catch (e) {
      console.error('[login-debug] failed to flush log', e);
    }
  });

  const uniqueDemoLogins = useMemo(() => {
    const seen = new Set();
    const merged = [...DEMO_LOGINS, ...SEEDED_EMPLOYER_CREDENTIALS];
    return merged.filter((d) => {
      const key = String(d?.email || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);
  const demosByGroup = useMemo(() => {
    const buckets = { student: [], alumni: [], employer: [], admin: [], placement_committee: [], superadmin: [], dummy: [] };
    for (const d of uniqueDemoLogins) {
      const k = getGroupKey(d);
      if (buckets[k]) buckets[k].push(d);
    }
    return buckets;
  }, [uniqueDemoLogins]);

  /**
   * Demo prefill (sessionStorage from /demo-accounts, or URL ?email= param).
   * DO NOT MODIFY NEEDLESSLY. This is a fix for double login requirement and test prefill.
   */
  useEffect(() => {
    if (userChoseCredentials.current || urlPrefillApplied.current) return;

    const emailFromStorage = consumeLoginPrefillEmail();
    const emailFromUrl = searchParams.get('email')?.trim() || '';
    const email = emailFromStorage || emailFromUrl;
    if (!email) return;

    urlPrefillApplied.current = true;

    // Clean up query param so page refreshes don't stick to it
    if (emailFromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('email');
      const next = params.toString() ? `/login?${params}` : '/login';
      router.replace(next, { scroll: false });
    }

    const frame = window.requestAnimationFrame(() => {
      if (userChoseCredentials.current) return;
      const form = loginFormRef.current;
      if (!form) return;
      const current = readLoginFormValues(form).email;
      if (current && current.toLowerCase() !== email.toLowerCase()) {
        userChoseCredentials.current = true;
        return;
      }
      if (!current) {
        writeLoginFormValues(form, { email, password: DEMO_SEED_PASSWORD });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [searchParams, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const verify = params.get('verify');
    if (verify === 'success') {
      setRegisteredBanner('Email verified. You can sign in below with your password.');
      return;
    }
    if (verify === 'expired') {
      setRegisteredBanner('That verification link has expired. Register again or contact support if you need help.');
      return;
    }
    if (verify === 'invalid' || verify === 'error') {
      setRegisteredBanner('That verification link is invalid or was already used.');
      return;
    }
    const errorParam = params.get('error');
    if (errorParam) {
      console.warn(`LoginPage: Landed on login page with error query parameter: ${errorParam}`);
      if (errorParam === 'session') {
        setError('Sign-in could not be completed. Please try again.');
      } else if (errorParam === 'stale') {
        setError('Your browser session has ended. Please sign in again.');
      } else if (errorParam === 'CredentialsSignin') {
        setError('Incorrect email or password. Please try again.');
      } else if (errorParam === 'Configuration') {
        setError('Server authentication configuration error. Please contact support.');
      } else if (errorParam === 'AccessDenied') {
        setError('Access denied. You do not have permission to sign in.');
      } else if (errorParam === 'Verification') {
        setError('The verification link has expired or has already been used.');
      } else {
        setError(`Sign-in error: ${errorParam}. Please try again.`);
      }
      return;
    }
    const q = params.get('registered');
    if (q === 'pending-platform') {
      setRegisteredBanner(
        'Registration received. Verify your email from our message, then wait for platform approval before signing in.',
      );
    } else if (q === 'check-email' || q === 'true') {
      setRegisteredBanner(
        'Account created. Open the verification link we emailed you, then sign in below with the password you chose.',
      );
    }
  }, []);

  // If ?force=1, sign out existing session so the user can switch accounts
  // DO NOT MODIFY NEEDLESSLY. This is a fix for double login requirement.
  useEffect(() => {
    if (loggingInRef.current) return; // skip force-signout if we are actively in the middle of logging in
    if (forceLogin && status === 'authenticated' && !signingOut.current) {
      signingOut.current = true;
      console.log('LoginPage: force login requested and user is authenticated. Performing full redirecting signout...');
      void signOut({ callbackUrl: '/login' });
    }
  }, [forceLogin, status]);

  // If ?force=1 and we are already unauthenticated, clean up the query parameter so next logins don't inherit it.
  useEffect(() => {
    if (forceLogin && status === 'unauthenticated') {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('force');
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '/login';
      const next = params.toString() ? `${pathname}?${params}` : pathname;
      router.replace(next, { scroll: false });
    }
  }, [forceLogin, status, searchParams, router]);

  // DO NOT MODIFY NEEDLESSLY. This is a fix for double login requirement.
  // We only redirect client-side if the session is fully active (marker === '1').
  // If the marker is missing (e.g. stale session or just logged out), we do NOT trigger
  // a client-side signOut on the login page itself to avoid redirect loops and double signouts.
  // Instead, the stale session check is handled when they try to access protected pages.
  useEffect(() => {
    if (forceLogin) return; // don't auto-redirect when force login
    if (loggingInRef.current) return; // skip stale check if actively logging in
    if (status !== 'authenticated' || !session?.user?.role) return;

    let marker = null;
    try {
      marker = sessionStorage.getItem(SESSION_BROWSER_MARKER_KEY);
    } catch {
      /* ignore */
    }

    if (marker === '1') {
      router.replace(getDashboardPath(session.user.role));
    }
  }, [status, session, router, forceLogin]);

  const submitCredentials = useCallback(
    async ({ email, password, token, answer }) => {
      console.log(`LoginPage: submitCredentials initiated for email: ${email}`);
      if (!email || !password) {
        console.warn('LoginPage: submitCredentials validation failed (missing email/password)');
        setError('Email and password are required.');
        return false;
      }
      if (!token) {
        console.warn('LoginPage: submitCredentials validation failed (missing captchaToken)');
        setError('Verification is still loading. Wait a moment, then try again.');
        return false;
      }
      const finalAnswer = String(answer ?? '').trim();
      setError('');
      setLoading(true);
      loggingInRef.current = true;
      setCaptchaAnswer(finalAnswer);
      debugLog.current('submit_start', { email, hasCaptchaToken: !!token, answer: finalAnswer || null });
      try {
        debugLog.current('signing_in');
        console.log('LoginPage: Invoking next-auth signIn with credentials...');
        const result = await signIn('credentials', {
          email,
          password,
          captchaToken: token,
          captchaAnswer: finalAnswer,
          redirect: false,
          callbackUrl: '/login', // explicitly set callbackUrl to /login (no query params!)
        });
        
        console.log('LoginPage: next-auth signIn response:', {
          ok: result?.ok,
          status: result?.status,
          error: result?.error,
          url: result?.url
        });
        debugLog.current('signin_response', { ok: result?.ok, status: result?.status, error: result?.error || null });

        if (result?.error || result?.ok === false) {
          console.error(`LoginPage: signIn failed. error=${result?.error}`);
          loggingInRef.current = false;
          let userMsg = result?.error;
          if (userMsg === 'CredentialsSignin') {
            userMsg = 'Incorrect email or password. Please try again.';
          } else if (!userMsg) {
            userMsg = 'Sign in failed. Please check your credentials and try again.';
          }
          setError(userMsg);
          debugLog.current('signin_failed', { error: result?.error, userMsg });
          await flushDebugLog.current(email, { failed: true });
          if (String(result?.error || '').toLowerCase().includes('verification')) {
            setCaptchaAnswer('');
            setCaptchaKey((k) => k + 1);
          }
          // Pause for 2 seconds as requested by user to display failure result
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return false;
        }

        console.log('LoginPage: signIn succeeded. Marking browser session active and preparing redirection...');
        markBrowserSessionActive();
        debugLog.current('signin_success', { url: result?.url || null });
        
        // Display success message and wait 2 seconds before redirecting
        setRegisteredBanner('Sign in successful! Redirecting in 2 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // /auth/continue reads the session cookie server-side — no need to wait for SessionProvider.
        if (typeof window !== 'undefined') {
          window.location.replace(`${window.location.origin}/auth/continue`);
        } else {
          router.replace('/auth/continue');
        }
        return true;
      } catch (err) {
        console.error('LoginPage: submitCredentials exception caught:', err);
        debugLog.current('signin_exception', { message: err?.message || String(err) });
        await flushDebugLog.current(email, { failed: true });
        setError('An unexpected error occurred during sign-in. Please try again.');
        loggingInRef.current = false;
        // Pause for 2 seconds to let the user see the failure message
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  /** Guided playbook — dev only: sign in via server API (no captcha UI race). */
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!guidedAutoLogin || !guidedEmail) return;
    if (guidedLoginAttempted.current) return;
    if (forceLogin && status === 'loading') return;

    guidedLoginAttempted.current = true;
    void (async () => {
      setError('');
      setLoading(true);
      try {
        const res = await fetch('/api/guided-runner/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email: guidedEmail, password: DEMO_SEED_PASSWORD }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok || !data.redirectTo) {
          guidedLoginAttempted.current = false;
          setError(data.error || 'Guided sign-in failed. Start the playbook in a second terminal.');
          return;
        }
        markBrowserSessionActive();
        window.location.replace(`${window.location.origin}${data.redirectTo}`);
      } catch {
        guidedLoginAttempted.current = false;
        setError('Guided sign-in failed. Check that npm run test:guided:playbook is running.');
      } finally {
        setLoading(false);
      }
    })();
  }, [guidedAutoLogin, guidedEmail, forceLogin, status]);

  /** Only hide the form when already signed in (redirecting), signing out, or loading session when forceLogin is true. */
  if (status === 'authenticated' || signingOut.current || (forceLogin && status === 'loading')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="skeleton" style={{ width: 220, height: 28 }} />
      </div>
    );
  }

  const showDemoLogins = isDemoLoginsEnabled();

  const handleSubmit = async (e) => {
    e.preventDefault();
    userChoseCredentials.current = true;
    const { email, password } = readLoginFormValues(e.currentTarget);

    if (!captchaToken) {
      setError('Verification is still loading. Wait a moment, then try again.');
      return;
    }
    await submitCredentials({
      email,
      password,
      token: captchaToken,
      answer: captchaAnswer,
    });
  };

  const fillCredential = (demo) => {
    if (demo.isDummy) {
      toast.info("Placement Committee is coming soon. It's currently in design.");
      return;
    }
    setError('');
    userChoseCredentials.current = true;
    writeLoginFormValues(loginFormRef.current, { email: demo.email, password: DEMO_SEED_PASSWORD });
    setShowCredentials(false);
    toast.info('Credentials auto-filled — click Sign In.');
  };


  /** One card — same structure as a column on `/demo-accounts`. */
  const renderDemoListCard = (groupKey) => {
    const items = demosByGroup[groupKey] || [];
    if (items.length === 0) return null;
    const meta = DEMO_GROUP_META[groupKey];
    const Icon = meta.icon;
    return (
      <Card key={groupKey} size="sm" className="min-w-0 gap-0 overflow-hidden py-0">
        <CardHeader
          className="gap-1 border-b px-2.5 py-2"
          style={{ background: meta.bg, borderBottomColor: meta.border, color: meta.color }}
        >
          <CardTitle className="flex items-center gap-1.5 text-[0.65rem] font-bold tracking-wide uppercase">
            <Icon className="size-3.5" aria-hidden />
            {meta.label} ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.map((demo, i) => (
            <div
              key={demo.email}
              className={cn(
                'flex items-center justify-between gap-2 px-2.5 py-1.5',
                i < items.length - 1 && 'border-border border-b',
                !demo.isDummy && 'border-l-[3px]'
              )}
              style={!demo.isDummy ? { borderLeftColor: meta.color } : undefined}
            >
              <div className="min-w-0">
                <div
                  className={cn(
                    'truncate text-xs font-semibold',
                    demo.isDummy ? 'text-muted-foreground' : 'text-foreground'
                  )}
                >
                  {demo.label}
                  {demo.name ? <span className="text-muted-foreground font-normal"> · {demo.name}</span> : null}
                </div>
                <div className="text-muted-foreground mt-0.5 truncate font-mono text-[0.68rem]">{demo.email}</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant={demo.isDummy ? 'secondary' : 'outline'}
                disabled={demo.isDummy}
                className="h-7 shrink-0 px-2 text-[0.68rem]"
                style={
                  demo.isDummy
                    ? undefined
                    : { borderColor: meta.border, background: meta.bg, color: meta.color }
                }
                onClick={() => fillCredential(demo)}
              >
                {demo.isDummy ? 'Soon' : 'Use →'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-muted/40 px-4 py-10 sm:px-6 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--primary-100),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_var(--info-100),_transparent_45%)] opacity-80"
        aria-hidden
      />
      <div className="fixed top-2.5 right-3 z-[100000]">
        <DevScreenTag />
      </div>

      <div
        className={cn(
          'relative z-10 flex w-full flex-col gap-4',
          showCredentials && showDemoLogins ? 'max-w-5xl' : 'max-w-lg'
        )}
      >
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <span>&larr;</span> Back to landing page
        </Link>

        <Card className="w-full gap-6 py-6">
          <CardHeader className="gap-6 px-6">
            <Link href="/" className="inline-flex items-center gap-3 no-underline">
              <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg text-lg font-bold shadow-xs">
                P
              </div>
              <span className="text-foreground text-lg font-semibold tracking-tight">PlacementHub</span>
            </Link>
            <div>
              <CardTitle className="mb-2 text-2xl font-semibold">Welcome back</CardTitle>
              <CardDescription className="text-base">Sign in to your account to continue</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 px-6">
            {registeredBanner && !error && (
              <Alert>
                <AlertDescription>{registeredBanner}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {showDemoLogins && (
              <div className="hidden-on-mobile flex flex-col gap-2.5">
                <Button
                  type="button"
                  id="view-credentials-btn"
                  variant={showCredentials ? 'secondary' : 'outline'}
                  className="h-auto w-full justify-between px-3 py-2.5"
                  onClick={() => setShowCredentials((v) => !v)}
                >
                  <span className="inline-flex items-center gap-2">
                    <KeyRound data-icon="inline-start" />
                    Demo accounts
                  </span>
                  {showCredentials ? <ChevronUp /> : <ChevronDown />}
                </Button>

                {showCredentials && (
                  <div className="border-border overflow-hidden rounded-lg border">
                    <div className="bg-muted text-muted-foreground flex flex-wrap items-center gap-1.5 border-b px-3.5 py-2 text-xs">
                      Same layout as <strong className="text-foreground">View all system accounts</strong> — password:{' '}
                      <code className="bg-background text-foreground rounded px-1.5 py-0.5 font-bold">{DEMO_SEED_PASSWORD}</code>
                    </div>

                    <div className="bg-card p-3">
                      <div className="login-demo-accounts-grid grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="flex min-w-0 flex-col gap-3">
                          {renderDemoListCard('student')}
                          {renderDemoListCard('alumni')}
                          {renderDemoListCard('dummy')}
                        </div>
                        <div className="min-w-0">{renderDemoListCard('employer')}</div>
                        <div className="flex min-w-0 flex-col gap-3">
                          {renderDemoListCard('superadmin')}
                          {renderDemoListCard('admin')}
                          {renderDemoListCard('placement_committee')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {guidedAutoLogin && process.env.NODE_ENV !== 'production' ? (
              <Alert>
                <AlertDescription>
                  Guided test — signing in automatically as <strong>{guidedEmail || 'demo user'}</strong>.
                  {loading ? ' Please wait…' : null}
                </AlertDescription>
              </Alert>
            ) : null}

            <form id="login-form" ref={loginFormRef} onSubmit={handleSubmit} autoComplete="off">
              <FieldGroup className="gap-4">
                <Field className="gap-2">
                  <FieldLabel htmlFor="login-email" className="leading-5">
                    Email address*
                  </FieldLabel>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="off"
                    readOnly={emailReadOnly}
                    onFocus={() => setEmailReadOnly(false)}
                    onClick={() => setEmailReadOnly(false)}
                    placeholder="Enter your email address"
                    defaultValue=""
                    onInput={() => {
                      userChoseCredentials.current = true;
                    }}
                    required
                  />
                </Field>

                <Field className="w-full gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="login-password" className="leading-5">
                      Password*
                    </FieldLabel>
                    <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground text-sm hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <InputGroup>
                    <InputGroupInput
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="off"
                      readOnly={passwordReadOnly}
                      onFocus={() => setPasswordReadOnly(false)}
                      onClick={() => setPasswordReadOnly(false)}
                      placeholder="••••••••••••••••"
                      defaultValue=""
                      onInput={() => {
                        userChoseCredentials.current = true;
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        if (captchaToken) return;
                        e.preventDefault();
                        userChoseCredentials.current = true;
                        setError('Verification is still loading. Wait a moment, then try again.');
                      }}
                      required
                    />
                    <InputGroupAddon align="inline-end" className="pr-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-muted-foreground rounded-l-none hover:bg-transparent"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </Button>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                <LoginCaptchaField
                  key={captchaKey}
                  token={captchaToken}
                  answer={captchaAnswer}
                  onTokenChange={setCaptchaToken}
                  onAnswerChange={setCaptchaAnswer}
                  disabled={loading}
                />

                <Field>
                  <Button
                    id="login-submit"
                    type="submit"
                    className="w-full"
                    disabled={loading || !captchaToken}
                    title={!captchaToken ? 'Wait for the verification question to load' : undefined}
                  >
                    {loading ? 'Signing in…' : !captchaToken ? 'Loading verification…' : 'Sign In'}
                  </Button>
                </Field>
              </FieldGroup>
            </form>

            <div className="hidden-on-mobile flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <Separator className="flex-1" />
                <p className="text-muted-foreground text-sm">or</p>
                <Separator className="flex-1" />
              </div>
              <Button variant="outline" className="h-auto w-full justify-between px-3 py-2.5" render={<Link href="/demo-accounts" target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
                <span className="inline-flex items-center gap-2">
                  <Users data-icon="inline-start" />
                  View all system accounts
                </span>
                <ArrowRight className="text-muted-foreground" />
              </Button>
              <Button variant="outline" className="hidden-on-mobile h-auto w-full justify-between px-3 py-2.5" render={<Link href="/help" />} nativeButton={false}>
                <span className="inline-flex items-center gap-2">
                  <BookOpen data-icon="inline-start" />
                  Help documentation
                </span>
                <ArrowRight className="text-muted-foreground" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <LoginSupportContact
          hideExternalInboxLinks={
            Boolean(registeredBanner) ||
            searchParams.get('registered') != null ||
            searchParams.get('verify') != null
          }
        />

        <p className="text-muted-foreground mt-1 text-center text-[0.8125rem] leading-relaxed">
          <MessageCircleQuestion size={14} className="mr-1 inline align-middle" aria-hidden />
          FAQ search: use the <strong>Help</strong> button at the bottom-right.
        </p>

        <div className="text-muted-foreground text-center text-sm">
          Employers and colleges:{' '}
          <Link href="/register" className="text-foreground font-medium hover:underline">
            Request an account
          </Link>
          <div className="mt-1 text-xs">
            Students are added by their college — use the login email from your welcome message.
          </div>
        </div>

        <div className="text-muted-foreground mt-4 text-center font-mono text-xs">
          Build: 13 Jun 2026, 02:37 AM (v1.0.11-debug)
        </div>

        <div className="mt-3 text-center">
          <label
            htmlFor="login-debug-toggle"
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 font-mono text-[0.72rem] select-none',
              debugMode ? 'text-amber-600' : 'text-muted-foreground'
            )}
          >
            <Checkbox
              id="login-debug-toggle"
              checked={debugMode}
              onCheckedChange={(v) => toggleDebugMode(!!v)}
            />
            {debugMode
              ? '🔴 Login debug ON — step trace in browser console; failures go to Error Logs'
              : 'Enable login debug (console only)'}
          </label>
        </div>

        <DocumentationHelpWidget fullDocHref="/help" />
      </div>
    </div>
  );
}
