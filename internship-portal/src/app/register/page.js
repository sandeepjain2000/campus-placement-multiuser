'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Building2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AuthShell from '@/components/ip/AuthShell';

function RegisterChooserInner() {
  const sp = useSearchParams();
  const ref = sp.get('ref');
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';

  return (
    <AuthShell subtitle="Create a candidate or employer account">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Choose how you will use Internship Portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ref ? (
            <Alert>
              <AlertDescription>
                Referral code applied: <code className="font-mono text-xs">{ref}</code>
              </AlertDescription>
            </Alert>
          ) : null}
          <Button render={<Link href={`/register/candidate${q}`} />} className="w-full justify-start gap-3" size="lg">
            <GraduationCap className="size-5" />
            Register as Candidate
          </Button>
          <Button
            render={<Link href={`/register/employer${q}`} />}
            variant="outline"
            className="w-full justify-start gap-3"
            size="lg"
          >
            <Building2 className="size-5" />
            Register as Employer
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

export default function RegisterChooserPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center text-muted-foreground">Loading…</div>}>
      <RegisterChooserInner />
    </Suspense>
  );
}
