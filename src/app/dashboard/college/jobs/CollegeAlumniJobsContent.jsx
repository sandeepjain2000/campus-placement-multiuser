'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Briefcase, Calendar, IndianRupee, LayoutGrid, List } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, FILTER_ALL } from '@/lib/tableQueryPresets';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import { useCollegeAcademicYearApiPath } from '@/lib/collegeAcademicYearContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import InternshipListingActions from '../internships/InternshipListingActions';
import AlumniJobDetailModal from './AlumniJobDetailModal';
import {
  computeAlumniJobStats,
  getAlumniJobTypeMeta,
  getCollegeStatusMeta,
  salaryLabel,
} from './alumniJobRowUtils';

const fetcher = (url) => fetch(url).then((r) => r.json());

const TYPE_FILTER_OPTIONS = [
  FILTER_ALL,
  { value: 'full_time', label: 'Full-time' },
  { value: 'contract', label: 'Contract' },
];

const APPROVAL_FILTER_OPTIONS = [
  FILTER_ALL,
  { value: 'pending', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const TABLE_COLUMNS = ['Title', 'Employer', 'Type', 'Salary', 'Openings', 'Posted', 'Campus', 'Actions'];

export default function CollegeAlumniJobsContent() {
  const { addToast } = useToast();
  const jobsPath = useCollegeAcademicYearApiPath('/api/college/jobs');
  const { data, error, isLoading, mutate } = useSWR(jobsPath, fetcher);
  const [viewMode, setViewMode] = useState('card');
  const [viewRow, setViewRow] = useState(null);
  const [approvalFilter, setApprovalFilter] = useState('');
  const [actionBusyId, setActionBusyId] = useState(null);

  const list = Array.isArray(data?.jobs) ? data.jobs : [];
  const stats = useMemo(() => computeAlumniJobStats(list), [list]);

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: searchedRows,
    filteredCount: searchedCount,
    totalCount,
    hasActiveFilters: hasSearchFilters,
    clearFilters: clearSearchFilters,
  } = useDataTableQuery(list, {
    getSearchText: (row) =>
      [row.title, row.company_name, row.description, ...(Array.isArray(row.skills_required) ? row.skills_required : [])]
        .filter(Boolean)
        .join(' '),
    filterFn: (row, f) => !f || String(row.job_type) === f,
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const displayRows = useMemo(() => {
    if (!approvalFilter) return searchedRows;
    return searchedRows.filter((row) => String(row.college_status || 'pending') === approvalFilter);
  }, [searchedRows, approvalFilter]);

  const filteredCount = approvalFilter ? displayRows.length : searchedCount;
  const hasActiveFilters = hasSearchFilters || Boolean(approvalFilter);

  const clearFilters = () => {
    clearSearchFilters();
    setApprovalFilter('');
  };

  const reviewListing = async (jobId, action) => {
    setActionBusyId(jobId);
    try {
      const res = await fetch('/api/college/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed to ${action} listing`);
      await mutate();
      addToast(
        action === 'approve' ? 'Alumni job approved — alumni can now see it.' : 'Alumni job rejected.',
        action === 'approve' ? 'success' : 'info',
      );
      setViewRow((current) => (current?.id === jobId ? null : current));
    } catch (e) {
      addToast(e.message || 'Action failed', 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <Briefcase className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
          Alumni Jobs
        </h1>
        <p className="text-muted-foreground m-0 text-sm">
          Review lateral job postings from employer partners before they appear to alumni. Approve each role for your
          campus after checking salary, experience, and eligibility.
        </p>
      </div>

      {!isLoading && !error ? (
        <Alert>
          <AlertTitle>
            {stats.count} alumni job{stats.count === 1 ? '' : 's'}
          </AlertTitle>
          <AlertDescription>
            {stats.pending ? (
              <>
                <strong className="text-amber-600">{stats.pending}</strong> awaiting review
              </>
            ) : (
              'None awaiting review'
            )}
            {stats.openings ? (
              <>
                {' '}
                · <strong>{stats.openings}</strong> openings
              </>
            ) : null}
            {stats.avgSalary != null ? (
              <>
                {' '}
                · avg salary <strong>{formatCurrency(stats.avgSalary)}</strong>/yr
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load alumni jobs</AlertTitle>
          <AlertDescription>Ensure you are signed in as a college admin.</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? <PageLoading message="Loading alumni jobs…" inline /> : null}

      {!isLoading && !error && totalCount > 0 ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-3 border-b px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Campus listings</CardTitle>
                <CardDescription>
                  Showing {filteredCount} of {totalCount}
                </CardDescription>
              </div>
              <div
                className="bg-muted flex w-fit items-center gap-0.5 rounded-lg p-[3px]"
                role="group"
                aria-label="View mode"
              >
                {[
                  { mode: 'card', icon: LayoutGrid, label: 'Card view', short: 'Cards' },
                  { mode: 'list', icon: List, label: 'List view', short: 'List' },
                ].map(({ mode, icon: Icon, label, short }) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={viewMode === mode ? 'secondary' : 'ghost'}
                    title={label}
                    aria-label={label}
                    aria-pressed={viewMode === mode}
                    onClick={() => setViewMode(mode)}
                    className="h-8 gap-1.5 px-2.5"
                  >
                    <Icon data-icon="inline-start" />
                    {short}
                  </Button>
                ))}
              </div>
            </div>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title, employer, or skills…"
              filter={filter}
              onFilterChange={setFilter}
              filterOptions={TYPE_FILTER_OPTIONS}
              filterLabel="Type"
              sort={sort}
              onSortChange={setSort}
              sortOptions={COMMON_SORT_OPTIONS}
              filteredCount={filteredCount}
              totalCount={totalCount}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-muted-foreground text-sm" htmlFor="college-alumni-job-approval-filter">
                Campus status
              </label>
              <AdminFilterSelect
                id="college-alumni-job-approval-filter"
                className="min-w-40"
                value={approvalFilter}
                onValueChange={setApprovalFilter}
                items={APPROVAL_FILTER_OPTIONS.map((opt) => ({
                  label: opt.label,
                  value: opt.value === '' ? 'all' : opt.value,
                }))}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {viewMode === 'list' ? (
              <Table className="college-jobs-table">
                <TableHeader>
                  <TableRow>
                    {TABLE_COLUMNS.map((col) => (
                      <TableHead key={col} className={cn(col === 'Actions' && 'text-right')}>
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={TABLE_COLUMNS.length} className="text-muted-foreground h-24 text-center">
                        No jobs match your search or filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {displayRows.map((row) => {
                    const typeMeta = getAlumniJobTypeMeta(row.job_type);
                    const campusMeta = getCollegeStatusMeta(row.college_status);
                    const busy = actionBusyId === row.id;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-[14rem] font-medium">
                          <span className="block truncate" title={row.title || undefined}>
                            {row.title}
                          </span>
                        </TableCell>
                        <TableCell>
                          <CompanyNameLink name={row.company_name} website={row.website} />
                        </TableCell>
                        <TableCell className="min-w-[7rem]">
                          <StatusBadge tone={typeMeta.tone} showDot>
                            {typeMeta.label || 'Full-time'}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>{salaryLabel(row.salary_min, row.salary_max)}</TableCell>
                        <TableCell>{row.vacancies ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.created_at ? formatDate(row.created_at) : '—'}
                        </TableCell>
                        <TableCell className="min-w-[7.5rem]">
                          <StatusBadge tone={campusMeta.tone} showDot>
                            {campusMeta.label || 'Pending review'}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-right">
                          <InternshipListingActions
                            row={row}
                            busy={busy}
                            onApprove={(id) => reviewListing(id, 'approve')}
                            onReject={(id) => reviewListing(id, 'reject')}
                            onView={setViewRow}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col gap-3 p-4">
                {displayRows.length === 0 ? (
                  <p className="text-muted-foreground m-0 text-sm">No jobs match your search or filters.</p>
                ) : (
                  displayRows.map((row) => {
                    const typeMeta = getAlumniJobTypeMeta(row.job_type);
                    const campusMeta = getCollegeStatusMeta(row.college_status);
                    const busy = actionBusyId === row.id;
                    return (
                      <Card key={row.id} size="sm" className="gap-3">
                        {String(row.college_status || 'pending') === 'pending' ? (
                          <Alert className="border-amber-600/20 bg-amber-600/10 text-amber-700 dark:text-amber-400">
                            <AlertDescription className="text-amber-700 dark:text-amber-400">
                              Pending your campus approval — alumni cannot see or apply yet
                            </AlertDescription>
                          </Alert>
                        ) : null}
                        <CardHeader className="gap-2 px-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base">{row.title}</CardTitle>
                            <StatusBadge tone={typeMeta.tone} showDot>
                              {typeMeta.label || 'Full-time'}
                            </StatusBadge>
                            <StatusBadge tone={campusMeta.tone} showDot>
                              {campusMeta.label || 'Pending review'}
                            </StatusBadge>
                          </div>
                          <CardDescription>
                            <CompanyNameLink name={row.company_name} website={row.website} />
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 px-4">
                          <p className="text-muted-foreground m-0 text-sm leading-relaxed">
                            {(row.description || '').slice(0, 280)}
                            {(row.description || '').length > 280 ? '…' : ''}
                          </p>
                          <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
                            <span className="inline-flex items-center gap-1">
                              <IndianRupee className="size-3.5" aria-hidden /> Salary:{' '}
                              {salaryLabel(row.salary_min, row.salary_max)}
                            </span>
                            <span>Openings: {row.vacancies ?? '—'}</span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3.5" aria-hidden /> Posted{' '}
                              {row.created_at ? formatDate(row.created_at) : '—'}
                            </span>
                          </div>
                          {row.skills_required?.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {row.skills_required.map((skill) => (
                                <StatusBadge key={skill} tone="gray">
                                  {skill}
                                </StatusBadge>
                              ))}
                            </div>
                          ) : null}
                          <div className="flex justify-end border-t pt-3">
                            <InternshipListingActions
                              row={row}
                              busy={busy}
                              align="end"
                              onApprove={(id) => reviewListing(id, 'approve')}
                              onReject={(id) => reviewListing(id, 'reject')}
                              onView={setViewRow}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !error && totalCount === 0 ? (
        <Card className="gap-0 py-10">
          <CardContent className="flex flex-col items-center px-6 text-center">
            <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full">
              <Briefcase className="size-7" />
            </div>
            <CardTitle className="mb-1 text-lg">No alumni jobs yet</CardTitle>
            <CardDescription className="max-w-md text-sm">
              Employers must publish a lateral role and include your college. Jobs appear here as{' '}
              <strong>Pending review</strong> until you approve them for alumni.
            </CardDescription>
          </CardContent>
        </Card>
      ) : null}

      <AlumniJobDetailModal
        row={viewRow}
        onClose={() => setViewRow(null)}
        busy={Boolean(viewRow && actionBusyId === viewRow.id)}
        onApprove={(id) => reviewListing(id, 'approve')}
        onReject={(id) => reviewListing(id, 'reject')}
      />
    </div>
  );
}
