'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { formatStatus, getStatusColor } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import { CheckCircle2, UserPlus, Eye, Pencil, Trash2 } from 'lucide-react';
import StudentListFiltersPanel from './StudentListFiltersPanel';
import StudentSectionSummaryCards from './StudentSectionSummaryCards';
import StudentQuickViewModal from './StudentQuickViewModal';
import { useStudentListFilters } from './useStudentListFilters';
import MobileHeader from '@/components/mobile/MobileHeader';
import PageLoading from '@/components/PageLoading';
import StudentDegreeSpecializationCell from './StudentDegreeSpecializationCell';
import StudentListAvatar from '@/components/student/StudentListAvatar';
import StudentSystemIdBatchCell from './StudentSystemIdBatchCell';
import {
  academicYearQueryString,
  readActiveAcademicYearContext,
} from '@/lib/collegeAcademicYearContext';
import { usePlacementCommitteeReadOnly } from '@/lib/placementCommittee';
import StudentCvVerificationBadge from '@/components/college/StudentCvVerificationBadge';

export default function CollegeStudentsMobile() {
  const router = useRouter();
  const readOnly = usePlacementCommitteeReadOnly();
  const { addToast } = useToast();
  const [students, setStudents] = useState([]);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requireCvVerification, setRequireCvVerification] = useState(false);
  const [quickViewStudent, setQuickViewStudent] = useState(null);

  useEffect(() => {
    if (quickViewStudent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [quickViewStudent]);

  const reloadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = academicYearQueryString(readActiveAcademicYearContext());
      const res = await fetch(`/api/college/students${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load students');
      const list = Array.isArray(json) ? json : json.students || [];
      setStudents(list);
      setRequireCvVerification(Boolean(json.requireCvVerification));
      setSessionMeta(Array.isArray(json) ? null : json.session || null);
    } catch (error) {
      addToast(error.message || 'Failed to load students', 'error');
      setStudents([]);
      setSessionMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => { reloadStudents(); }, [reloadStudents]);

  useEffect(() => {
    const onYear = () => { reloadStudents(); };
    window.addEventListener('placementhub-academic-year', onYear);
    return () => window.removeEventListener('placementhub-academic-year', onYear);
  }, [reloadStudents]);

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
      setStudents((prev) => prev.map((s) => (s.id === profileId ? { ...s, verified: approve } : s)));
      setQuickViewStudent((d) => (d && d.id === profileId ? { ...d, verified: approve } : d));
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    }
  }, [addToast]);

  const archiveStudent = useCallback(async (student) => {
    const label = student?.name || 'this student';
    if (
      !confirm(
        `Archive ${label}? They will be hidden from drives, jobs, and the student list, and cannot sign in. A super admin can restore them later. Use this for mistaken or test entries.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/college/students/${student.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Archive failed');
      addToast('Student archived.', 'success');
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      setQuickViewStudent((d) => (d && d.id === student.id ? null : d));
    } catch (error) {
      addToast(error.message || 'Archive failed', 'error');
    }
  }, [addToast]);

  const {
    search,
    setSearch,
    deptFilters,
    setDeptFilters,
    degreeFilters,
    setDegreeFilters,
    batchFilters,
    setBatchFilters,
    batchOptions,
    jobStatusFilters,
    setJobStatusFilters,
    sectionFilters,
    setSectionFilters,
    sectionFilterOptions,
    sectionRangeCounts,
    sortBy,
    setSortBy,
    sortOpen,
    setSortOpen,
    departmentOptions,
    degreeOptions,
    filtered,
    hasFilters,
    clearFilters,
  } = useStudentListFilters(students);

  const toggleSectionFilter = useCallback((value) => {
    setSectionFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }, [setSectionFilters]);

  return (
    <>
      <MobileHeader title="Students" />
      <div className="animate-fadeIn" style={{ padding: '1rem', paddingBottom: '5rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {filtered.length} of {students.length} enrolled
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!readOnly ? (
              <Link
                href="/dashboard/college/students/add"
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <UserPlus size={14} /> Add
              </Link>
            ) : null}
          </div>
        </div>

      {!isLoading && students.length > 0 ? (
        <StudentSectionSummaryCards
          lte4Count={sectionRangeCounts.lte4}
          gte5Count={sectionRangeCounts.gte5}
          totalStudents={students.length}
          sectionFilters={sectionFilters}
          onToggleSectionFilter={toggleSectionFilter}
        />
      ) : null}

      <StudentListFiltersPanel
        search={search}
        setSearch={setSearch}
        deptFilters={deptFilters}
        setDeptFilters={setDeptFilters}
        degreeFilters={degreeFilters}
        setDegreeFilters={setDegreeFilters}
        batchFilters={batchFilters}
        setBatchFilters={setBatchFilters}
        batchOptions={batchOptions}
        jobStatusFilters={jobStatusFilters}
        setJobStatusFilters={setJobStatusFilters}
        sectionFilters={sectionFilters}
        setSectionFilters={setSectionFilters}
        sectionFilterOptions={sectionFilterOptions}
        departmentOptions={departmentOptions}
        degreeOptions={degreeOptions}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOpen={sortOpen}
        setSortOpen={setSortOpen}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        filteredCount={filtered.length}
        totalCount={students.length}
      />

      {isLoading && (
        <PageLoading message="Loading students…" variant="skeleton-list" inline />
      )}

      {!isLoading && (
        <>
          <div className="mobile-cards">
            {filtered.map((s) => {
              return (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid var(--border-default)',
                    borderRadius: '12px',
                    padding: '1rem',
                    background: 'var(--bg-elevated)',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <StudentListAvatar photo={s.photo} name={s.name} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/dashboard/college/students/${s.id}`} className="student-name-link" style={{ fontSize: '1rem' }}>{s.name}</Link>
                      <div style={{ marginTop: '0.2rem' }}>
                        <StudentSystemIdBatchCell
                          systemId={s.systemId}
                          roll={s.roll}
                          batch={s.batch}
                          joiningAcademicYear={s.joiningAcademicYear}
                          compact
                        />
                      </div>
                      <div style={{ marginTop: '0.35rem' }}>
                        <StudentDegreeSpecializationCell
                          degree={s.degreePursued}
                          specialization={s.specialization}
                          compact
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.15rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-icon"
                        aria-label={`Quick view ${s.name}`}
                        title="Quick view"
                        onClick={() => setQuickViewStudent(s)}
                      >
                        <Eye size={18} aria-hidden />
                      </button>
                      {!readOnly ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-icon"
                            aria-label={`Edit ${s.name}`}
                            title="Edit"
                            onClick={() => router.push(`/dashboard/college/students/${s.id}/edit`)}
                          >
                            <Pencil size={18} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-icon"
                            aria-label={`Archive ${s.name}`}
                            title="Archive"
                            onClick={() => archiveStudent(s)}
                            style={{ color: 'var(--danger-600)' }}
                          >
                            <Trash2 size={18} aria-hidden />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CGPA</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: s.cgpa >= 8 ? 'var(--success-600)' : s.cgpa >= 6 ? 'var(--text-primary)' : 'var(--warning-600)' }}>{s.cgpa ?? '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`badge badge-${getStatusColor(s.jobStatus)} badge-dot`} style={{ fontSize: '0.75rem' }}>Job: {formatStatus(s.jobStatus)}</span>
                    {s.verified
                      ? <span className="badge badge-green" style={{ fontSize: '0.75rem' }}><CheckCircle2 size={12} style={{ marginRight: 4 }} /> Profile</span>
                      : <span className="badge badge-amber" style={{ fontSize: '0.75rem' }}>Profile pending</span>}
                    {requireCvVerification ? <StudentCvVerificationBadge status={s.cvStatus} compact /> : null}
                  </div>
                </div>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-tertiary)', border: '1px solid var(--border-default)', borderRadius: '12px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No students found</div>
                <div style={{ fontSize: '0.85rem' }}>Try adjusting filters</div>
              </div>
            )}
          </div>
        </>
      )}

      <StudentQuickViewModal
        student={quickViewStudent}
        onClose={() => setQuickViewStudent(null)}
        onVerify={readOnly ? null : setStudentVerified}
        readOnly={readOnly}
      />

      </div>
    </>
  );
}
