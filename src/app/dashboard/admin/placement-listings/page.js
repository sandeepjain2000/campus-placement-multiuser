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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    <div className="bg-muted/50 flex items-center gap-3 rounded-lg border px-4 py-3">
        <Icon className="text-muted-foreground size-5" strokeWidth={1.5} aria-hidden />
        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      <strong className="ml-auto font-mono text-lg">{value}</strong>
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
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <LayoutList className="text-muted-foreground size-7" strokeWidth={1.5} />
            Placement listings
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            All jobs, internships, projects, hackathons, and placement drives across every college and employer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totalCount > 0 ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={emailFilteredListings}
                title="Compose email for listings in the current view"
              >
                <Mail data-icon="inline-start" aria-hidden />
                Email view ({typeFilteredCount})
              </Button>
              {typeFilteredCount !== totalCount ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={emailAllListings}
                  title="Compose email for every listing"
                >
                  <Mail data-icon="inline-start" aria-hidden />
                  Email all ({totalCount})
                </Button>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatChip icon={Briefcase} label="Jobs" value={counts.job ?? 0} />
        <StatChip icon={GraduationCap} label="Internships" value={counts.internship ?? 0} />
        <StatChip icon={Target} label="Drives" value={counts.drive ?? 0} />
        <StatChip icon={FolderDot} label="Projects" value={counts.project ?? 0} />
        <StatChip icon={Trophy} label="Hackathons" value={counts.hackathon ?? 0} />
        <StatChip icon={LayoutList} label="Total" value={counts.all ?? totalCount} />
      </div>

      <div className="flex flex-wrap gap-2">
        {ADMIN_LISTING_TAB_OPTIONS.map((tab) => {
          const active = typeTab === tab.value;
          const n =
            tab.value === ''
              ? counts.all ?? totalCount
              : counts[tab.value] ?? 0;
          return (
            <Button
              key={tab.value || 'all'}
              type="button"
              onClick={() => setTypeTab(tab.value)}
              variant={active ? 'secondary' : 'outline'}
              size="sm"
            >
              {tab.label}
              <span className="font-mono" style={{ marginLeft: '0.35rem', opacity: 0.85 }}>
                {n}
              </span>
            </Button>
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
        <Card><CardContent className="text-muted-foreground py-12 text-center text-sm">
            No job postings or placement drives in the database yet.
        </CardContent></Card>
      ) : (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4"><CardTitle>All listings</CardTitle><CardDescription>{typeFilteredCount} shown</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table className="student-opportunities-table">
              <colgroup>
                <col className="student-opportunities-col-select" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="student-opportunities-col-select pl-3">
                    <Checkbox
                      aria-label="Select all listings on this page"
                      checked={pageAllSelected}
                      indeterminate={pageSomeSelected}
                      onCheckedChange={() => selection.toggleAll(typeFiltered)}
                    />
                  </TableHead>
                  {['Type','Title','Employer','College(s)','Status','Apps / reg.','Date','Posted'].map((label) => <TableHead key={label}>{label}</TableHead>)}
                  <TableHead className="student-opportunities-col-actions pr-5 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-muted-foreground h-24 text-center">
                      No listings match your filters.
                    </TableCell>
                  </TableRow>
                ) : null}
                {typeFiltered.map((row) => (
                  <TableRow
                    key={listingRowSelectionId(row)}
                    className={selection.isSelected(row) ? 'is-row-selected' : undefined}
                  >
                    <TableCell className="student-opportunities-col-select pl-3">
                      <Checkbox
                        aria-label={`Select ${row.title || 'listing'}`}
                        checked={selection.isSelected(row)}
                        onCheckedChange={() => selection.toggle(row)}
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.typeLabel}
                    </TableCell>
                    <TableCell className="cell-truncate text-sm font-semibold" title={row.title || undefined}>
                      {row.title || '—'}
                    </TableCell>
                    <TableCell className="cell-truncate text-sm" title={row.employerName || undefined}>
                      {row.employerId ? (
                        <Link
                          href={`/dashboard/admin/employers?view=${encodeURIComponent(row.employerId)}`}
                          className="text-primary font-medium hover:underline"
                          style={{ display: 'inline' }}
                        >
                          {row.employerName}
                        </Link>
                      ) : (
                        row.employerName || '—'
                      )}
                    </TableCell>
                    <TableCell className="cell-truncate text-sm" title={row.collegeNames || undefined}>
                      {row.collegeId ? (
                        <Link
                          href={`/dashboard/admin/colleges/${row.collegeId}`}
                          className="text-primary font-medium hover:underline"
                          style={{ display: 'inline' }}
                        >
                          {row.collegeNames}
                        </Link>
                      ) : (
                        row.collegeNames || '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={getStatusColor(row.status)} showDot>
                        {formatStatus(row.status) || '—'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm">{row.applicationCount ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.eventDate ? formatDate(row.eventDate) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.createdAt ? formatDate(row.createdAt) : '—'}
                    </TableCell>
                    <TableCell className="student-opportunities-col-actions pr-5 text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
