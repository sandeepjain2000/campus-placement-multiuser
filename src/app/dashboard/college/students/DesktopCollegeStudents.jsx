'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { formatStatus, getStatusColor } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { ImportCsvSplitButton } from '@/components/import/ImportCsvSplitButton';
import { downloadCsvFromRows } from '@/lib/csvExport';
import {
  CURRENT_SEMESTER, STUDENT_CSV_HEADERS,
  studentToCsvRow, studentCsvTemplateExampleRow,
} from '@/lib/collegeStudentsCsv';
import { getCurrentAcademicYear } from '@/lib/academicYear';
import {
  academicYearQueryString,
  readActiveAcademicYearContext,
} from '@/lib/collegeAcademicYearContext';
import { useToast } from '@/components/ToastProvider';
import { GraduationCap, Download, CheckCircle2, CircleAlert, UserPlus } from 'lucide-react';
import StudentQuickViewModal from './StudentQuickViewModal';
import StudentListFiltersPanel from './StudentListFiltersPanel';
import StudentSectionSummaryCards from './StudentSectionSummaryCards';
import { useStudentListFilters } from './useStudentListFilters';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import PageLoading from '@/components/PageLoading';
import StudentDegreeSpecializationCell, {
  StudentDegreeSpecializationHeader,
} from './StudentDegreeSpecializationCell';
import StudentListAvatar from '@/components/student/StudentListAvatar';
import StudentSystemIdBatchCell, {
  StudentSystemIdBatchHeader,
} from './StudentSystemIdBatchCell';
import { usePlacementCommitteeReadOnly } from '@/lib/placementCommittee';
import StudentCvVerificationBadge from '@/components/college/StudentCvVerificationBadge';

export default function DesktopCollegeStudents() {
  const router = useRouter();
  const readOnly = usePlacementCommitteeReadOnly();
  const { addToast } = useToast();
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [importBusy, setImportBusy] = useState(false);
  const [sessionMeta, setSessionMeta] = useState(null);
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

  const getStudentCsv = useCallback((scope) => {
    const list = scope === 'current' ? filtered : students;
    return { headers: [...STUDENT_CSV_HEADERS], rows: list.map((s) => studentToCsvRow(s)) };
  }, [filtered, students]);

  const downloadTemplate = useCallback(() => {
    downloadCsvFromRows('students_import_template', [...STUDENT_CSV_HEADERS], [studentCsvTemplateExampleRow()]);
  }, []);

  const onImportFile = useCallback(async (file) => {
    setImportBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/college/students/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        const error = new Error(json.error || 'Import failed');
        error.details = json.details;
        error.stack = json.stack;
        throw error;
      }

      const processed = json.message || `Successfully processed students`;
      addToast(processed, 'success');
      
      if (json.errors?.length) {
        addToast(`${json.errors.length} rows had issues.`, 'warning', 10000, { rowErrors: json.errors });
      }

      // Refresh data from server
      await reloadStudents();
    } catch (err) {
      addToast(err.message || 'Could not process CSV file', 'error', 5000, err.details ? { 
        details: err.details,
        stack: err.stack,
        fileName: file.name,
        fileSize: file.size,
        timestamp: new Date().toISOString()
      } : null);
    } finally {
      setImportBusy(false);
    }
  }, [addToast, reloadStudents]);

  const toggleSectionFilter = useCallback((value) => {
    setSectionFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }, [setSectionFilters]);

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>

      {/* Page Header — v0 standard */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
            Students
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            AY {sessionMeta?.academicYearLabel || getCurrentAcademicYear()} · Semester{' '}
            {sessionMeta?.semesterNumber ?? sessionMeta?.semesterLabel ?? CURRENT_SEMESTER} · {students.length}{' '}
            enrolled
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.35rem 0 0', maxWidth: 520 }}>
            {readOnly
              ? 'Read-only placement committee view — browse and export student records for your college.'
              : 'CSV import: fill every column in the template; only Remarks may be left blank.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {!readOnly ? (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-default)', fontSize: '0.85rem' }}>
                <Download size={14} /> Template
              </button>
              <ImportCsvSplitButton onFileSelected={onImportFile} busy={importBusy} />
            </>
          ) : null}
          <ExportCsvSplitButton filenameBase="students" currentCount={filtered.length} fullCount={students.length} getRows={getStudentCsv} />
          {!readOnly ? (
            <Link
              href="/dashboard/college/students/add"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <UserPlus size={15} /> Add Student
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
          <div className="card card-table-shell desktop-table">
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table college-students-table">
                <colgroup>
                  <col className="college-students-col-num" />
                  <col className="college-students-col-name" />
                  <col className="college-students-col-id-batch" />
                  <col className="college-students-col-degree" />
                  <col className="college-students-col-cgpa" />
                  <col className="college-students-col-status" />
                  <col className="college-students-col-verified" />
                  {requireCvVerification ? <col className="college-students-col-cv" /> : null}
                  <col className="college-students-col-actions" />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ paddingLeft: '1.5rem' }}>#</th>
                    <th>Name</th>
                    <StudentSystemIdBatchHeader />
                    <StudentDegreeSpecializationHeader />
                    <th>CGPA</th>
                    <th>Job Status</th>
                    <th title="Student profile approved by college">Profile</th>
                    {requireCvVerification ? <th title="Uploaded CV verified for drives &amp; internships">CV</th> : null}
                    <th className="college-students-col-actions" style={{ paddingRight: '1.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, index) => {
                    return (
                      <tr key={s.id} style={{ transition: 'background 0.15s' }}>
                        <td style={{ color: 'var(--text-tertiary)', paddingLeft: '1.5rem', fontSize: '0.85rem' }}>{index + 1}</td>
                        <td className="college-students-name-cell">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                            <StudentListAvatar photo={s.photo} name={s.name} size={34} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <Link href={`/dashboard/college/students/${s.id}`} className="student-name-link">
                                {s.name}
                              </Link>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{s.skills.slice(0, 2).join(', ')}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StudentSystemIdBatchCell
                            systemId={s.systemId}
                            roll={s.roll}
                            batch={s.batch}
                            joiningAcademicYear={s.joiningAcademicYear}
                          />
                        </td>
                        <td>
                          <StudentDegreeSpecializationCell
                            degree={s.degreePursued}
                            specialization={s.specialization}
                          />
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: s.cgpa >= 8 ? 'var(--success-600)' : s.cgpa >= 6 ? 'var(--text-primary)' : 'var(--warning-600)' }}>
                            {s.cgpa ?? '—'}
                          </span>
                        </td>
                        <td><span className={`badge badge-${getStatusColor(s.jobStatus)} badge-dot`} style={{ fontSize: '0.75rem' }}>{formatStatus(s.jobStatus)}</span></td>
                        <td>
                          {s.verified
                            ? <span className="badge badge-green" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle2 size={12} /> Verified</span>
                            : <span className="badge badge-amber" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><CircleAlert size={12} /> Pending</span>}
                        </td>
                        {requireCvVerification ? (
                          <td>
                            <StudentCvVerificationBadge status={s.cvStatus} compact />
                          </td>
                        ) : null}
                        <td className="college-students-col-actions" style={{ paddingRight: '1.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <StandardTableIconAction
                              action="view"
                              showLabel={false}
                              onClick={() => setQuickViewStudent(s)}
                            />
                            {!readOnly ? (
                              <>
                                <StandardTableIconAction
                                  action="edit"
                                  showLabel={false}
                                  onClick={() => router.push(`/dashboard/college/students/${s.id}/edit`)}
                                />
                                <StandardTableIconAction
                                  action="delete"
                                  variant="danger"
                                  showLabel={false}
                                  tooltip="Archive student"
                                  onClick={() => archiveStudent(s)}
                                />
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={requireCvVerification ? 9 : 8} style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-tertiary)' }}>
                        <GraduationCap size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No students found</div>
                        <div>Try adjusting your filters or import a student CSV.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
  );
}
