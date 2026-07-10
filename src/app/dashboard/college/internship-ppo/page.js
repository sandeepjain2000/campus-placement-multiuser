'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Award } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { SORT_DATE_ASC, SORT_DATE_DESC } from '@/lib/dataTableQuery';
import { formatDate, formatStatus } from '@/lib/utils';

const PPO_SORT_OPTIONS = [
  {
    value: 'name_asc',
    label: 'Student (A → Z)',
    compare: (a, b) =>
      String(a?.studentName ?? '').localeCompare(String(b?.studentName ?? ''), undefined, {
        sensitivity: 'base',
      }),
  },
  {
    value: 'name_desc',
    label: 'Student (Z → A)',
    compare: (a, b) =>
      String(b?.studentName ?? '').localeCompare(String(a?.studentName ?? ''), undefined, {
        sensitivity: 'base',
      }),
  },
  SORT_DATE_DESC,
  SORT_DATE_ASC,
];

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

export default function CollegeInternshipPpoPage() {
  const { data, error, isLoading } = useSWR('/api/college/internship-ppo', fetcher);

  const items = Array.isArray(data?.items) ? data.items : [];
  const summary = data?.summary || { total: 0, awaitingStudent: 0, accepted: 0, withJobOffer: 0 };

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(items, {
    getSearchText: (r) =>
      [r.studentName, r.rollNumber, r.branch, r.companyName, r.openingTitle, r.ppoStatusLabel]
        .filter(Boolean)
        .join(' '),
    sortOptions: PPO_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });

  const exportCsv = () => {
    const header = [
      'Student',
      'Roll',
      'Branch',
      'Batch',
      'Company',
      'Internship',
      'Internship_start',
      'Application_status',
      'PPO_status',
      'PPO_confirmed',
      'Student_responded',
      'Job_offer_status',
    ];
    const rows = filtered.map((r) => [
      r.studentName,
      r.rollNumber,
      r.branch,
      r.batchYear ?? '',
      r.companyName,
      r.openingTitle,
      r.internshipStartDate ? formatDate(r.internshipStartDate) : '',
      formatStatus(r.applicationStatus),
      r.ppoStatusLabel,
      r.ppo?.confirmedAt ? formatDate(r.ppo.confirmedAt) : '',
      r.ppo?.studentRespondedAt ? formatDate(r.ppo.studentRespondedAt) : '',
      r.jobOfferStatus ? formatStatus(r.jobOfferStatus) : '',
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'internship_ppo.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statLine = useMemo(
    () =>
      `${summary.total} PPO record(s) · ${summary.awaitingStudent} awaiting student · ${summary.withJobOffer} with job offer`,
    [summary],
  );

  if (isLoading) return <PageLoading message="Loading PPO…" variant="skeleton-card" />;

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Award size={26} aria-hidden />
            Internship PPO
          </h1>
          <p className="text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>
            Read-only view of Pre-Placement Offers for interns on your campus. PPO is separate from internship selection
            and formal job offers.
          </p>
          <p className="text-sm text-tertiary" style={{ margin: '0.35rem 0 0' }}>{statLine}</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: '1.5rem', color: 'var(--danger-600)' }}>{error.message}</div>
      ) : null}

      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        sortOptions={PPO_SORT_OPTIONS}
        filteredCount={filteredCount}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map((row) => (
          <div key={row.programApplicationId} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{row.studentName}</div>
                <div className="text-sm text-secondary">
                  {row.rollNumber} · {row.branch}
                  {row.batchYear ? ` · Batch ${row.batchYear}` : ''}
                </div>
                <div className="text-sm" style={{ marginTop: '0.35rem' }}>
                  {row.companyName} — {row.openingTitle}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <span className="badge badge-blue badge-dot">{row.ppoStatusLabel}</span>
                {row.jobOfferStatus ? (
                  <span className="badge badge-green badge-dot">Offer: {formatStatus(row.jobOfferStatus)}</span>
                ) : null}
              </div>
            </div>
            {row.ppo?.confirmedAt ? (
              <p className="text-xs text-tertiary" style={{ margin: '0.5rem 0 0' }}>
                PPO confirmed {formatDate(row.ppo.confirmedAt)}
                {row.ppo.studentRespondedAt ? ` · Student responded ${formatDate(row.ppo.studentRespondedAt)}` : ''}
              </p>
            ) : null}
          </div>
        ))}

        {!error && filtered.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No PPO records yet for your campus interns.
          </div>
        ) : null}
      </div>
    </div>
  );
}
