'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import LoginCaptchaField from '@/components/auth/LoginCaptchaField';
import { verifyCaptchaAnswer } from '@/lib/captchaClient';
import { ROLE_HOME } from '@/lib/roleHome';

export default function IpSignInLanding() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/ip/bootstrap', { method: 'POST' }).catch(() => {});
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!captchaToken) {
        setError('Verification is still loading. Wait a moment, then try again.');
        return;
      }
      const check = await verifyCaptchaAnswer(captchaToken, captchaAnswer);
      if (!check.ok) {
        setError(check.error || 'Incorrect verification answer. Refresh the question and try again.');
        setCaptchaAnswer('');
        setCaptchaKey((k) => k + 1);
        return;
      }
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
        // Prefer short gate token (already verified) so NextAuth form parsing cannot break the challenge token
        captchaToken: check.gate || captchaToken,
        captchaAnswer: check.gate ? '1' : captchaAnswer,
      });
      if (res?.error) {
        setError(res.error);
        if (String(res.error).toLowerCase().includes('captcha') || String(res.error).toLowerCase().includes('verification')) {
          setCaptchaAnswer('');
          setCaptchaKey((k) => k + 1);
        }
        return;
      }
      const sess = await fetch('/api/auth/session').then((r) => r.json());
      const role = sess?.user?.role;
      router.push(ROLE_HOME[role] || '/');
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--primary-100)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_var(--primary-50)_0%,_transparent_45%)]"
      />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
            IP
          </div>
          <div>
            <p className="font-display text-3xl font-semibold tracking-tight">Internship Portal</p>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to continue your workplace journey</p>
          </div>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
            <CardDescription>Sign in with your email and password. New here? Use Register.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Sign in failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </FieldGroup>
              <LoginCaptchaField
                key={captchaKey}
                token={captchaToken}
                answer={captchaAnswer}
                onTokenChange={setCaptchaToken}
                onAnswerChange={setCaptchaAnswer}
              />
              <div className="flex justify-between gap-3 text-sm">
                <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
                  Reset password
                </Link>
                <Link href="/register" className="text-primary underline-offset-4 hover:underline">
                  Register
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Login'}
              </Button>
            </form>
            <Separator className="my-4" />
            <p className="text-center text-xs text-muted-foreground">
              SuperAdmin:{' '}
              <Link href="/superadmin/login" className="underline underline-offset-4">
                separate login
              </Link>
              {' · '}
              <Link href="/how-it-works" className="underline underline-offset-4">
                How it works
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
