'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { BookOpen, Calendar, GraduationCap, IndianRupee, LayoutGrid, List } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, FILTER_ALL } from '@/lib/tableQueryPresets';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import InternshipDetailModal from './InternshipDetailModal';
import InternshipListingActions from './InternshipListingActions';
import {
  computeInternshipStats,
  getCollegeStatusMeta,
  getJobTypeMeta,
  stipendLabel,
} from './internshipRowUtils';

const fetcher = (url) => fetch(url).then((r) => r.json());

const TYPE_FILTER_OPTIONS = [
  FILTER_ALL,
  { value: 'internship', label: 'Internship' },
  { value: 'short_project', label: 'Short project' },
  { value: 'hackathon', label: 'Hackathon' },
];

const APPROVAL_FILTER_OPTIONS = [
  FILTER_ALL,
  { value: 'pending', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const TABLE_COLUMNS = [
  'Title',
  'Employer',
  'Type',
  'Stipend',
  'CGPA',
  'Openings',
  'Posted',
  'Campus',
  'Actions',
];

export default function CollegeInternshipsContent() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/college/internships', fetcher);
  const [viewMode, setViewMode] = useState('card');
  const [viewRow, setViewRow] = useState(null);
  const [approvalFilter, setApprovalFilter] = useState('');
  const [actionBusyId, setActionBusyId] = useState(null);

  const list = Array.isArray(data?.internships) ? data.internships : [];
  const stats = useMemo(() => computeInternshipStats(list), [list]);

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
      [
        row.title,
        row.company_name,
        row.description,
        ...(Array.isArray(row.skills_required) ? row.skills_required : []),
      ]
        .filter(Boolean)
        .join(' '),
    filterFn: (row, f) => !f || String(row.job_type || 'internship') === f,
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
      const res = await fetch('/api/college/internships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed to ${action} listing`);
      await mutate();
      addToast(action === 'approve' ? 'Listing approved — students can now see it.' : 'Listing rejected.', action === 'approve' ? 'success' : 'info');
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
          <h1>Internships &amp; Programs</h1>
          <p>
            Review employer listings before they appear to students. Approve each posting for your campus after
            checking eligibility and stipend details.
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
          <strong style={{ color: 'var(--text-primary)' }}>{stats.count}</strong> listing
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
          {stats.avgStipend != null ? (
            <>
              {' '}
              · avg stipend <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(stats.avgStipend)}</strong>/mo
            </>
          ) : null}
        </p>
      ) : null}

      {error ? (
        <div className="card" style={{ borderColor: 'var(--danger-500)', marginBottom: '1rem' }}>
          <p className="text-sm" style={{ margin: 0 }}>
            Could not load internships. Ensure you are signed in as a college admin and migration{' '}
            <span className="font-mono text-xs">067</span> is applied.
          </p>
        </div>
      ) : null}

      {isLoading ? <PageLoading message="Loading internships…" inline /> : null}

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
              <label className="text-sm text-secondary" htmlFor="college-listing-approval-filter">
                Campus status
              </label>
              <select
                id="college-listing-approval-filter"
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
                    transition: 'background 0.15s ease, color 0.15s ease',
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
            <table className="data-table college-applications-table college-internships-table">
              <colgroup>
                <col className="college-internships-col-title" />
                <col className="college-internships-col-employer" />
                <col className="college-internships-col-type" />
                <col className="college-internships-col-stipend" />
                <col className="college-internships-col-cgpa" />
                <col className="college-internships-col-openings" />
                <col className="college-internships-col-posted" />
                <col className="college-internships-col-campus" />
                <col className="college-internships-col-actions" />
              </colgroup>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {TABLE_COLUMNS.map((col, i) => (
                    <th
                      key={col}
                      className={col === 'Actions' ? 'college-internships-col-actions' : undefined}
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
                      No listings match your search or filters.
                    </td>
                  </tr>
                ) : null}
                {displayRows.map((row) => {
                  const typeMeta = getJobTypeMeta(row.job_type);
                  const campusMeta = getCollegeStatusMeta(row.college_status);
                  const busy = actionBusyId === row.id;
                  return (
                    <tr key={row.id}>
                      <td
                        className="font-semibold text-sm cell-truncate"
                        style={{ paddingLeft: '1.25rem' }}
                        title={row.title || undefined}
                      >
                        {row.title}
                      </td>
                      <td className="text-sm">
                        <CompanyNameLink name={row.company_name} website={row.website} />
                      </td>
                      <td>
                        <span className={`badge ${typeMeta.badge} badge-dot`}>{typeMeta.label}</span>
                      </td>
                      <td className="text-sm">{stipendLabel(row.salary_min, row.salary_max)}</td>
                      <td className="text-sm">{row.min_cgpa != null ? Number(row.min_cgpa) : '—'}</td>
                      <td className="text-sm">{row.vacancies ?? '—'}</td>
                      <td className="text-sm text-secondary">{row.created_at ? formatDate(row.created_at) : '—'}</td>
                      <td>
                        <span className={`badge ${campusMeta.badge} badge-dot`} style={{ fontSize: '0.75rem' }}>
                          {campusMeta.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1.25rem', whiteSpace: 'nowrap' }} className="college-internships-col-actions">
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
              No listings match your search or filters.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {displayRows.map((row) => {
              const typeMeta = getJobTypeMeta(row.job_type);
              const campusMeta = getCollegeStatusMeta(row.college_status);
              const busy = actionBusyId === row.id;
              return (
                <div key={row.id} className="card card-hover" style={{ border: '1px solid var(--border-default)' }}>
                  {String(row.college_status || 'pending') === 'pending' ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                        marginBottom: '1rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(217, 119, 6, 0.08)',
                        border: '1px solid rgba(217, 119, 6, 0.22)',
                      }}
                    >
                      <span className="text-sm" style={{ color: 'var(--warning-700, #b45309)', fontWeight: 600 }}>
                        Pending your campus approval — students cannot apply yet
                      </span>
                    </div>
                  ) : null}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                          marginBottom: '0.35rem',
                        }}
                      >
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
                      <div
                        className="text-sm text-secondary"
                        style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <IndianRupee size={14} aria-hidden /> Stipend: {stipendLabel(row.salary_min, row.salary_max)}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <BookOpen size={14} aria-hidden /> Min CGPA: {row.min_cgpa != null ? Number(row.min_cgpa) : '—'}
                        </span>
                        <span>Openings: {row.vacancies ?? '—'}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={14} aria-hidden /> Posted {row.created_at ? formatDate(row.created_at) : '—'}
                        </span>
                      </div>
                      {row.skills_required?.length ? (
                        <div style={{ marginTop: '0.65rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {row.skills_required.map((skill) => (
                            <span key={skill} className="badge badge-gray">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : null}
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
          <GraduationCap size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.25, color: 'var(--text-tertiary)' }} />
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>No published listings yet</p>
          <p className="text-sm text-secondary" style={{ margin: '0.5rem 0 0', maxWidth: '36rem', marginInline: 'auto' }}>
            Partners must publish from Internships or Projects and include your college. Listings appear here as{' '}
            <strong>Pending review</strong> until you approve them for students.
          </p>
        </div>
      ) : null}

      <InternshipDetailModal
        row={viewRow}
        onClose={() => setViewRow(null)}
        busy={Boolean(viewRow && actionBusyId === viewRow.id)}
        onApprove={(id) => reviewListing(id, 'approve')}
        onReject={(id) => reviewListing(id, 'reject')}
      />
    </div>
  );
}
