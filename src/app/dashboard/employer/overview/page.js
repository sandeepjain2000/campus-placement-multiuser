'use client';

import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { Briefcase, FileText, CheckCircle, Send, Users, Calendar, ArrowRight, Building2, MapPin, Eye } from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import { EMPLOYER_ALUMNI_JOBS_PATH } from '@/lib/employerAlumniRoutes';
import { useEmployerScopedApiPath } from '@/lib/employerAcademicYearContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to load dashboard');
  return data;
};

export default function EmployerOverviewPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const router = useRouter();
  const [activeCampus, setActiveCampus] = useState(null);
  const [resolvingCampus, setResolvingCampus] = useState(true);

  const showNotReady = (label) => {
    addToast(`${label} is not available yet in this build.`, 'info');
  };

  useEffect(() => {
    let mounted = true;
    const resolveCampus = async () => {
      try {
        const stored = sessionStorage.getItem('activeCampus');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.id) {
              if (mounted) setActiveCampus(parsed);
              return;
            }
            sessionStorage.removeItem('activeCampus');
          } catch {
            sessionStorage.removeItem('activeCampus');
          }
        }

        try {
          const lsRaw = localStorage.getItem('activeCampus');
          if (lsRaw) {
            const lsParsed = JSON.parse(lsRaw);
            if (lsParsed?.id) {
              sessionStorage.setItem('activeCampus', lsRaw);
              try { window.dispatchEvent(new Event('placementhub-active-campus')); } catch { /**/ }
              if (mounted) setActiveCampus(lsParsed);
              return;
            }
            localStorage.removeItem('activeCampus');
          }
        } catch { /**/ }

        const res = await fetch('/api/employer/campuses', { credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (!mounted) return;
        const approved = Array.isArray(json?.colleges)
          ? json.colleges.filter((c) => String(c?.approval_status || '').toLowerCase() === 'approved')
          : [];
        if (approved.length >= 1) {
          const campus = approved[0];
          const campusPayload = {
            id: campus.id,
            name: campus.name,
            slug: campus.slug,
            city: campus.city,
            state: campus.state,
          };
          const payload = JSON.stringify(campusPayload);
          sessionStorage.setItem('activeCampus', payload);
          try { localStorage.setItem('activeCampus', payload); } catch { /**/ }
          try {
            window.dispatchEvent(new Event('placementhub-active-campus'));
          } catch {
            // ignore
          }
          setActiveCampus(campusPayload);
          return;
        }
      } finally {
        if (mounted) setResolvingCampus(false);
      }
    };
    resolveCampus();
    return () => {
      mounted = false;
    };
  }, [router]);

  const dashboardUrl = useEmployerScopedApiPath('/api/employer/dashboard');

  const { data, error, isLoading } = useSWR(
    activeCampus ? dashboardUrl : null,
    fetcher
  );

  const recentApplications = Array.isArray(data?.recentApplications) ? data.recentApplications : [];
  const {
    search: appsSearch,
    setSearch: setAppsSearch,
    sort: appsSort,
    setSort: setAppsSort,
    filtered: displayRecentApplications,
    filteredCount: appsFilteredCount,
    totalCount: appsTotalCount,
    hasActiveFilters: appsHasActiveFilters,
    clearFilters: clearAppsFilters,
  } = useDataTableQuery(recentApplications, {
    getSearchText: (app) => [app.name, app.role, app.college, app.status, app.cgpa].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  if (error) return <PageError error={error} />;

  if (resolvingCampus || isLoading || (!data && activeCampus)) {
    return (
      <PageLoading
        message={resolvingCampus ? 'Loading campus context…' : 'Loading employer overview…'}
        variant="skeleton-dashboard"
      />
    );
  }

  if (!activeCampus) {
    return (
      <div className="animate-fadeIn">
        <Card className="mx-auto my-16 max-w-xl border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--primary-50)', border: '1px solid var(--primary-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Building2 size={32} style={{ color: 'var(--primary-600)' }} />
          </div>
          <CardTitle className="text-xl">No campus tie-up yet</CardTitle>
          <CardDescription className="mt-2 mb-6 max-w-md leading-relaxed">
            Request a partnership with one or more colleges to start posting jobs, viewing applications, and managing placement drives.
          </CardDescription>
          <Button render={<Link href="/dashboard/employer/select-campus" />}>
            Browse &amp; Request Campus Tie-ups
          </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { stats, upcomingDrives } = data;
  const pipelineCounts = [
    stats.totalApplications || 0,
    stats.shortlisted || 0,
    stats.interviewStage || 0,
    stats.selectedCount || 0,
  ];
  const offersExtended = stats.offersExtended || 0;
  const acceptanceBadgeLabel =
    offersExtended > 0
      ? `${Math.round(((stats.selectedCount || 0) / offersExtended) * 100)}% acceptance`
      : null;

  return (
    <div className="animate-fadeIn flex flex-col gap-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 text-2xl font-semibold tracking-tight">
            Welcome, {session?.user?.tenantName || session?.user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Managing recruitment for <strong className="text-foreground font-medium">{activeCampus.name}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/dashboard/employer/assessment-summary" />}>
            Assessment Map
          </Button>
          <Button render={<Link href={EMPLOYER_ALUMNI_JOBS_PATH} />}>
            + Post New Job
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recruitment Snapshot</CardTitle>
          <CardDescription>Current activity across jobs, applications, and offers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Briefcase, 'Active jobs', stats.activeJobs],
            [FileText, 'Total applications', stats.totalApplications],
            [CheckCircle, 'Shortlisted', stats.shortlisted],
            [Send, 'Offers extended', stats.offersExtended],
          ].map(([Icon, label, value]) => (
            <div key={label} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
                <Icon aria-hidden />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{value || 0}</p>
              </div>
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-4">
            <Badge variant="secondary">{acceptanceBadgeLabel || 'No offers yet'}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users aria-hidden /> Hiring Pipeline</CardTitle>
            <CardDescription>Candidate progression through the active funnel.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['Applied', 'Shortlisted', 'Interview', 'Selected'].map((stage, i) => (
              <div key={stage} className="bg-muted/50 rounded-lg border p-3 text-center">
                <p className="text-lg font-semibold tabular-nums">{pipelineCounts[i]}</p>
                <p className="text-muted-foreground mt-1 text-xs font-medium uppercase tracking-wide">{stage}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><Calendar aria-hidden /> Upcoming Drives</CardTitle>
              <CardDescription className="mt-1">Your next scheduled campus events.</CardDescription>
            </div>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/dashboard/employer/calendar" />}>
                View Calendar <ArrowRight data-icon="inline-end" aria-hidden />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex max-h-72 flex-col gap-3 overflow-y-auto">
            {upcomingDrives.map((drive) => (
              <div key={drive.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{drive.role}</p>
                  <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                    <MapPin aria-hidden /> {drive.college} · {drive.type === 'virtual' ? 'Virtual' : 'On-Campus'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium">{formatDate(drive.date)}</p>
                  <StatusBadge status={drive.status} showDot>{formatStatus(drive.status) || 'Open'}</StatusBadge>
                </div>
              </div>
            ))}
            {upcomingDrives.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">No upcoming drives scheduled.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="bg-muted/30 border-b py-5">
          <div>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription className="mt-1">Latest candidates entering your hiring pipeline.</CardDescription>
          </div>
          <CardAction>
            <Button variant="ghost" size="sm" render={<Link href="/dashboard/employer/applications" />}>
              View All Pipeline <ArrowRight data-icon="inline-end" aria-hidden />
            </Button>
          </CardAction>
        </CardHeader>
        {appsTotalCount > 0 ? (
          <DataTableToolbar
            search={appsSearch}
            onSearchChange={setAppsSearch}
            searchPlaceholder="Search candidate, role, or campus…"
            sort={appsSort}
            onSortChange={setAppsSort}
            sortOptions={COMMON_SORT_OPTIONS}
            filteredCount={appsFilteredCount}
            totalCount={appsTotalCount}
            hasActiveFilters={appsHasActiveFilters}
            onClear={clearAppsFilters}
            style={{ margin: '0 1.25rem 1rem', border: '1px solid var(--border-default)' }}
          />
        ) : null}
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Candidate</TableHead>
                <TableHead>Role &amp; Campus</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied On</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRecentApplications.length === 0 && appsTotalCount > 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    No applications match your search.
                  </TableCell>
                </TableRow>
              ) : null}
              {displayRecentApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const appName = String(app?.name || 'Student').trim() || 'Student';
                        const initials = appName.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <>
                            <div className="bg-muted flex size-8 items-center justify-center rounded-full border text-xs font-semibold">
                              {initials || 'S'}
                            </div>
                            <span className="text-sm font-semibold">
                              {appName}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">{app.role}</span>
                      <span className="text-muted-foreground flex items-center gap-1 text-xs"><Building2 aria-hidden /> {app.college}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold tabular-nums">
                      {app.cgpa}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={app.status} showDot>{formatStatus(app.status) || 'Applied'}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(app.appliedAt)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={<Link href={`/dashboard/employer/applications?jobId=${app.jobId}`} />}
                      title="View application details"
                      aria-label="View application details"
                    >
                      <Eye aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {appsTotalCount === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-28 text-center">
                    No recent applications to review.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
