'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LoginCaptchaField from '@/components/auth/LoginCaptchaField';
import AuthShell from '@/components/ip/AuthShell';
import { domainsMatch } from '@/lib/authRegisterRules';

/**
 * Employer registration:
 * - Domain path: Google step → website + matching work email → password emailed → login
 * - Form (manual): company details for SuperAdmin to create the account
 */
export default function EmployerRegisterPage() {
  const sp = useSearchParams();
  const referralCode = sp.get('ref') || '';
  const [path, setPath] = useState('choose'); // choose | domain-google | domain | form | done
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [reason, setReason] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState('');

  async function submitDomain(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!domainsMatch(website, email)) {
      setError('Website domain and work-email domain must match (e.g. company.com and hr@company.com).');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/ip/auth/register-employer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website,
          email,
          companyName,
          contactName,
          manualRequest: false,
          referralCode: referralCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setDone(data);
      setPath('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitForm(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ip/auth/register-employer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: website || undefined,
          email,
          companyName,
          contactName,
          reason,
          manualRequest: true,
          captchaToken,
          captchaAnswer,
          referralCode: referralCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setDone(data);
      setPath('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Employer registration" mark="E">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex justify-between">
            <div>
              <CardTitle>Employer registration</CardTitle>
              <CardDescription>
                Domain path for matching website/email, or Form request if you cannot use a company domain.
              </CardDescription>
            </div>
            <Button
              render={<Link href={path === 'choose' ? '/register' : '#'} />}
              variant="link"
              size="sm"
              onClick={(e) => {
                if (path !== 'choose') {
                  e.preventDefault();
                  setPath('choose');
                  setError('');
                  setHint('');
                }
              }}
            >
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
          {hint ? (
            <Alert>
              <AlertDescription>{hint}</AlertDescription>
            </Alert>
          ) : null}

          {path === 'choose' ? (
            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  setPath('domain-google');
                  setError('');
                }}
              >
                Domain register (matching website + work email)
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => {
                  setPath('form');
                  setError('');
                }}
              >
                Form — request SuperAdmin to create my account
              </Button>
              <p className="text-xs text-muted-foreground">
                Domain path requires website hostname and email domain to be the same. Form is for cases without a
                matching company domain/email — SuperAdmin will create the account after review.
              </p>
            </div>
          ) : null}

          {path === 'domain-google' ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Verify with Google, then enter your website and matching work email.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12"
                onClick={() => {
                  setPath('domain');
                  setHint(
                    'Google verification complete. Enter your company website and work email (domains must match). We email a temporary password to that work inbox.',
                  );
                }}
              >
                Continue with Google
              </Button>
            </div>
          ) : null}

          {path === 'domain' ? (
            <form className="space-y-4" onSubmit={submitDomain}>
              <div className="rounded-md border bg-slate-50 p-3 space-y-3">
                <h3 className="font-medium text-sm">Automated domain verification</h3>
                <Field>
                  <FieldLabel>Company website</FieldLabel>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourcompany.com"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Work email (same domain as website)</FieldLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hr@yourcompany.com"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Company name (optional)</FieldLabel>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>Contact name (optional)</FieldLabel>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </Field>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Registering…' : 'Register & email password'}
              </Button>
            </form>
          ) : null}

          {path === 'form' ? (
            <form className="space-y-4" onSubmit={submitForm}>
              <div className="rounded-md border p-3 space-y-3">
                <h3 className="font-medium text-sm">Manual verification request</h3>
                <p className="text-xs text-muted-foreground">
                  Submit details so SuperAdmin can create your employer account. You will be contacted / receive
                  credentials after review (you will not get an instant password email on this path).
                </p>
                <Field>
                  <FieldLabel>Company name</FieldLabel>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel>Contact email</FieldLabel>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel>Contact name</FieldLabel>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>Website (optional)</FieldLabel>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
                </Field>
                <Field>
                  <FieldLabel>Reason / additional info</FieldLabel>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Why you cannot use a matching domain email…"
                    required
                  />
                </Field>
                <LoginCaptchaField
                  token={captchaToken}
                  answer={captchaAnswer}
                  onTokenChange={setCaptchaToken}
                  onAnswerChange={setCaptchaAnswer}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit request to SuperAdmin'}
              </Button>
            </form>
          ) : null}

          {path === 'done' && done ? (
            <div className="space-y-4">
              <Alert>
                <AlertTitle>{done.mode === 'manual_request' ? 'Request submitted' : 'Account created'}</AlertTitle>
                <AlertDescription>
                  {done.message}
                  {done.warning ? ` ${done.warning}` : ''}
                  {done.mode === 'manual_request'
                    ? ' SuperAdmin will create your account if approved — watch for follow-up.'
                    : ' Use the emailed password on the login page to enter the employer portal.'}
                </AlertDescription>
              </Alert>
              <Button render={<Link href="/" />} className="w-full">
                Go to login
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
