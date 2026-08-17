'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, STATUS_FILTER_OPTIONS, statusActiveFilterFn } from '@/lib/tableQueryPresets';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { collegePlacementRate } from '@/lib/adminCollegeProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminCollegesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedView = useRef(false);
  const [colleges, setColleges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');

  const openCollege = (id, mode = 'view') => {
    const base = `/dashboard/admin/colleges/${id}`;
    router.push(mode === 'edit' ? `${base}?mode=edit` : base);
  };

  const loadColleges = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/colleges');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load colleges');
      setColleges(Array.isArray(json.colleges) ? json.colleges : []);
      setListError('');
    } catch (e) {
      setListError(e.message || 'Failed to load colleges');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadColleges();
  }, [loadColleges]);

  useEffect(() => {
    if (redirectedView.current) return;
    const viewId = String(searchParams.get('view') || '').trim();
    if (!viewId) return;
    redirectedView.current = true;
    router.replace(`/dashboard/admin/colleges/${viewId}`);
  }, [router, searchParams]);

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayColleges,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(colleges, {
    getSearchText: (c) => [c.name, c.city, c.naac].filter(Boolean).join(' '),
    filterFn: statusActiveFilterFn,
    sortOptions: COMMON_SORT_OPTIONS,
  });

  const getExportRows = (scope = 'current') => {
    const headers = ['College', 'City', 'NAAC', 'Students', 'Placed', 'Rate', 'Status'];
    const source = scope === 'full' ? colleges : displayColleges;
    const rows = source.map((c) => [
      c.name,
      c.city,
      c.naac,
      String(c.students),
      String(c.placed),
      `${collegePlacementRate(c.students, c.placed)}%`,
      c.active ? 'Active' : 'Inactive',
    ]);
    return { headers, rows };
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Manage Colleges</h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">All registered colleges on the platform</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportCsvSplitButton
            filenameBase="admin_colleges"
            currentCount={displayColleges.length}
            fullCount={colleges.length}
            getRows={getExportRows}
          />
          <Button variant="outline" render={<Link href="/dashboard/admin/pending-registrations" />}>Onboard colleges & employers</Button>
          <Button render={<Link href="/dashboard/admin/colleges/add" />}>Add College</Button>
        </div>
      </div>

      {!isLoading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search college, city, or NAAC…"
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={STATUS_FILTER_OPTIONS}
          filterLabel="Status"
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
        <CardHeader className="border-b py-4">
          <CardTitle>College directory</CardTitle>
          <CardDescription>{displayColleges.length} of {colleges.length} colleges</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {['College','City','NAAC','Students','Placed','Rate','Status','Actions'].map((label) => <TableHead key={label}>{label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayColleges.length === 0 && totalCount > 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                  No colleges match your search or filters.
                </TableCell>
              </TableRow>
            ) : null}
            {displayColleges.map((c) => (
              <TableRow
                key={c.id}
                className="admin-row-clickable"
                tabIndex={0}
                role="button"
                aria-label={`View ${c.name} profile`}
                onClick={() => openCollege(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openCollege(c.id);
                  }
                }}
              >
                <TableCell className="font-semibold">
                  <button
                    type="button"
                    className="text-primary font-semibold hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCollege(c.id);
                    }}
                  >
                    {c.name}
                  </button>
                </TableCell>
                <TableCell>{c.city}</TableCell>
                <TableCell><StatusBadge tone="indigo">{c.naac || '—'}</StatusBadge></TableCell>
                <TableCell>{c.students}</TableCell>
                <TableCell>{c.placed}</TableCell>
                <TableCell className="font-bold">{collegePlacementRate(c.students, c.placed)}%</TableCell>
                <TableCell><StatusBadge tone={c.active ? 'green' : 'gray'} showDot>{c.active ? 'Active' : 'Inactive'}</StatusBadge></TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap items-center gap-1">
                    <StandardTableIconAction action="view" onClick={() => openCollege(c.id)} />
                    <StandardTableIconAction action="edit" onClick={() => openCollege(c.id, 'edit')} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && totalCount === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                  {listError || 'No colleges found.'}
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
