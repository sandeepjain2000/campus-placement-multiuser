'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import AddStudentForm from '@/components/college/AddStudentForm';
import { collegeStudentToFormValues } from '@/lib/collegeStudentForm';
import {
  academicYearQueryString,
  readActiveAcademicYearContext,
} from '@/lib/collegeAcademicYearContext';
import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import MobileHeader from '@/components/mobile/MobileHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function EditStudentContent({ mobile = false }) {
  const router = useRouter();
  const params = useParams();
  const studentId = String(params?.id || '');
  const { addToast } = useToast();
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadStudent = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const qs = academicYearQueryString(readActiveAcademicYearContext());
      const res = await fetch(`/api/college/students/${studentId}${qs}`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to load student');
      setStudent(json.student || null);
    } catch (error) {
      setStudent(null);
      setLoadError(error.message || 'Failed to load student');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  const initialValues = useMemo(() => collegeStudentToFormValues(student), [student]);

  const handleSuccess = () => {
    addToast('Student updated.', 'success');
    router.push(`/dashboard/college/students/${studentId}`);
  };

  const body = (() => {
    if (isLoading) {
      return <div className="skeleton" style={{ height: 360, borderRadius: 'var(--radius-xl)' }} />;
    }
    if (loadError || !student || !initialValues) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Unable to load student</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <p>{loadError || 'Student not found.'}</p>
            <Button variant="outline" render={<Link href="/dashboard/college/students" />}>Back to students</Button>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-5">
          <CardTitle>Student details</CardTitle>
          <CardDescription>Update profile, academic, placement, and preference information.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
        <AddStudentForm
          active
          editStudentId={studentId}
          initialValues={initialValues}
          onSuccess={handleSuccess}
          onCancel={() => router.push(`/dashboard/college/students/${studentId}`)}
          bodyPadding="1.5rem 1.5rem 0.5rem"
        />
        </CardContent>
      </Card>
    );
  })();

  const header = (
    <div className="mb-6">
      <Button variant="ghost" size="sm" className="mb-2" render={<Link href={`/dashboard/college/students/${studentId}`} />}>
        <ArrowLeft data-icon="inline-start" aria-hidden />
        Back to profile
      </Button>
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
        <span className="rounded-lg bg-muted p-2 text-muted-foreground"><Pencil aria-hidden /></span>
        Edit student
      </h1>
      {student?.name ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {student.name}
          {student.systemId ? (
            <span className="ml-2 font-mono">
              {student.systemId}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );

  if (mobile) {
    return (
      <>
        <MobileHeader title="Edit student" />
        <div className="p-4 pb-20">
          {header}
          {body}
        </div>
      </>
    );
  }

  return (
    <div className="animate-fadeIn pb-12">
      {header}
      {body}
    </div>
  );
}

export default function CollegeEditStudentPage() {
  return (
    <ResponsiveWrapper
      desktopView={<EditStudentContent />}
      mobileView={<EditStudentContent mobile />}
    />
  );
}
