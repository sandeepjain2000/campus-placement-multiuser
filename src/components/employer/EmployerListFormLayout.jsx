'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Full-page form shell for employer list → add/edit flows.
 * Replaces the list landing view until the user backs out or submits.
 */
export default function EmployerListFormLayout({
  title,
  subtitle,
  onBack,
  backLabel = 'Back to list',
  children,
  footer,
}) {
  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-2">
        <Button type="button" variant="ghost" className="w-fit" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" aria-hidden />
          {backLabel}
        </Button>
        <div>
          <h1 className="text-foreground m-0 text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-muted-foreground mt-1 mb-0 text-sm">{subtitle}</p> : null}
        </div>
      </div>
      <Card className="gap-0 py-0">
        <CardHeader className="border-border sr-only border-b">
          <CardTitle>{title}</CardTitle>
          {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          {children}
          {footer ? <div className="mt-2">{footer}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
