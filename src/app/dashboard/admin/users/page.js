'use client';
import { useEffect, useState } from 'react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import {
  COMMON_SORT_OPTIONS,
  FILTER_ALL,
  ROLE_FILTER_OPTIONS,
  roleFilterFn,
  STATUS_FILTER_OPTIONS,
  statusActiveFilterFn,
} from '@/lib/tableQueryPresets';
import { getRoleDisplayName } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/users');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load users');
        if (!mounted) return;
        setUsers(Array.isArray(json.users) ? json.users : []);
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Failed to load users');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayUsers,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(users, {
    getSearchText: (u) => [u.name, u.email, getRoleDisplayName(u.role)].filter(Boolean).join(' '),
    filterFn: (row, f) => {
      if (f === 'active' || f === 'inactive') return statusActiveFilterFn(row, f);
      return roleFilterFn(row, f);
    },
    sortOptions: COMMON_SORT_OPTIONS,
  });

  const getExportRows = (scope = 'current') => {
    const headers = ['User', 'Email', 'Role', 'Status'];
    const source = scope === 'full' ? users : displayUsers;
    const rowsList = source.map((u) => [
      u.name,
      u.email,
      getRoleDisplayName(u.role),
      u.active ? 'Active' : 'Inactive',
    ]);
    return { headers, rows: rowsList };
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>👥 Manage Users</h1><p>All users across the platform</p></div>
        <ExportCsvSplitButton 
          filenameBase="admin_users" 
          currentCount={displayUsers.length} 
          fullCount={users.length} 
          getRows={getExportRows} 
        />
      </div>

      {!isLoading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, email, or role…"
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={[
            FILTER_ALL,
            ...ROLE_FILTER_OPTIONS.slice(1),
            ...STATUS_FILTER_OPTIONS.slice(1),
          ]}
          filterLabel="Filter"
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
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {displayUsers.length === 0 && totalCount > 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-secondary">No users match your search or filters.</td>
              </tr>
            ) : null}
            {displayUsers.map(u => (
            <tr key={u.id}>
              <td><div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><div className="avatar avatar-sm">{u.name.split(' ').map(n=>n[0]).join('')}</div><span className="font-semibold">{u.name}</span></div></td>
              <td className="text-sm">{u.email}</td>
              <td><span className={`badge badge-${u.role === 'super_admin' ? 'red' : u.role === 'college_admin' ? 'indigo' : u.role === 'employer' ? 'green' : 'blue'}`}>{getRoleDisplayName(u.role)}</span></td>
              <td><span className={`badge ${u.active ? 'badge-green' : 'badge-gray'} badge-dot`}>{u.active ? 'Active' : 'Inactive'}</span></td>
              <td>
                <StandardTableIconAction action="edit" variant="ghost" disabled tooltip="Coming soon" />
              </td>
            </tr>
          ))}
          {!isLoading && totalCount === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-secondary">{error || 'No users found.'}</td>
            </tr>
          ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
