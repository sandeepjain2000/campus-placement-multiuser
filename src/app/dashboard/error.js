'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { reportClientError } from '@/lib/clientErrorReport';

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    reportClientError(error?.message || 'Dashboard error', { source: 'next.dashboard.error' });
  }, [error]);

  return (
    <div
      className="animate-fadeIn"
      style={{
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <Card className="w-full max-w-[420px]">
        <CardHeader className="items-center text-center">
          <CircleAlert className="text-destructive size-8" aria-hidden />
          <CardTitle>Something went wrong</CardTitle>
          <p className="text-muted-foreground text-sm">
          This dashboard page hit an unexpected error. You can retry or return to your home screen.
          </p>
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
        <CardFooter className="flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
            Dashboard home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
