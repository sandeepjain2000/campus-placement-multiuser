'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, AlertTriangle, GraduationCap } from 'lucide-react';
import {
  COLLEGE_PROGRAM_EVENT_TYPES,
  defaultBlockingForEventType,
} from '@/lib/calendarClashDetection';
import { toDateOnlyString } from '@/lib/dateOnly';

function todayYmd() {
  return toDateOnlyString(new Date());
}

export default function AddCollegeProgramEventModal({
  open,
  onClose,
  onSaved,
  initialStartDate = '',
  mode = 'program',
}) {
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('exam');
  const [startDate, setStartDate] = useState(initialStartDate || todayYmd());
  const [endDate, setEndDate] = useState(initialStartDate || todayYmd());
  const [description, setDescription] = useState('');
  const [isBlocking, setIsBlocking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clashLoading, setClashLoading] = useState(false);
  const [driveClashes, setDriveClashes] = useState([]);

  const isBlockMode = mode === 'block';

  useEffect(() => {
    if (!open) return;
    const start = initialStartDate || todayYmd();
    setTitle('');
    setEventType(isBlockMode ? 'holiday' : 'exam');
    setStartDate(start);
    setEndDate(start);
    setDescription('');
    setIsBlocking(isBlockMode ? true : defaultBlockingForEventType('exam'));
    setError('');
    setDriveClashes([]);
  }, [open, initialStartDate, isBlockMode]);

  useEffect(() => {
    if (!open) return;
    if (isBlockMode) {
      setIsBlocking(true);
      return;
    }
    setIsBlocking(defaultBlockingForEventType(eventType));
  }, [eventType, open, isBlockMode]);

  const loadClashes = useCallback(async (start, end) => {
    if (!start) {
      setDriveClashes([]);
      return;
    }
    setClashLoading(true);
    try {
      const qs = new URLSearchParams({
        startDate: start,
        endDate: end || start,
      });
      const res = await fetch(`/api/college/calendar-clashes?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not check clashes');
      setDriveClashes(Array.isArray(json.clashes) ? json.clashes : []);
    } catch {
      setDriveClashes([]);
    } finally {
      setClashLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !startDate) return;
    const end = endDate || startDate;
    const timer = setTimeout(() => {
      void loadClashes(startDate, end);
    }, 350);
    return () => clearTimeout(timer);
  }, [open, startDate, endDate, loadClashes]);

  const programTypes = useMemo(
    () => (isBlockMode ? COLLEGE_PROGRAM_EVENT_TYPES.filter((t) => t.blocksDrives) : COLLEGE_PROGRAM_EVENT_TYPES),
    [isBlockMode],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Program title is required.');
      return;
    }
    if (!startDate) {
      setError('Start date is required.');
      return;
    }

    const effectiveType = isBlockMode ? 'holiday' : eventType;
    const effectiveEnd = endDate || startDate;

    if (driveClashes.length && !window.confirm(
      `There ${driveClashes.length === 1 ? 'is' : 'are'} ${driveClashes.length} placement drive(s) scheduled in this period. Add this program anyway?`,
    )) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/college/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          eventType: effectiveType,
          startDate,
          endDate: effectiveEnd,
          description: description.trim(),
          isBlocking: isBlockMode ? true : isBlocking,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save program');

      onSaved?.({
        warning: json.warning,
        driveClashes: json.driveClashes,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save program');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-overlay modal-overlay-solid"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-college-program-title"
        className="card animate-fadeIn"
        style={{
          width: 'min(520px, calc(100vw - 2rem))',
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
            <h2 id="add-college-program-title" className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={20} />
              {isBlockMode ? 'Block dates for placements' : 'Add college program'}
            </h2>
            <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0' }}>
              {isBlockMode
                ? 'Mark holidays or exam periods when placement drives should not be scheduled.'
                : 'Add exams, workshops, and other academic events to prevent drive clashes.'}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="program-title">
              Title <span className="required">*</span>
            </label>
            <input
              id="program-title"
              className="form-input"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              placeholder={isBlockMode ? 'e.g. Diwali break' : 'e.g. End Semester Exam — CSE'}
              maxLength={255}
              required
            />
          </div>

          {!isBlockMode ? (
            <div className="form-group">
              <label className="form-label" htmlFor="program-type">
                Program type
              </label>
              <select
                id="program-type"
                className="form-input"
                value={eventType}
                onChange={(ev) => setEventType(ev.target.value)}
              >
                {programTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="program-start">
                Start date <span className="required">*</span>
              </label>
              <input
                id="program-start"
                type="date"
                className="form-input"
                value={startDate}
                onChange={(ev) => {
                  setStartDate(ev.target.value);
                  if (!endDate || endDate < ev.target.value) setEndDate(ev.target.value);
                }}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="program-end">
                End date
              </label>
              <input
                id="program-end"
                type="date"
                className="form-input"
                value={endDate}
                min={startDate}
                onChange={(ev) => setEndDate(ev.target.value)}
              />
            </div>
          </div>

          {!isBlockMode ? (
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isBlocking}
                  onChange={(ev) => setIsBlocking(ev.target.checked)}
                  style={{ marginTop: '0.2rem' }}
                />
                <span>
                  <span className="form-label" style={{ display: 'block', margin: 0 }}>Block placement drives on these dates</span>
                  <span className="text-sm text-secondary">
                    Recommended for exams and holidays. Drive approval will warn when dates overlap.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          <div className="form-group">
            <label className="form-label" htmlFor="program-notes">
              Notes (optional)
            </label>
            <textarea
              id="program-notes"
              className="form-input"
              rows={2}
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              placeholder="Batch, department, or venue details"
            />
          </div>

          {clashLoading ? (
            <p className="text-sm text-secondary" style={{ margin: '0 0 1rem' }}>Checking placement drive clashes…</p>
          ) : null}

          {!clashLoading && driveClashes.length > 0 ? (
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
                    {driveClashes.length} placement drive{driveClashes.length === 1 ? '' : 's'} in this period
                  </div>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--warning-900)' }}>
                    {driveClashes.slice(0, 4).map((c) => (
                      <li key={c.id}>{c.title} · {c.driveDate} ({c.status})</li>
                    ))}
                    {driveClashes.length > 4 ? <li>…and {driveClashes.length - 4} more</li> : null}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <p style={{ color: 'var(--danger-600)', fontSize: '0.875rem', margin: '0 0 1rem' }}>{error}</p>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isBlockMode ? 'Block dates' : 'Add program'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
