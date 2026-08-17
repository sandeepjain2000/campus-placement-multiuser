'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        setMessage('If an account exists with that email, a password reset link has been sent.');
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
              <CardTitle className="mb-2 text-2xl font-semibold">Reset your password</CardTitle>
              <CardDescription className="text-base">
                Enter your email and we&apos;ll send you a link to reset your password.
              </CardDescription>
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
            {!message ? (
              <form onSubmit={handleSubmit}>
                <FieldGroup className="gap-4">
                  <Field className="gap-2">
                    <FieldLabel htmlFor="reset-email">Email address</FieldLabel>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </Field>
                  <Button type="submit" className="w-full" disabled={loading || !email}>
                    {loading ? 'Sending link…' : 'Send Reset Link'}
                  </Button>
                </FieldGroup>
              </form>
            ) : null}
          </CardContent>
        </Card>
        <p className="text-muted-foreground m-0 text-center text-sm">
          Remember your password?{' '}
          <Link href="/login" className="text-primary font-semibold no-underline hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
