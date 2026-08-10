'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { clientDebugLog, flushClientDebugLog, debugFetch } from '@/lib/clientDebugLog';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import {
  COMPANY_SORT_OPTIONS,
  STUDENT_OPPORTUNITY_FILTER_OPTIONS,
  opportunityFilterFn,
  opportunitySearchText,
} from '@/lib/tableQueryPresets';
import { Briefcase, Mail } from 'lucide-react';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import StudentApplyResumeBanner from '@/components/StudentApplyResumeBanner';
import StudentBrowsePrerequisitePanel from '@/components/student/StudentBrowsePrerequisitePanel';
import StudentOpportunityDetailModal from '@/components/student/StudentOpportunityDetailModal';
import StudentOpportunityRowActions from '@/components/student/StudentOpportunityRowActions';
import PageLoading from '@/components/PageLoading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  globalApplyBlockedReason,
  resolveApplyBlockReason,
} from '@/lib/getApplyBlockReason';
import { buildStudentApplyContext, programOpportunityFromRow } from '@/lib/studentApplyContext';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { buildStudentOpportunityCsvPayload, downloadStudentOpportunityCsv } from '@/lib/studentOpportunityCsvExport';
import { useTableRowSelection, usePruneRowSelection } from '@/hooks/useTableRowSelection';
import TableBulkActionBar from '@/components/table/TableBulkActionBar';
import OpportunityEmailComposeModal from '@/components/student/OpportunityEmailComposeModal';
import { useProgramApplicationWithCv } from '@/components/student/StudentCvApply';
import { isAlumniStudent } from '@/lib/studentAlumni';

async function fetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.hint ? ` ${data.hint}` : '';
    throw new Error((data.error || `Request failed (${res.status})`) + detail);
  }
  return data;
}

export default function StudentJobsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAlumni = isAlumniStudent(session?.user);
  const { addToast } = useToast();
  const [selectedRow, setSelectedRow] = useState(null);
  const [emailComposeRows, setEmailComposeRows] = useState(null);
  const { data, error, isLoading, mutate } = useSWR(
    isAlumni ? '/api/student/program-opportunities?kind=job' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 0,
    },
  );

  useEffect(() => {
    if (status === 'loading') return;
    if (!isAlumni) {
      router.replace('/dashboard/student/drives');
    }
  }, [isAlumni, router, status]);

  const { startApply, applyingId, pickerModal } = useProgramApplicationWithCv({
    addToast,
    mutate,
    fetchApply: debugFetch,
  });

  const items = data?.items || [];
  const placementLocked = data?.placementLocked === true;
  const applyBlockedReason = data?.applyBlockedReason || '';
  const currentStudent = buildStudentApplyContext(data);
  const canApply = data?.canApply !== false;
  const globalBlockedReason = globalApplyBlockedReason(canApply, applyBlockedReason);
  const canBrowseListings = data?.canBrowseListings === true && !error;
  const browseGateProps = {
    canBrowseListings,
    browseGateTitle: data?.browseGateTitle,
    browseGateMessage: data?.browseGateMessage,
    profileComplete: data?.profileComplete !== false,
    hasResume: data?.hasResume !== false,
    profileMissingLabels: data?.profileMissingLabels || [],
  };

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayItems,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(items, {
    getSearchText: opportunitySearchText,
    filterFn: opportunityFilterFn,
    sortOptions: COMPANY_SORT_OPTIONS,
    defaultSort: 'company_asc',
  });

  const selection = useTableRowSelection();
  usePruneRowSelection(selection, displayItems);

  if (status === 'loading' || !isAlumni) {
    return <PageLoading message="Loading…" />;
  }

  const apply = async (jobId, title) => {
    const row = items.find((i) => i.id === jobId);
    const blockReason = row
      ? resolveApplyBlockReason(programOpportunityFromRow(row), currentStudent, { globalBlockedReason })
      : null;

    clientDebugLog('student_apply', 'apply_start', { jobId, title, blockReason });

    if (blockReason) {
      clientDebugLog('student_apply', 'apply_blocked', { blockReason });
      await flushClientDebugLog('student_apply', session?.user?.email);
      return;
    }

    startApply(jobId, title);
    await flushClientDebugLog('student_apply', session?.user?.email);
  };

  const buildCsvRows = (scope) => {
    const dataset = scope === 'full' ? items : displayItems;
    return buildStudentOpportunityCsvPayload(dataset, { kind: 'job' });
  };

  const downloadJob = (row) => {
    downloadStudentOpportunityCsv(row, { kind: 'job' });
  };

  const userEmail = String(session?.user?.email || session?.user?.communicationEmail || '').trim();

  const emailJobs = (rows) => {
    const list = (rows || []).filter(Boolean);
    if (!list.length) {
      addToast('Select at least one job to email.', 'warning');
      return;
    }
    setEmailComposeRows(list);
  };

  const emailFilteredJobs = () => emailJobs(displayItems);
  const emailAllJobs = () => emailJobs(items);
  const emailSelectedJobs = () => emailJobs(selection.selectedRows(displayItems));

  const pageAllSelected = selection.allSelected(displayItems);
  const pageSomeSelected = selection.someSelected(displayItems);

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Briefcase className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Browse Alumni Jobs
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Alumni job openings published for your college network. Apply directly from here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canBrowseListings && totalCount > 0 ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit shrink-0"
                onClick={emailFilteredJobs}
                title="Open your email client with all jobs in the current view"
              >
                <Mail data-icon="inline-start" aria-hidden />
                Email view ({displayItems.length})
              </Button>
              {displayItems.length !== items.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit shrink-0"
                  onClick={emailAllJobs}
                  title="Email every job on this campus list"
                >
                  <Mail data-icon="inline-start" aria-hidden />
                  Email all ({items.length})
                </Button>
              ) : null}
              <ExportCsvSplitButton
                filenameBase="alumni_jobs"
                currentCount={displayItems.length}
                fullCount={items.length}
                getRows={buildCsvRows}
                size="sm"
              />
            </>
          ) : null}
          {canBrowseListings ? (
            <StatusBadge tone="blue" className="px-3 py-1 text-sm">
              {totalCount} job{totalCount !== 1 ? 's' : ''} available
            </StatusBadge>
          ) : null}
        </div>
      </div>

      {isLoading && <PageLoading message="Loading alumni jobs…" inline />}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load alumni jobs</AlertTitle>
          <AlertDescription>
            {error.message}
            {error.message === 'Failed to load opportunities' ? (
              <>
                {' '}
                Try refreshing the page. If this persists, your campus database may need migrations{' '}
                <code className="text-xs">066</code>, <code className="text-xs">067</code>, and{' '}
                <code className="text-xs">074</code>.
              </>
            ) : null}
            {/job_posting_visibility|program_applications|member_tenant_id|does not exist/i.test(error.message) ? (
              <>
                {' '}
                Run <code className="text-xs">006_job_visibility_program_applications.sql</code> (adds{' '}
                <code className="text-xs">member_tenant_id</code> + visibility tables) or{' '}
                <code className="text-xs">004_group_tenants_student_affiliation.sql</code>, then reload.
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <StudentBrowsePrerequisitePanel {...browseGateProps}>
          <div className="flex flex-col gap-4">
            <StudentApplyResumeBanner
              canApply={canApply}
              placementLocked={placementLocked}
              applyBlockedReason={applyBlockedReason}
            />

            {canBrowseListings && totalCount === 0 && (
              <Card className="gap-0 py-10">
                <CardContent className="flex flex-col items-center px-6 text-center">
                  <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full">
                    <Briefcase className="size-7" />
                  </div>
                  <CardTitle className="mb-1 text-lg">No jobs available</CardTitle>
                  <CardDescription className="max-w-md text-sm">
                    No alumni job postings for your campus right now. When an employer publishes a lateral role and your
                    college approves it, it will appear here.
                  </CardDescription>
                </CardContent>
              </Card>
            )}

            {canBrowseListings && totalCount > 0 && (
              <Card className="gap-0 overflow-hidden py-0">
                <CardHeader className="border-border gap-3 border-b px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base">Open listings</CardTitle>
                    <CardDescription>
                      Showing {filteredCount} of {totalCount}
                    </CardDescription>
                  </div>
                  <DataTableToolbar
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search company, role, or status…"
                    filter={filter}
                    onFilterChange={setFilter}
                    filterOptions={STUDENT_OPPORTUNITY_FILTER_OPTIONS}
                    filterLabel="Status"
                    sort={sort}
                    onSortChange={setSort}
                    sortOptions={COMPANY_SORT_OPTIONS}
                    filteredCount={filteredCount}
                    totalCount={totalCount}
                    hasActiveFilters={hasActiveFilters}
                    onClear={clearFilters}
                  />
                  <TableBulkActionBar
                    count={selection.count}
                    onEmail={emailSelectedJobs}
                    onClear={selection.clear}
                    emailLabel="Email selected jobs"
                  />
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="student-opportunities-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 pl-3">
                          <Checkbox
                            aria-label="Select all jobs on this page"
                            checked={pageAllSelected}
                            indeterminate={pageSomeSelected}
                            onCheckedChange={() => selection.toggleAll(displayItems)}
                          />
                        </TableHead>
                        <TableHead className="pl-4">Company</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>CGPA</TableHead>
                        <TableHead>Openings</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead className="min-w-[6.5rem]">Status</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-muted-foreground h-24 text-center">
                            No jobs match your search or filters.
                          </TableCell>
                        </TableRow>
                      ) : null}
                      {displayItems.map((row) => {
                        const salaryText =
                          row.salaryMin != null || row.salaryMax != null
                            ? `${formatCurrency(row.salaryMin || row.salaryMax)}${
                                row.salaryMax != null &&
                                row.salaryMin != null &&
                                Number(row.salaryMax) !== Number(row.salaryMin)
                                  ? ` – ${formatCurrency(row.salaryMax)}`
                                  : ''
                              } /mo`
                            : '—';
                        return (
                          <TableRow
                            key={row.id}
                            data-state={selection.isSelected(row) ? 'selected' : undefined}
                          >
                            <TableCell data-label="" className="pl-3">
                              <Checkbox
                                aria-label={`Select ${row.title || 'job'} at ${row.companyName || 'company'}`}
                                checked={selection.isSelected(row)}
                                onCheckedChange={() => selection.toggle(row)}
                              />
                            </TableCell>
                            <TableCell data-label="Company" className="pl-4">
                              <div className="flex min-w-0 items-center gap-2">
                                <EntityLogo name={row.companyName} size="sm" shape="rounded" />
                                <span className="truncate font-medium" title={row.companyName || undefined}>
                                  <CompanyNameLink name={row.companyName} website={row.website} />
                                </span>
                              </div>
                            </TableCell>
                            <TableCell data-label="Role" className="max-w-[12rem]">
                              <span className="block truncate" title={row.title || undefined}>
                                {row.title}
                              </span>
                            </TableCell>
                            <TableCell
                              data-label="Salary"
                              className="text-sm"
                              title={salaryText !== '—' ? salaryText : undefined}
                            >
                              {row.salaryMin != null || row.salaryMax != null ? (
                                <>
                                  {formatCurrency(row.salaryMin || row.salaryMax)}
                                  {row.salaryMax != null &&
                                  row.salaryMin != null &&
                                  Number(row.salaryMax) !== Number(row.salaryMin)
                                    ? ` – ${formatCurrency(row.salaryMax)}`
                                    : ''}
                                  <span className="text-muted-foreground"> /mo</span>
                                </>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell data-label="CGPA" className="text-sm">
                              {row.minCgpa != null ? row.minCgpa : '—'}
                            </TableCell>
                            <TableCell data-label="Openings" className="text-sm">
                              {row.vacancies ?? '—'}
                            </TableCell>
                            <TableCell
                              data-label="Deadline"
                              className="max-w-[10rem] text-sm"
                              title={row.applicationDeadline ? formatDate(row.applicationDeadline) : undefined}
                            >
                              <span className="block truncate">
                                {row.applicationDeadline ? formatDate(row.applicationDeadline) : '—'}
                              </span>
                            </TableCell>
                            <TableCell className="min-w-[6.5rem]" data-label="Status">
                              {row.hasApplied ? (
                                <StatusBadge status={row.applicationStatus || 'applied'} showDot>
                                  {formatStatus(row.applicationStatus) || 'Applied'}
                                </StatusBadge>
                              ) : (
                                <StatusBadge tone="gray" showDot>
                                  Open
                                </StatusBadge>
                              )}
                            </TableCell>
                            <TableCell data-label="Actions" className="pr-4 text-right whitespace-nowrap">
                              <StudentOpportunityRowActions
                                row={row}
                                kind="job"
                                currentStudent={currentStudent}
                                globalBlockedReason={globalBlockedReason}
                                applyingId={applyingId}
                                onView={setSelectedRow}
                                onDownload={downloadJob}
                                onEmail={(r) => emailJobs([r])}
                                onApply={apply}
                                onShowEligibility={setSelectedRow}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {selectedRow ? (
              <StudentOpportunityDetailModal
                row={selectedRow}
                kind="job"
                onClose={() => setSelectedRow(null)}
                onApply={apply}
                applyingId={applyingId}
                currentStudent={currentStudent}
                canApply={canApply}
                applyBlockedReason={applyBlockedReason}
              />
            ) : null}

            {emailComposeRows ? (
              <OpportunityEmailComposeModal
                rows={emailComposeRows}
                kind="job"
                defaultTo={userEmail}
                onClose={() => setEmailComposeRows(null)}
              />
            ) : null}
          </div>
        </StudentBrowsePrerequisitePanel>
      )}
      {pickerModal}
    </div>
  );
}
