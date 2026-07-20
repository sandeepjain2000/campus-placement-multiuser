'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { toDateOnlyString } from '@/lib/dateOnly';

function todayYmd() {
  return toDateOnlyString(new Date());
}

/**
 * Delete ICS-imported college calendar events (all, or overlapping a date range).
 */
export default function DeleteImportedCalendarModal({ open, onClose, onDeleted }) {
  const [scope, setScope] = useState('range'); // 'range' | 'all'
  const [fromDate, setFromDate] = useState(todayYmd());
  const [toDate, setToDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setScope('range');
    setFromDate(todayYmd());
    setToDate('');
    setPreview(null);
    setError('');
    setBusy(false);
  }, [open]);

  const loadPreview = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (scope === 'range') {
        if (fromDate) qs.set('fromDate', fromDate);
        if (toDate) qs.set('toDate', toDate);
      }
      const res = await fetch(`/api/college/calendar/imported?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not count imported events');
      if (json.available === false) {
        throw new Error(json.message || 'Imported-event tracking is not available yet.');
      }
      setPreview(json);
    } catch (err) {
      setPreview(null);
      setError(err.message || 'Could not count imported events');
    } finally {
      setBusy(false);
    }
  }, [scope, fromDate, toDate]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      void loadPreview();
    }, 250);
    return () => clearTimeout(timer);
  }, [open, loadPreview]);

  const handleDelete = async () => {
    setError('');
    if (scope === 'range' && !fromDate && !toDate) {
      setError('Enter a from and/or to date, or choose delete all.');
      return;
    }

    const count = Number(preview?.count) || 0;
    const label =
      scope === 'all'
        ? `Delete ALL ${count} imported calendar event${count === 1 ? '' : 's'}? This cannot be undone.`
        : `Delete ${count} imported event${count === 1 ? '' : 's'} in this date range? This cannot be undone.`;

    if (!window.confirm(label)) return;

    setBusy(true);
    try {
      const res = await fetch('/api/college/calendar/imported', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          scope === 'all'
            ? { scope: 'all' }
            : { scope: 'range', fromDate: fromDate || null, toDate: toDate || null },
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      onDeleted?.(json);
      onClose();
    } catch (err) {
      setError(err.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const count = Number(preview?.count) || 0;

  return (
    <div className="modal-overlay modal-overlay-solid" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-imported-calendar-title"
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
            <h2
              id="delete-imported-calendar-title"
              className="card-title"
              style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Trash2 size={20} />
              Delete imported events
            </h2>
            <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0' }}>
              Removes only events brought in via .ics import. Manually added programs and placement drives stay.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
          <div className="form-group">
            <span className="form-label">What to delete</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="delete-imported-scope"
                  checked={scope === 'range'}
                  onChange={() => setScope('range')}
                  style={{ marginTop: '0.2rem' }}
                />
                <span>
                  <span className="form-label" style={{ display: 'block', margin: 0 }}>
                    Date range
                  </span>
                  <span className="text-sm text-secondary">
                    Delete imported events that overlap the selected dates.
                  </span>
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="delete-imported-scope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  style={{ marginTop: '0.2rem' }}
                />
                <span>
                  <span className="form-label" style={{ display: 'block', margin: 0 }}>
                    All imported events
                  </span>
                  <span className="text-sm text-secondary">Clear every ICS-imported event for this campus.</span>
                </span>
              </label>
            </div>
          </div>

          {scope === 'range' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="delete-imported-from">
                  From
                </label>
                <input
                  id="delete-imported-from"
                  type="date"
                  className="form-input"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="delete-imported-to">
                  To
                </label>
                <input
                  id="delete-imported-to"
                  type="date"
                  className="form-input"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div
            className="card"
            style={{
              padding: '0.875rem 1rem',
              margin: '1rem 0',
              borderColor: count > 0 ? 'var(--warning-300)' : 'var(--border-default)',
              background: count > 0 ? 'var(--warning-50)' : 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertTriangle
                size={18}
                style={{
                  flexShrink: 0,
                  marginTop: 2,
                  color: count > 0 ? 'var(--warning-700)' : 'var(--text-tertiary)',
                }}
              />
              <div style={{ fontSize: '0.9rem' }}>
                {busy && !preview ? (
                  <span className="text-secondary">Counting imported events…</span>
                ) : (
                  <>
                    <strong>{count}</strong> imported event{count === 1 ? '' : 's'} match
                    {scope === 'all' ? ' (all)' : ' this range'}
                    {preview?.earliest && preview?.latest ? (
                      <div className="text-sm text-secondary" style={{ marginTop: '0.25rem' }}>
                        Span: {preview.earliest}
                        {preview.latest !== preview.earliest ? ` → ${preview.latest}` : ''}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>

          {error ? (
            <p style={{ color: 'var(--danger-600)', fontSize: '0.875rem', margin: '0 0 1rem' }}>{error}</p>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={busy || count === 0}
            >
              {busy ? 'Working…' : scope === 'all' ? 'Delete all imported' : 'Delete in range'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
