'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, FILTER_ALL } from '@/lib/tableQueryPresets';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { GraduationCap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function placementTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'placed') return 'green';
  if (s === 'offer' || s === 'offered') return 'indigo';
  if (s === 'blocked' || s === 'ineligible') return 'red';
  return 'blue';
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/students');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load students');
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

  const collegeFilterOptions = useMemo(() => {
    const names = [...new Set(students.map((s) => s.collegeName).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
    return [FILTER_ALL, ...names.map((name) => ({ value: name, label: name }))];
  }, [students]);

  const {
    search,
    setSearch,
    sort,
    setSort,
    filter,
    setFilter,
    filtered: displayStudents,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(students, {
    getSearchText: (s) =>
      [s.name, s.email, s.collegeName, s.systemId, s.roll, s.dept, s.branch, s.placementStatus]
        .filter(Boolean)
        .join(' '),
    filterFn: (row, f) => {
      if (!f) return true;
      return String(row.collegeName || '') === f;
    },
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });

  const CSV_HEADERS = [
    'Name',
    'Email',
    'College',
    'System ID',
    'Department',
    'Branch',
    'Batch',
    'Placement status',
    'Verified',
    'Account',
  ];

  const studentToCsvRow = useCallback(
    (s) => [
      s.name,
      s.email,
      s.collegeName,
      s.systemId || s.roll || '',
      s.dept,
      s.branch,
      s.batchYear != null ? String(s.batchYear) : '',
      s.placementStatus || '',
      s.verified ? 'Yes' : 'No',
      s.accountActive === false ? 'Inactive' : 'Active',
    ],
    [],
  );

  const getExportRows = useCallback(
    (scope) => ({
      headers: CSV_HEADERS,
      rows: (scope === 'current' ? displayStudents : students).map(studentToCsvRow),
    }),
    [displayStudents, students, studentToCsvRow],
  );

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <GraduationCap className="text-muted-foreground size-7" aria-hidden />
            Students
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 max-w-2xl text-sm">
            Active students across all colleges. View and search only — colleges manage add, edit, and import.
          </p>
        </div>
        <ExportCsvSplitButton
          filenameBase="admin_students"
          currentCount={displayStudents.length}
          fullCount={students.length}
          getRows={getExportRows}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search student, college, or ID…"
          sort={sort}
          onSortChange={setSort}
          sortOptions={COMMON_SORT_OPTIONS}
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={collegeFilterOptions}
          filterLabel="College"
          filteredCount={filteredCount}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Directory</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading…' : `${displayStudents.length} student${displayStudents.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {['Student', 'College', 'System ID', 'Department', 'Batch', 'Status'].map((label) => (
                  <TableHead key={label}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : null}
              {!isLoading && displayStudents.length === 0 && totalCount > 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    No students match your search or filters.
                  </TableCell>
                </TableRow>
              ) : null}
              {!isLoading &&
                displayStudents.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-muted-foreground text-sm">{s.email || '—'}</div>
                    </TableCell>
                    <TableCell>{s.collegeName || '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{s.systemId || s.roll || '—'}</TableCell>
                    <TableCell>
                      <div>{s.dept || '—'}</div>
                      {s.branch ? <div className="text-muted-foreground text-xs">{s.branch}</div> : null}
                    </TableCell>
                    <TableCell>{s.batchYear != null ? s.batchYear : '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge tone={placementTone(s.placementStatus)}>
                          {s.placementStatus || '—'}
                        </StatusBadge>
                        {s.verified ? <StatusBadge tone="green">Verified</StatusBadge> : null}
                        {s.accountActive === false ? <StatusBadge tone="red">Inactive</StatusBadge> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    No active students on the platform yet.
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
