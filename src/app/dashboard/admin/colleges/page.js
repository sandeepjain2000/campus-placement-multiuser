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

  const getExportRows = () => {
    const headers = ['College', 'City', 'NAAC', 'Students', 'Placed', 'Rate', 'Status'];
    const rows = colleges.map((c) => [
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
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🏫 Manage Colleges</h1>
          <p>All registered colleges on the platform</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <ExportCsvSplitButton
            filenameBase="admin_colleges"
            currentCount={displayColleges.length}
            fullCount={colleges.length}
            getRows={getExportRows}
          />
          <Link className="btn btn-secondary" href="/dashboard/admin/pending-registrations">
            Onboard colleges & employers
          </Link>
          <Link className="btn btn-primary" href="/dashboard/admin/colleges/add">
            + Add College
          </Link>
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

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>College</th>
              <th>City</th>
              <th>NAAC</th>
              <th>Students</th>
              <th>Placed</th>
              <th>Rate</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayColleges.length === 0 && totalCount > 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-secondary">
                  No colleges match your search or filters.
                </td>
              </tr>
            ) : null}
            {displayColleges.map((c) => (
              <tr
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
                <td className="font-semibold">
                  <button
                    type="button"
                    className="admin-entity-name-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCollege(c.id);
                    }}
                  >
                    {c.name}
                  </button>
                </td>
                <td>{c.city}</td>
                <td>
                  <span className="badge badge-indigo">{c.naac}</span>
                </td>
                <td>{c.students}</td>
                <td>{c.placed}</td>
                <td className="font-bold">{collegePlacementRate(c.students, c.placed)}%</td>
                <td>
                  <span className={`badge badge-dot ${c.active ? 'badge-green' : 'badge-gray'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                    <StandardTableIconAction action="view" onClick={() => openCollege(c.id)} />
                    <StandardTableIconAction action="edit" onClick={() => openCollege(c.id, 'edit')} />
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && totalCount === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-secondary">
                  {listError || 'No colleges found.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
