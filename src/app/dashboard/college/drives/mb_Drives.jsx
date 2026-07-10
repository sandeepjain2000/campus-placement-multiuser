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
  Target, CheckCircle, XCircle, Download, Video, Building2,
  ChevronDown, ChevronUp, LayoutList, CalendarDays, X,
  Clock, MapPin, Users, CheckCircle2, AlertCircle
} from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import {
  academicYearQueryString,
  readActiveAcademicYearContext,
} from '@/lib/collegeAcademicYearContext';
import { mapCollegeDriveFromApi, isDriveStaffDirty } from '@/lib/collegeDrivesClient';
import { fetchCollegeDrivesList } from '@/lib/collegeDrivesApi';
import { approveCollegeDriveWithClashCheck } from '@/lib/collegeDriveApprovalClient';
import PageLoading from '@/components/PageLoading';

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

export default function mb_Drives() {
  const { addToast } = useToast();
  const [drives, setDrives] = useState([]);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [downloading, setDownloading] = useState(null);

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
    <>
      <MobileHeader title="Drives" />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {activeCount} active · {completedCount} completed
          </span>
          {pendingCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
              <AlertCircle size={12} /> {pendingCount} pending
            </span>
          )}
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

      {!isLoading && (
        drives.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-default)' }}>
            <Target size={40} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>No drives yet. Employers request placement drives from their dashboard.</p>
          </div>
        ) : (
          <div className="mobile-drives-list">
            {drives.map((drive) => {
              const isExpanded = expandedId === drive.id;
              return (
                <div key={drive.id} style={{ border: '1px solid var(--border-default)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-elevated)', marginBottom: '0.75rem' }}>
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <EntityLogo name={drive.company} size="sm" shape="rounded" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          <CompanyNameLink name={drive.company} website={drive.website} />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{drive.role}</div>
                      </div>
                      <StatusPill status={drive.status} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date &amp; Type</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {drive.date ? formatDate(drive.date) : '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {drive.type === 'virtual' ? 'Virtual' : 'On-Campus'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered</div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{drive.registered}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected</div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: drive.selected > 0 ? '#059669' : 'var(--text-primary)' }}>{drive.selected}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {drive.status === 'requested' && (
                        <>
                          <button className="btn btn-primary btn-sm" type="button" onClick={() => approveDrive(drive.id)} disabled={actionBusyId === drive.id}>
                            <CheckCircle size={13} style={{marginRight:4}}/> Approve
                          </button>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => rejectDrive(drive.id)} disabled={actionBusyId === drive.id} style={{ color: '#dc2626', border: '1px solid #fecaca' }}>
                            <XCircle size={13} style={{marginRight:4}}/> Reject
                          </button>
                        </>
                      )}
                      {drive.status === 'completed' && (
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleDownloadReport(drive)} disabled={downloading === drive.id} style={{ border: '1px solid var(--border-default)' }}>
                          <Download size={13} style={{marginRight:4}}/> Report
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setExpandedId(id => id === drive.id ? null : drive.id)} style={{ border: '1px solid var(--border-default)', marginLeft: 'auto' }}>
                        {isExpanded ? <><ChevronUp size={13} style={{marginRight:4}}/> Less</> : <><ChevronDown size={13} style={{marginRight:4}}/> More</>}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                          {drive.staffIds.length === 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>None linked yet.</span>
                          )}
                          {drive.staffIds.map((sid) => {
                            const s = staffDirectory.find((staff) => staff.id === sid);
                            if (!s) return null;
                            return (
                              <span key={sid} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--primary-50)', color: 'var(--primary-700)', border: '1px solid var(--primary-200)', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', fontWeight: 500 }}>
                                {s.name}
                                <button type="button" onClick={() => removeStaff(drive.id, sid)} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit' }}><X size={11} /></button>
                              </span>
                            );
                          })}
                          {staffDirectory.length > 0 && (
                            <select className="form-select" style={{ width: 'auto', minWidth: 120, fontSize: '0.75rem', padding: '0.2rem 1.5rem 0.2rem 0.5rem' }} value="" onChange={(e) => { attachStaff(drive.id, e.target.value); e.target.value = ''; }}>
                              <option value="">+ Add</option>
                              {addOptionsForDrive[drive.id]?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: '0.5rem' }}
                          disabled={!isDriveStaffDirty(drive) || staffSavingId === drive.id || staffDirectory.length === 0}
                          onClick={() => saveDriveStaff(drive.id)}
                        >
                          {staffSavingId === drive.id ? 'Saving…' : 'Save staff'}
                        </button>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Social</div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {SOCIAL_PLATFORM_ORDER.map(({ id, label, Icon }) => {
                            const shared = (drive.socialShared || []).includes(id);
                            return (
                              <button key={id} type="button" onClick={() => toggleDriveSocialShare(drive.id, id)} style={{ padding: '0.4rem', borderRadius: '6px', border: `1px solid ${shared ? 'var(--primary-300)' : 'var(--border-default)'}`, background: shared ? 'var(--primary-50)' : 'var(--bg-elevated)', color: shared ? 'var(--primary-600)' : 'var(--text-tertiary)' }}>
                                <Icon size={14} />
                              </button>
                            );
                          })}
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
    </>
  );
}
