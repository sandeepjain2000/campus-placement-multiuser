'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Bell, Mail, Megaphone, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { buildDriveReminderDefaults } from '@/lib/collegeBulkStudentNotifyShared';
import { useToast } from '@/components/ToastProvider';
import PageLoading from '@/components/PageLoading';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

export default function CollegeBulkNotificationsPage() {
  const { addToast } = useToast();
  const { data: meta, error, isLoading } = useSWR('/api/college/bulk-notifications/meta', fetcher);

  const [driveId, setDriveId] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [allBranches, setAllBranches] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendAlert, setSendAlert] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [previewCount, setPreviewCount] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  const branches = useMemo(() => (Array.isArray(meta?.branches) ? meta.branches : []), [meta]);
  const batchYears = useMemo(() => (Array.isArray(meta?.batchYears) ? meta.batchYears : []), [meta]);
  const drives = useMemo(() => (Array.isArray(meta?.upcomingDrives) ? meta.upcomingDrives : []), [meta]);

  useEffect(() => {
    if (batchYears.length && !batchYear) {
      setBatchYear(String(batchYears[0]));
    }
  }, [batchYears, batchYear]);

  const selectedDrive = useMemo(
    () => drives.find((d) => d.id === driveId) || null,
    [drives, driveId],
  );

  const applyDriveDefaults = useCallback((drive) => {
    if (!drive) return;
    const defaults = buildDriveReminderDefaults({
      company: drive.company,
      title: drive.title,
      driveDate: drive.driveDate,
    });
    setTitle(defaults.alertTitle);
    setMessage(defaults.alertMessage);
  }, []);

  useEffect(() => {
    if (selectedDrive) applyDriveDefaults(selectedDrive);
  }, [selectedDrive, applyDriveDefaults]);

  const toggleBranch = (branch) => {
    setAllBranches(false);
    setPreviewCount(null);
    setSelectedBranches((prev) =>
      prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch],
    );
  };

  const onAllBranchesChange = (checked) => {
    setAllBranches(checked);
    if (checked) setSelectedBranches([]);
    setPreviewCount(null);
  };

  const audiencePayload = () => ({
    batchYear: Number(batchYear),
    allBranches,
    branches: selectedBranches,
  });

  const runPreview = async () => {
    if (!batchYear) {
      addToast('Choose a batch year.', 'warning');
      return;
    }
    if (!allBranches && !selectedBranches.length) {
      addToast('Select branches or choose all branches.', 'warning');
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch('/api/college/bulk-notifications/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audiencePayload()),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Preview failed');
      setPreviewCount(json.recipientCount);
      addToast(`${json.recipientCount} student(s) will receive this message.`, json.recipientCount ? 'success' : 'warning');
    } catch (e) {
      addToast(e.message || 'Preview failed', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const runSend = async () => {
    if (!batchYear) {
      addToast('Choose a batch year.', 'warning');
      return;
    }
    if (!allBranches && !selectedBranches.length) {
      addToast('Select branches or choose all branches.', 'warning');
      return;
    }
    if (!sendAlert && !sendEmail) {
      addToast('Enable at least one channel.', 'warning');
      return;
    }
    if (!title.trim() || !message.trim()) {
      addToast('Title and message are required.', 'warning');
      return;
    }
    if (!window.confirm(`Send to students matching batch ${batchYear}${allBranches ? ' (all branches)' : ''}?`)) {
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/college/bulk-notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...audiencePayload(),
          driveId: driveId || undefined,
          title: title.trim(),
          message: message.trim(),
          sendAlert,
          sendEmail,
          channels: { alert: sendAlert, email: sendEmail },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Send failed');
      addToast(json.message || 'Sent.', 'success');
      setPreviewCount(json.recipientCount ?? previewCount);
    } catch (e) {
      addToast(e.message || 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <PageLoading message="Loading audience options…" variant="skeleton-card" />;
  if (error) {
    return (
      <div className="card" style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--danger-600)', margin: 0 }}>{error.message || 'Failed to load'}</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem', maxWidth: '920px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Megaphone size={26} aria-hidden />
            Bulk campus notifications
          </h1>
          <p className="text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>
            Send drive reminders (or custom messages) to students by <strong>batch year</strong> and{' '}
            <strong>branch</strong>. Delivered as in-app alerts and/or email.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 className="card-title" style={{ marginBottom: '1rem' }}>
          1 — Optional: upcoming drive
        </h2>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Placement drive (prefills reminder text)</label>
          <select
            className="form-select"
            value={driveId}
            onChange={(e) => {
              setDriveId(e.target.value);
              setPreviewCount(null);
            }}
          >
            <option value="">Custom message (no drive)</option>
            {drives.map((d) => (
              <option key={d.id} value={d.id}>
                {d.company} — {d.title}
                {d.driveDate ? ` (${formatDate(d.driveDate)})` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-tertiary" style={{ margin: '0.5rem 0 0' }}>
            Approved or scheduled drives with today&apos;s date or later. Students are linked to Browse Drives.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 className="card-title" style={{ marginBottom: '1rem' }}>
          2 — Audience
        </h2>
        <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Batch / graduation year</label>
            <select
              className="form-select"
              value={batchYear}
              onChange={(e) => {
                setBatchYear(e.target.value);
                setPreviewCount(null);
              }}
            >
              <option value="">Select year</option>
              {batchYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Branch scope</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', minHeight: '2.5rem' }}>
              <input
                type="checkbox"
                checked={allBranches}
                onChange={(e) => onAllBranchesChange(e.target.checked)}
              />
              <span>All branches for this year</span>
            </label>
          </div>
        </div>

        {!allBranches && (
          <div>
            <p className="form-label" style={{ marginBottom: '0.5rem' }}>
              Branches (multi-select)
            </p>
            {branches.length === 0 ? (
              <p className="text-sm text-secondary" style={{ margin: 0 }}>
                No branches on student profiles yet — import students with branch/department filled.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '0.75rem',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {branches.map((b) => {
                  const on = selectedBranches.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      className={on ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                      onClick={() => toggleBranch(b)}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" disabled={previewing} onClick={runPreview}>
            <Users size={14} aria-hidden /> {previewing ? 'Counting…' : 'Preview audience'}
          </button>
          {previewCount != null && (
            <span className="text-sm text-secondary">
              <strong>{previewCount}</strong> student(s) match
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 className="card-title" style={{ marginBottom: '1rem' }}>
          3 — Message
        </h2>
        <div className="form-group">
          <label className="form-label">Alert title</label>
          <input
            className="form-input"
            value={title}
            maxLength={250}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">Message body</label>
          <textarea
            className="form-textarea"
            rows={6}
            value={message}
            maxLength={4000}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <p className="form-label" style={{ marginBottom: '0.5rem' }}>
          Channels
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendAlert} onChange={(e) => setSendAlert(e.target.checked)} />
            <Bell size={16} aria-hidden /> In-app alert
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            <Mail size={16} aria-hidden /> Email
          </label>
        </div>
      </div>

      <button type="button" className="btn btn-primary" disabled={sending} onClick={runSend}>
        {sending ? 'Sending…' : 'Send to selected students'}
      </button>
    </div>
  );
}
