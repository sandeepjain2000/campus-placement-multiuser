'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { MessageSquareText } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { SORT_DATE_ASC, SORT_DATE_DESC } from '@/lib/dataTableQuery';
import { formatDate, formatStatus } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const summary = useMemo(
    () => data?.summary || { total: 0, withStudentFeedback: 0, withEmployerFeedback: 0 },
    [data?.summary],
  );

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
    <div className="animate-fadeIn flex flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-3xl flex-col gap-1">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <MessageSquareText className="text-muted-foreground size-7" strokeWidth={1.5} aria-hidden />
            Internship Progress Reviews
          </h1>
          <p className="text-muted-foreground m-0 text-sm">
            Read-only view of student and employer progress reviews for selected / in-progress internships on your campus.
          </p>
          <p className="text-muted-foreground m-0 text-xs">{statLine}</p>
        </div>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>
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

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Company / Internship</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const updated =
                  row.studentFeedback?.updatedAt || row.employerFeedback?.updatedAt || null;
                return (
                  <TableRow key={row.programApplicationId}>
                    <TableCell>
                      <div className="font-medium">{row.studentName}</div>
                      <div className="text-muted-foreground text-xs">{row.rollNumber}</div>
                    </TableCell>
                    <TableCell>{row.branch}</TableCell>
                    <TableCell>
                      <div>{row.companyName}</div>
                      <div className="text-muted-foreground text-xs">{row.openingTitle}</div>
                    </TableCell>
                    <TableCell className="max-w-[280px] whitespace-pre-wrap text-sm">
                      {row.studentFeedback ? (
                        <>
                          {row.studentFeedback.rating ? `${row.studentFeedback.rating}/5 · ` : ''}
                          {row.studentFeedback.feedbackText}
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="max-w-[280px] whitespace-pre-wrap text-sm">
                      {row.employerFeedback ? (
                        <>
                          {row.employerFeedback.rating ? `${row.employerFeedback.rating}/5 · ` : ''}
                          {row.employerFeedback.feedbackText}
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{updated ? formatDate(updated) : '—'}</TableCell>
                  </TableRow>
                );
              })}
              {!error && filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                    No progress reviews submitted yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
