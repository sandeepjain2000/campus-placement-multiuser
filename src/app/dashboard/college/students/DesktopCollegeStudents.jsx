'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { formatStatus, getStatusColor } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { ImportCsvSplitButton } from '@/components/import/ImportCsvSplitButton';
import {
  CURRENT_SEMESTER, STUDENT_CSV_HEADERS,
  studentToCsvRow,
  STUDENTS_IMPORT_TEMPLATE_FILENAME,
} from '@/lib/collegeStudentsCsv';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { getCurrentAcademicYear } from '@/lib/academicYear';
import {
  academicYearQueryString,
  readActiveAcademicYearContext,
} from '@/lib/collegeAcademicYearContext';
import { useToast } from '@/components/ToastProvider';
import { GraduationCap, CheckCircle2, CircleAlert, UserPlus } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DesktopCollegeStudents() {
  const router = useRouter();
  const readOnly = usePlacementCommitteeReadOnly();
  const { addToast } = useToast();
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [importBusy, setImportBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
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

  const downloadTemplate = useCallback(async () => {
    setTemplateBusy(true);
    try {
      await downloadCsvFromApi(
        '/api/college/students/import-template',
        STUDENTS_IMPORT_TEMPLATE_FILENAME,
      );
      addToast('Import template downloaded.', 'success');
    } catch (e) {
      addToast(e?.message || 'Import template is unavailable. Please try again.', 'error');
    } finally {
      setTemplateBusy(false);
    }
  }, [addToast]);

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
    <div className="animate-fadeIn flex flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AY {sessionMeta?.academicYearLabel || getCurrentAcademicYear()} · Semester{' '}
            {sessionMeta?.semesterNumber ?? sessionMeta?.semesterLabel ?? CURRENT_SEMESTER} · {students.length}{' '}
            enrolled
          </p>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            {readOnly
              ? 'Read-only placement committee view — browse and export student records for your college.'
              : 'CSV import: fill every column in the template; only Remarks may be left blank.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly ? (
            <>
              <div className="export-csv-wrap">
                <div className="export-csv-split-inner export-csv-split-inner--single">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    disabled={templateBusy}
                    title="Download CSV import template (same columns as Export CSV)"
                  >
                    {templateBusy ? (
                      <span className="export-csv-preparing">Preparing…</span>
                    ) : (
                      <>
                        <span className="export-csv-icon" aria-hidden>⬇</span>
                        Template
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <ImportCsvSplitButton
                onFileSelected={onImportFile}
                onDownloadTemplate={downloadTemplate}
                busy={importBusy || templateBusy}
              />
            </>
          ) : null}
          <ExportCsvSplitButton filenameBase="students" currentCount={filtered.length} fullCount={students.length} getRows={getStudentCsv} />
          {!readOnly ? (
            <Button render={<Link href="/dashboard/college/students/add" />}>
              <UserPlus data-icon="inline-start" /> Add Student
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
          <Card className="desktop-table py-0">
            <CardContent className="px-0">
              <Table className="college-students-table">
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
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="pl-6">#</TableHead>
                    <TableHead>Name</TableHead>
                    <StudentSystemIdBatchHeader />
                    <StudentDegreeSpecializationHeader />
                    <TableHead>CGPA</TableHead>
                    <TableHead>Job Status</TableHead>
                    <TableHead title="Student profile approved by college">Profile</TableHead>
                    {requireCvVerification ? <TableHead title="Uploaded CV verified for drives &amp; internships">CV</TableHead> : null}
                    <TableHead className="college-students-col-actions pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s, index) => {
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="pl-6 text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="college-students-name-cell">
                          <div className="flex min-w-0 items-center gap-3">
                            <StudentListAvatar photo={s.photo} name={s.name} size={34} />
                            <div className="min-w-0 flex-1">
                              <Link href={`/dashboard/college/students/${s.id}`} className="font-medium text-foreground hover:underline">
                                {s.name}
                              </Link>
                              <div className="truncate text-xs text-muted-foreground">{s.skills.slice(0, 2).join(', ')}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StudentSystemIdBatchCell
                            systemId={s.systemId}
                            roll={s.roll}
                            batch={s.batch}
                            joiningAcademicYear={s.joiningAcademicYear}
                          />
                        </TableCell>
                        <TableCell>
                          <StudentDegreeSpecializationCell
                            degree={s.degreePursued}
                            specialization={s.specialization}
                          />
                        </TableCell>
                        <TableCell className="font-semibold">{s.cgpa ?? '—'}</TableCell>
                        <TableCell><StatusBadge tone={getStatusColor(s.jobStatus)} showDot>{formatStatus(s.jobStatus) || '—'}</StatusBadge></TableCell>
                        <TableCell>
                          {s.verified
                            ? <StatusBadge tone="green"><CheckCircle2 aria-hidden /> Verified</StatusBadge>
                            : <StatusBadge tone="amber"><CircleAlert aria-hidden /> Pending</StatusBadge>}
                        </TableCell>
                        {requireCvVerification ? (
                          <TableCell>
                            <StudentCvVerificationBadge status={s.cvStatus} compact />
                          </TableCell>
                        ) : null}
                        <TableCell className="college-students-col-actions pr-6 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={requireCvVerification ? 9 : 8} className="h-52 text-center text-muted-foreground">
                        <GraduationCap className="mx-auto mb-4 size-12 opacity-30" />
                        <div className="mb-1 font-medium text-foreground">No students found</div>
                        <div>Try adjusting your filters or import a student CSV.</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>


        </>
      )}

      <StudentQuickViewModal
        student={quickViewStudent}
        onClose={() => setQuickViewStudent(null)}
        onVerify={setStudentVerified}
        readOnly={readOnly}
      />

    </div>
  );
}
