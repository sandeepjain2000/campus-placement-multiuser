'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { ADMIN_LISTING_TAB_OPTIONS } from '@/lib/adminPlacementListings';
import { listingRowSelectionId } from '@/lib/adminPlacementListingEmail';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { toCsvIsoDate } from '@/lib/csvExport';
import { useToast } from '@/components/ToastProvider';
import { useTableRowSelection, usePruneRowSelection } from '@/hooks/useTableRowSelection';
import TableBulkActionBar from '@/components/table/TableBulkActionBar';
import AdminPlacementListingEmailComposeModal from '@/components/admin/AdminPlacementListingEmailComposeModal';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Briefcase, Target, GraduationCap, FolderDot, Trophy, LayoutList, Mail } from 'lucide-react';

const fetcher = async (url) => {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to load listings');
  return json;
};

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first', fn: (a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0) },
  { value: 'date_asc', label: 'Oldest first', fn: (a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0) },
  { value: 'title_asc', label: 'Title A–Z', fn: (a, b) => String(a.title || '').localeCompare(String(b.title || '')) },
  { value: 'employer_asc', label: 'Employer A–Z', fn: (a, b) => String(a.employerName || '').localeCompare(String(b.employerName || '')) },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'requested', label: 'Requested' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function StatChip({ icon: Icon, label, value }) {
  return (
    <div
      className="stats-card"
      style={{ padding: '1rem 1.15rem', minHeight: 0 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <Icon size={18} strokeWidth={1.5} className="text-secondary" aria-hidden />
        <span className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <div className="stats-card-value" style={{ fontSize: '1.5rem' }}>{value}</div>
    </div>
  );
}

export default function AdminPlacementListingsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [emailComposeRows, setEmailComposeRows] = useState(null);

  const { data, error, isLoading } = useSWR('/api/admin/placement-listings?kind=all', fetcher, {
    revalidateOnFocus: true,
  });

  const items = Array.isArray(data?.items) ? data.items : [];
  const counts = data?.counts || {};

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayItems,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(items, {
    getSearchText: (row) =>
      [row.title, row.typeLabel, row.employerName, row.collegeNames, row.status].filter(Boolean).join(' '),
    filterFn: (row, f) => !f || String(row.status || '').toLowerCase() === f,
    sortOptions: SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const [typeTab, setTypeTab] = useState('');

  const typeFiltered = useMemo(() => {
    if (!typeTab) return displayItems;
    return displayItems.filter((row) => {
      if (typeTab === 'drive') return row.source === 'drive';
      return row.source === 'posting' && row.category === typeTab;
    });
  }, [displayItems, typeTab]);

  const typeFilteredCount = typeFiltered.length;

  const selection = useTableRowSelection({ getRowId: listingRowSelectionId });
  usePruneRowSelection(selection, typeFiltered, { getRowId: listingRowSelectionId });

  const userEmail = String(session?.user?.email || '').trim();

  const emailListings = (rows) => {
    const list = (rows || []).filter(Boolean);
    if (!list.length) {
      addToast('Select at least one listing to email.', 'warning');
      return;
    }
    setEmailComposeRows(list);
  };

  const emailFilteredListings = () => emailListings(typeFiltered);
  const emailAllListings = () => emailListings(items);
  const emailSelectedListings = () => emailListings(selection.selectedRows(typeFiltered));

  const pageAllSelected = selection.allSelected(typeFiltered);
  const pageSomeSelected = selection.someSelected(typeFiltered);

  const getCsvRows = (scope) => {
    const list = scope === 'current' ? typeFiltered : items;
    return {
      headers: [
        'id',
        'type',
        'title',
        'status',
        'employer',
        'colleges',
        'applications_or_registered',
        'event_or_deadline',
        'created_at',
      ],
      rows: list.map((row) => [
        row.id,
        row.typeLabel,
        row.title ?? '',
        row.status ?? '',
        row.employerName ?? '',
        row.collegeNames ?? '',
        String(row.applicationCount ?? ''),
        row.eventDate ? toCsvIsoDate(row.eventDate) : '',
        row.createdAt ? toCsvIsoDate(row.createdAt) : '',
      ]),
    };
  };

  if (error) return <PageError error={error} />;
  if (isLoading || !data) {
    return <PageLoading message="Loading placement listings…" variant="skeleton-dashboard" />;
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LayoutList size={28} className="text-secondary" strokeWidth={1.5} />
            Placement listings
          </h1>
          <p className="text-secondary">
            All jobs, internships, projects, hackathons, and placement drives across every college and employer.
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {totalCount > 0 ? (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={emailFilteredListings}
                title="Compose email for listings in the current view"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Mail size={15} aria-hidden />
                Email view ({typeFilteredCount})
              </button>
              {typeFilteredCount !== totalCount ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={emailAllListings}
                  title="Compose email for every listing"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Mail size={15} aria-hidden />
                  Email all ({totalCount})
                </button>
              ) : null}
            </>
          ) : null}
          <ExportCsvSplitButton
            mode="dual"
            filenameBase="admin_placement_listings"
            currentCount={typeFilteredCount}
            fullCount={totalCount}
            getRows={(scope) => getCsvRows(scope === 'current' ? 'current' : 'full')}
          />
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
        <StatChip icon={Briefcase} label="Jobs" value={counts.job ?? 0} />
        <StatChip icon={GraduationCap} label="Internships" value={counts.internship ?? 0} />
        <StatChip icon={Target} label="Drives" value={counts.drive ?? 0} />
        <StatChip icon={FolderDot} label="Projects" value={counts.project ?? 0} />
        <StatChip icon={Trophy} label="Hackathons" value={counts.hackathon ?? 0} />
        <StatChip icon={LayoutList} label="Total" value={counts.all ?? totalCount} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {ADMIN_LISTING_TAB_OPTIONS.map((tab) => {
          const active = typeTab === tab.value;
          const n =
            tab.value === ''
              ? counts.all ?? totalCount
              : counts[tab.value] ?? 0;
          return (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => setTypeTab(tab.value)}
              className={active ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            >
              {tab.label}
              <span className="font-mono" style={{ marginLeft: '0.35rem', opacity: 0.85 }}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {totalCount > 0 && (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search title, employer, college, status…"
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={STATUS_FILTER_OPTIONS}
          filterLabel="Status"
          sort={sort}
          onSortChange={setSort}
          sortOptions={SORT_OPTIONS}
          filteredCount={typeFilteredCount}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters || Boolean(typeTab)}
          onClear={() => {
            clearFilters();
            setTypeTab('');
          }}
        />
      )}

      {totalCount > 0 ? (
        <TableBulkActionBar
          count={selection.count}
          onEmail={emailSelectedListings}
          onClear={selection.clear}
          emailLabel="Email selected listings"
        />
      ) : null}

      {totalCount === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <p className="text-sm text-secondary" style={{ margin: 0 }}>
            No job postings or placement drives in the database yet.
          </p>
        </div>
      ) : (
        <div className="card card-table-shell">
          <div className="table-container">
            <table className="data-table student-opportunities-table">
              <colgroup>
                <col className="student-opportunities-col-select" />
              </colgroup>
              <thead>
                <tr>
                  <th className="student-opportunities-col-select" style={{ paddingLeft: '0.75rem' }}>
                    <input
                      type="checkbox"
                      aria-label="Select all listings on this page"
                      checked={pageAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = pageSomeSelected;
                      }}
                      onChange={() => selection.toggleAll(typeFiltered)}
                    />
                  </th>
                  <th style={{ paddingLeft: '0.5rem' }}>Type</th>
                  <th>Title</th>
                  <th>Employer</th>
                  <th>College(s)</th>
                  <th>Status</th>
                  <th>Apps / reg.</th>
                  <th>Date</th>
                  <th>Posted</th>
                  <th className="student-opportunities-col-actions" style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {typeFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center text-secondary">
                      No listings match your filters.
                    </td>
                  </tr>
                ) : null}
                {typeFiltered.map((row) => (
                  <tr
                    key={listingRowSelectionId(row)}
                    className={selection.isSelected(row) ? 'is-row-selected' : undefined}
                  >
                    <td className="student-opportunities-col-select" style={{ paddingLeft: '0.75rem' }}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.title || 'listing'}`}
                        checked={selection.isSelected(row)}
                        onChange={() => selection.toggle(row)}
                      />
                    </td>
                    <td style={{ paddingLeft: '0.5rem' }} className="text-sm">
                      {row.typeLabel}
                    </td>
                    <td className="font-semibold text-sm cell-truncate" title={row.title || undefined}>
                      {row.title || '—'}
                    </td>
                    <td className="text-sm cell-truncate" title={row.employerName || undefined}>
                      {row.employerId ? (
                        <Link
                          href={`/dashboard/admin/employers?view=${encodeURIComponent(row.employerId)}`}
                          className="admin-entity-name-btn"
                          style={{ display: 'inline' }}
                        >
                          {row.employerName}
                        </Link>
                      ) : (
                        row.employerName || '—'
                      )}
                    </td>
                    <td className="text-sm cell-truncate" title={row.collegeNames || undefined}>
                      {row.collegeId ? (
                        <Link
                          href={`/dashboard/admin/colleges/${row.collegeId}`}
                          className="admin-entity-name-btn"
                          style={{ display: 'inline' }}
                        >
                          {row.collegeNames}
                        </Link>
                      ) : (
                        row.collegeNames || '—'
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${getStatusColor(row.status)} badge-dot`}>
                        {formatStatus(row.status)}
                      </span>
                    </td>
                    <td className="text-sm">{row.applicationCount ?? '—'}</td>
                    <td className="text-sm text-secondary">
                      {row.eventDate ? formatDate(row.eventDate) : '—'}
                    </td>
                    <td className="text-sm text-secondary">
                      {row.createdAt ? formatDate(row.createdAt) : '—'}
                    </td>
                    <td
                      className="student-opportunities-col-actions"
                      style={{ textAlign: 'right', paddingRight: '1.25rem' }}
                    >
                      <div
                        className="table-actions"
                        style={{
                          display: 'inline-flex',
                          gap: '0.35rem',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          flexWrap: 'nowrap',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <StandardTableIconAction
                          action="email"
                          showLabel={false}
                          onClick={() => emailListings([row])}
                          tooltip="Email this listing"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {emailComposeRows ? (
        <AdminPlacementListingEmailComposeModal
          rows={emailComposeRows}
          defaultTo={userEmail}
          onClose={() => setEmailComposeRows(null)}
        />
      ) : null}
    </div>
  );
}
