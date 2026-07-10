'use client';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import { EmployerCalendarGrid } from '@/components/employer/EmployerCalendarGrid';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { useToast } from '@/components/ToastProvider';
import { SOCIAL_PLATFORM_ORDER } from '@/components/SocialIcons';

export default function CollegeDrivesPage() {
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

  useEffect(() => {
    let mounted = true;
    const loadDrives = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/college/drives');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load drives');
        if (!mounted) return;
        setStaffDirectory(Array.isArray(json.staffDirectory) ? json.staffDirectory : []);
        setFacebookPageShare(Boolean(json.integrations?.facebookPageShare));
        setDrives(
          (json.drives || []).map((d) => ({
            ...d,
            date: d.date ? String(d.date).slice(0, 10) : '',
            registered: Number(d.registered || 0),
            selected: Number(d.selected || 0),
            staffIds: [],
            jobPostingTitle: '',
            jobPostingUrl: '',
            socialShared: Array.isArray(d.social_shared) ? d.social_shared : [],
          })),
        );
      } catch (error) {
        if (!mounted) return;
        addToast(error.message || 'Failed to load drives', 'error');
        setDrives([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadDrives();
    return () => {
      mounted = false;
    };
  }, [addToast]);

  const attachStaff = (driveId, staffId) => {
    if (!staffId) return;
    setDrives((prev) =>
      prev.map((d) => (d.id === driveId && !d.staffIds.includes(staffId) ? { ...d, staffIds: [...d.staffIds, staffId] } : d)),
    );
  };

  const removeStaff = (driveId, staffId) => {
    setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, staffIds: d.staffIds.filter((id) => id !== staffId) } : d)));
  };

  const addOptionsForDrive = useMemo(() => {
    const map = {};
    for (const d of drives) {
      map[d.id] = staffDirectory.filter((s) => !d.staffIds.includes(s.id));
    }
    return map;
  }, [drives, staffDirectory]);

  const calItems = useMemo(
    () =>
      drives.map((d) => ({
        id: d.id,
        date: d.date,
        title: d.company,
        time: '',
        meta: `${formatStatus(d.status)} · ${d.role}`,
      })),
    [drives],
  );

  const getDrivesCsv = useCallback(
    (_scope) => ({
      headers: ['Company', 'Role', 'Date', 'Type', 'Status', 'Venue', 'Registered', 'Selected', 'Job_posting', 'Staff_count'],
      rows: drives.map((d) => [
        d.company,
        d.role,
        d.date,
        d.type,
        d.status,
        d.venue,
        String(d.registered),
        String(d.selected),
        d.jobPostingTitle || '',
        String(d.staffIds.length),
      ]),
    }),
    [drives],
  );

  const handleDownloadReport = async (drive) => {
    setDownloading(drive.id);
    try {
      const res = await fetch(`/api/college/drives/${drive.id}/report`);
      if (!res.ok) throw new Error('Failed to fetch report data');
      const data = await res.json();

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', dataStr);
      downloadAnchorNode.setAttribute('download', `Post_Drive_Report_${drive.company.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();

      addToast(`Report generated for ${drive.company}.`, 'info');
    } catch (e) {
      addToast('Error generating report: ' + e.message, 'warning');
    } finally {
      setDownloading(null);
    }
  };

  const approveDrive = async (id) => {
    setActionBusyId(id);
    try {
      const res = await fetch('/api/college/drives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveId: id, action: 'approve' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to approve drive');
      setDrives((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'approved' } : d)));
      addToast('Drive approved.', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to approve drive', 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const rejectDrive = async (id) => {
    setActionBusyId(id);
    try {
      const res = await fetch('/api/college/drives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveId: id, action: 'reject' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to reject drive');
      setDrives((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'cancelled' } : d)));
      addToast('Drive rejected.', 'info');
    } catch (error) {
      addToast(error.message || 'Failed to reject drive', 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const scheduleNewDrive = () => {
    addToast('Use employer drive creation flow for now.', 'warning');
  };

  const postDriveToFacebookPage = async (drive) => {
    setPostingFacebookId(drive.id);
    try {
      const res = await fetch(`/api/college/drives/${drive.id}/facebook-post`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(json.error || 'Facebook post failed.', 'error');
        return;
      }
      addToast(`Posted to Facebook Page (id: ${json.postId}).`, 'success');
    } catch (e) {
      addToast(e.message || 'Network error.', 'error');
    } finally {
      setPostingFacebookId(null);
    }
  };

  const toggleDriveSocialShare = async (driveId, platformId) => {
    const drive = drives.find((d) => d.id === driveId);
    if (!drive) return;
    const list = drive.socialShared || [];
    const has = list.includes(platformId);
    const socialShared = has ? list.filter((p) => p !== platformId) : [...list, platformId];

    setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, socialShared } : d)));

    try {
      const res = await fetch(`/api/college/drives/${driveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socialShared }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, socialShared: list } : d)));
        addToast(json.error || 'Could not save share flags.', 'error');
        return;
      }
      addToast('Share flags saved for this drive.', 'success');
    } catch (e) {
      setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, socialShared: list } : d)));
      addToast(e.message || 'Network error while saving.', 'error');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🎯 Placement Drives</h1>
          <p>
            Schedule and manage placement drives. Channel toggles are saved on each drive.
            {facebookPageShare
              ? ' Facebook Page posting is enabled (server test — posts to the Page configured in env).'
              : ' Add FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN to enable live Facebook Page posts.'}
          </p>
        </div>
        <div className="page-header-actions">
          <ExportCsvSplitButton filenameBase="college_placement_drives" currentCount={drives.length} fullCount={drives.length} getRows={getDrivesCsv} />
          <div className="view-toggle" role="group" aria-label="Drive list or calendar">
            <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
              List
            </button>
            <button type="button" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
              Calendar
            </button>
          </div>
          <button className="btn btn-primary" type="button" onClick={scheduleNewDrive}>
            + Schedule Drive
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <EmployerCalendarGrid items={calItems} initialYear={2026} initialMonth={7} />
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {drives.map((drive) => (
          <div key={drive.id} className="card card-hover" id={`drive-${drive.id}`}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 14rem', minWidth: 0 }}>
                <EntityLogo name={drive.company} size="md" shape="rounded" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{drive.company}</h3>
                    <span className={`badge badge-${getStatusColor(drive.status)} badge-dot`}>{formatStatus(drive.status)}</span>
                  </div>
                  <p className="text-sm text-secondary">{drive.role}</p>
                  {drive.jobPostingTitle ? (
                    <p className="text-xs" style={{ marginTop: '0.35rem' }}>
                      <span className="text-tertiary">Linked job posting: </span>
                      <a href={drive.jobPostingUrl || '#'} style={{ fontWeight: 600, color: 'var(--text-link)' }}>
                        {drive.jobPostingTitle}
                      </a>
                      <span className="text-tertiary"> (optional)</span>
                    </p>
                  ) : (
                    <p className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
                      No job posting linked (optional).
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {drive.status === 'requested' && (
                    <>
                      <button className="btn btn-success btn-sm" type="button" onClick={() => approveDrive(drive.id)}>
                        {actionBusyId === drive.id ? 'Approving...' : '✅ Approve'}
                      </button>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => rejectDrive(drive.id)}>
                        {actionBusyId === drive.id ? 'Rejecting...' : '❌ Reject'}
                      </button>
                    </>
                  )}
                  {drive.status === 'completed' && (
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => handleDownloadReport(drive)} disabled={downloading === drive.id}>
                      {downloading === drive.id ? 'Generating...' : '📥 Generate Report'}
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => setExpandedId((id) => (id === drive.id ? null : drive.id))}
                  >
                    {expandedId === drive.id ? 'Hide details ↑' : 'View details →'}
                  </button>
                </div>
                <div className="drive-social-sidebar">
                  <span className="drive-social-share-label">Share</span>
                  <div className="drive-social-share">
                    {SOCIAL_PLATFORM_ORDER.map(({ id, label, Icon }) => {
                      const shared = (drive.socialShared || []).includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`drive-social-icon-btn${shared ? ' is-shared' : ''}`}
                          title={`${label}${shared ? ' — marked shared' : ' — click to mark shared'}`}
                          aria-label={`${label} ${shared ? 'shared' : 'not shared'}`}
                          aria-pressed={shared}
                          onClick={() => toggleDriveSocialShare(drive.id, id)}
                        >
                          <Icon size={15} />
                        </button>
                      );
                    })}
                  </div>
                  {facebookPageShare && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', alignSelf: 'flex-end' }}
                      disabled={postingFacebookId === drive.id}
                      onClick={() => postDriveToFacebookPage(drive)}
                    >
                      {postingFacebookId === drive.id ? 'Posting…' : 'Post to FB Page'}
                    </button>
                  )}
                  <span className="text-xs text-tertiary" style={{ textAlign: 'right', lineHeight: 1.35, maxWidth: '12rem' }}>
                    {facebookPageShare
                      ? 'Green = channels you plan to use. “Post to FB Page” sends one real post (test).'
                      : 'No live posting · green = saved on the drive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="drive-info-grid" style={{ marginTop: '0.75rem' }}>
              <div className="drive-info-item">
                <div className="drive-info-label">Date</div>
                <div className="drive-info-value">{formatDate(drive.date)}</div>
              </div>
              <div className="drive-info-item">
                <div className="drive-info-label">Type</div>
                <div className="drive-info-value">
                  <span className={`badge badge-${drive.type === 'virtual' ? 'blue' : 'indigo'}`}>{drive.type === 'virtual' ? '🌐 Virtual' : '🏛️ On-Campus'}</span>
                </div>
              </div>
              <div className="drive-info-item">
                <div className="drive-info-label">Venue</div>
                <div className="drive-info-value">{drive.venue}</div>
              </div>
              <div className="drive-info-item">
                <div className="drive-info-label">Registered</div>
                <div className="drive-info-value">{drive.registered}</div>
              </div>
              <div className="drive-info-item">
                <div className="drive-info-label">Selected</div>
                <div className="drive-info-value">{drive.selected}</div>
              </div>
            </div>

            {expandedId === drive.id && (
              <div className="text-sm text-secondary" style={{ marginTop: '0.75rem' }}>
                Drive logistics, slot confirmations, and employer comms can be attached here in a full implementation.
              </div>
            )}

            <div
              style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-default)',
              }}
            >
              <div className="text-sm font-semibold" style={{ marginBottom: '0.5rem' }}>
                Staff attached to drive
              </div>
              <p className="text-xs text-tertiary" style={{ margin: '0 0 0.65rem' }}>
                Coordinators and faculty points-of-contact visible to students and employers for this drive.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                {drive.staffIds.length === 0 && <span className="text-sm text-secondary">No staff linked yet.</span>}
                {drive.staffIds.map((sid) => {
                  const s = staffDirectory.find((staff) => staff.id === sid);
                  if (!s) return null;
                  return (
                    <span key={sid} className="badge badge-indigo" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', paddingRight: '0.35rem' }}>
                      {s.name}
                      <span className="text-xs" style={{ opacity: 0.85 }}>
                        ({s.role})
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0 0.25rem', minHeight: 'auto', fontSize: '0.875rem', lineHeight: 1 }}
                        aria-label={`Remove ${s.name}`}
                        onClick={() => removeStaff(drive.id, sid)}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                <select
                  className="form-select"
                  style={{ width: 'auto', minWidth: 220, fontSize: '0.8125rem' }}
                  value=""
                  onChange={(e) => {
                    attachStaff(drive.id, e.target.value);
                    e.target.value = '';
                  }}
                >
                  <option value="">+ Add staff…</option>
                  {addOptionsForDrive[drive.id]?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && drives.length === 0 ? (
          <div className="card text-secondary">No drives found.</div>
        ) : null}
      </div>
      )}
    </div>
  );
}
