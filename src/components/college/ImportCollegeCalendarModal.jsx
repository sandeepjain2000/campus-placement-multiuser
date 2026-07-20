'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Upload, CalendarDays, AlertTriangle } from 'lucide-react';
import { toDateOnlyString } from '@/lib/dateOnly';

function todayYmd() {
  return toDateOnlyString(new Date());
}

export default function ImportCollegeCalendarModal({ open, onClose, onImported }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fromDate, setFromDate] = useState(todayYmd());
  const [markBlocking, setMarkBlocking] = useState(false);
  const [expandRrule, setExpandRrule] = useState(true);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setFromDate(todayYmd());
    setMarkBlocking(false);
    setExpandRrule(true);
    setPreview(null);
    setError('');
    setBusy(false);
  }, [open]);

  const buildForm = useCallback(
    (dryRun) => {
      if (!file) return null;
      const form = new FormData();
      form.append('file', file);
      form.append('fromDate', fromDate || todayYmd());
      form.append('markBlocking', markBlocking ? 'true' : 'false');
      form.append('expandRrule', expandRrule ? 'true' : 'false');
      if (dryRun) form.append('dryRun', 'true');
      return form;
    },
    [file, fromDate, markBlocking, expandRrule],
  );

  const runPreview = useCallback(async () => {
    const form = buildForm(true);
    if (!form) {
      setError('Choose an .ics file exported from Google Calendar or Outlook.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/college/calendar/import', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not read calendar file');
      setPreview(json);
    } catch (err) {
      setPreview(null);
      setError(err.message || 'Could not read calendar file');
    } finally {
      setBusy(false);
    }
  }, [buildForm]);

  const runImport = useCallback(async () => {
    const form = buildForm(false);
    if (!form) {
      setError('Choose an .ics file exported from Google Calendar or Outlook.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/college/calendar/import', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Import failed');
      onImported?.(json);
      onClose();
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  }, [buildForm, onClose, onImported]);

  if (!open) return null;

  return (
    <div className="modal-overlay modal-overlay-solid" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-college-calendar-title"
        className="card animate-fadeIn"
        style={{
          width: 'min(560px, calc(100vw - 2rem))',
          maxHeight: '90vh',
          overflow: 'auto',
          margin: 'auto',
          padding: 0,
        }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div
          className="card-header"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div>
            <h2
              id="import-college-calendar-title"
              className="card-title"
              style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Upload size={20} />
              Import calendar (.ics)
            </h2>
            <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0' }}>
              Upload a Google Calendar or Outlook export to add campus events in bulk.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="ics-file">
              ICS file <span className="required">*</span>
            </label>
            <input
              ref={inputRef}
              id="ics-file"
              type="file"
              accept=".ics,.ical,text/calendar"
              className="form-input"
              onChange={(e) => {
                const next = e.target.files?.[0] || null;
                setFile(next);
                setPreview(null);
                setError('');
              }}
            />
            <p className="text-sm text-secondary" style={{ margin: '0.4rem 0 0' }}>
              Google Calendar: Settings → Import &amp; export → Export, then pick the calendar .ics file.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ics-from">
              Import events from
            </label>
            <input
              id="ics-from"
              type="date"
              className="form-input"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPreview(null);
              }}
            />
            <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0' }}>
              Defaults to today so historical personal events are not dumped onto the placement calendar.
            </p>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={expandRrule}
                onChange={(e) => {
                  setExpandRrule(e.target.checked);
                  setPreview(null);
                }}
                style={{ marginTop: '0.2rem' }}
              />
              <span>
                <span className="form-label" style={{ display: 'block', margin: 0 }}>
                  Expand weekly / daily recurring events
                </span>
                <span className="text-sm text-secondary">
                  Creates individual dates for simple RRULE series (capped per series).
                </span>
              </span>
            </label>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={markBlocking}
                onChange={(e) => setMarkBlocking(e.target.checked)}
                style={{ marginTop: '0.2rem' }}
              />
              <span>
                <span className="form-label" style={{ display: 'block', margin: 0 }}>
                  Mark all imported events as blocking drives
                </span>
                <span className="text-sm text-secondary">
                  Leave off unless this file is an official no-placement academic calendar.
                </span>
              </span>
            </label>
          </div>

          {preview ? (
            <div
              className="card"
              style={{
                padding: '0.875rem 1rem',
                marginBottom: '1rem',
                background: 'var(--bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <CalendarDays size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary-600)' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {preview.calendarName || 'Calendar file'} · {preview.wouldImport ?? 0} event
                    {(preview.wouldImport ?? 0) === 1 ? '' : 's'} to import
                  </div>
                  {Array.isArray(preview.preview) && preview.preview.length > 0 ? (
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {preview.preview.map((row) => (
                        <li key={`${row.title}-${row.startDate}`}>
                          {row.title} · {row.startDate}
                          {row.endDate && row.endDate !== row.startDate ? ` → ${row.endDate}` : ''}
                          {row.eventType ? ` · ${row.eventType}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {preview?.hasDriveClashes ? (
            <div
              className="card"
              style={{
                padding: '0.875rem 1rem',
                marginBottom: '1rem',
                borderColor: 'var(--warning-300)',
                background: 'var(--warning-50)',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning-700)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--warning-800)', fontSize: '0.9rem' }}>
                    Placement drive clashes detected
                  </div>
                  <p className="text-sm" style={{ margin: '0.35rem 0 0', color: 'var(--warning-900)' }}>
                    {preview.warning ||
                      'Some imported exams/holidays overlap existing placement drives.'}
                  </p>
                  {Array.isArray(preview.clashByEvent) && preview.clashByEvent.length > 0 ? (
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--warning-900)' }}>
                      {preview.clashByEvent.slice(0, 4).map((row) => (
                        <li key={`${row.title}-${row.startDate}`}>
                          {row.title} ({row.startDate}) → {row.clashes?.[0]?.title || 'drive clash'}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <p style={{ color: 'var(--danger-600)', fontSize: '0.875rem', margin: '0 0 1rem' }}>{error}</p>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-secondary" onClick={runPreview} disabled={busy || !file}>
              {busy && !preview ? 'Reading…' : 'Preview'}
            </button>
            <button type="button" className="btn btn-primary" onClick={runImport} disabled={busy || !file}>
              {busy && preview ? 'Importing…' : 'Import events'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
