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
  const summary = data?.summary || { total: 0, withGuide: 0 };

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
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <UserRoundSearch size={26} aria-hidden />
            Internship guides
          </h1>
          <p className="text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>
            Assign a campus faculty or TPO guide for each intern. Students see guide contact details on their
            Internship Progress Reviews page.
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
        sortOptions={GUIDE_SORT_OPTIONS}
        filteredCount={filteredCount}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map((row) => {
          const isEditing = editingId === row.programApplicationId;
          const isSaving = savingId === row.programApplicationId;
          return (
            <div key={row.programApplicationId} className="card" style={{ padding: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginBottom: isEditing || !row.guide ? '0.75rem' : 0,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{row.studentName}</div>
                  <div className="text-sm text-secondary">
                    {row.rollNumber} · {row.branch}
                  </div>
                  <div className="text-sm" style={{ marginTop: '0.35rem' }}>
                    {row.companyName} — {row.openingTitle}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${row.applicationStatus === 'selected' ? 'green' : 'amber'} badge-dot`}>
                    {formatStatus(row.applicationStatus)}
                  </span>
                  {!isEditing ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditingId(row.programApplicationId)}
                    >
                      {row.guide ? 'Edit guide' : 'Assign guide'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={isSaving}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {!isEditing && row.guide ? (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs text-tertiary" style={{ margin: '0 0 0.35rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                    CAMPUS GUIDE
                  </p>
                  <InternshipGuideForm initialGuide={row.guide} readOnly />
                  {row.guide.updatedAt ? (
                    <p className="text-xs text-tertiary" style={{ margin: '0.5rem 0 0' }}>
                      Updated {formatDate(row.guide.updatedAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!isEditing && row.supervisor ? (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs text-tertiary" style={{ margin: '0 0 0.35rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                    COMPANY SUPERVISOR
                  </p>
                  <InternshipSupervisorForm initialSupervisor={row.supervisor} readOnly />
                </div>
              ) : null}

              {isEditing ? (
                <InternshipGuideForm
                  initialGuide={row.guide}
                  saving={isSaving}
                  onSubmit={(payload) => saveGuide(row.programApplicationId, payload)}
                  onClear={row.guide ? () => clearGuide(row.programApplicationId) : null}
                />
              ) : null}
            </div>
          );
        })}

        {!error && filtered.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No selected or in-progress internships on your campus yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
