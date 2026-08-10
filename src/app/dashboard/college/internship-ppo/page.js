'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Award } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { SORT_DATE_ASC, SORT_DATE_DESC } from '@/lib/dataTableQuery';
import { formatDate, formatStatus } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

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
  const summary = useMemo(
    () => data?.summary || { total: 0, awaitingStudent: 0, accepted: 0, withJobOffer: 0 },
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
    <div className="animate-fadeIn flex flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-3xl flex-col gap-1">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Award className="text-muted-foreground size-7" strokeWidth={1.5} aria-hidden />
            Internship PPO
          </h1>
          <p className="text-muted-foreground m-0 text-sm">
            Read-only view of Pre-Placement Offers for interns on your campus. PPO is separate from internship selection
            and formal job offers.
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
        sortOptions={PPO_SORT_OPTIONS}
        filteredCount={filteredCount}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <div className="flex flex-col gap-4">
        {filtered.map((row) => (
          <Card key={row.programApplicationId}>
            <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <div className="font-medium">{row.studentName}</div>
                <div className="text-muted-foreground text-sm">
                  {row.rollNumber} · {row.branch}
                  {row.batchYear ? ` · Batch ${row.batchYear}` : ''}
                </div>
                <div className="mt-1 text-sm">
                  {row.companyName} — {row.openingTitle}
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <StatusBadge tone="blue" showDot>{row.ppoStatusLabel || '—'}</StatusBadge>
                {row.jobOfferStatus ? (
                  <StatusBadge tone="green" showDot>Offer: {formatStatus(row.jobOfferStatus) || '—'}</StatusBadge>
                ) : null}
              </div>
            </div>
            {row.ppo?.confirmedAt ? (
              <p className="text-muted-foreground m-0 text-xs">
                PPO confirmed {formatDate(row.ppo.confirmedAt)}
                {row.ppo.studentRespondedAt ? ` · Student responded ${formatDate(row.ppo.studentRespondedAt)}` : ''}
              </p>
            ) : null}
            </CardContent>
          </Card>
        ))}

        {!error && filtered.length === 0 ? (
          <Card><CardContent className="text-muted-foreground py-10 text-center">No PPO records yet for your campus interns.</CardContent></Card>
        ) : null}
      </div>
    </div>
  );
}
