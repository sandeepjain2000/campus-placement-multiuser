'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import MobileHeader from '@/components/mobile/MobileHeader';
import PageLoading from '@/components/PageLoading';
import StudentProfileView from './StudentProfileView';
import {
  academicYearQueryString,
  readActiveAcademicYearContext,
} from '@/lib/collegeAcademicYearContext';
import { usePlacementCommitteeReadOnly } from '@/lib/placementCommittee';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function CollegeStudentProfilePage({ mobile = false }) {
  const { addToast } = useToast();
  const readOnly = usePlacementCommitteeReadOnly();
  const params = useParams();
  const studentId = String(params?.id || '');
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadStudent = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const qs = academicYearQueryString(readActiveAcademicYearContext());
      const res = await fetch(`/api/college/students/${encodeURIComponent(studentId)}${qs}`, { credentials: 'include' });
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

  useEffect(() => {
    const onYear = () => {
      loadStudent();
    };
    window.addEventListener('placementhub-academic-year', onYear);
    return () => window.removeEventListener('placementhub-academic-year', onYear);
  }, [loadStudent]);

  const setStudentVerified = useCallback(async (profileId, approve) => {
    try {
      const res = await fetch('/api/college/students/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentProfileId: profileId, approve }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      addToast(approve ? 'Student verified.' : 'Verification cleared.', 'success');
      setStudent((prev) => (prev && prev.id === profileId ? { ...prev, verified: approve } : prev));
    } catch (error) {
      addToast(error.message || 'Failed', 'error');
    }
  }, [addToast]);

  const content = (() => {
    if (isLoading) {
      return <PageLoading message="Loading student profile…" variant="skeleton-card" inline />;
    }
    if (loadError || !student) {
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
      <StudentProfileView
        student={student}
        onVerify={setStudentVerified}
        readOnly={readOnly}
      />
    );
  })();

  if (mobile) {
    return (
      <>
        <MobileHeader title="Student profile" />
        <div className="p-4 pb-20">{content}</div>
      </>
    );
  }

  return <div className="animate-fadeIn pb-12">{content}</div>;
}
