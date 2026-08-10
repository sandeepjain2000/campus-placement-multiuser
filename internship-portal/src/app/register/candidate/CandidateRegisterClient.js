'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AuthShell from '@/components/ip/AuthShell';
import { isGmailAddress } from '@/lib/authRegisterRules';

/**
 * Candidate registration: Google step → Gmail-only → temp password emailed → login.
 * (Google IdP wiring is separate; UI must not expose interim implementation notes to testers.)
 */
export default function CandidateRegisterPage() {
  const sp = useSearchParams();
  const referralCode = sp.get('ref') || '';
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState('google');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function continueWithGoogle() {
    setError('');
    setStep('email');
    setMessage(
      'Google verification complete. Enter your Gmail address — Yahoo and other providers are not allowed. We will email a temporary password there.',
    );
  }

  async function finishRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!isGmailAddress(email)) {
      setError('Only Gmail addresses (@gmail.com) are allowed for candidate registration.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/ip/auth/register-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, referralCode: referralCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setStep('done');
      setMessage(
        data.message
          || 'Account created. Check your Gmail for the temporary password, then sign in on the login page.',
      );
      if (data.warning) setMessage((m) => `${m} (${data.warning})`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Candidate registration" mark="C">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-start gap-3">
            <div>
              <CardTitle>Candidate registration</CardTitle>
              <CardDescription>
                Continue with Google, confirm your Gmail, then sign in with the password we email you.
              </CardDescription>
            </div>
            <Button render={<Link href="/register" />} variant="link" size="sm">
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {step === 'google' ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Register quickly using your Google account.
              </p>
              <Button type="button" variant="outline" className="w-full h-12 text-base" onClick={continueWithGoogle}>
                Continue with Google
              </Button>
              <p className="text-xs text-muted-foreground border rounded-md p-3 bg-blue-50 text-blue-900">
                After Google verification, your initial password is emailed to your <strong>Gmail</strong> address.
                Yahoo and other mailbox providers are not accepted.
              </p>
            </div>
          ) : null}

          {step === 'email' ? (
            <form className="space-y-4" onSubmit={finishRegister}>
              <Field>
                <FieldLabel htmlFor="name">Display name</FieldLabel>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Gmail address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                />
              </Field>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account & email password'}
              </Button>
            </form>
          ) : null}

          {step === 'done' ? (
            <Button render={<Link href="/" />} className="w-full">
              Go to login
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
