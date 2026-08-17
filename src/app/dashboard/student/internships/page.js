'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { clientDebugLog, flushClientDebugLog, debugFetch } from '@/lib/clientDebugLog';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import {
  COMPANY_SORT_OPTIONS,
  STUDENT_OPPORTUNITY_FILTER_OPTIONS,
  opportunityFilterFn,
  opportunitySearchText,
} from '@/lib/tableQueryPresets';
import { GraduationCap } from 'lucide-react';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import StudentApplyResumeBanner from '@/components/StudentApplyResumeBanner';
import StudentBrowsePrerequisitePanel from '@/components/student/StudentBrowsePrerequisitePanel';
import StudentOpportunityDetailModal from '@/components/student/StudentOpportunityDetailModal';
import StudentOpportunityApplyButton from '@/components/student/StudentOpportunityApplyButton';
import PageLoading from '@/components/PageLoading';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { buildStudentOpportunityCsvPayload } from '@/lib/studentOpportunityCsvExport';
import { formatInternshipPeriodLabel } from '@/lib/internshipPostingMeta';
import { useProgramApplicationWithCv } from '@/components/student/StudentCvApply';

async function fetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = [data.error || `Request failed (${res.status})`, data.hint].filter(Boolean).join(' — ');
    throw new Error(msg);
  }
  return data;
}

export default function StudentInternshipsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [selectedRow, setSelectedRow] = useState(null);
  const { data, error, isLoading, mutate } = useSWR('/api/student/program-opportunities?kind=internship', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });
  const { startApply, applyingId, pickerModal } = useProgramApplicationWithCv({
    addToast,
    mutate,
    fetchApply: debugFetch,
  });

  const items = data?.items || [];
  const placementLocked = data?.placementLocked === true;
  const internshipLocked = data?.internshipLocked === true;
  const selectedInternship = data?.selectedInternship;
  const notProcessedCount = data?.notProcessedCount ?? 0;
  const applyBlockedReason = data?.applyBlockedReason || '';
  const currentStudent = buildStudentApplyContext(data);
  const applyOptions = {
    internshipLocked,
    requireCvVerification: Boolean(currentStudent.cvVerificationRequired),
  };
  const canApply = data?.canApply !== false;
  const globalBlockedReason = globalApplyBlockedReason(canApply, applyBlockedReason);
  const canBrowseListings = data?.canBrowseListings !== false;
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

  const apply = async (jobId, title) => {
    const row = items.find((i) => i.id === jobId);
    const blockReason = row
      ? resolveApplyBlockReason(programOpportunityFromRow(row), currentStudent, {
          ...applyOptions,
          globalBlockedReason,
        })
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
    return buildStudentOpportunityCsvPayload(dataset, { kind: 'internship' });
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <GraduationCap className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Browse Internships
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Published internships visible to your college. Apply directly from here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canBrowseListings && notProcessedCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="w-fit shrink-0"
              render={<Link href="/dashboard/student/internships/not-processed" />}
              nativeButton={false}
            >
              Not processed ({notProcessedCount})
            </Button>
          ) : canBrowseListings && internshipLocked ? (
            <Button
              variant="outline"
              size="sm"
              className="w-fit shrink-0"
              render={<Link href="/dashboard/student/internships/not-processed" />}
              nativeButton={false}
            >
              Not processed internships
            </Button>
          ) : null}
          {canBrowseListings && totalCount > 0 ? (
            <ExportCsvSplitButton
              filenameBase="internships"
              currentCount={displayItems.length}
              fullCount={items.length}
              getRows={buildCsvRows}
              size="sm"
            />
          ) : null}
          {canBrowseListings ? (
            <StatusBadge tone="blue" className="px-3 py-1 text-sm">
              {totalCount} internship{totalCount !== 1 ? 's' : ''} available
            </StatusBadge>
          ) : null}
        </div>
      </div>

      {isLoading && <PageLoading message="Loading internships…" inline />}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load internships</AlertTitle>
          <AlertDescription>
            {error.message}
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

            {canBrowseListings && internshipLocked && selectedInternship ? (
              <Card className="border-primary/25 bg-primary/5 gap-0 py-4" role="status">
                <CardContent className="px-4">
                  <p className="text-foreground m-0 text-sm leading-relaxed">
                    You were selected for <strong>{selectedInternship.companyName}</strong> — {selectedInternship.title}.
                    Campus rule allows <strong>1 internship</strong> (FCFS). Other internships are hidden here; see{' '}
                    <Link
                      href="/dashboard/student/internships/not-processed"
                      className="text-primary font-semibold hover:underline"
                    >
                      not processed internships
                    </Link>{' '}
                    for the read-only list.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {canBrowseListings && totalCount === 0 && (
              <Card className="gap-0 py-10">
                <CardContent className="flex flex-col items-center px-6 text-center">
                  <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full">
                    <GraduationCap className="size-7" />
                  </div>
                  <CardTitle className="mb-1 text-lg">No internships available</CardTitle>
                  <CardDescription className="max-w-md text-sm">
                    No published internships for your campus right now. When an employer publishes one and selects your
                    college, it will appear here.
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
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="student-opportunities-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Stipend</TableHead>
                        <TableHead>CGPA</TableHead>
                        <TableHead>Openings</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="min-w-[6.5rem]">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                            No internships match your search or filters.
                          </TableCell>
                        </TableRow>
                      ) : null}
                      {displayItems.map((row) => {
                        const stipendText =
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
                          <TableRow key={row.id}>
                            <TableCell>
                              <div className="flex min-w-0 items-center gap-2">
                                <EntityLogo name={row.companyName} size="sm" shape="rounded" />
                                <span className="truncate font-medium" title={row.companyName || undefined}>
                                  <CompanyNameLink name={row.companyName} website={row.website} />
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[12rem]">
                              <span className="block truncate" title={row.title || undefined}>
                                {row.title}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm" title={stipendText !== '—' ? stipendText : undefined}>
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
                            <TableCell className="text-sm">{row.minCgpa != null ? row.minCgpa : '—'}</TableCell>
                            <TableCell className="text-sm">{row.vacancies ?? '—'}</TableCell>
                            <TableCell
                              className="max-w-[10rem] text-sm"
                              title={
                                formatInternshipPeriodLabel(row.startDate, row.endDate, formatDate) || undefined
                              }
                            >
                              <span className="block truncate">
                                {formatInternshipPeriodLabel(row.startDate, row.endDate, formatDate) || '—'}
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
                              <TableCell className="text-right whitespace-nowrap" data-label="Actions">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <StandardTableIconAction
                                  action="view"
                                  showLabel={false}
                                  onClick={() => setSelectedRow(row)}
                                />
                                {!row.hasApplied && (
                                  <StudentOpportunityApplyButton
                                    row={row}
                                    currentStudent={currentStudent}
                                    applyOptions={applyOptions}
                                    globalBlockedReason={globalBlockedReason}
                                    applyingId={applyingId}
                                    onApply={apply}
                                    onShowEligibility={setSelectedRow}
                                  />
                                )}
                              </div>
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
                kind="internship"
                onClose={() => setSelectedRow(null)}
                onApply={apply}
                applyingId={applyingId}
                currentStudent={currentStudent}
                applyOptions={applyOptions}
                canApply={canApply}
                applyBlockedReason={applyBlockedReason}
              />
            ) : null}
          </div>
        </StudentBrowsePrerequisitePanel>
      )}
      {pickerModal}
    </div>
  );
}
