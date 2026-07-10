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
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import StudentApplyResumeBanner from '@/components/StudentApplyResumeBanner';
import StudentBrowsePrerequisitePanel from '@/components/student/StudentBrowsePrerequisitePanel';
import StudentOpportunityDetailModal from '@/components/student/StudentOpportunityDetailModal';
import StudentOpportunityApplyButton from '@/components/student/StudentOpportunityApplyButton';
import PageLoading from '@/components/PageLoading';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
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
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <GraduationCap size={28} className="text-secondary" strokeWidth={1.5} />
            Browse Internships
          </h1>
          <p className="text-secondary">
            Published internships visible to your college. Apply directly from here.
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {canBrowseListings && notProcessedCount > 0 ? (
            <Link href="/dashboard/student/internships/not-processed" className="btn btn-secondary btn-sm">
              Not processed ({notProcessedCount})
            </Link>
          ) : canBrowseListings && internshipLocked ? (
            <Link href="/dashboard/student/internships/not-processed" className="btn btn-secondary btn-sm">
              Not processed internships
            </Link>
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
            <span className="badge badge-blue" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              {totalCount} internship{totalCount !== 1 ? 's' : ''} available
            </span>
          ) : null}
        </div>
      </div>

      {isLoading && <PageLoading message="Loading internships…" inline />}
      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-500)' }}>
          <p className="text-sm" style={{ margin: 0 }}>
            {error.message}
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

      {canBrowseListings && internshipLocked && selectedInternship ? (
        <div
          role="status"
          className="card"
          style={{
            marginBottom: '1.25rem',
            padding: '1rem 1.25rem',
            borderColor: 'var(--primary-200)',
            background: 'var(--primary-50)',
          }}
        >
          <p className="text-sm" style={{ margin: 0, lineHeight: 1.55 }}>
            You were selected for <strong>{selectedInternship.companyName}</strong> — {selectedInternship.title}. Campus
            rule allows <strong>1 internship</strong> (FCFS). Other internships are hidden here; see{' '}
            <Link href="/dashboard/student/internships/not-processed" style={{ fontWeight: 600 }}>
              not processed internships
            </Link>{' '}
            for the read-only list.
          </p>
        </div>
      ) : null}

      {canBrowseListings && totalCount === 0 && (
        <div className="empty-state-container" style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ background: 'var(--primary-50)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <GraduationCap size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>No internships available</h3>
          <p className="text-secondary" style={{ margin: 0 }}>
            No published internships for your campus right now. When an employer publishes one and selects your college, it will appear here.
          </p>
        </div>
      )}

      {canBrowseListings && totalCount > 0 && (
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
      )}

      {/* ── Tabular list ── */}
      {canBrowseListings && totalCount > 0 && (
        <div className="card card-table-shell">
          <div className="table-container">
          <table className="data-table student-opportunities-table">
            <colgroup>
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
                <th className="student-opportunities-col-company" style={{ paddingLeft: '1rem' }}>Company</th>
                <th className="student-opportunities-col-role">Role</th>
                <th className="student-opportunities-col-stipend">Stipend</th>
                <th className="student-opportunities-col-cgpa">CGPA</th>
                <th className="student-opportunities-col-openings">Openings</th>
                <th className="student-opportunities-col-deadline">Period</th>
                <th className="student-opportunities-col-status">Status</th>
                <th className="student-opportunities-col-actions" style={{ textAlign: 'right', paddingRight: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-secondary">
                    No internships match your search or filters.
                  </td>
                </tr>
              ) : null}
              {displayItems.map((row) => {
                const stipendText =
                  row.salaryMin != null || row.salaryMax != null
                    ? `${formatCurrency(row.salaryMin || row.salaryMax)}${
                        row.salaryMax != null && row.salaryMin != null && Number(row.salaryMax) !== Number(row.salaryMin)
                          ? ` – ${formatCurrency(row.salaryMax)}`
                          : ''
                      } /mo`
                    : '—';
                return (
                <tr key={row.id}>
                  <td className="student-opportunities-col-company" style={{ paddingLeft: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <EntityLogo name={row.companyName} size="sm" shape="rounded" />
                      <span className="cell-truncate font-semibold" title={row.companyName || undefined}>
                        <CompanyNameLink name={row.companyName} website={row.website} />
                      </span>
                    </div>
                  </td>
                  <td className="cell-truncate" title={row.title || undefined}>{row.title}</td>
                  <td className="text-sm cell-truncate" title={stipendText !== '—' ? stipendText : undefined}>
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
                  <td
                    className="text-sm cell-truncate"
                    title={formatInternshipPeriodLabel(row.startDate, row.endDate, formatDate) || undefined}
                  >
                    {formatInternshipPeriodLabel(row.startDate, row.endDate, formatDate) || '—'}
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
                  <td style={{ textAlign: 'right', paddingRight: '1rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <StandardTableIconAction action="view" showLabel={false} onClick={() => setSelectedRow(row)} />
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
      </StudentBrowsePrerequisitePanel>
      )}
      {pickerModal}
    </div>
  );
}
