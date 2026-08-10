'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPasswordValidationError, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_HINT } from '@/lib/validators';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      const t = q.get('token');
      if (t) setToken(t);
      else setError('Invalid or missing reset token.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const passwordErr = getPasswordValidationError(password);
    if (passwordErr) {
      setError(passwordErr);
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        setMessage('Your password has been successfully reset. You can now sign in.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Card className="w-full gap-6 py-6">
          <CardHeader className="gap-6 px-6">
            <Link href="/" className="inline-flex items-center gap-3 no-underline">
              <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg text-lg font-bold shadow-xs">
                P
              </div>
              <span className="text-foreground text-lg font-semibold tracking-tight">PlacementHub</span>
            </Link>
            <div>
              <CardTitle className="mb-2 text-2xl font-semibold">Set new password</CardTitle>
              <CardDescription className="text-base">Enter your new password below.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-6">
            {message ? (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {!message && token && !error.includes('missing') ? (
              <form onSubmit={handleSubmit}>
                <FieldGroup className="gap-4">
                  <Field className="gap-2">
                    <FieldLabel htmlFor="reset-pwd">New Password</FieldLabel>
                    <Input
                      id="reset-pwd"
                      type="password"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                    />
                    <FieldDescription>{PASSWORD_REQUIREMENTS_HINT}</FieldDescription>
                  </Field>
                  <Field className="gap-2">
                    <FieldLabel htmlFor="reset-confirm-pwd">Confirm New Password</FieldLabel>
                    <Input
                      id="reset-confirm-pwd"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                    />
                  </Field>
                  <Button type="submit" className="w-full" disabled={loading || !password || !confirmPassword}>
                    {loading ? 'Saving…' : 'Reset Password'}
                  </Button>
                </FieldGroup>
              </form>
            ) : null}

            {message ? (
              <Button className="w-full" render={<Link href="/login" />} nativeButton={false}>
                Sign In
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
