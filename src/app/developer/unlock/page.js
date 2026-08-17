'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';

function UnlockForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/developer';
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/developer-notes/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json?.error === 'Invalid password' ? 'Incorrect password' : (json?.error || 'Incorrect password'));
        return;
      }
      const safeFrom =
        from.startsWith('/developer') || from.startsWith('/data-entry') ? from : '/developer';
      // Full navigation so the unlock cookie is always sent on the next request
      // (client soft-nav can race ahead of Set-Cookie).
      window.location.assign(safeFrom);
    } catch {
      setError('Could not verify password. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="dev-notes-unlock-page">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Lock className="text-primary size-8" strokeWidth={1.5} aria-hidden />
          <CardTitle className="text-xl">Internal tools</CardTitle>
          <p className="text-muted-foreground text-sm">
          Enter the team password to open Developer Notes or the legacy data-entry hub.
          </p>
        </CardHeader>
        <form onSubmit={onSubmit}>
        <CardContent>
          <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="dev-notes-password">Password</FieldLabel>
            <InputGroup>
            <InputGroupInput
              id="dev-notes-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
              required
              autoFocus
              disabled={loading}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                disabled={loading}
                size="icon-xs"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
            </InputGroup>
          </Field>
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" disabled={loading || !password}>
            {loading ? 'Checking…' : 'Unlock'}
          </Button>
          <Link href="/" className={buttonVariants({ variant: 'ghost' })}>Back to landing</Link>
        </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function DeveloperNotesUnlockPage() {
  return (
    <Suspense fallback={<div className="dev-notes-unlock-page" style={{ minHeight: '100vh' }} />}>
      <UnlockForm />
    </Suspense>
  );
}
