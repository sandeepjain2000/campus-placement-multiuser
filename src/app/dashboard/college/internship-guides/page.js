'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { UserRoundSearch } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import DataTableToolbar from '@/components/DataTableToolbar';
import InternshipGuideForm from '@/components/internship/InternshipGuideForm';
import InternshipSupervisorForm from '@/components/internship/InternshipSupervisorForm';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { SORT_DATE_ASC, SORT_DATE_DESC } from '@/lib/dataTableQuery';
import { useToast } from '@/components/ToastProvider';
import { formatDate, formatStatus } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/ui/status-badge';

const GUIDE_SORT_OPTIONS = [
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

export default function CollegeInternshipGuidesPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/college/internship-guides', fetcher);
  const [savingId, setSavingId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const items = Array.isArray(data?.items) ? data.items : [];
  const summary = useMemo(
    () => data?.summary || { total: 0, withGuide: 0 },
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
      [
        r.studentName,
        r.rollNumber,
        r.branch,
        r.companyName,
        r.openingTitle,
        r.guide?.guideName,
        r.guide?.guideEmail,
        r.guide?.guideDepartment,
      ]
        .filter(Boolean)
        .join(' '),
    sortOptions: GUIDE_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });

  const saveGuide = async (programApplicationId, payload) => {
    setSavingId(programApplicationId);
    try {
      const res = await fetch('/api/college/internship-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programApplicationId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      addToast('Internship guide saved.', 'success');
      setEditingId(null);
      await mutate();
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const clearGuide = async (programApplicationId) => {
    setSavingId(programApplicationId);
    try {
      const res = await fetch('/api/college/internship-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programApplicationId, clear: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Remove failed');
      addToast('Guide removed.', 'success');
      setEditingId(null);
      await mutate();
    } catch (e) {
      addToast(e.message || 'Remove failed', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const exportCsv = () => {
    const header = [
      'Student',
      'Roll',
      'Branch',
      'Batch',
      'Company',
      'Internship',
      'Status',
      'Guide_name',
      'Guide_department',
      'Guide_email',
      'Guide_phone',
      'Guide_notes',
      'Supervisor_name',
      'Supervisor_team',
      'Supervisor_email',
    ];
    const rows = filtered.map((r) => [
      r.studentName,
      r.rollNumber,
      r.branch,
      r.batchYear != null ? String(r.batchYear) : '',
      r.companyName,
      r.openingTitle,
      formatStatus(r.applicationStatus),
      r.guide?.guideName || '',
      r.guide?.guideDepartment || '',
      r.guide?.guideEmail || '',
      r.guide?.guidePhone || '',
      r.guide?.guideNotes || '',
      r.supervisor?.supervisorName || '',
      r.supervisor?.supervisorTeam || '',
      r.supervisor?.supervisorEmail || '',
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'internship_guides.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statLine = useMemo(
    () => `${summary.withGuide} of ${summary.total} selected / in-progress intern(s) have a guide assigned`,
    [summary],
  );

  if (isLoading) return <PageLoading message="Loading interns…" variant="skeleton-card" />;

  return (
    <div className="animate-fadeIn flex flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-3xl flex-col gap-1">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <UserRoundSearch className="text-muted-foreground size-7" strokeWidth={1.5} aria-hidden />
            Internship guides
          </h1>
          <p className="text-muted-foreground m-0 text-sm">
            Assign a campus faculty or TPO guide for each intern. Students see guide contact details on their
            Internship Progress Reviews page.
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
        sortOptions={GUIDE_SORT_OPTIONS}
        filteredCount={filteredCount}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <div className="flex flex-col gap-4">
        {filtered.map((row) => {
          const isEditing = editingId === row.programApplicationId;
          const isSaving = savingId === row.programApplicationId;
          return (
            <Card key={row.programApplicationId}>
              <CardHeader className="border-b">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <CardTitle>{row.studentName}</CardTitle>
                  <div className="text-muted-foreground text-sm">
                    {row.rollNumber} · {row.branch}
                  </div>
                  <div className="mt-1 text-sm">
                    {row.companyName} — {row.openingTitle}
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <StatusBadge tone={row.applicationStatus === 'selected' ? 'green' : 'amber'} showDot>
                    {formatStatus(row.applicationStatus) || 'Applied'}
                  </StatusBadge>
                  {!isEditing ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(row.programApplicationId)}
                    >
                      {row.guide ? 'Edit guide' : 'Assign guide'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">

              {!isEditing && row.guide ? (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground m-0 text-xs font-semibold tracking-wide">
                    CAMPUS GUIDE
                  </p>
                  <InternshipGuideForm initialGuide={row.guide} readOnly />
                  {row.guide.updatedAt ? (
                    <p className="text-muted-foreground m-0 text-xs">
                      Updated {formatDate(row.guide.updatedAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!isEditing && row.supervisor ? (
                <>
                <Separator />
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground m-0 text-xs font-semibold tracking-wide">
                    COMPANY SUPERVISOR
                  </p>
                  <InternshipSupervisorForm initialSupervisor={row.supervisor} readOnly />
                </div>
                </>
              ) : null}

              {isEditing ? (
                <InternshipGuideForm
                  initialGuide={row.guide}
                  saving={isSaving}
                  onSubmit={(payload) => saveGuide(row.programApplicationId, payload)}
                  onClear={row.guide ? () => clearGuide(row.programApplicationId) : null}
                />
              ) : null}
              </CardContent>
            </Card>
          );
        })}

        {!error && filtered.length === 0 ? (
          <Card><CardContent className="text-muted-foreground py-10 text-center">No selected or in-progress internships on your campus yet.</CardContent></Card>
        ) : null}
      </div>
    </div>
  );
}
