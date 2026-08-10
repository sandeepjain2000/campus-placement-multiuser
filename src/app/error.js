'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { reportClientError } from '@/lib/clientErrorReport';

export default function Error({ error, reset }) {
  useEffect(() => {
    reportClientError(error?.message || 'Application error', { source: 'next.error' });
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <Card className="w-full max-w-[420px]">
        <CardHeader className="items-center text-center">
          <CircleAlert className="text-destructive size-10" aria-hidden />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Something went wrong!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>An unexpected error occurred. Retry the request or return home.</p>
        </CardHeader>
        <CardContent>
          {process.env.NODE_ENV !== 'production' && error?.message ? (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertTitle>Development error</AlertTitle>
              <AlertDescription className="break-words">{error.message}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="justify-center gap-3">
          <Button onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            Go back home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
