'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { formatDate, formatStatus, getStatusColor, formatSalaryRangeParts } from '@/lib/utils';
import { formatEmployerMinCgpa } from '@/lib/employerJobDisplay';
import {
  formatEligibleBranchesLabel,
  PLACEMENT_DRIVE_JOB_TYPE_LABELS,
} from '@/lib/placementDriveJobFields';
import { DriveDetailsSection } from '@/components/employer/DriveFormSection';
import EntityLogo from '@/components/EntityLogo';
import { useToast } from '@/components/ToastProvider';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { Target, Plus, Video, Building2, Calendar, Users, ChevronDown, Check, ClipboardList, LayoutGrid, List, Search, X, Ban, Pencil } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import PageError from '@/components/PageError';
import { reportClientApiFailure } from '@/lib/clientPlatformErrorReport';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';
import { useEmployerPostingCampuses } from '@/hooks/useEmployerPostingCampuses';
import { formatFilterBadgeLabelParen } from '@/lib/filterBadgeLabel';

const EMPLOYER_DRIVES_API = '/api/employer/drives';

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

function DriveTypeBadge({ type }) {
  return (
    <span className={`badge badge-${type === 'virtual' ? 'blue' : 'indigo'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
      {type === 'virtual'
        ? <><Video size={11} /> Virtual</>
        : type === 'hybrid'
          ? <><Building2 size={11} /> Hybrid</>
          : type === 'off_campus'
            ? <><Building2 size={11} /> Off campus</>
            : <><Building2 size={11} /> On-Campus</>}
    </span>
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
  // selectedCampusIds: Set of campus IDs checked; empty = all
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

  // Campus list
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

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!viewDrive) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewDrive]);

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
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>

      {/* ── Hero Banner ── */}
      <div style={{
        position: 'relative',
        background: 'var(--banner-gradient)',
        borderRadius: 'var(--radius-xl)', padding: '2.5rem',
        color: 'white', overflow: 'hidden', marginBottom: '2rem',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1.5rem',
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '5%', width: '140px', height: '140px', background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 60%)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#fff', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.4rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Target size={28} />
            Placement Drives
            {allDrives.length > 0 && (
              <span style={{ fontSize: '0.875rem', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.65rem', borderRadius: '999px', backdropFilter: 'blur(4px)' }}>
                {filteredDrives.length !== allDrives.length
                  ? `${filteredDrives.length} of ${allDrives.length}`
                  : `${allDrives.length} total`}
              </span>
            )}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.82)', margin: 0, fontSize: '1rem', lineHeight: 1.5 }}>
            All placement drives across your campus partnerships — past, active, and upcoming.
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
          <Link
            href="/dashboard/employer/drives/request"
            className="btn banner-cta-solid"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.75rem 1.5rem' }}
          >
            <Plus size={16} /> Request Drive
          </Link>
        </div>
      </div>

      {/* ── Filters + view toggle ── */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 220px', minWidth: 200 }}>
            <label className="form-label" htmlFor="drive-search">Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                id="drive-search"
                className="form-input"
                placeholder="Campus, title, or venue…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: '0 1 160px', minWidth: 140 }}>
            <label className="form-label" htmlFor="drive-type-filter">Drive type</label>
            <select id="drive-type-filter" className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.id || 'all'} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: '0 1 150px', minWidth: 130 }}>
            <label className="form-label" htmlFor="drive-date-filter">Date</label>
            <select id="drive-date-filter" className="form-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              {DATE_OPTIONS.map((o) => (
                <option key={o.id || 'all'} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: '0 1 180px', minWidth: 160 }}>
            <label className="form-label" htmlFor="drive-registration-filter">Registrations</label>
            <select id="drive-registration-filter" className="form-select" value={registrationFilter} onChange={(e) => setRegistrationFilter(e.target.value)}>
              {REGISTRATION_OPTIONS.map((o) => (
                <option key={o.id || 'all'} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: '0 1 220px', minWidth: 200 }}>
            <label className="form-label" htmlFor="drive-sort">Sort</label>
            <select id="drive-sort" className="form-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              {DRIVE_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {approvedCampuses.length > 0 && (
            <div className="form-group" style={{ marginBottom: 0, flex: '0 1 220px', minWidth: 180 }}>
              <label className="form-label">Campus</label>
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((p) => !p)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                    padding: '0.55rem 0.85rem', borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    background: campusFilterActive ? 'var(--primary-50)' : 'var(--bg-primary)',
                    color: campusFilterActive ? 'var(--primary-700)' : 'var(--text-primary)',
                    fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                    transition: 'all 0.15s ease', justifyContent: 'space-between',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filterLabel}</span>
                  <ChevronDown size={15} style={{ flexShrink: 0, transition: 'transform 0.15s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
                </button>

                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                    background: 'var(--bg-primary)', border: '1px solid var(--border-default)',
                    borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    padding: '0.5rem', zIndex: 50, minWidth: '240px',
                  }}>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        width: '100%', padding: '0.5rem 0.75rem', border: 'none',
                        background: 'transparent', cursor: 'pointer', borderRadius: '6px',
                        fontSize: '0.875rem', fontWeight: 600,
                        color: selectedIds.size === 0 ? 'var(--primary-600)' : 'var(--text-secondary)',
                      }}
                    >
                      <span style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedIds.size === 0 && <Check size={14} />}
                      </span>
                      All campuses
                    </button>
                    <div style={{ height: '1px', background: 'var(--border-default)', margin: '0.25rem 0' }} />
                    {approvedCampuses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCampus(c.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          width: '100%', padding: '0.5rem 0.75rem', border: 'none',
                          background: selectedIds.has(c.id) ? 'var(--primary-50)' : 'transparent',
                          cursor: 'pointer', borderRadius: '6px',
                          fontSize: '0.875rem', fontWeight: 500, textAlign: 'left',
                          color: selectedIds.has(c.id) ? 'var(--primary-700)' : 'var(--text-primary)',
                        }}
                      >
                        <span style={{
                          width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                          border: `2px solid ${selectedIds.has(c.id) ? 'var(--primary-500)' : 'var(--border-default)'}`,
                          background: selectedIds.has(c.id) ? 'var(--primary-500)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.12s ease',
                        }}>
                          {selectedIds.has(c.id) && <Check size={10} color="white" strokeWidth={3} />}
                        </span>
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearFilters}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', alignSelf: 'flex-end' }}
            >
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id || 'all'}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '999px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.15s ease-out',
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === tab.id ? 'var(--primary-600)' : 'var(--bg-secondary)',
                  color: statusFilter === tab.id ? 'white' : 'var(--text-secondary)',
                  boxShadow: statusFilter === tab.id ? '0 4px 10px rgba(79, 70, 229, 0.18)' : 'none',
                }}
              >
                {formatFilterBadgeLabelParen(tab.label, statusCounts[tab.id])}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
              {filteredDrives.length} shown
            </span>
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '3px', gap: '2px', border: '1px solid var(--border-default)' }}>
              {[{ mode: 'list', icon: List, label: 'List view' }, { mode: 'card', icon: LayoutGrid, label: 'Card view' }].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.4rem 0.85rem', borderRadius: '7px', border: 'none',
                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                    transition: 'all 0.15s ease',
                    background: viewMode === mode ? 'var(--bg-primary)' : 'transparent',
                    color: viewMode === mode ? 'var(--primary-600)' : 'var(--text-tertiary)',
                    boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <Icon size={15} />
                  {mode === 'list' ? 'List' : 'Cards'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* ── Loading skeletons ── */}
      {isLoading && (
        <PageLoading message="Loading placement drives…" inline>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card" style={{ padding: '1.5rem' }}>
                <div className="skeleton" style={{ height: '1.2rem', width: '45%', borderRadius: '6px', marginBottom: '0.6rem' }} />
                <div className="skeleton" style={{ height: '0.9rem', width: '65%', borderRadius: '6px', marginBottom: '1.25rem' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="skeleton" style={{ height: '3rem', borderRadius: '8px' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PageLoading>
      )}

      {/* ── Drive list ── */}
      {!isLoading && viewMode === 'list' && filteredDrives.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
          <div className="table-container" style={{ border: 'none', overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 960 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ paddingLeft: '1.25rem' }}>Campus</th>
                  <th>Drive title</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Venue</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right', paddingRight: '1.25rem', width: 1 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrives.map((drive) => (
                  <tr key={drive.id}>
                    <td style={{ paddingLeft: '1.25rem', maxWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                        <EntityLogo name={drive.college} size="sm" shape="rounded" />
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {drive.college}
                        </span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {drive.role}
                      </span>
                    </td>
                    <td className="text-sm text-secondary" style={{ whiteSpace: 'nowrap' }}>
                      {drive.date ? formatDate(drive.date) : '—'}
                    </td>
                    <td>
                      <DriveTypeBadge type={drive.type} />
                    </td>
                    <td>
                      <span
                        className={`badge badge-${getStatusColor(drive.status)} badge-dot`}
                        style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                      >
                        {formatStatus(drive.status)}
                      </span>
                    </td>
                    <td
                      className="text-sm"
                      style={{
                        maxWidth: 160,
                        color: drive.venue?.trim() ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {drive.venue?.trim() || '—'}
                    </td>
                    <td className="text-sm text-secondary" style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Users size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} aria-hidden />
                        {drive.registered ?? 0}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', justifyContent: 'flex-end', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <StandardTableIconAction
                          action="view"
                          variant="ghost"
                          showLabel={false}
                          tooltip={VIEW_DRIVE_TIP}
                          onClick={() => setViewDrive(drive)}
                        />
                        {canReviewApplicants(drive) && (
                          <Link
                            href={`/dashboard/employer/applications?tab=drives&driveId=${encodeURIComponent(drive.id)}`}
                            className="btn btn-primary btn-icon btn-sm"
                            title={REVIEW_APPLICANTS_TIP}
                            aria-label={REVIEW_APPLICANTS_TIP}
                          >
                            <ClipboardList size={16} aria-hidden />
                          </Link>
                        )}
                        {canEditDrive(drive) && (
                          <Link
                            href={`/dashboard/employer/drives/edit/${drive.id}`}
                            className="btn btn-secondary btn-icon btn-sm"
                            title={EDIT_DRIVE_TIP}
                            aria-label={EDIT_DRIVE_TIP}
                          >
                            <Pencil size={16} aria-hidden />
                          </Link>
                        )}
                        {canCancelDrive(drive) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-sm"
                            disabled={cancellingId === drive.id}
                            onClick={() => cancelDrive(drive)}
                            title={
                              cancellingId === drive.id
                                ? 'Cancelling drive…'
                                : cancelDriveTooltip(drive)
                            }
                            aria-label={
                              cancellingId === drive.id
                                ? 'Cancelling drive'
                                : cancelDriveTooltip(drive)
                            }
                            style={{ color: 'var(--danger-600)' }}
                          >
                            <Ban size={16} aria-hidden />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && viewMode === 'card' && filteredDrives.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredDrives.map((drive) => (
            <div key={drive.id} className="card card-hover" style={{ border: '1px solid var(--border-default)', padding: '1.5rem' }}>
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <EntityLogo name={drive.college} size="sm" shape="rounded" />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{drive.college}</h3>
                      <span className={`badge badge-${getStatusColor(drive.status)} badge-dot`}>{formatStatus(drive.status)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{drive.role}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <StandardTableIconAction
                    action="view"
                    variant="ghost"
                    showLabel={false}
                    tooltip={VIEW_DRIVE_TIP}
                    onClick={() => setViewDrive(drive)}
                  />
                  {canReviewApplicants(drive) && (
                    <Link
                      href={`/dashboard/employer/applications?tab=drives&driveId=${encodeURIComponent(drive.id)}`}
                      className="btn btn-primary btn-icon btn-sm"
                      style={{ flexShrink: 0 }}
                      title={REVIEW_APPLICANTS_TIP}
                      aria-label={REVIEW_APPLICANTS_TIP}
                    >
                      <ClipboardList size={16} aria-hidden />
                    </Link>
                  )}
                  {canEditDrive(drive) && (
                    <Link
                      href={`/dashboard/employer/drives/edit/${drive.id}`}
                      className="btn btn-secondary btn-icon btn-sm"
                      style={{ flexShrink: 0 }}
                      title={EDIT_DRIVE_TIP}
                      aria-label={EDIT_DRIVE_TIP}
                    >
                      <Pencil size={16} aria-hidden />
                    </Link>
                  )}
                  {canCancelDrive(drive) && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      disabled={cancellingId === drive.id}
                      onClick={() => cancelDrive(drive)}
                      style={{ flexShrink: 0, color: 'var(--danger-600)' }}
                      title={
                        cancellingId === drive.id
                          ? 'Cancelling drive…'
                          : cancelDriveTooltip(drive)
                      }
                      aria-label={
                        cancellingId === drive.id
                          ? 'Cancelling drive'
                          : cancelDriveTooltip(drive)
                      }
                    >
                      <Ban size={16} aria-hidden />
                    </button>
                  )}
                </div>
              </div>

              {/* Info grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem', marginTop: '1.1rem', paddingTop: '1.1rem',
                borderTop: '1px solid var(--border-default)',
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Calendar size={11} /> Date
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {drive.date ? formatDate(drive.date) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.3rem' }}>Type</div>
                  <DriveTypeBadge type={drive.type} />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.3rem' }}>Venue</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: drive.venue?.trim() ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {drive.venue?.trim() || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Users size={11} /> Registered
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {drive.registered ?? 0} students
                  </div>
                </div>
              </div>

              {/* CTC breakup (internal) */}
              {(drive.ctc_breakup || drive.ctcBreakup) && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-default)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>
                    CTC breakup (internal)
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {drive.ctc_breakup || drive.ctcBreakup}
                  </p>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Not shown to the college in the dashboard.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredDrives.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)',
          border: '1px dashed var(--border-default)',
        }}>
          <div style={{ background: 'var(--primary-50)', width: '68px', height: '68px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Target size={30} style={{ color: 'var(--primary-500)' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {allDrives.length === 0 ? 'No placement drives found' : 'No drives match your filters'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            {allDrives.length === 0
              ? (campusFilterActive
                ? `No drives found for the selected campus${selectedIds.size > 1 ? 'es' : ''}. Try a different filter or request a new drive.`
                : 'No drives scheduled yet. Request a placement drive with one of your approved partner campuses.')
              : 'Try adjusting search, status, date, or campus filters to see more results.'}
          </p>
          {allDrives.length === 0 ? (
            <Link href="/dashboard/employer/drives/request" className="btn btn-primary">
              Request New Drive
            </Link>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {viewDrive ? (
        <DriveDetailsDialog drive={viewDrive} onClose={() => setViewDrive(null)} />
      ) : null}

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
  const modalBackdrop = {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: 'rgba(15, 23, 42, 0.55)',
  };

  return (
    <div style={modalBackdrop} role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drive-details-title"
        className="card"
        style={{
          maxWidth: 520,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '1.25rem',
          position: 'relative',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-label="Close"
          style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingRight: '2rem' }}>
          <EntityLogo name={drive.college} size="sm" shape="rounded" />
          <div>
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              {drive.college}
            </p>
            <h2 id="drive-details-title" style={{ fontSize: '1.1rem', margin: '0.25rem 0 0' }}>
              {drive.role}
            </h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.85rem' }}>
          <div>
            <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Status</div>
            <span className={`badge badge-${getStatusColor(drive.status)} badge-dot`}>{formatStatus(drive.status)}</span>
          </div>
          <div>
            <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Drive date</div>
            <div className="text-sm font-semibold">{drive.date ? formatDate(drive.date) : '—'}</div>
          </div>
          <div>
            <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Type</div>
            <DriveTypeBadge type={drive.type} />
          </div>
          <div>
            <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Registered</div>
            <div className="text-sm font-semibold">{drive.registered ?? 0} students</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Venue</div>
            <div className="text-sm">{drive.venue?.trim() || '—'}</div>
          </div>
        </div>

        {(drive.description || '').trim() ? (
          <DriveDetailsSection title="Job description">
            <p style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {drive.description.trim()}
            </p>
          </DriveDetailsSection>
        ) : null}

        <DriveDetailsSection title="Role & compensation">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
            <div>
              <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Role type</div>
              <div className="text-sm font-semibold">
                {PLACEMENT_DRIVE_JOB_TYPE_LABELS[jobType] || jobType || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Openings</div>
              <div className="text-sm font-semibold">{drive.max_students ?? drive.vacancies ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>CTC band (public)</div>
              <div className="text-sm font-semibold">{salaryLabel}</div>
              {salaryWords ? (
                <div className="text-xs text-secondary" style={{ marginTop: '0.25rem', lineHeight: 1.4 }}>
                  {salaryWords}
                </div>
              ) : null}
            </div>
            <div>
              <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Skills</div>
              <div className="text-sm">{Array.isArray(skills) && skills.length ? skills.join(', ') : '—'}</div>
            </div>
            {Array.isArray(locations) && locations.length ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Work locations</div>
                <div className="text-sm">{locations.join(', ')}</div>
              </div>
            ) : null}
          </div>
        </DriveDetailsSection>

        <DriveDetailsSection title="Eligibility">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
            <div>
              <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Minimum CGPA</div>
              <div className="text-sm font-semibold">
                {formatEmployerMinCgpa(drive.min_cgpa ?? drive.minCgpa)}
              </div>
            </div>
            <div>
              <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Eligible branches</div>
              <div className="text-sm font-semibold">
                {formatEligibleBranchesLabel(drive.eligible_branches ?? drive.eligibleBranches)}
              </div>
            </div>
            <div>
              <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Max backlogs</div>
              <div className="text-sm font-semibold">
                {drive.max_backlogs ?? drive.maxBacklogs ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem' }}>Batch year</div>
              <div className="text-sm font-semibold">{drive.batch_year ?? drive.batchYear ?? '—'}</div>
            </div>
          </div>
          {formatEmployerMinCgpa(drive.min_cgpa ?? drive.minCgpa) === '—' ? (
            <p className="text-xs text-secondary" style={{ margin: '0.65rem 0 0' }}>
              No drive-specific eligibility criteria set — campus placement rules still apply.
            </p>
          ) : null}
        </DriveDetailsSection>

        {ctcBreakup ? (
          <DriveDetailsSection title="Compensation (internal)">
            <p style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {ctcBreakup}
            </p>
            <p className="text-xs text-tertiary" style={{ margin: '0.35rem 0 0' }}>
              Not shown to the college in the dashboard.
            </p>
          </DriveDetailsSection>
        ) : null}
        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {canReviewApplicants(drive) ? (
            <Link
              href={`/dashboard/employer/applications?tab=drives&driveId=${encodeURIComponent(drive.id)}`}
              className="btn btn-primary btn-sm"
            >
              Review applications
            </Link>
          ) : null}
          {canEditDrive(drive) ? (
            <Link href={`/dashboard/employer/drives/edit/${drive.id}`} className="btn btn-secondary btn-sm">
              Edit drive
            </Link>
          ) : null}
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
