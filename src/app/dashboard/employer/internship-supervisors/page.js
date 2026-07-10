'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { UserCog } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import DataTableToolbar from '@/components/DataTableToolbar';
import InternshipSupervisorForm from '@/components/internship/InternshipSupervisorForm';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { SORT_DATE_ASC, SORT_DATE_DESC } from '@/lib/dataTableQuery';
import { useToast } from '@/components/ToastProvider';
import { formatDate, formatStatus } from '@/lib/utils';

const SUPERVISOR_SORT_OPTIONS = [
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

export default function EmployerInternshipSupervisorsPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/employer/internship-supervisors', fetcher);
  const [savingId, setSavingId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const items = Array.isArray(data?.items) ? data.items : [];
  const summary = data?.summary || { total: 0, withSupervisor: 0 };

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
        r.openingTitle,
        r.supervisor?.supervisorName,
        r.supervisor?.supervisorEmail,
        r.supervisor?.supervisorTeam,
      ]
        .filter(Boolean)
        .join(' '),
    sortOptions: SUPERVISOR_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });

  const saveSupervisor = async (programApplicationId, payload) => {
    setSavingId(programApplicationId);
    try {
      const res = await fetch('/api/employer/internship-supervisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programApplicationId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      addToast('Intern supervisor saved.', 'success');
      setEditingId(null);
      await mutate();
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const clearSupervisor = async (programApplicationId) => {
    setSavingId(programApplicationId);
    try {
      const res = await fetch('/api/employer/internship-supervisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programApplicationId, clear: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Remove failed');
      addToast('Supervisor removed.', 'success');
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
      'Internship',
      'Status',
      'Supervisor_name',
      'Supervisor_team',
      'Supervisor_email',
      'Supervisor_phone',
      'Supervisor_notes',
    ];
    const rows = filtered.map((r) => [
      r.studentName,
      r.rollNumber || r.systemId,
      r.openingTitle,
      formatStatus(r.status),
      r.supervisor?.supervisorName || '',
      r.supervisor?.supervisorTeam || '',
      r.supervisor?.supervisorEmail || '',
      r.supervisor?.supervisorPhone || '',
      r.supervisor?.supervisorNotes || '',
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'internship_supervisors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statLine = useMemo(
    () => `${summary.withSupervisor} of ${summary.total} selected / in-progress intern(s) have a supervisor assigned`,
    [summary],
  );

  if (isLoading) return <PageLoading message="Loading interns…" variant="skeleton-card" />;

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <UserCog size={26} aria-hidden />
            Internship supervisors
          </h1>
          <p className="text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>
            Assign a company supervisor for each intern. Students see supervisor contact details on their
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
        sortOptions={SUPERVISOR_SORT_OPTIONS}
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
                  marginBottom: isEditing || !row.supervisor ? '0.75rem' : 0,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{row.studentName}</div>
                  <div className="text-sm text-secondary">{row.rollNumber || row.systemId}</div>
                  <div className="text-sm" style={{ marginTop: '0.35rem' }}>
                    {row.openingTitle}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${row.status === 'selected' ? 'green' : 'amber'} badge-dot`}>
                    {formatStatus(row.status)}
                  </span>
                  {!isEditing ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditingId(row.programApplicationId)}
                    >
                      {row.supervisor ? 'Edit supervisor' : 'Assign supervisor'}
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

              {!isEditing && row.supervisor ? (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <InternshipSupervisorForm initialSupervisor={row.supervisor} readOnly />
                  {row.supervisor.updatedAt ? (
                    <p className="text-xs text-tertiary" style={{ margin: '0.5rem 0 0' }}>
                      Updated {formatDate(row.supervisor.updatedAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isEditing ? (
                <InternshipSupervisorForm
                  initialSupervisor={row.supervisor}
                  saving={isSaving}
                  onSubmit={(payload) => saveSupervisor(row.programApplicationId, payload)}
                  onClear={row.supervisor ? () => clearSupervisor(row.programApplicationId) : null}
                />
              ) : null}
            </div>
          );
        })}

        {!error && filtered.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No selected or in-progress interns yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
