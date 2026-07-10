'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Briefcase, Calendar, IndianRupee, LayoutGrid, List } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, FILTER_ALL } from '@/lib/tableQueryPresets';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import { useCollegeAcademicYearApiPath } from '@/lib/collegeAcademicYearContext';
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
    <div className="animate-fadeIn" style={{ paddingBottom: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div className="page-header-left">
          <h1>Alumni Jobs</h1>
          <p>
            Review lateral job postings from employer partners before they appear to alumni. Approve each role for your
            campus after checking salary, experience, and eligibility.
          </p>
        </div>
      </div>

      {!isLoading && !error ? (
        <p
          className="text-sm text-secondary"
          style={{
            margin: '0 0 1.25rem',
            padding: '0.65rem 0.85rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>{stats.count}</strong> alumni job
          {stats.count === 1 ? '' : 's'}
          {stats.pending ? (
            <>
              {' '}
              · <strong style={{ color: 'var(--warning-600, #d97706)' }}>{stats.pending}</strong> awaiting review
            </>
          ) : null}
          {stats.openings ? (
            <>
              {' '}
              · <strong style={{ color: 'var(--text-primary)' }}>{stats.openings}</strong> openings
            </>
          ) : null}
          {stats.avgSalary != null ? (
            <>
              {' '}
              · avg salary <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(stats.avgSalary)}</strong>/yr
            </>
          ) : null}
        </p>
      ) : null}

      {error ? (
        <div className="card" style={{ borderColor: 'var(--danger-500)', marginBottom: '1rem' }}>
          <p className="text-sm" style={{ margin: 0 }}>
            Could not load alumni jobs. Ensure you are signed in as a college admin.
          </p>
        </div>
      ) : null}

      {isLoading ? <PageLoading message="Loading alumni jobs…" inline /> : null}

      {!isLoading && !error && totalCount > 0 ? (
        <>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              margin: '-0.5rem 0 1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label className="text-sm text-secondary" htmlFor="college-alumni-job-approval-filter">
                Campus status
              </label>
              <select
                id="college-alumni-job-approval-filter"
                className="form-select"
                style={{ width: 'auto', minWidth: '10rem', padding: '0.5rem 2rem 0.5rem 0.75rem' }}
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
              >
                {APPROVAL_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div
              role="group"
              aria-label="View mode"
              style={{
                display: 'flex',
                background: 'var(--bg-secondary)',
                borderRadius: '10px',
                padding: '3px',
                gap: '2px',
                border: '1px solid var(--border-default)',
              }}
            >
              {[
                { mode: 'card', icon: LayoutGrid, label: 'Card view' },
                { mode: 'list', icon: List, label: 'List view' },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: viewMode === mode ? 'var(--bg-primary)' : 'transparent',
                    color: viewMode === mode ? 'var(--primary-600)' : 'var(--text-tertiary)',
                    boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <Icon size={15} aria-hidden />
                  {mode === 'card' ? 'Cards' : 'List'}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {!isLoading && !error && totalCount > 0 && viewMode === 'list' ? (
        <div className="card card-table-shell" style={{ border: '1px solid var(--border-default)' }}>
          <div className="table-container" style={{ border: 'none', overflowX: 'auto' }}>
            <table className="data-table college-applications-table college-jobs-table">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {TABLE_COLUMNS.map((col, i) => (
                    <th
                      key={col}
                      style={
                        i === 0
                          ? { paddingLeft: '1.25rem' }
                          : i === TABLE_COLUMNS.length - 1
                            ? { textAlign: 'right', paddingRight: '1.25rem' }
                            : undefined
                      }
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLUMNS.length} className="text-center text-secondary">
                      No jobs match your search or filters.
                    </td>
                  </tr>
                ) : null}
                {displayRows.map((row) => {
                  const typeMeta = getAlumniJobTypeMeta(row.job_type);
                  const campusMeta = getCollegeStatusMeta(row.college_status);
                  const busy = actionBusyId === row.id;
                  return (
                    <tr key={row.id}>
                      <td style={{ paddingLeft: '1.25rem', maxWidth: 240 }}>
                        <div className="font-semibold text-sm cell-truncate" title={row.title}>
                          {row.title}
                        </div>
                      </td>
                      <td className="text-sm">
                        <CompanyNameLink name={row.company_name} website={row.website} />
                      </td>
                      <td>
                        <span className={`badge ${typeMeta.badge} badge-dot`}>{typeMeta.label}</span>
                      </td>
                      <td className="text-sm">{salaryLabel(row.salary_min, row.salary_max)}</td>
                      <td className="text-sm">{row.vacancies ?? '—'}</td>
                      <td className="text-sm text-secondary">{row.created_at ? formatDate(row.created_at) : '—'}</td>
                      <td>
                        <span className={`badge ${campusMeta.badge} badge-dot`} style={{ fontSize: '0.75rem' }}>
                          {campusMeta.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>
                        <InternshipListingActions
                          row={row}
                          busy={busy}
                          onApprove={(id) => reviewListing(id, 'approve')}
                          onReject={(id) => reviewListing(id, 'reject')}
                          onView={setViewRow}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!isLoading && !error && totalCount > 0 && viewMode === 'card' ? (
        displayRows.length === 0 ? (
          <div className="card">
            <p className="text-secondary" style={{ margin: 0 }}>
              No jobs match your search or filters.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {displayRows.map((row) => {
              const typeMeta = getAlumniJobTypeMeta(row.job_type);
              const campusMeta = getCollegeStatusMeta(row.college_status);
              const busy = actionBusyId === row.id;
              return (
                <div key={row.id} className="card card-hover" style={{ border: '1px solid var(--border-default)' }}>
                  {String(row.college_status || 'pending') === 'pending' ? (
                    <div
                      style={{
                        marginBottom: '1rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(217, 119, 6, 0.08)',
                        border: '1px solid rgba(217, 119, 6, 0.22)',
                      }}
                    >
                      <span className="text-sm" style={{ color: 'var(--warning-700, #b45309)', fontWeight: 600 }}>
                        Pending your campus approval — alumni cannot see or apply yet
                      </span>
                    </div>
                  ) : null}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>{row.title}</h3>
                      <span className={`badge ${typeMeta.badge} badge-dot`}>{typeMeta.label}</span>
                      <span className={`badge ${campusMeta.badge} badge-dot`}>{campusMeta.label}</span>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <CompanyNameLink name={row.company_name} website={row.website} />
                    </div>
                    <p className="text-sm text-secondary" style={{ margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                      {(row.description || '').slice(0, 280)}
                      {(row.description || '').length > 280 ? '…' : ''}
                    </p>
                    <div className="text-sm text-secondary" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <IndianRupee size={14} aria-hidden /> Salary: {salaryLabel(row.salary_min, row.salary_max)}
                      </span>
                      <span>Openings: {row.vacancies ?? '—'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} aria-hidden /> Posted {row.created_at ? formatDate(row.created_at) : '—'}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-default)',
                      display: 'flex',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <InternshipListingActions
                      row={row}
                      busy={busy}
                      onApprove={(id) => reviewListing(id, 'approve')}
                      onReject={(id) => reviewListing(id, 'reject')}
                      onView={setViewRow}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {!isLoading && !error && totalCount === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Briefcase size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.25, color: 'var(--text-tertiary)' }} />
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>No alumni jobs yet</p>
          <p className="text-sm text-secondary" style={{ margin: '0.5rem 0 0', maxWidth: '36rem', marginInline: 'auto' }}>
            Employers must publish a lateral role and include your college. Jobs appear here as{' '}
            <strong>Pending review</strong> until you approve them for alumni.
          </p>
        </div>
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
