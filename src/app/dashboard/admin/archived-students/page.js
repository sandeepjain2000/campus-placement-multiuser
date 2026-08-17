'use client';

import { useCallback, useEffect, useState } from 'react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { Archive, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div>
          <h1 className="m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Archive className="text-muted-foreground size-7" aria-hidden />
            Archived students
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 max-w-2xl text-sm">
            Students removed by college admins (mistaken or test entries). Restore one at a time to bring them back
            into drives, jobs, and the active student list.
          </p>
      </div>

      {error ? (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
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

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4"><CardTitle>Archive</CardTitle><CardDescription>{displayStudents.length} archived students</CardDescription></CardHeader>
        <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>{['Student','College','System ID','Department','Archived','Archived by','Restore'].map((label) => <TableHead key={label} className={label === 'Restore' ? 'text-right' : undefined}>{label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  Loading…
              </TableCell></TableRow>
            ) : null}
            {!isLoading && displayStudents.length === 0 && totalCount > 0 ? (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  No archived students match your search.
              </TableCell></TableRow>
            ) : null}
            {!isLoading &&
              displayStudents.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="text-sm text-secondary">{s.email}</div>
                  </TableCell>
                  <TableCell>{s.collegeName || '—'}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {s.systemId || s.roll || '—'}
                  </TableCell>
                  <TableCell>{s.dept || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{formatWhen(s.archivedAt)}</TableCell>
                  <TableCell className="text-sm">{s.archivedBy || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      title="Restore student"
                      aria-label={`Restore ${s.name}`}
                      disabled={restoringId === s.id}
                      onClick={() => restoreOne(s)}
                    >
                      <RotateCcw aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && students.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  No archived students. When a college admin archives a student, they will appear here.
              </TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
    </div>
  );
}
