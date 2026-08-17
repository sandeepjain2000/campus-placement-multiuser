'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { getPasswordValidationError, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_HINT } from '@/lib/validators';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const INITIAL_FORM = {
  collegeName: '',
  city: '',
  state: '',
  naacGrade: '',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminPassword: '',
};

export default function AdminAddCollegePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const copyEnrollmentKey = async () => {
    if (!created?.enrollmentKey) return;
    try {
      await navigator.clipboard.writeText(created.enrollmentKey);
      setCopiedKey(true);
      addToast('Enrollment key copied', 'success');
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      addToast('Could not copy to clipboard', 'error');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const passwordErr = getPasswordValidationError(form.adminPassword);
    if (passwordErr) {
      setError(passwordErr);
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create college');
      setCreated(json);
      addToast('College created and admin account activated', 'success');
    } catch (e) {
      setError(e.message || 'Failed to create college');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="animate-fadeIn flex max-w-2xl flex-col gap-4 pb-8">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Add College</h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">{created.college?.name} is live on the platform.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>College provisioned</CardTitle><CardDescription>The workspace and administrator account are ready.</CardDescription></CardHeader>
          <CardContent>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">College</dt>
              <dd className="mt-1 font-semibold">{created.college?.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Location</dt>
              <dd className="mt-1">
                {[created.college?.city, created.college?.state].filter(Boolean).join(', ')}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">College admin</dt>
              <dd className="mt-1">
                {created.admin?.firstName} · {created.admin?.email}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Student enrollment key</dt>
              <dd className="mt-2 flex flex-wrap items-center gap-2">
                <code className="bg-muted rounded-md border px-3 py-2 font-mono text-base tracking-wider">
                  {created.enrollmentKey}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={copyEnrollmentKey}>
                  {copiedKey ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                  {copiedKey ? 'Copied' : 'Copy'}
                </Button>
              </dd>
            </div>
          </dl>
          <p className="text-muted-foreground mt-5 mb-0 text-sm">
            The admin received approval and enrollment-key emails. Share the login password you set using your official channel.
          </p>
          </CardContent>
          <CardFooter className="flex-wrap gap-2 border-t">
            <Button render={<Link href="/dashboard/admin/colleges" />}>Back to Colleges</Button>
            <Button
              type="button" variant="outline"
              onClick={() => {
                setCreated(null);
                setForm(INITIAL_FORM);
              }}
            >
              Add another
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn flex max-w-3xl flex-col gap-4 pb-12">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/admin/colleges" />}><ArrowLeft data-icon="inline-start" />Back to Colleges</Button>
        <h1 className="mt-3 mb-0 flex items-center gap-2 text-2xl font-semibold tracking-tight"><Building2 aria-hidden />Add College</h1>
        <p className="text-muted-foreground mt-1 mb-0 max-w-2xl text-sm">
          Provision a college workspace and an active college admin account. Self-service sign-ups still go through{' '}
          <Link href="/dashboard/admin/pending-registrations">Onboard colleges & employers</Link>.
        </p>
      </div>
      <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader><CardTitle>Provision institution</CardTitle><CardDescription>Create the institution record and its first administrator.</CardDescription></CardHeader>
        <CardContent><FieldGroup>
          <FieldSet><FieldLegend>Institution</FieldLegend>
          <div className="grid gap-5 md:grid-cols-2">
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="collegeName">College name</FieldLabel>
            <Input id="collegeName"
              value={form.collegeName}
              onChange={onChange('collegeName')}
              required
              autoComplete="organization"
            />
          </Field>
          <Field><FieldLabel htmlFor="city">City</FieldLabel><Input id="city" value={form.city} onChange={onChange('city')} required /></Field>
          <Field><FieldLabel htmlFor="state">State</FieldLabel><Input id="state" value={form.state} onChange={onChange('state')} required /></Field>
          <Field>
            <FieldLabel htmlFor="naacGrade">NAAC grade (optional)</FieldLabel>
            <Input id="naacGrade"
              value={form.naacGrade}
              onChange={onChange('naacGrade')}
              placeholder="e.g. A+"
            />
          </Field></div></FieldSet>
          <FieldSet><FieldLegend>College administrator</FieldLegend>
          <div className="grid gap-5 md:grid-cols-2">
          <Field><FieldLabel htmlFor="adminFirstName">First name</FieldLabel><Input id="adminFirstName"
              value={form.adminFirstName}
              onChange={onChange('adminFirstName')}
              required
              autoComplete="given-name"
            /></Field>
          <Field><FieldLabel htmlFor="adminLastName">Last name</FieldLabel><Input id="adminLastName"
              value={form.adminLastName}
              onChange={onChange('adminLastName')}
              autoComplete="family-name"
            /></Field>
          <Field><FieldLabel htmlFor="adminEmail">Email</FieldLabel><Input id="adminEmail" type="email"
              value={form.adminEmail}
              onChange={onChange('adminEmail')}
              required
              autoComplete="email"
            /></Field>
          <Field><FieldLabel htmlFor="adminPassword">Initial password</FieldLabel><Input id="adminPassword" type="password"
              value={form.adminPassword}
              onChange={onChange('adminPassword')}
              required
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              placeholder={PASSWORD_REQUIREMENTS_HINT}
            />
            <FieldDescription>{PASSWORD_REQUIREMENTS_HINT}</FieldDescription>
          </Field></div></FieldSet>
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        </FieldGroup></CardContent>
        <CardFooter className="flex-wrap gap-2 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create college'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard/admin/colleges')}>
            Cancel
          </Button>
        </CardFooter>
      </Card></form>
    </div>
  );
}
