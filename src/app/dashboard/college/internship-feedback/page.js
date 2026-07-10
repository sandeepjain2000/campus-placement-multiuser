'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { MessageSquareText } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { SORT_DATE_ASC, SORT_DATE_DESC } from '@/lib/dataTableQuery';
import { formatDate, formatStatus } from '@/lib/utils';

const FEEDBACK_SORT_OPTIONS = [
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

export default function CollegeInternshipFeedbackPage() {
  const { data, error, isLoading } = useSWR('/api/college/internship-feedback', fetcher);
  const items = Array.isArray(data?.items) ? data.items : [];
  const summary = data?.summary || { total: 0, withStudentFeedback: 0, withEmployerFeedback: 0 };

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
      [r.studentName, r.rollNumber, r.branch, r.companyName, r.openingTitle, r.studentFeedback?.feedbackText, r.employerFeedback?.feedbackText]
        .filter(Boolean)
        .join(' '),
    sortOptions: FEEDBACK_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const exportCsv = () => {
    const header = [
      'Student',
      'Roll',
      'Branch',
      'Batch',
      'Company',
      'Internship',
      'Status',
      'Student_rating',
      'Student_feedback',
      'Employer_rating',
      'Employer_feedback',
    ];
    const rows = filtered.map((r) => [
      r.studentName,
      r.rollNumber,
      r.branch,
      r.batchYear != null ? String(r.batchYear) : '',
      r.companyName,
      r.openingTitle,
      formatStatus(r.applicationStatus),
      r.studentFeedback?.rating != null ? String(r.studentFeedback.rating) : '',
      r.studentFeedback?.feedbackText || '',
      r.employerFeedback?.rating != null ? String(r.employerFeedback.rating) : '',
      r.employerFeedback?.feedbackText || '',
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'internship_progress_reviews.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statLine = useMemo(
    () =>
      `${summary.withStudentFeedback} student · ${summary.withEmployerFeedback} employer submission(s) on ${summary.total} record(s)`,
    [summary],
  );

  if (isLoading) return <PageLoading message="Loading progress reviews…" variant="skeleton-card" />;

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <MessageSquareText size={26} aria-hidden />
            Internship Progress Reviews
          </h1>
          <p className="text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>
            Read-only view of student and employer progress reviews for selected / in-progress internships on your campus.
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
        sortOptions={FEEDBACK_SORT_OPTIONS}
        filteredCount={filteredCount}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <div className="card table-container">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Branch</th>
                <th>Company / Internship</th>
                <th>Student</th>
                <th>Employer</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const updated =
                  row.studentFeedback?.updatedAt || row.employerFeedback?.updatedAt || null;
                return (
                  <tr key={row.programApplicationId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.studentName}</div>
                      <div className="text-xs text-secondary">{row.rollNumber}</div>
                    </td>
                    <td>{row.branch}</td>
                    <td>
                      <div>{row.companyName}</div>
                      <div className="text-xs text-secondary">{row.openingTitle}</div>
                    </td>
                    <td style={{ maxWidth: '280px', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                      {row.studentFeedback ? (
                        <>
                          {row.studentFeedback.rating ? `${row.studentFeedback.rating}/5 · ` : ''}
                          {row.studentFeedback.feedbackText}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ maxWidth: '280px', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                      {row.employerFeedback ? (
                        <>
                          {row.employerFeedback.rating ? `${row.employerFeedback.rating}/5 · ` : ''}
                          {row.employerFeedback.feedbackText}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{updated ? formatDate(updated) : '—'}</td>
                  </tr>
                );
              })}
              {!error && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                    No progress reviews submitted yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
