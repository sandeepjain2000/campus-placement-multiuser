'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Building2, ClipboardList, GraduationCap } from 'lucide-react';
import { formatDate, formatStatus, cn } from '@/lib/utils';
import CompanyNameLink from '@/components/CompanyNameLink';
import DataTableToolbar from '@/components/DataTableToolbar';
import PageLoading from '@/components/PageLoading';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import ApplicationDetailModal from './ApplicationDetailModal';
import {
  applicationKindLabel,
  computeApplicationStats,
  getApplicationKindMeta,
  getApplicationStatusMeta,
  openingLabel,
  studentInitials,
} from './applicationRowUtils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load applications');
  return json;
};

const KIND_FILTER_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'drive', label: 'Placement drives' },
  { value: 'program', label: 'Jobs & programs' },
];

const TABLE_COLUMNS = [
  'Student',
  'Roll No.',
  'Department',
  'Company',
  'Type',
  'Opening',
  'Status',
  'Applied',
  'Actions',
];

export default function DtCollegeApplications() {
  const { data, isLoading, error } = useSWR('/api/college/applications', fetcher);
  const applications = Array.isArray(data?.applications) ? data.applications : [];
  const counts = data?.counts || { drives: 0, programs: 0, total: 0 };
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [viewRow, setViewRow] = useState(null);

  const stats = useMemo(() => computeApplicationStats(applications, counts), [applications, counts]);

  const filtered = useMemo(
    () =>
      applications.filter((a) => {
        const haystack = [
          a.student_name,
          a.roll_number,
          a.department,
          a.company_name,
          a.drive_title,
          a.opening_title,
          applicationKindLabel(a),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matchSearch = !search || haystack.includes(search.toLowerCase());
        const matchStatus = !statusFilter || a.status === statusFilter;
        const matchKind =
          !kindFilter ||
          (kindFilter === 'drive' && a.source_kind === 'drive') ||
          (kindFilter === 'program' && a.source_kind === 'program');
        return matchSearch && matchStatus && matchKind;
      }),
    [applications, search, statusFilter, kindFilter],
  );

  const statuses = useMemo(
    () => [...new Set(applications.map((a) => a.status).filter(Boolean))],
    [applications],
  );

  const hasActiveFilters = Boolean(search || statusFilter || kindFilter);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setKindFilter('');
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <ClipboardList className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
          Applications
        </h1>
        <p className="text-muted-foreground m-0 text-sm">
          Track student applications across placement drives, jobs, internships, and projects.
        </p>
      </div>

      {!isLoading && !error ? (
        <Alert>
          <AlertTitle>
            {stats.total} application{stats.total === 1 ? '' : 's'}
          </AlertTitle>
          <AlertDescription>
            <strong>{stats.drives}</strong> placement drive{stats.drives === 1 ? '' : 's'} ·{' '}
            <strong>{stats.programs}</strong> job{stats.programs === 1 ? '' : 's'} &amp; program
            {stats.programs === 1 ? '' : 's'}
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load applications</AlertTitle>
          <AlertDescription>{error.message || 'Could not load applications.'}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading && !applications.length ? <PageLoading message="Loading applications…" inline /> : null}

      {!isLoading && !error && applications.length > 0 ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-3 border-b px-4 py-3">
            <div>
              <CardTitle className="text-base">Campus applications</CardTitle>
              <CardDescription>
                Showing {filtered.length} of {applications.length}
              </CardDescription>
            </div>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search student, roll, company, opening…"
              filteredCount={filtered.length}
              totalCount={applications.length}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-muted-foreground text-sm" htmlFor="college-applications-kind-filter">
                Type
              </label>
              <AdminFilterSelect
                id="college-applications-kind-filter"
                className="min-w-40"
                value={kindFilter}
                onValueChange={setKindFilter}
                items={KIND_FILTER_OPTIONS.map((opt) => ({
                  label: opt.label,
                  value: opt.value === '' ? 'all' : opt.value,
                }))}
              />
              <label className="text-muted-foreground text-sm" htmlFor="college-applications-status-filter">
                Status
              </label>
              <AdminFilterSelect
                id="college-applications-status-filter"
                className="min-w-40"
                value={statusFilter}
                onValueChange={setStatusFilter}
                items={[
                  { label: 'All statuses', value: 'all' },
                  ...statuses.map((s) => ({ label: formatStatus(s) || s, value: s })),
                ]}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="college-applications-table">
              <TableHeader>
                <TableRow>
                  {TABLE_COLUMNS.map((col) => (
                    <TableHead
                      key={col}
                      className={cn(
                        col === 'Actions' && 'text-right',
                        col === 'Status' && 'min-w-[6.5rem]',
                        col === 'Type' && 'min-w-[7rem]',
                      )}
                    >
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMNS.length} className="text-muted-foreground h-24 text-center">
                      No applications match your search or filters.
                    </TableCell>
                  </TableRow>
                ) : null}
                {filtered.map((a) => {
                  const kindMeta = getApplicationKindMeta(a);
                  const statusMeta = getApplicationStatusMeta(a.status);
                  const initials = studentInitials(a.student_name);
                  return (
                    <TableRow key={`${a.source_kind}-${a.id}`}>
                      <TableCell data-label="Student">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="bg-primary/10 text-primary border-primary/20 flex size-8 shrink-0 items-center justify-center rounded-full border text-[0.7rem] font-bold">
                            {initials}
                          </div>
                          <span className="truncate font-medium">{a.student_name || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell data-label="Roll No." className="text-muted-foreground font-mono text-sm">
                        {a.roll_number || '—'}
                      </TableCell>
                      <TableCell data-label="Department">
                        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                          <GraduationCap className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{a.department || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell data-label="Company" className="max-w-[12rem]">
                        <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                          <Building2 className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">
                            <CompanyNameLink name={a.company_name} website={a.company_website} />
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-label="Type" className="min-w-[7rem]">
                        <StatusBadge tone={kindMeta.tone} showDot>
                          {kindMeta.label}
                        </StatusBadge>
                      </TableCell>
                      <TableCell data-label="Opening" className="text-muted-foreground max-w-[14rem]">
                        <span className="block truncate" title={openingLabel(a)}>
                          {openingLabel(a)}
                        </span>
                      </TableCell>
                      <TableCell data-label="Status" className="min-w-[6.5rem]">
                        <StatusBadge status={a.status} tone={statusMeta.tone} showDot>
                          {statusMeta.label}
                        </StatusBadge>
                      </TableCell>
                      <TableCell data-label="Applied" className="text-muted-foreground">
                        {a.applied_at ? formatDate(a.applied_at) : '—'}
                      </TableCell>
                      <TableCell data-label="Actions" className="text-right">
                        <StandardTableIconAction action="view" showLabel={false} onClick={() => setViewRow(a)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !error && applications.length === 0 ? (
        <Card className="gap-0 py-10">
          <CardContent className="flex flex-col items-center px-6 text-center">
            <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full">
              <ClipboardList className="size-7" />
            </div>
            <CardTitle className="mb-1 text-lg">No applications yet</CardTitle>
            <CardDescription className="max-w-md text-sm">
              Students apply from placement drives, jobs, internships, and projects on their dashboard.
            </CardDescription>
          </CardContent>
        </Card>
      ) : null}

      <ApplicationDetailModal row={viewRow} onClose={() => setViewRow(null)} />
    </div>
  );
}
