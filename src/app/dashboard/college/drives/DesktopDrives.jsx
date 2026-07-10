'use client';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import { EmployerCalendarGrid } from '@/components/employer/EmployerCalendarGrid';
import CompanyNameLink from '@/components/CompanyNameLink';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { useToast } from '@/components/ToastProvider';
import { SOCIAL_PLATFORM_ORDER } from '@/components/SocialIcons';
import {
  academicYearQueryString,
  readActiveAcademicYearContext,
} from '@/lib/collegeAcademicYearContext';
import { mapCollegeDriveFromApi, isDriveStaffDirty } from '@/lib/collegeDrivesClient';
import { fetchCollegeDrivesList } from '@/lib/collegeDrivesApi';
import { approveCollegeDriveWithClashCheck } from '@/lib/collegeDriveApprovalClient';
import PageLoading from '@/components/PageLoading';
import {
  Target, CheckCircle, XCircle, Download, Video, Building2,
  ChevronDown, ChevronUp, LayoutList, CalendarDays, X,
  Clock, MapPin, Users, CheckCircle2, AlertCircle
} from 'lucide-react';

const STATUS_META = {
  requested: { label: 'Awaiting Approval', icon: AlertCircle },
  approved: { label: 'Approved', icon: CheckCircle2 },
  scheduled: { label: 'Scheduled', icon: Clock },
  in_progress: { label: 'In Progress', icon: Target },
  completed: { label: 'Completed', icon: CheckCircle },
  cancelled: { label: 'Cancelled', icon: XCircle },
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status, icon: AlertCircle };
  const pillClass = STATUS_META[status] ? `drive-status-pill--${status}` : 'drive-status-pill--completed';
  const Icon = meta.icon;
  return (
    <span className={`drive-status-pill ${pillClass}`}>
      <Icon size={11} strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}

export default function DesktopDrives() {
  const { addToast } = useToast();
  const [drives, setDrives] = useState([]);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [view, setView] = useState('list');
  const [expandedId, setExpandedId] = useState(null);
  const [facebookPageShare, setFacebookPageShare] = useState(false);
  const [postingFacebookId, setPostingFacebookId] = useState(null);
  const [staffSavingId, setStaffSavingId] = useState(null);

  const loadDrives = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = academicYearQueryString(readActiveAcademicYearContext());
      const json = await fetchCollegeDrivesList(qs);
      setStaffDirectory(Array.isArray(json.staffDirectory) ? json.staffDirectory : []);
      setFacebookPageShare(Boolean(json.integrations?.facebookPageShare));
      setDrives((json.drives || []).map(mapCollegeDriveFromApi));
    } catch (error) {
      addToast(error.message || 'Failed to load drives', 'error');
      setDrives([]);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  useEffect(() => {
    const onYear = () => { loadDrives(); };
    window.addEventListener('placementhub-academic-year', onYear);
    return () => window.removeEventListener('placementhub-academic-year', onYear);
  }, [loadDrives]);

  const attachStaff = (driveId, staffId) => {
    if (!staffId) return;
    setDrives((prev) => prev.map((d) => (d.id === driveId && !d.staffIds.includes(staffId) ? { ...d, staffIds: [...d.staffIds, staffId] } : d)));
  };
  const removeStaff = (driveId, staffId) => {
    setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, staffIds: d.staffIds.filter((id) => id !== staffId) } : d)));
  };

  const saveDriveStaff = async (driveId) => {
    const drive = drives.find((d) => d.id === driveId);
    if (!drive) return;
    setStaffSavingId(driveId);
    try {
      const res = await fetch(`/api/college/drives/${driveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffIds: drive.staffIds }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(json.error || 'Could not save staff assignment.', 'error');
        return;
      }
      const saved = (json.drive?.staffIds || drive.staffIds).map(String);
      setDrives((prev) =>
        prev.map((d) =>
          d.id === driveId ? { ...d, staffIds: saved, staffIdsBaseline: [...saved] } : d,
        ),
      );
      addToast('Staff assignment saved.', 'success');
    } catch (e) {
      addToast(e.message || 'Network error while saving.', 'error');
    } finally {
      setStaffSavingId(null);
    }
  };

  const addOptionsForDrive = useMemo(() => {
    const map = {};
    for (const d of drives) map[d.id] = staffDirectory.filter((s) => !d.staffIds.includes(s.id));
    return map;
  }, [drives, staffDirectory]);

  const calItems = useMemo(() => drives.map((d) => ({
    id: d.id, date: d.date, title: d.company, time: '', meta: `${formatStatus(d.status)} · ${d.role}`
  })), [drives]);

  const getDrivesCsv = useCallback((_scope) => ({
    headers: ['Company', 'Role', 'Date', 'Type', 'Status', 'Venue', 'Registered', 'Selected'],
    rows: drives.map((d) => [d.company, d.role, d.date, d.type, d.status, d.venue, String(d.registered), String(d.selected)]),
  }), [drives]);

  const handleDownloadReport = async (drive) => {
    setDownloading(drive.id);
    try {
      const res = await fetch(`/api/college/drives/${drive.id}/report`);
      if (!res.ok) throw new Error('Failed to fetch report data');
      const data = await res.json();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `Post_Drive_Report_${drive.company.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(a); a.click(); a.remove();
      addToast(`Report generated for ${drive.company}.`, 'info');
    } catch (e) { addToast('Error: ' + e.message, 'warning'); }
    finally { setDownloading(null); }
  };

  const approveDrive = async (id) => {
    setActionBusyId(id);
    try {
      const result = await approveCollegeDriveWithClashCheck(id);
      if (!result.ok) {
        if (result.error && result.error !== 'Approval cancelled due to calendar clash.') {
          addToast(result.error, 'error');
        }
        return;
      }
      setDrives((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'approved' } : d)));
      addToast('Drive approved.', 'success');
    } catch (error) { addToast(error.message, 'error'); }
    finally { setActionBusyId(null); }
  };

  const rejectDrive = async (id) => {
    setActionBusyId(id);
    try {
      const res = await fetch('/api/college/drives', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driveId: id, action: 'reject' }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to reject drive');
      setDrives((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'cancelled' } : d)));
      addToast('Drive rejected.', 'info');
    } catch (error) { addToast(error.message, 'error'); }
    finally { setActionBusyId(null); }
  };

  const toggleDriveSocialShare = async (driveId, platformId) => {
    const drive = drives.find((d) => d.id === driveId);
    if (!drive) return;
    const list = drive.socialShared || [];
    const has = list.includes(platformId);
    const socialShared = has ? list.filter((p) => p !== platformId) : [...list, platformId];
    setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, socialShared } : d)));
    try {
      const res = await fetch(`/api/college/drives/${driveId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ socialShared }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, socialShared: list } : d))); addToast(json.error || 'Could not save.', 'error'); }
      else addToast('Share flags saved.', 'success');
    } catch (e) { setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, socialShared: list } : d))); addToast(e.message, 'error'); }
  };

  const postDriveToFacebookPage = async (drive) => {
    setPostingFacebookId(drive.id);
    try {
      const res = await fetch(`/api/college/drives/${drive.id}/facebook-post`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { addToast(json.error || 'Facebook post failed.', 'error'); return; }
      addToast(`Posted to Facebook Page (id: ${json.postId}).`, 'success');
    } catch (e) { addToast(e.message, 'error'); }
    finally { setPostingFacebookId(null); }
  };

  const pendingCount = drives.filter(d => d.status === 'requested').length;
  const completedCount = drives.filter(d => d.status === 'completed').length;
  const activeCount = drives.filter(d => ['approved', 'scheduled', 'in_progress'].includes(d.status)).length;

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>

      {/* Page Header — clean editorial, no gradient hero */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
            Placement Drives
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{drives.length} total</span>
            {pendingCount > 0 && (
              <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                <AlertCircle size={12} /> {pendingCount} awaiting approval
              </span>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{activeCount} active · {completedCount} completed</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
            {[{ id: 'list', icon: LayoutList, label: 'List' }, { id: 'calendar', icon: CalendarDays, label: 'Calendar' }].map(({ id, icon: Icon, label }) => (
              <button key={id} type="button" onClick={() => setView(id)} style={{
                padding: '0.45rem 0.9rem', background: view === id ? 'var(--bg-elevated)' : 'transparent',
                color: view === id ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', fontWeight: view === id ? 600 : 400,
                display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem',
                boxShadow: view === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <ExportCsvSplitButton filenameBase="college_placement_drives" currentCount={drives.length} fullCount={drives.length} getRows={getDrivesCsv} />
        </div>
      </div>

      {isLoading && (
        <PageLoading message="Loading placement drives…" inline>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }} aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: i === 1 ? '12px 12px 0 0' : i === 3 ? '0 0 12px 12px' : 0 }} />
            ))}
          </div>
        </PageLoading>
      )}

      {!isLoading && view === 'calendar' && <EmployerCalendarGrid items={calItems} initialYear={2026} initialMonth={7} />}

      {!isLoading && view === 'list' && (
        drives.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-default)' }}>
            <Target size={40} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>No drives yet. Employers request placement drives from their dashboard.</p>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border-default)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-elevated)' }}>
            {drives.map((drive, idx) => {
              const isExpanded = expandedId === drive.id;
              const isLast = idx === drives.length - 1;
              return (
                <div key={drive.id} id={`drive-${drive.id}`} style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-default)' }}>

                  {/* Drive Row */}
                  <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

                    {/* Logo + Identity */}
                    <EntityLogo name={drive.company} size="sm" shape="rounded" />
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <CompanyNameLink name={drive.company} website={drive.website} />
                      </div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{drive.role}</div>
                    </div>

                    {/* Status */}
                    <div style={{ flex: '0 0 auto' }}>
                      <StatusPill status={drive.status} />
                    </div>

                    {/* Type */}
                    <div style={{ flex: '0 0 auto' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.775rem', fontWeight: 500, color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                        {drive.type === 'virtual' ? <><Video size={11} /> Virtual</> : <><Building2 size={11} /> On-Campus</>}
                      </span>
                    </div>

                    {/* Date + Venue */}
                    <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {drive.date && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CalendarDays size={12} style={{ flexShrink: 0 }} /> {formatDate(drive.date)}
                        </span>
                      )}
                      {drive.venue && (
                        <span style={{ fontSize: '0.775rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <MapPin size={11} style={{ flexShrink: 0 }} /> {drive.venue}
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div style={{ flex: '0 0 auto', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{drive.registered}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>Registered</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: drive.selected > 0 ? '#059669' : 'var(--text-tertiary)', lineHeight: 1 }}>{drive.selected}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>Selected</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ flex: '0 0 auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {drive.status === 'requested' && (
                        <>
                          <button className="btn btn-primary btn-sm" type="button" onClick={() => approveDrive(drive.id)} disabled={actionBusyId === drive.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                            <CheckCircle size={13} /> {actionBusyId === drive.id ? 'Approving…' : 'Approve'}
                          </button>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => rejectDrive(drive.id)} disabled={actionBusyId === drive.id} style={{ color: '#dc2626', fontSize: '0.8rem', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <XCircle size={13} /> Reject
                          </button>
                        </>
                      )}
                      {drive.status === 'completed' && (
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleDownloadReport(drive)} disabled={downloading === drive.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', border: '1px solid var(--border-default)' }}>
                          <Download size={13} /> {downloading === drive.id ? 'Generating…' : 'Report'}
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setExpandedId(id => id === drive.id ? null : drive.id)} style={{ border: '1px solid var(--border-default)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {isExpanded ? <><ChevronUp size={13} /> Less</> : <><ChevronDown size={13} /> More</>}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Panel */}
                  {isExpanded && (
                    <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-default)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                        {/* Staff */}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff Attached</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                            {drive.staffIds.length === 0 && <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>None linked yet.</span>}
                            {drive.staffIds.map((sid) => {
                              const s = staffDirectory.find((staff) => staff.id === sid);
                              if (!s) return null;
                              return (
                                <span key={sid} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--primary-50)', color: 'var(--primary-700)', border: '1px solid var(--primary-200)', borderRadius: '6px', padding: '0.25rem 0.5rem 0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: 500 }}>
                                  {s.name} <span style={{ opacity: 0.6 }}>({s.role})</span>
                                  <button type="button" onClick={() => removeStaff(drive.id, sid)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex', alignItems: 'center' }} aria-label={`Remove ${s.name}`}><X size={11} /></button>
                                </span>
                              );
                            })}
                            {staffDirectory.length === 0 ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                Add college admin accounts under Settings to list coordinators here.
                              </span>
                            ) : (
                              <select className="form-select" style={{ width: 'auto', minWidth: 180, fontSize: '0.825rem' }} value="" onChange={(e) => { attachStaff(drive.id, e.target.value); e.target.value = ''; }}>
                                <option value="">+ Add staff…</option>
                                {addOptionsForDrive[drive.id]?.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                              </select>
                            )}
                          </div>
                          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={!isDriveStaffDirty(drive) || staffSavingId === drive.id || staffDirectory.length === 0}
                              onClick={() => saveDriveStaff(drive.id)}
                            >
                              {staffSavingId === drive.id ? 'Saving…' : 'Save staff'}
                            </button>
                            {isDriveStaffDirty(drive) ? (
                              <span className="text-xs text-secondary">Unsaved changes</span>
                            ) : drive.staffIds.length > 0 ? (
                              <span className="text-xs text-tertiary">Saved</span>
                            ) : null}
                          </div>
                        </div>

                        {/* Social */}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Social Channels</div>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {SOCIAL_PLATFORM_ORDER.map(({ id, label, Icon }) => {
                              const shared = (drive.socialShared || []).includes(id);
                              return (
                                <button key={id} type="button" onClick={() => toggleDriveSocialShare(drive.id, id)} title={`${label}${shared ? ' — shared' : ''}`} aria-pressed={shared} style={{ padding: '0.45rem', borderRadius: '8px', border: `1px solid ${shared ? 'var(--primary-300)' : 'var(--border-default)'}`, background: shared ? 'var(--primary-50)' : 'var(--bg-elevated)', color: shared ? 'var(--primary-600)' : 'var(--text-tertiary)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center' }}>
                                  <Icon size={15} />
                                </button>
                              );
                            })}
                            {facebookPageShare && (
                              <button type="button" className="btn btn-ghost btn-sm" disabled={postingFacebookId === drive.id} onClick={() => postDriveToFacebookPage(drive)} style={{ fontSize: '0.8rem', border: '1px solid var(--border-default)' }}>
                                {postingFacebookId === drive.id ? 'Posting…' : 'Post to FB Page'}
                              </button>
                            )}
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem', marginBottom: 0 }}>
                            {facebookPageShare ? 'Highlighted = planned. Post to FB sends a live post.' : 'Highlighted channels are marked as shared on this drive.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
