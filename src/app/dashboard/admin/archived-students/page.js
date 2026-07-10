'use client';

import { useCallback, useEffect, useState } from 'react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { Archive, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminArchivedStudentsPage() {
  const { addToast } = useToast();
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/archived-students');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load archived students');
      setStudents(Array.isArray(json.students) ? json.students : []);
    } catch (e) {
      setError(e.message || 'Failed to load');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayStudents,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(students, {
    getSearchText: (s) =>
      [s.name, s.email, s.collegeName, s.systemId, s.roll, s.dept, s.archivedBy].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const restoreOne = async (student) => {
    if (
      !confirm(
        `Restore ${student.name}? They will reappear in their college student list and can access drives and jobs again.`,
      )
    ) {
      return;
    }
    setRestoringId(student.id);
    try {
      const res = await fetch(`/api/admin/archived-students/${student.id}/restore`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Restore failed');
      addToast(json.message || 'Student restored.', 'success');
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (e) {
      addToast(e.message || 'Restore failed', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              margin: '0 0 0.35rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Archive size={24} aria-hidden style={{ color: 'var(--primary-600)' }} />
            Archived students
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 560 }}>
            Students removed by college admins (mistaken or test entries). Restore one at a time to bring them back
            into drives, jobs, and the active student list.
          </p>
        </div>
      </div>

      {error ? (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            borderColor: 'var(--danger-300)',
            background: 'var(--danger-50)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 600 }}>{error}</p>
        </div>
      ) : null}

      {!isLoading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search student, college, or ID…"
          sort={sort}
          onSortChange={setSort}
          sortOptions={COMMON_SORT_OPTIONS}
          filteredCount={filteredCount}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>College</th>
              <th>System ID</th>
              <th>Department</th>
              <th>Archived</th>
              <th>Archived by</th>
              <th style={{ width: 88, textAlign: 'right' }}>Restore</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center text-secondary" style={{ padding: '2rem' }}>
                  Loading…
                </td>
              </tr>
            ) : null}
            {!isLoading && displayStudents.length === 0 && totalCount > 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-secondary">
                  No archived students match your search.
                </td>
              </tr>
            ) : null}
            {!isLoading &&
              displayStudents.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="text-sm text-secondary">{s.email}</div>
                  </td>
                  <td>{s.collegeName || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem' }}>
                    {s.systemId || s.roll || '—'}
                  </td>
                  <td>{s.dept || '—'}</td>
                  <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{formatWhen(s.archivedAt)}</td>
                  <td style={{ fontSize: '0.85rem' }}>{s.archivedBy || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm btn-icon"
                      title="Restore student"
                      aria-label={`Restore ${s.name}`}
                      disabled={restoringId === s.id}
                      onClick={() => restoreOne(s)}
                    >
                      <RotateCcw size={16} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            {!isLoading && students.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-secondary" style={{ padding: '2.5rem' }}>
                  No archived students. When a college admin archives a student, they will appear here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
