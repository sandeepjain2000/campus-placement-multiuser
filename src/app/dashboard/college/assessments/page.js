'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CollegeAssessmentsCompatPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/college/hiring-assessment');
  }, [router]);

  return (
    <Card className="m-8 max-w-xl" aria-live="polite">
      <CardHeader>
        <CardTitle>Hiring Assessment</CardTitle>
        <CardDescription>Opening the current assessment workspace.</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">Redirecting…</CardContent>
    </Card>
  );
}
