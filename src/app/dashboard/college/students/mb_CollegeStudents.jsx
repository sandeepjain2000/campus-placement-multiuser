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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

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
      <div className="animate-fadeIn flex flex-col gap-4 p-4 pb-20">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {students.length} enrolled
          </p>
          <div className="flex gap-2">
            {!readOnly ? (
              <Button size="sm" render={<Link href="/dashboard/college/students/add" />}>
                <UserPlus data-icon="inline-start" /> Add
              </Button>
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
          <div className="flex flex-col gap-3">
            {filtered.map((s) => {
              return (
                <Card key={s.id} size="sm">
                  <CardHeader className="flex-row items-start gap-3">
                    <StudentListAvatar photo={s.photo} name={s.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/dashboard/college/students/${s.id}`} className="font-medium text-foreground hover:underline">{s.name}</Link>
                      <div className="mt-1">
                        <StudentSystemIdBatchCell
                          systemId={s.systemId}
                          roll={s.roll}
                          batch={s.batch}
                          joiningAcademicYear={s.joiningAcademicYear}
                          compact
                        />
                      </div>
                      <div className="mt-1">
                        <StudentDegreeSpecializationCell
                          degree={s.degreePursued}
                          specialization={s.specialization}
                          compact
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Quick view ${s.name}`}
                        title="Quick view"
                        onClick={() => setQuickViewStudent(s)}
                      >
                        <Eye aria-hidden />
                      </Button>
                      {!readOnly ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${s.name}`}
                            title="Edit"
                            onClick={() => router.push(`/dashboard/college/students/${s.id}/edit`)}
                          >
                            <Pencil aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            aria-label={`Archive ${s.name}`}
                            title="Archive"
                            onClick={() => archiveStudent(s)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CGPA</div>
                    <div className="font-semibold">{s.cgpa ?? '—'}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={getStatusColor(s.jobStatus)} showDot>Job: {formatStatus(s.jobStatus) || '—'}</StatusBadge>
                    {s.verified
                      ? <StatusBadge tone="green"><CheckCircle2 aria-hidden /> Profile</StatusBadge>
                      : <StatusBadge tone="amber">Profile pending</StatusBadge>}
                    {requireCvVerification ? <StudentCvVerificationBadge status={s.cvStatus} compact /> : null}
                  </div>
                  </CardContent>
                </Card>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <Card size="sm"><CardContent className="py-10 text-center text-muted-foreground">
                <div className="mb-1 font-medium text-foreground">No students found</div>
                <div className="text-sm">Try adjusting filters</div>
              </CardContent></Card>
            )}
          </div>
        </>
      )}

      <StudentQuickViewModal
        student={quickViewStudent}
        onClose={() => setQuickViewStudent(null)}
        onVerify={setStudentVerified}
        readOnly={readOnly}
      />

      </div>
    </>
  );
}
