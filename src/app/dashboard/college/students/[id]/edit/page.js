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
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--danger-600)', marginBottom: '0.75rem' }}>
            {loadError || 'Student not found.'}
          </p>
          <Link href="/dashboard/college/students" className="btn btn-secondary">
            Back to students
          </Link>
        </div>
      );
    }

    return (
      <div
        className="card"
        style={{
          width: '100%',
          padding: 0,
          overflow: 'hidden',
          border: '1px solid var(--border-default)',
        }}
      >
        <AddStudentForm
          active
          editStudentId={studentId}
          initialValues={initialValues}
          onSuccess={handleSuccess}
          onCancel={() => router.push(`/dashboard/college/students/${studentId}`)}
          bodyPadding="1.5rem 1.5rem 0.5rem"
        />
      </div>
    );
  })();

  const header = (
    <div style={{ marginBottom: '1.5rem' }}>
      <Link
        href={`/dashboard/college/students/${studentId}`}
        className="btn btn-ghost btn-sm"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          marginBottom: '0.75rem',
          paddingLeft: 0,
        }}
      >
        <ArrowLeft size={16} aria-hidden />
        Back to profile
      </Link>
      <h1
        style={{
          fontSize: mobile ? '1.35rem' : '1.75rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          margin: '0 0 0.35rem',
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span
          style={{
            display: 'flex',
            padding: '0.35rem',
            background: 'var(--primary-50)',
            borderRadius: '8px',
            color: 'var(--primary-600)',
          }}
        >
          <Pencil size={22} aria-hidden />
        </span>
        Edit student
      </h1>
      {student?.name ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
          {student.name}
          {student.systemId ? (
            <span style={{ fontFamily: 'var(--font-mono, monospace)', marginLeft: '0.5rem' }}>
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
        <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
          {header}
          {body}
        </div>
      </>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
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
