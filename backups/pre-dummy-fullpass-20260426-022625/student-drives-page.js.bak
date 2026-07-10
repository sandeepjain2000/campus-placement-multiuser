'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ToastProvider';
import { loadAppliedDriveIds, saveAppliedDriveIds } from '@/lib/studentProfileStorage';

function getTimeLeft(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const diff = d - now;
  if (diff < 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return '< 1h left';
}

function driveTypeLabel(type) {
  if (type === 'virtual') return '🌐 Virtual';
  if (type === 'off_campus') return '🏙️ Off-campus';
  if (type === 'hybrid') return '🔄 Hybrid';
  return '🏛️ On-campus';
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch data');
  }
  return res.json();
};

export default function StudentDrivesPage() {
  const { data: session } = useSession();
  const email = session?.user?.email || '';
  const { addToast } = useToast();
  const { data: drivesData, error: drivesError, isLoading: drivesLoading } = useSWR('/api/student/drives', fetcher);
  const { data: applicationsData } = useSWR('/api/student/applications', fetcher);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [now, setNow] = useState(Date.now());
  const [appliedIds, setAppliedIds] = useState(() => new Set());

  const [applyingTo, setApplyingTo] = useState(null);
  const [locationPref, setLocationPref] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (Array.isArray(applicationsData?.items)) {
      const dbSet = new Set(
        applicationsData.items
          .filter((item) => item.status !== 'withdrawn')
          .map((item) => item.drive_id),
      );
      setAppliedIds(dbSet);
      if (email) saveAppliedDriveIds(email, dbSet);
      return;
    }
    if (email) setAppliedIds(loadAppliedDriveIds(email));
  }, [applicationsData, email]);

  const persistApplied = useCallback(
    (set) => {
      setAppliedIds(set);
      if (email) saveAppliedDriveIds(email, set);
    },
    [email]
  );

  const drives = useMemo(() => {
    return Array.isArray(drivesData?.drives) ? drivesData.drives : [];
  }, [drivesData]);

  const monthOptions = useMemo(() => {
    const opts = [];
    for (let y = 2026; y <= 2027; y++) {
      for (let m = 0; m < 12; m++) {
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        const label = new Date(y, m).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        opts.push({ key, label });
      }
    }
    return opts;
  }, []);

  const filteredDrives = useMemo(() => {
    const todayStart = startOfDay(new Date());
    return drives.filter((d) => {
      if (search && !d.company.toLowerCase().includes(search.toLowerCase()) && !d.role.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType && d.type !== filterType) return false;
      if (filterStatus && d.status !== filterStatus) return false;

      const driveDay = startOfDay(new Date(d.date + 'T12:00:00'));

      if (monthFilter) {
        if (!d.date.startsWith(monthFilter)) return false;
      }

      if (datePreset === 'past' && driveDay >= todayStart) return false;
      if (datePreset === 'future' && driveDay < todayStart) return false;

      if (datePreset === 'range') {
        if (rangeFrom) {
          const from = startOfDay(new Date(rangeFrom + 'T12:00:00'));
          if (driveDay < from) return false;
        }
        if (rangeTo) {
          const to = startOfDay(new Date(rangeTo + 'T12:00:00'));
          if (driveDay > to) return false;
        }
      }

      return true;
    });
  }, [drives, search, filterType, filterStatus, datePreset, monthFilter, rangeFrom, rangeTo]);

  const openApplyModal = (drive) => {
    if (appliedIds.has(drive.id)) return;
    setApplyingTo(drive);
    setLocationPref('');
  };

  const confirmApply = async () => {
    if (!applyingTo) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/student/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drive_id: applyingTo.id,
          location_preference: locationPref,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || data.success) {
        const next = new Set(appliedIds);
        next.add(applyingTo.id);
        persistApplied(next);
        addToast(`Applied to ${applyingTo.company}. Good luck!`, 'info');
      } else {
        addToast(data.error || 'Could not record application. Try again.', 'warning');
      }
    } catch {
      addToast('Network error — application may not be saved.', 'warning');
    } finally {
      setIsSubmitting(false);
      setApplyingTo(null);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🎯 Placement Drives</h1>
          <p>Browse on-campus, virtual, and off-campus drives — filter by date and apply when open.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="table-search" style={{ flex: '1', minWidth: '220px', maxWidth: '360px' }}>
              <input className="form-input" placeholder="🔍 Search company or role…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 'auto' }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All modes</option>
              <option value="on_campus">On-campus</option>
              <option value="virtual">Virtual</option>
              <option value="off_campus">Off-campus</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label text-xs">When</label>
              <select className="form-select" style={{ minWidth: '160px' }} value={datePreset} onChange={(e) => setDatePreset(e.target.value)}>
                <option value="">Any date</option>
                <option value="future">Upcoming only</option>
                <option value="past">Past drives</option>
                <option value="range">Custom range…</option>
              </select>
            </div>
            {datePreset === 'range' && (
              <>
                <div>
                  <label className="form-label text-xs">From</label>
                  <input className="form-input" type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                </div>
                <div>
                  <label className="form-label text-xs">To</label>
                  <input className="form-input" type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className="form-label text-xs">Month</label>
              <select className="form-select" style={{ minWidth: '200px' }} value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                <option value="">Any month</option>
                {monthOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-secondary">{filteredDrives.length} drives match</div>
          </div>
        </div>
      </div>

      {drivesLoading && <div className="skeleton skeleton-card" style={{ height: 180 }} />}
      {drivesError && (
        <div className="card" style={{ color: 'var(--danger-600)' }}>
          <p>{drivesError.message || 'Could not load drives.'}</p>
        </div>
      )}
      {!drivesLoading && !drivesError && filteredDrives.length === 0 && (
        <div className="card">
          <p className="text-secondary">No drives found for your current filters.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredDrives.map((drive) => {
          const isExpired = drive.deadline ? new Date(drive.deadline) < now : false;
          const timeLeft = getTimeLeft(drive.deadline);
          const applied = appliedIds.has(drive.id);

          return (
            <div
              key={drive.id}
              className={`card card-hover ${isExpired && !applied ? 'card-disabled' : ''}`}
              style={{ cursor: 'default', opacity: isExpired && !applied ? 0.75 : 1 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{drive.company}</h3>
                    <span className={`badge badge-${getStatusColor(drive.status)}`}>{formatStatus(drive.status)}</span>
                  </div>
                  <p className="text-sm text-secondary">{drive.role}</p>
                  <p className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
                    📍 {drive.venue}
                    {drive.offCampusCity ? ` · ${drive.offCampusCity}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  {applied ? (
                    <span className="badge badge-green">Applied</span>
                  ) : (
                    <button className={`btn ${isExpired ? 'btn-outline' : 'btn-primary'} btn-sm`} disabled={isExpired} onClick={() => openApplyModal(drive)}>
                      {isExpired ? 'Closed' : 'Apply now'}
                    </button>
                  )}
                  {timeLeft && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isExpired ? 'var(--danger-500)' : 'var(--warning-600)' }}>
                      🕒 {isExpired ? 'Deadline passed' : `Ends in ${timeLeft}`}
                    </div>
                  )}
                </div>
              </div>
              <div className="drive-info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                <div className="drive-info-item">
                  <div className="drive-info-label">Date</div>
                  <div className="drive-info-value">{formatDate(drive.date)}</div>
                </div>
                <div className="drive-info-item">
                  <div className="drive-info-label">Package</div>
                  <div className="drive-info-value">{drive.salary}</div>
                </div>
                <div className="drive-info-item">
                  <div className="drive-info-label">Mode</div>
                  <div className="drive-info-value">
                    <span className={`badge badge-${drive.type === 'virtual' ? 'blue' : drive.type === 'off_campus' ? 'amber' : drive.type === 'hybrid' ? 'amber' : 'indigo'}`}>
                      {driveTypeLabel(drive.type)}
                    </span>
                  </div>
                </div>
                <div className="drive-info-item">
                  <div className="drive-info-label">Min CGPA</div>
                  <div className="drive-info-value">{drive.cgpa}</div>
                </div>
                <div className="drive-info-item">
                  <div className="drive-info-label">Vacancies</div>
                  <div className="drive-info-value">{drive.vacancies}</div>
                </div>
                <div className="drive-info-item">
                  <div className="drive-info-label">Registered</div>
                  <div className="drive-info-value">{drive.registered} students</div>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {drive.branch.map((b) => (
                  <span key={b} className="badge badge-gray">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {applyingTo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Apply to {applyingTo.company}</h3>
            <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Confirm application for <strong>{applyingTo.role}</strong>. You can note a location preference if the role has multiple bases.
            </p>
            <div className="form-group">
              <label className="form-label">Preferred location (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="E.g. Bangalore, Remote, Any"
                value={locationPref}
                onChange={(e) => setLocationPref(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setApplyingTo(null)} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmApply} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Confirm application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
