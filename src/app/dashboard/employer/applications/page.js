'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import useSWR from 'swr';
import {
  Briefcase,
  Building2,
  ClipboardList,
  FolderDot,
  GraduationCap,
} from 'lucide-react';
import { formatDate, formatStatus } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { useToast } from '@/components/ToastProvider';
import PageLoading from '@/components/PageLoading';
import DataTableToolbar from '@/components/DataTableToolbar';
import EmployerStudentProfileModal from '@/components/employer/EmployerStudentProfileModal';
import EmployerApplicationRowActions from '@/components/employer/EmployerApplicationRowActions';
import {
  EMPLOYER_ALUMNI_APPLICATIONS_PATH,
  isEmployerAlumniDashboardPath,
} from '@/lib/employerAlumniRoutes';
import {
  countApplicationStatusPills,
  formatFilterBadgeLabel,
  shouldShowFilterCount,
} from '@/lib/filterBadgeLabel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ALL_TABS = [
  { id: 'drives', label: 'Placement drives', shortLabel: 'Drives', icon: Building2, desc: 'Students who registered for your campus placement drives.' },
  { id: 'jobs', label: 'Alumni Jobs', shortLabel: 'Alumni Jobs', icon: Briefcase, desc: 'Alumni who applied to your published full-time and contract job postings.' },
  { id: 'internships', label: 'Internships', shortLabel: 'Internships', icon: GraduationCap, desc: 'Students who applied to your published internship postings.' },
  { id: 'projects', label: 'Projects', shortLabel: 'Projects', icon: FolderDot, desc: 'Short projects and hackathons students applied to.' },
];

const STATUS_PILLS = [
  { key: '', label: 'All' },
  { key: 'applied', label: 'Applied' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'selected', label: 'Selected' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'withdrawn', label: 'Withdrawn' },
];

const APPLICATION_SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'cgpa_desc', label: 'Highest CGPA' },
  { value: 'name_asc', label: 'Name A–Z' },
];

async function fetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function jobTypeLabel(t) {
  if (!t || t === 'placement_drive') return 'Drive';
  return String(t).replace(/_/g, ' ');
}

function profileApplicationContext(profileContext) {
  if (!profileContext) return null;
  const {
    studentId: _studentId,
    openingTitle,
    status,
    appliedAt,
    currentRound,
    jobType,
    notes,
    sourceKind,
  } = profileContext;
  return { openingTitle, status, appliedAt, currentRound, jobType, notes, sourceKind };
}

export default function EmployerApplicationsPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const isAlumniScope = isEmployerAlumniDashboardPath(pathname);
  const applicationsBasePath = isAlumniScope ? EMPLOYER_ALUMNI_APPLICATIONS_PATH : '/dashboard/employer/applications';
  const visibleTabs = useMemo(
    () => (isAlumniScope ? ALL_TABS.filter((t) => t.id === 'jobs') : ALL_TABS.filter((t) => t.id !== 'jobs')),
    [isAlumniScope],
  );
  const searchParams = useSearchParams();
  const driveIdFromUrl = String(searchParams.get('driveId') || '').trim();
  const jobIdFromUrl = String(searchParams.get('jobId') || '').trim();
  const [tab, setTab] = useState(isAlumniScope ? 'jobs' : 'drives');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');
  const [profileContext, setProfileContext] = useState(null);
  const [updatingAppKey, setUpdatingAppKey] = useState(null);
  const profileStudentId = profileContext?.studentId ?? null;
  const profileApplication = useMemo(
    () => profileApplicationContext(profileContext),
    [profileContext],
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (isAlumniScope) {
      if (tabParam && tabParam !== 'jobs') {
        router.replace(EMPLOYER_ALUMNI_APPLICATIONS_PATH);
        return;
      }
      setTab('jobs');
      return;
    }
    if (tabParam === 'jobs') {
      router.replace(EMPLOYER_ALUMNI_APPLICATIONS_PATH);
      return;
    }
    if (tabParam === 'drives' || tabParam === 'internships' || tabParam === 'projects') {
      setTab(tabParam);
      return;
    }
    if (jobIdFromUrl && !tabParam) {
      router.replace(`${EMPLOYER_ALUMNI_APPLICATIONS_PATH}?jobId=${encodeURIComponent(jobIdFromUrl)}`);
      return;
    }
    if (driveIdFromUrl && !tabParam) {
      setTab('drives');
    }
  }, [searchParams, jobIdFromUrl, driveIdFromUrl, isAlumniScope, router]);

  const applicationsBaseUrl = useMemo(() => {
    const params = new URLSearchParams({ tab });
    if (driveIdFromUrl && tab === 'drives') params.set('driveId', driveIdFromUrl);
    if (jobIdFromUrl && (tab === 'jobs' || tab === 'internships' || tab === 'projects')) {
      params.set('jobId', jobIdFromUrl);
    }
    return `/api/employer/applications?${params.toString()}`;
  }, [tab, driveIdFromUrl, jobIdFromUrl]);

  const { data, error, isLoading, mutate } = useSWR(applicationsBaseUrl, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });
  const {
    data: profileData,
    error: profileError,
    isLoading: profileLoading,
  } = useSWR(
    profileStudentId
      ? `/api/employer/applications/student-profile?studentId=${encodeURIComponent(profileStudentId)}${
          profileContext?.applicationId
            ? `&applicationId=${encodeURIComponent(profileContext.applicationId)}&source=${encodeURIComponent(profileContext.sourceKind || '')}`
            : ''
        }`
      : null,
    fetcher,
  );

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const counts = data?.counts || { drives: 0, jobs: 0, internships: 0, projects: 0 };
  const statusCounts = useMemo(
    () => countApplicationStatusPills(items, STATUS_PILLS),
    [items],
  );

  const filtered = useMemo(() => {
    const result = items.filter((a) => {
      if (statusFilter === 'withdrawn') {
        if (a.status !== 'withdrawn') return false;
      } else if (statusFilter) {
        if (a.status !== statusFilter) return false;
      } else if (a.status === 'withdrawn') {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const blob = [a.studentName, a.systemId, a.rollNumber, a.email, a.collegeName, a.openingTitle, a.branch]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      if (sortOption === 'date_desc') return new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0);
      if (sortOption === 'date_asc') return new Date(a.appliedAt || 0) - new Date(b.appliedAt || 0);
      if (sortOption === 'cgpa_desc') return (Number(b.cgpa) || 0) - (Number(a.cgpa) || 0);
      if (sortOption === 'name_asc') return (a.studentName || '').localeCompare(b.studentName || '');
      return 0;
    });
  }, [items, statusFilter, search, sortOption]);

  const tabMeta = visibleTabs.find((t) => t.id === tab) || visibleTabs[0] || ALL_TABS[0];

  const getApplicationsCsv = useCallback(
    (scope) => {
      const list = scope === 'current' ? filtered : items;
      const headers = isAlumniScope
        ? [
            'Opening',
            'College',
            'Student',
            'System ID',
            'Email',
            'Branch',
            'CGPA',
            'Type',
            'Status',
            'Applied',
            'Source',
          ]
        : [
            'Student',
            'System ID',
            'Roll number',
            'Email',
            'College',
            'Branch',
            'CGPA',
            'Opening',
            'Type',
            'Status',
            'Applied',
            'Source',
          ];
      const rows = list.map((a) =>
        isAlumniScope
          ? [
              a.openingTitle,
              a.collegeName,
              a.studentName,
              a.systemId || '',
              a.email,
              a.branch,
              a.cgpa != null ? String(a.cgpa) : '',
              jobTypeLabel(a.jobType),
              a.status,
              a.appliedAt ? formatDate(a.appliedAt) : '',
              a.sourceKind === 'drive' ? 'Placement drive' : 'Program',
            ]
          : [
              a.studentName,
              a.systemId || '',
              a.rollNumber || '',
              a.email,
              a.collegeName,
              a.branch,
              a.cgpa != null ? String(a.cgpa) : '',
              a.openingTitle,
              jobTypeLabel(a.jobType),
              a.status,
              a.appliedAt ? formatDate(a.appliedAt) : '',
              a.sourceKind === 'drive' ? 'Placement drive' : 'Program',
            ],
      );
      return { headers, rows };
    },
    [filtered, items, isAlumniScope],
  );

  const openResume = (url) => {
    if (!url) { addToast('No resume on file for this student.', 'info'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadResume = (url) => {
    if (!url) { addToast('No resume on file for this student.', 'info'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const updateStatus = async (app, status) => {
    const appKey = `${app.sourceKind}-${app.id}`;
    if (updatingAppKey === appKey) return;
    setUpdatingAppKey(appKey);
    try {
      const res = await fetch('/api/employer/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id, sourceKind: app.sourceKind, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to update status');
      await mutate();
      addToast(`Application marked as ${formatStatus(status)}.`, 'success');
    } catch (e) {
      addToast(e.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingAppKey(null);
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <ClipboardList className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            {isAlumniScope ? 'Alumni Applications' : 'Applications Pipeline'}
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">{tabMeta.desc}</p>
          <p className="text-muted-foreground mt-2 mb-0 text-xs">
            Students confirmed by another employer (FCFS) are hidden here — see{' '}
            <Link
              href="/dashboard/employer/fcfs-unavailable"
              className="text-primary underline underline-offset-2"
            >
              Unavailable candidates
            </Link>
            .
          </p>
        </div>
        <ExportCsvSplitButton
          filenameBase={`employer-applications-${tab}`}
          currentCount={filtered.length}
          fullCount={items.length}
          getRows={getApplicationsCsv}
        />
      </div>

      {driveIdFromUrl && tab === 'drives' ? (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <strong>{items.length}</strong> applicant{items.length === 1 ? '' : 's'} for this placement drive
              {statusFilter || search ? ` (${filtered.length} shown with current filters)` : ''}.
              Use the shortlist icon on each row to move candidates forward.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              render={<Link href="/dashboard/employer/applications?tab=drives" />}
            >
              Show all drives
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {jobIdFromUrl && !driveIdFromUrl && (tab === 'jobs' || tab === 'internships' || tab === 'projects') ? (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <strong>{items.length}</strong> applicant{items.length === 1 ? '' : 's'} for this opening
              {statusFilter || search ? ` (${filtered.length} shown with current filters)` : ''}.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              render={<Link href={`${applicationsBasePath}?tab=${tab}`} />}
            >
              Show all {tab === 'internships' ? 'internships' : tab === 'projects' ? 'projects' : 'alumni jobs'}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {visibleTabs.length > 1 ? (
        <div
          className="bg-muted flex w-fit flex-wrap items-center gap-0.5 rounded-lg p-[3px]"
          role="tablist"
          aria-label="Application source"
        >
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const n = counts[t.id] ?? 0;
            const active = tab === t.id;
            return (
              <Button
                key={t.id}
                type="button"
                size="sm"
                variant={active ? 'secondary' : 'ghost'}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(t.id);
                  setStatusFilter('');
                  router.replace(`${applicationsBasePath}?tab=${t.id}`);
                }}
                className="h-8 gap-1.5 px-2.5"
              >
                <Icon data-icon="inline-start" strokeWidth={active ? 2.25 : 1.75} />
                {t.shortLabel}
                {shouldShowFilterCount(n) ? (
                  <span className="bg-background/80 text-muted-foreground rounded-full px-1.5 py-0 text-[0.7rem] font-semibold">
                    {n}
                  </span>
                ) : null}
              </Button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, college, or opening…"
        sort={sortOption}
        onSortChange={setSortOption}
        sortOptions={APPLICATION_SORT_OPTIONS}
        filteredCount={filtered.length}
        totalCount={items.length}
        hasActiveFilters={Boolean(statusFilter || search.trim())}
        onClear={() => {
          setSearch('');
          setStatusFilter('');
        }}
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_PILLS.map((p) => (
          <Button
            key={p.key || 'all'}
            type="button"
            size="sm"
            variant={statusFilter === p.key ? 'secondary' : 'outline'}
            onClick={() => setStatusFilter(p.key)}
          >
            {formatFilterBadgeLabel(p.label, statusCounts[p.key])}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <PageLoading message="Loading applications…" inline>
          <div className="flex flex-col gap-3" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-14 rounded-lg" />
            ))}
          </div>
        </PageLoading>
      ) : null}

      {!isLoading && !error && filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ClipboardList className="text-muted-foreground mb-4 size-12 opacity-40" />
            <CardTitle className="text-lg">No applications yet</CardTitle>
            <CardDescription className="mt-2 max-w-md">
              Students apply from placement drives (Jobs) or from Internships / Projects.
              Post a job to start receiving applications.
            </CardDescription>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !error && filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAlumniScope ? (
                    <>
                      <TableHead className="pl-4">Opening</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>System ID</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>CGPA</TableHead>
                      <TableHead className="min-w-[6.5rem]">Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="pr-4 text-right">Actions</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="pl-4">Student</TableHead>
                      <TableHead>System ID</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>CGPA</TableHead>
                      <TableHead>Opening</TableHead>
                      <TableHead className="min-w-[6.5rem]">Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="pr-4 text-right">Actions</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((app) => {
                  const appName = String(app?.studentName || 'Student').trim() || 'Student';
                  const initials = appName.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  const openingCell = (
                    <TableCell className="max-w-[14rem] pl-4">
                      <div className="font-medium leading-snug">{app.openingTitle}</div>
                    </TableCell>
                  );
                  const collegeCell = (
                    <TableCell>
                      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <Building2 className="size-3.5 shrink-0" />
                        {app.collegeName}
                      </div>
                    </TableCell>
                  );
                  const studentCell = (
                    <TableCell className={isAlumniScope ? undefined : 'pl-4'}>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary border-primary/20 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                          {initials || 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{app.studentName}</div>
                          <div className="text-muted-foreground truncate text-xs">{app.email}</div>
                        </div>
                      </div>
                    </TableCell>
                  );
                  const systemIdCell = (
                    <TableCell className="text-muted-foreground font-mono text-sm">{app.systemId || '—'}</TableCell>
                  );
                  const branchCell = (
                    <TableCell className="text-muted-foreground text-sm">{app.branch || '—'}</TableCell>
                  );
                  const cgpaCell = (
                    <TableCell>
                      {app.cgpa != null ? (
                        <span className="text-sm font-semibold">{app.cgpa}</span>
                      ) : '—'}
                    </TableCell>
                  );
                  const statusCell = (
                    <TableCell className="min-w-[6.5rem]" data-label="Status">
                      <StatusBadge status={app.status} showDot>
                        {formatStatus(app.status) || 'Applied'}
                      </StatusBadge>
                    </TableCell>
                  );
                  const appliedCell = (
                    <TableCell className="text-muted-foreground text-sm">
                      {app.appliedAt ? formatDate(app.appliedAt) : '—'}
                    </TableCell>
                  );
                  const actionsCell = (
                    <TableCell className="pr-4 text-right whitespace-nowrap">
                      <EmployerApplicationRowActions
                        app={app}
                        busy={updatingAppKey === `${app.sourceKind}-${app.id}`}
                        onViewProfile={() =>
                          setProfileContext({
                            applicationId: app.id,
                            studentId: app.studentProfileId,
                            openingTitle: app.openingTitle,
                            status: app.status,
                            appliedAt: app.appliedAt,
                            currentRound: app.currentRound,
                            jobType: app.jobType,
                            notes: app.notes,
                            sourceKind: app.sourceKind,
                          })
                        }
                        onOpenResume={() => openResume(app.resumeUrl)}
                        onDownloadResume={() => downloadResume(app.resumeDownloadUrl)}
                        onUpdateStatus={updateStatus}
                      />
                    </TableCell>
                  );
                  return (
                    <TableRow key={`${app.sourceKind}-${app.id}-${app.jobId || app.driveId || app.openingTitle}`}>
                      {isAlumniScope ? (
                        <>
                          {openingCell}
                          {collegeCell}
                          {studentCell}
                          {systemIdCell}
                          {branchCell}
                          {cgpaCell}
                          {statusCell}
                          {appliedCell}
                          {actionsCell}
                        </>
                      ) : (
                        <>
                          {studentCell}
                          {systemIdCell}
                          {collegeCell}
                          {branchCell}
                          {cgpaCell}
                          {openingCell}
                          {statusCell}
                          {appliedCell}
                          {actionsCell}
                        </>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <EmployerStudentProfileModal
        key={profileStudentId || 'closed'}
        open={Boolean(profileStudentId)}
        profileData={profileData}
        profileError={profileError}
        profileLoading={profileLoading}
        applicationContext={profileApplication}
        onClose={() => setProfileContext(null)}
        onOpenResume={openResume}
      />
    </div>
  );
}
