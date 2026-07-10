'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import AddStudentForm from '@/components/college/AddStudentForm';
import { CURRENT_ACADEMIC_YEAR, CURRENT_SEMESTER } from '@/lib/collegeStudentsCsv';

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
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div style={{
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
      >
        <div>
          <Link
            href="/dashboard/college/students"
            className="btn btn-ghost btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginBottom: '0.75rem',
              paddingLeft: 0,
            }}
          >
            <ArrowLeft size={16} />
            Back to Students
          </Link>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.35rem',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          >
            <span style={{
              display: 'flex',
              padding: '0.35rem',
              background: 'var(--primary-50)',
              borderRadius: '8px',
              color: 'var(--primary-600)',
            }}
            >
              <UserPlus size={22} />
            </span>
            Add Student
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 640 }}>
            Create a student with the same fields as CSV import and the full profile. A welcome email is sent with a temporary password. Roll number and login email are locked after creation.
            {' '}
            <span style={{ color: 'var(--text-tertiary)' }}>
              AY {CURRENT_ACADEMIC_YEAR} · Sem {CURRENT_SEMESTER}
            </span>
          </p>
        </div>
      </div>

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
          onSuccess={handleSuccess}
          onCancel={() => router.push('/dashboard/college/students')}
          bodyPadding="1.5rem 1.5rem 0.5rem"
        />
      </div>
    </div>
  );
}
