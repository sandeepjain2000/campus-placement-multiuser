'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { formatDate, formatStatus, formatSalaryRangeParts } from '@/lib/utils';
import { formatEmployerMinCgpa } from '@/lib/employerJobDisplay';
import {
  formatEligibleBranchesLabel,
  PLACEMENT_DRIVE_JOB_TYPE_LABELS,
} from '@/lib/placementDriveJobFields';
import { DriveDetailsSection } from '@/components/employer/DriveFormSection';
import EntityLogo from '@/components/EntityLogo';
import { useToast } from '@/components/ToastProvider';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import {
  Target,
  Plus,
  Video,
  Building2,
  Calendar,
  Users,
  ChevronDown,
  Check,
  ClipboardList,
  LayoutGrid,
  List,
  Search,
  X,
  Ban,
  Pencil,
} from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import PageError from '@/components/PageError';
import { reportClientApiFailure } from '@/lib/clientPlatformErrorReport';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';
import { useEmployerPostingCampuses } from '@/hooks/useEmployerPostingCampuses';
import { formatFilterBadgeLabelParen } from '@/lib/filterBadgeLabel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const EMPLOYER_DRIVES_API = '/api/employer/drives';

const SELECT_CLASS =
  'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2.5 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50';

const drivesFetcher = async (url) => {
  let json = {};
  try {
    const res = await fetch(url);
    json = await res.json().catch(() => ({}));
    if (!res.ok) {
      void reportClientApiFailure({
        context: PLATFORM_ERROR_CONTEXT.EMPLOYER_DRIVE_LIST,
        route: url,
        statusCode: res.status,
        responseBody: json,
      });
      throw new Error(json.userMessage || json.error || 'Failed to load placement drives');
    }
    return json;
  } catch (err) {
    if (err instanceof Error && /Failed to load placement drives/i.test(err.message)) throw err;
    void reportClientApiFailure({
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_DRIVE_LIST,
      route: url,
      message: err instanceof Error ? err.message : 'Network error loading drives',
    });
    throw err instanceof Error ? err : new Error('Failed to load placement drives');
  }
};

const campusesFetcher = (url) => fetch(url).then((r) => r.json());

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'requested', label: 'Awaiting approval' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { id: '', label: 'All types' },
  { id: 'on_campus', label: 'On campus' },
  { id: 'virtual', label: 'Virtual' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'off_campus', label: 'Off campus' },
];

const DATE_OPTIONS = [
  { id: '', label: 'Any date' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'no_date', label: 'No date set' },
];

const REGISTRATION_OPTIONS = [
  { id: '', label: 'Any registrations' },
  { id: 'with', label: 'With applicants' },
  { id: 'without', label: 'No applicants yet' },
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function matchesStatusFilter(status, filter) {
  if (!filter) return true;
  if (filter === 'active') return ['approved', 'scheduled', 'in_progress'].includes(status);
  return status === filter;
}

function matchesDateFilter(dateStr, filter) {
  if (!filter) return true;
  if (filter === 'no_date') return !dateStr;
  if (!dateStr) return false;
  const driveDay = new Date(dateStr);
  driveDay.setHours(0, 0, 0, 0);
  const today = startOfToday();
  if (filter === 'upcoming') return driveDay >= today;
  if (filter === 'past') return driveDay < today;
  return true;
}

function matchesSearch(drive, query) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const haystack = [drive.college, drive.role, drive.venue].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q);
}

function driveTypeTone(type) {
  if (type === 'virtual') return 'blue';
  if (type === 'off_campus' || type === 'hybrid') return 'amber';
  return 'indigo';
}

function driveTypeLabel(type) {
  if (type === 'virtual') return 'Virtual';
  if (type === 'hybrid') return 'Hybrid';
  if (type === 'off_campus') return 'Off campus';
  return 'On campus';
}

function DriveTypeBadge({ type }) {
  const Icon = type === 'virtual' ? Video : Building2;
  return (
    <StatusBadge tone={driveTypeTone(type)} showDot className="min-w-fit">
      <span className="inline-flex items-center gap-1">
        <Icon className="size-3 shrink-0" aria-hidden />
        {driveTypeLabel(type)}
      </span>
    </StatusBadge>
  );
}

function canReviewApplicants(drive) {
  return (drive.registered ?? 0) > 0 && drive.status !== 'requested' && drive.status !== 'rejected';
}

const REVIEW_APPLICANTS_TIP =
  'Review student applications for this placement drive — shortlist, reject, or move candidates forward';
const VIEW_DRIVE_TIP =
  'View placement drive details — campus, role, date, venue, type, status, and registered students';
const EDIT_DRIVE_TIP = 'Edit drive details — title, date, venue, eligibility, and job description';

function canCancelDrive(drive) {
  return ['requested', 'approved', 'scheduled', 'in_progress'].includes(drive.status);
}

function canEditDrive(drive) {
  return canCancelDrive(drive);
}

function cancelDriveTooltip(drive) {
  return drive.status === 'requested'
    ? 'Withdraw this drive request before the college approves it'
    : 'Cancel this placement drive and stop accepting new applicants';
}

function driveDateMs(drive) {
  if (!drive?.date) return null;
  const t = new Date(drive.date).getTime();
  return Number.isNaN(t) ? null : t;
}

const DRIVE_SORT_OPTIONS = [
  {
    value: 'drive_date_asc',
    label: 'Drive date (soonest first)',
    compare: (a, b) => {
      const da = driveDateMs(a);
      const db = driveDateMs(b);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    },
  },
  {
    value: 'drive_date_desc',
    label: 'Drive date (latest first)',
    compare: (a, b) => DRIVE_SORT_OPTIONS[0].compare(b, a),
  },
  {
    value: 'campus_asc',
    label: 'Campus (A → Z)',
    compare: (a, b) =>
      String(a.college ?? '').localeCompare(String(b.college ?? ''), undefined, { sensitivity: 'base' }),
  },
  {
    value: 'campus_desc',
    label: 'Campus (Z → A)',
    compare: (a, b) => DRIVE_SORT_OPTIONS[2].compare(b, a),
  },
  {
    value: 'title_asc',
    label: 'Drive title (A → Z)',
    compare: (a, b) =>
      String(a.role ?? '').localeCompare(String(b.role ?? ''), undefined, { sensitivity: 'base' }),
  },
  {
    value: 'title_desc',
    label: 'Drive title (Z → A)',
    compare: (a, b) => DRIVE_SORT_OPTIONS[4].compare(b, a),
  },
  {
    value: 'registered_desc',
    label: 'Registered (high → low)',
    compare: (a, b) => (b.registered ?? 0) - (a.registered ?? 0),
  },
  {
    value: 'registered_asc',
    label: 'Registered (low → high)',
    compare: (a, b) => (a.registered ?? 0) - (b.registered ?? 0),
  },
  {
    value: 'status_asc',
    label: 'Status (A → Z)',
    compare: (a, b) =>
      String(a.status ?? '').localeCompare(String(b.status ?? ''), undefined, { sensitivity: 'base' }),
  },
];

const DEFAULT_DRIVE_SORT = 'drive_date_asc';

export default function EmployerDrivesPage() {
  const { addToast } = useToast();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [registrationFilter, setRegistrationFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState(DEFAULT_DRIVE_SORT);
  const [cancellingId, setCancellingId] = useState(null);
  const [viewDrive, setViewDrive] = useState(null);
  const dropdownRef = useRef(null);

  const { data: campusData } = useSWR('/api/employer/campuses', campusesFetcher, { revalidateOnFocus: false });
  const approvedCampuses = useEmployerPostingCampuses(campusData, 'drives');

  const { data, error, isLoading, mutate } = useSWR(EMPLOYER_DRIVES_API, drivesFetcher, {
    revalidateOnFocus: true,
    revalidateOnMount: true,
  });
  const allDrives = Array.isArray(data?.drives) ? data.drives : [];

  const statusCounts = useMemo(() => {
    const counts = { '': allDrives.length, requested: 0, active: 0, completed: 0, cancelled: 0 };
    for (const d of allDrives) {
      if (d.status === 'requested') counts.requested += 1;
      else if (['approved', 'scheduled', 'in_progress'].includes(d.status)) counts.active += 1;
      else if (d.status === 'completed') counts.completed += 1;
      else if (d.status === 'cancelled') counts.cancelled += 1;
    }
    return counts;
  }, [allDrives]);

  const filteredDrives = useMemo(() => {
    const campusFilterActiveLocal =
      selectedIds.size > 0 && selectedIds.size < approvedCampuses.length;
    const list = allDrives.filter((drive) => {
      if (campusFilterActiveLocal && !selectedIds.has(drive.tenant_id)) return false;
      if (!matchesStatusFilter(drive.status, statusFilter)) return false;
      if (typeFilter && drive.type !== typeFilter) return false;
      if (!matchesDateFilter(drive.date, dateFilter)) return false;
      if (registrationFilter === 'with' && !(drive.registered > 0)) return false;
      if (registrationFilter === 'without' && (drive.registered ?? 0) > 0) return false;
      if (!matchesSearch(drive, searchQuery)) return false;
      return true;
    });
    const cmp = DRIVE_SORT_OPTIONS.find((o) => o.value === sortKey)?.compare;
    return cmp ? [...list].sort(cmp) : list;
  }, [allDrives, selectedIds, approvedCampuses.length, statusFilter, typeFilter, dateFilter, registrationFilter, searchQuery, sortKey]);

  const campusFilterActive = selectedIds.size > 0 && selectedIds.size < approvedCampuses.length;
  const hasActiveFilters = Boolean(
    statusFilter || typeFilter || dateFilter || registrationFilter || searchQuery.trim() || campusFilterActive || sortKey !== DEFAULT_DRIVE_SORT,
  );

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setTypeFilter('');
    setDateFilter('');
    setRegistrationFilter('');
    setSearchQuery('');
    setSortKey(DEFAULT_DRIVE_SORT);
    setSelectedIds(new Set());
  }, []);

  const cancelDrive = useCallback(async (drive) => {
    const registered = drive.registered ?? 0;
    const confirmMsg = drive.status === 'requested'
      ? `Withdraw the drive request "${drive.role}" at ${drive.college}?`
      : registered > 0
        ? `Cancel "${drive.role}" at ${drive.college}? ${registered} student(s) have registered — the campus will be notified.`
        : `Cancel "${drive.role}" at ${drive.college}? The campus will be notified.`;
    if (!confirm(confirmMsg)) return;

    setCancellingId(drive.id);
    try {
      const res = await fetch('/api/employer/drives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveId: drive.id, action: 'cancel' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to cancel drive');
      addToast(
        drive.status === 'requested' ? 'Drive request withdrawn.' : 'Placement drive cancelled.',
        'success',
      );
      mutate();
    } catch (e) {
      addToast(e.message || 'Failed to cancel drive', 'error');
    } finally {
      setCancellingId(null);
    }
  }, [addToast, mutate]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleCampus = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filterLabel = selectedIds.size === 0 || selectedIds.size === approvedCampuses.length
    ? 'All campuses'
    : selectedIds.size === 1
      ? approvedCampuses.find((c) => selectedIds.has(c.id))?.name ?? '1 campus'
      : `${selectedIds.size} campuses`;

  if (error) {
    return <PageError error={error} reset={() => mutate()} />;
  }

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">
            <Target className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Placement Drives
            {allDrives.length > 0 ? (
              <Badge variant="secondary" className="text-sm font-semibold">
                {filteredDrives.length !== allDrives.length
                  ? `${filteredDrives.length} of ${allDrives.length}`
                  : `${allDrives.length} total`}
              </Badge>
            ) : null}
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            All placement drives across your campus partnerships — past, active, and upcoming.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allDrives.length > 0 ? (
            <ExportCsvSplitButton
              mode="dual"
              filenameBase="employer_placement_drives"
              currentCount={filteredDrives.length}
              fullCount={allDrives.length}
              getRows={(scope) => {
                const rows = scope === 'full' ? allDrives : filteredDrives;
                return {
                  headers: ['id', 'college', 'title', 'date', 'drive_type', 'status', 'venue', 'registered_count', 'ctc_breakup'],
                  rows: rows.map((d) => [
                    d.id, d.college ?? '', d.role ?? '',
                    d.date ?? '', d.type ?? '', d.status ?? '',
                    d.venue ?? '', String(d.registered ?? ''),
                    d.ctc_breakup ?? d.ctcBreakup ?? '',
                  ]),
                };
              }}
            />
          ) : null}
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/employer/drives/request" />}
          >
            <Plus data-icon="inline-start" />
            Request Drive
          </Button>
        </div>
      </div>

      {isLoading ? <PageLoading message="Loading placement drives…" variant="skeleton-list" inline /> : null}

      {!isLoading && allDrives.length === 0 ? (
        <Card className="gap-0 py-10">
          <CardContent className="flex flex-col items-center px-6 text-center">
            <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full">
              <Target className="size-7" />
            </div>
            <CardTitle className="mb-1 text-lg">No placement drives found</CardTitle>
            <CardDescription className="mb-4 max-w-md">
              {campusFilterActive
                ? `No drives found for the selected campus${selectedIds.size > 1 ? 'es' : ''}. Try a different filter or request a new drive.`
                : 'No drives scheduled yet. Request a placement drive with one of your approved partner campuses.'}
            </CardDescription>
            <Button nativeButton={false} render={<Link href="/dashboard/employer/drives/request" />}>
              Request New Drive
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && allDrives.length > 0 ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-3 border-b px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Your placement drives</CardTitle>
                <CardDescription>
                  Showing {filteredDrives.length} of {allDrives.length}
                </CardDescription>
              </div>
              <div
                className="bg-muted flex w-fit items-center gap-0.5 rounded-lg p-[3px]"
                role="group"
                aria-label="View mode"
              >
                {[
                  { mode: 'list', icon: List, label: 'List view', short: 'List' },
                  { mode: 'card', icon: LayoutGrid, label: 'Card view', short: 'Cards' },
                ].map(({ mode, icon: Icon, label, short }) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={viewMode === mode ? 'secondary' : 'ghost'}
                    title={label}
                    aria-label={label}
                    aria-pressed={viewMode === mode}
                    onClick={() => setViewMode(mode)}
                    className="h-8 gap-1.5 px-2.5"
                  >
                    <Icon data-icon="inline-start" />
                    {short}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-card text-card-foreground ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 text-sm shadow-xs ring-1">
              <div className="flex flex-wrap items-end gap-3">
                <Field className="min-w-[200px] flex-1 basis-[220px] gap-1.5">
                  <FieldLabel htmlFor="drive-search">Search</FieldLabel>
                  <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="drive-search"
                      placeholder="Campus, title, or venue…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </Field>
                <Field className="min-w-[140px] flex-[0_1_160px] gap-1.5">
                  <FieldLabel htmlFor="drive-type-filter">Drive type</FieldLabel>
                  <AdminFilterSelect
                    id="drive-type-filter"
                    className={SELECT_CLASS}
                    value={typeFilter}
                    onValueChange={setTypeFilter}
                    items={TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.id === '' ? 'all' : o.id }))}
                  />
                </Field>
                <Field className="min-w-[130px] flex-[0_1_150px] gap-1.5">
                  <FieldLabel htmlFor="drive-date-filter">Date</FieldLabel>
                  <AdminFilterSelect
                    id="drive-date-filter"
                    className={SELECT_CLASS}
                    value={dateFilter}
                    onValueChange={setDateFilter}
                    items={DATE_OPTIONS.map((o) => ({ label: o.label, value: o.id === '' ? 'all' : o.id }))}
                  />
                </Field>
                <Field className="min-w-[160px] flex-[0_1_180px] gap-1.5">
                  <FieldLabel htmlFor="drive-registration-filter">Registrations</FieldLabel>
                  <AdminFilterSelect
                    id="drive-registration-filter"
                    className={SELECT_CLASS}
                    value={registrationFilter}
                    onValueChange={setRegistrationFilter}
                    items={REGISTRATION_OPTIONS.map((o) => ({ label: o.label, value: o.id === '' ? 'all' : o.id }))}
                  />
                </Field>
                <Field className="min-w-[200px] flex-[0_1_220px] gap-1.5">
                  <FieldLabel htmlFor="drive-sort">Sort</FieldLabel>
                  <AdminFilterSelect
                    id="drive-sort"
                    className={SELECT_CLASS}
                    value={sortKey}
                    emptyMapsToAll={false}
                    onValueChange={setSortKey}
                    items={DRIVE_SORT_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                  />
                </Field>
                {approvedCampuses.length > 0 ? (
                  <Field className="min-w-[180px] flex-[0_1_220px] gap-1.5">
                    <FieldLabel>Campus</FieldLabel>
                    <div ref={dropdownRef} className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'h-9 w-full justify-between font-normal',
                          campusFilterActive && 'border-primary/40 bg-primary/5 text-primary',
                        )}
                        onClick={() => setDropdownOpen((p) => !p)}
                      >
                        <span className="truncate">{filterLabel}</span>
                        <ChevronDown className={cn('size-4 shrink-0 transition-transform', dropdownOpen && 'rotate-180')} />
                      </Button>
                      {dropdownOpen ? (
                        <div className="border-border bg-popover absolute top-[calc(100%+6px)] right-0 z-50 max-h-[min(280px,50vh)] min-w-[240px] overflow-y-auto overscroll-contain rounded-lg border p-2 shadow-md">
                          <button
                            type="button"
                            onClick={() => setSelectedIds(new Set())}
                            className={cn(
                              'hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium',
                              selectedIds.size === 0 ? 'text-primary' : 'text-muted-foreground',
                            )}
                          >
                            <span className="flex size-4 items-center justify-center">
                              {selectedIds.size === 0 ? <Check className="size-3.5" /> : null}
                            </span>
                            All campuses
                          </button>
                          <div className="bg-border my-1 h-px" />
                          {approvedCampuses.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleCampus(c.id)}
                              className={cn(
                                'hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
                                selectedIds.has(c.id) ? 'bg-primary/5 text-primary font-medium' : 'text-foreground',
                              )}
                            >
                              <span
                                className={cn(
                                  'flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                                  selectedIds.has(c.id)
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-input bg-background',
                                )}
                              >
                                {selectedIds.has(c.id) ? <Check className="size-2.5" strokeWidth={3} /> : null}
                              </span>
                              <span className="min-w-0 flex-1 break-words">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Field>
                ) : null}
                {hasActiveFilters ? (
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="self-end">
                    <X data-icon="inline-start" />
                    Clear filters
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className="bg-muted flex w-fit max-w-full flex-wrap gap-0.5 rounded-lg p-[3px]"
                  role="tablist"
                  aria-label="Drive status"
                >
                  {STATUS_TABS.map((tab) => (
                    <Button
                      key={tab.id || 'all'}
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === tab.id}
                      size="sm"
                      variant={statusFilter === tab.id ? 'secondary' : 'ghost'}
                      onClick={() => setStatusFilter(tab.id)}
                      className="h-8 rounded-md px-3 text-xs font-semibold"
                    >
                      {formatFilterBadgeLabelParen(tab.label, statusCounts[tab.id])}
                    </Button>
                  ))}
                </div>
                <span className="text-muted-foreground text-sm font-medium">
                  {filteredDrives.length} shown
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {viewMode === 'list' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campus</TableHead>
                    <TableHead>Drive title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="min-w-[6.5rem]">Status</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrives.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                        No drives match your filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {filteredDrives.map((drive) => (
                    <TableRow key={drive.id}>
                      <TableCell className="max-w-[220px]">
                        <div className="flex min-w-0 items-center gap-2">
                          <EntityLogo name={drive.college} size="sm" shape="rounded" />
                          <span className="truncate font-medium">{drive.college}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="block truncate font-semibold">{drive.role}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {drive.date ? formatDate(drive.date) : '—'}
                      </TableCell>
                      <TableCell>
                        <DriveTypeBadge type={drive.type} />
                      </TableCell>
                      <TableCell className="min-w-[6.5rem]" data-label="Status">
                        <StatusBadge status={drive.status} showDot className="min-w-fit">
                          {formatStatus(drive.status) || 'Pending'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'max-w-[160px] truncate',
                          drive.venue?.trim() ? 'text-muted-foreground' : 'text-muted-foreground/70',
                        )}
                      >
                        {drive.venue?.trim() || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5 shrink-0" aria-hidden />
                          {drive.registered ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <DriveRowActions
                          drive={drive}
                          cancellingId={cancellingId}
                          onView={() => setViewDrive(drive)}
                          onCancel={() => cancelDrive(drive)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredDrives.length === 0 ? (
                  <div className="col-span-full py-12 text-center">
                    <Target className="text-muted-foreground mx-auto mb-3 size-12 opacity-50" />
                    <CardTitle className="mb-1 text-lg">No drives match your filters</CardTitle>
                    <CardDescription className="mb-4">Try adjusting search, status, date, or campus filters.</CardDescription>
                    <Button type="button" variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  filteredDrives.map((drive) => (
                    <DriveCard
                      key={drive.id}
                      drive={drive}
                      cancellingId={cancellingId}
                      onView={() => setViewDrive(drive)}
                      onCancel={() => cancelDrive(drive)}
                    />
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <p className="text-muted-foreground m-0 text-sm">
        {allDrives.length} placement drive{allDrives.length === 1 ? '' : 's'} across your campus partnerships
      </p>

      {viewDrive ? (
        <DriveDetailsDialog drive={viewDrive} onClose={() => setViewDrive(null)} />
      ) : null}
    </div>
  );
}

function DriveRowActions({ drive, cancellingId, onView, onCancel }) {
  return (
    <div className="inline-flex shrink-0 items-center justify-end gap-1.5 pe-0.5">
      <StandardTableIconAction
        action="view"
        variant="ghost"
        showLabel={false}
        tooltip={VIEW_DRIVE_TIP}
        onClick={onView}
      />
      {canReviewApplicants(drive) ? (
        <Button
          type="button"
          size="icon-sm"
          variant="default"
          title={REVIEW_APPLICANTS_TIP}
          aria-label={REVIEW_APPLICANTS_TIP}
          nativeButton={false}
          render={
            <Link href={`/dashboard/employer/applications?tab=drives&driveId=${encodeURIComponent(drive.id)}`} />
          }
        >
          <ClipboardList aria-hidden />
        </Button>
      ) : null}
      {canEditDrive(drive) ? (
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          title={EDIT_DRIVE_TIP}
          aria-label={EDIT_DRIVE_TIP}
          nativeButton={false}
          render={<Link href={`/dashboard/employer/drives/edit/${drive.id}`} />}
        >
          <Pencil aria-hidden />
        </Button>
      ) : null}
      {canCancelDrive(drive) ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={cancellingId === drive.id}
          onClick={onCancel}
          title={cancellingId === drive.id ? 'Cancelling drive…' : cancelDriveTooltip(drive)}
          aria-label={cancellingId === drive.id ? 'Cancelling drive' : cancelDriveTooltip(drive)}
        >
          <Ban aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

function DriveCard({ drive, cancellingId, onView, onCancel }) {
  const ctcBreakup = drive.ctc_breakup || drive.ctcBreakup;

  return (
    <Card size="sm" className="h-full gap-3 overflow-visible">
      <CardHeader className="gap-2 px-4 pe-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <EntityLogo name={drive.college} size="sm" shape="rounded" />
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{drive.college}</CardTitle>
              <CardDescription className="mt-0.5 truncate font-medium">{drive.role}</CardDescription>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={drive.status} showDot className="min-w-fit">
                  {formatStatus(drive.status) || 'Pending'}
                </StatusBadge>
                <DriveTypeBadge type={drive.type} />
              </div>
            </div>
          </div>
          <DriveRowActions
            drive={drive}
            cancellingId={cancellingId}
            onView={onView}
            onCancel={onCancel}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="text-muted-foreground grid grid-cols-2 gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5 shrink-0" />
            {drive.date ? formatDate(drive.date) : '—'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 shrink-0" />
            {drive.registered ?? 0} registered
          </span>
          <span className="col-span-2 inline-flex items-start gap-1.5">
            <Building2 className="mt-0.5 size-3.5 shrink-0" />
            <span className={drive.venue?.trim() ? '' : 'text-muted-foreground/70'}>
              {drive.venue?.trim() || '—'}
            </span>
          </span>
        </div>
        {ctcBreakup ? (
          <div className="border-border border-t border-dashed pt-3">
            <div className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
              CTC breakup (internal)
            </div>
            <p className="text-muted-foreground m-0 text-sm leading-relaxed whitespace-pre-wrap">{ctcBreakup}</p>
            <p className="text-muted-foreground/80 mt-1 mb-0 text-xs">
              Not shown to the college in the dashboard.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DetailField({ label, children }) {
  return (
    <div className="bg-muted/50 rounded-lg border px-3.5 py-3">
      <div className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className="text-foreground text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function DriveDetailsDialog({ drive, onClose }) {
  const ctcBreakup = drive.ctc_breakup || drive.ctcBreakup;
  const jobType = drive.job_type || drive.jobType;
  const skills = drive.skills_required || drive.skillsRequired;
  const locations = drive.locations;
  const { numeric: salaryLabel, words: salaryWords } = formatSalaryRangeParts(
    drive.salary_min ?? drive.salaryMin,
    drive.salary_max ?? drive.salaryMax,
  );

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="gap-4 sm:max-w-xl" showCloseButton>
        <DialogHeader className="gap-2 pr-8">
          <div className="flex items-center gap-3">
            <EntityLogo name={drive.college} size="sm" shape="rounded" />
            <div className="min-w-0">
              <DialogDescription className="m-0">{drive.college}</DialogDescription>
              <DialogTitle id="drive-details-title" className="text-xl font-semibold">
                {drive.role}
              </DialogTitle>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={drive.status} showDot className="min-w-fit">
              {formatStatus(drive.status) || 'Pending'}
            </StatusBadge>
            <DriveTypeBadge type={drive.type} />
          </div>
        </DialogHeader>

        <div className="grid max-h-[min(60vh,28rem)] gap-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Drive date">{drive.date ? formatDate(drive.date) : '—'}</DetailField>
            <DetailField label="Registered">{drive.registered ?? 0} students</DetailField>
            <DetailField label="Venue">{drive.venue?.trim() || '—'}</DetailField>
          </div>

          {(drive.description || '').trim() ? (
            <DetailField label="Job description">
              <p className="m-0 whitespace-pre-wrap">{drive.description.trim()}</p>
            </DetailField>
          ) : null}

          <div className="border-border border-t pt-3">
            <DriveDetailsSection title="Role & compensation">
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Role type">
                  {PLACEMENT_DRIVE_JOB_TYPE_LABELS[jobType] || jobType || '—'}
                </DetailField>
                <DetailField label="Openings">{drive.max_students ?? drive.vacancies ?? '—'}</DetailField>
                <DetailField label="CTC band (public)">
                  <div>{salaryLabel}</div>
                  {salaryWords ? (
                    <div className="text-muted-foreground mt-1 text-xs leading-snug">{salaryWords}</div>
                  ) : null}
                </DetailField>
                <DetailField label="Skills">
                  {Array.isArray(skills) && skills.length ? skills.join(', ') : '—'}
                </DetailField>
                {Array.isArray(locations) && locations.length ? (
                  <div className="col-span-2">
                    <DetailField label="Work locations">{locations.join(', ')}</DetailField>
                  </div>
                ) : null}
              </div>
            </DriveDetailsSection>
          </div>

          <div className="border-border border-t pt-3">
            <DriveDetailsSection title="Eligibility">
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Minimum CGPA">
                  {formatEmployerMinCgpa(drive.min_cgpa ?? drive.minCgpa)}
                </DetailField>
                <DetailField label="Eligible branches">
                  {formatEligibleBranchesLabel(drive.eligible_branches ?? drive.eligibleBranches)}
                </DetailField>
                <DetailField label="Max backlogs">{drive.max_backlogs ?? drive.maxBacklogs ?? '—'}</DetailField>
                <DetailField label="Batch year">{drive.batch_year ?? drive.batchYear ?? '—'}</DetailField>
              </div>
              {formatEmployerMinCgpa(drive.min_cgpa ?? drive.minCgpa) === '—' ? (
                <p className="text-muted-foreground mt-2 mb-0 text-xs">
                  No drive-specific eligibility criteria set — campus placement rules still apply.
                </p>
              ) : null}
            </DriveDetailsSection>
          </div>

          {ctcBreakup ? (
            <div className="border-border border-t pt-3">
              <DriveDetailsSection title="Compensation (internal)">
                <p className="text-muted-foreground m-0 text-sm leading-relaxed whitespace-pre-wrap">{ctcBreakup}</p>
                <p className="text-muted-foreground/80 mt-1 mb-0 text-xs">
                  Not shown to the college in the dashboard.
                </p>
              </DriveDetailsSection>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          {canReviewApplicants(drive) ? (
            <Button
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/dashboard/employer/applications?tab=drives&driveId=${encodeURIComponent(drive.id)}`} />
              }
            >
              Review applications
            </Button>
          ) : null}
          {canEditDrive(drive) ? (
            <Button
              size="sm"
              variant="secondary"
              nativeButton={false}
              render={<Link href={`/dashboard/employer/drives/edit/${drive.id}`} />}
            >
              Edit drive
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
