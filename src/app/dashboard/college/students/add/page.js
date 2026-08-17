'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import AddStudentForm from '@/components/college/AddStudentForm';
import { CURRENT_ACADEMIC_YEAR, CURRENT_SEMESTER } from '@/lib/collegeStudentsCsv';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CollegeAddStudentPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const handleSuccess = (result) => {
    addToast(
      result.isNew
        ? `Student added! System ID: ${result.systemId}`
        : `Student profile updated (${result.systemId})`,
      'success',
      7000,
    );
    router.push('/dashboard/college/students');
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-2" render={<Link href="/dashboard/college/students" />}>
            <ArrowLeft data-icon="inline-start" />
            Back to Students
          </Button>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
            <span className="rounded-lg bg-muted p-2 text-muted-foreground"><UserPlus /></span>
            Add Student
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create a student with the same fields as CSV import and the full profile. A welcome email is sent with a temporary password. Roll number and login email are locked after creation.
            {' '}
            <span>
              AY {CURRENT_ACADEMIC_YEAR} · Sem {CURRENT_SEMESTER}
            </span>
          </p>
        </div>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-5">
          <CardTitle>Student details</CardTitle>
          <CardDescription>Complete each section, then review before saving.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
        <AddStudentForm
          active
          onSuccess={handleSuccess}
          onCancel={() => router.push('/dashboard/college/students')}
          bodyPadding="1.5rem 1.5rem 0.5rem"
        />
        </CardContent>
      </Card>
    </div>
  );
}
