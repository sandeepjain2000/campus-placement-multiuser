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
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import StudentApplyResumeBanner from '@/components/StudentApplyResumeBanner';
import StudentBrowsePrerequisitePanel from '@/components/student/StudentBrowsePrerequisitePanel';
import StudentOpportunityDetailModal from '@/components/student/StudentOpportunityDetailModal';
import StudentOpportunityRowActions from '@/components/student/StudentOpportunityRowActions';
import PageLoading from '@/components/PageLoading';
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

  if (status === 'loading' || !isAlumni) {
    return <PageLoading message="Loading…" />;
  }
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
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Briefcase size={28} className="text-secondary" strokeWidth={1.5} />
            Browse Alumni Jobs
          </h1>
          <p className="text-secondary">
            Alumni job openings published for your college network. Apply directly from here.
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {canBrowseListings && totalCount > 0 ? (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={emailFilteredJobs}
                title="Open your email client with all jobs in the current view"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Mail size={15} aria-hidden />
                Email view ({displayItems.length})
              </button>
              {displayItems.length !== items.length ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={emailAllJobs}
                  title="Email every job on this campus list"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Mail size={15} aria-hidden />
                  Email all ({items.length})
                </button>
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
            <span className="badge badge-blue" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              {totalCount} job{totalCount !== 1 ? 's' : ''} available
            </span>
          ) : null}
        </div>
      </div>

      {isLoading && <PageLoading message="Loading alumni jobs…" inline />}
      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-500)' }}>
          <p className="text-sm" style={{ margin: 0 }}>
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
          </p>
        </div>
      )}

      {!isLoading && !error && (
      <StudentBrowsePrerequisitePanel {...browseGateProps}>
      <StudentApplyResumeBanner
        canApply={canApply}
        placementLocked={placementLocked}
        applyBlockedReason={applyBlockedReason}
      />

      {canBrowseListings && !error && totalCount === 0 && (
        <div className="empty-state-container" style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ background: 'var(--primary-50)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Briefcase size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>No jobs available</h3>
          <p className="text-secondary" style={{ margin: 0 }}>
            No alumni job postings for your campus right now. When an employer publishes a lateral role and your college approves it, it will appear here.
          </p>
        </div>
      )}

      {canBrowseListings && totalCount > 0 && (
        <>
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
        </>
      )}

      {/* ── Tabular list ── */}
      {canBrowseListings && totalCount > 0 && (
        <div className="card card-table-shell">
          <div className="table-container">
          <table className="data-table student-opportunities-table">
            <colgroup>
              <col className="student-opportunities-col-select" />
              <col className="student-opportunities-col-company" />
              <col className="student-opportunities-col-role" />
              <col className="student-opportunities-col-stipend" />
              <col className="student-opportunities-col-cgpa" />
              <col className="student-opportunities-col-openings" />
              <col className="student-opportunities-col-deadline" />
              <col className="student-opportunities-col-status" />
              <col className="student-opportunities-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th className="student-opportunities-col-select" style={{ paddingLeft: '0.75rem' }}>
                  <input
                    type="checkbox"
                    aria-label="Select all jobs on this page"
                    checked={pageAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = pageSomeSelected;
                    }}
                    onChange={() => selection.toggleAll(displayItems)}
                  />
                </th>
                <th className="student-opportunities-col-company" style={{ paddingLeft: '1rem' }}>Company</th>
                <th className="student-opportunities-col-role">Role</th>
                <th className="student-opportunities-col-stipend">Salary</th>
                <th className="student-opportunities-col-cgpa">CGPA</th>
                <th className="student-opportunities-col-openings">Openings</th>
                <th className="student-opportunities-col-deadline">Deadline</th>
                <th className="student-opportunities-col-status">Status</th>
                <th className="student-opportunities-col-actions" style={{ textAlign: 'right', paddingRight: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-secondary">
                    No jobs match your search or filters.
                  </td>
                </tr>
              ) : null}
              {displayItems.map((row) => {
                const salaryText =
                  row.salaryMin != null || row.salaryMax != null
                    ? `${formatCurrency(row.salaryMin || row.salaryMax)}${
                        row.salaryMax != null && row.salaryMin != null && Number(row.salaryMax) !== Number(row.salaryMin)
                          ? ` – ${formatCurrency(row.salaryMax)}`
                          : ''
                      } /mo`
                    : '—';
                return (
                <tr key={row.id} className={selection.isSelected(row) ? 'is-row-selected' : undefined}>
                  <td className="student-opportunities-col-select" style={{ paddingLeft: '0.75rem' }}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.title || 'job'} at ${row.companyName || 'company'}`}
                      checked={selection.isSelected(row)}
                      onChange={() => selection.toggle(row)}
                    />
                  </td>
                  <td className="student-opportunities-col-company" style={{ paddingLeft: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <EntityLogo name={row.companyName} size="sm" shape="rounded" />
                      <span className="cell-truncate font-semibold" title={row.companyName || undefined}>
                        <CompanyNameLink name={row.companyName} website={row.website} />
                      </span>
                    </div>
                  </td>
                  <td className="cell-truncate" title={row.title || undefined}>{row.title}</td>
                  <td className="text-sm cell-truncate" title={salaryText !== '—' ? salaryText : undefined}>
                    {row.salaryMin != null || row.salaryMax != null ? (
                      <>
                        {formatCurrency(row.salaryMin || row.salaryMax)}
                        {row.salaryMax != null && row.salaryMin != null && Number(row.salaryMax) !== Number(row.salaryMin)
                          ? ` – ${formatCurrency(row.salaryMax)}`
                          : ''}
                        <span className="text-tertiary"> /mo</span>
                      </>
                    ) : '—'}
                  </td>
                  <td className="text-sm">{row.minCgpa != null ? row.minCgpa : '—'}</td>
                  <td className="text-sm">{row.vacancies ?? '—'}</td>
                  <td className="text-sm cell-truncate" title={row.applicationDeadline ? formatDate(row.applicationDeadline) : undefined}>
                    {row.applicationDeadline ? formatDate(row.applicationDeadline) : '—'}
                  </td>
                  <td>
                    {row.hasApplied ? (
                      <span className={`badge badge-${getStatusColor(row.applicationStatus)} badge-dot`}>
                        {formatStatus(row.applicationStatus)}
                      </span>
                    ) : (
                      <span className="badge badge-gray">Open</span>
                    )}
                  </td>
                  <td className="student-opportunities-col-actions" style={{ textAlign: 'right', paddingRight: '1rem' }}>
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
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
          </div>
        </div>
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
      </StudentBrowsePrerequisitePanel>
      )}
      {pickerModal}
    </div>
  );
}
