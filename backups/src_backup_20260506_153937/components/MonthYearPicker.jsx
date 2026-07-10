'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonthKey(key) {
  if (key == null || key === '') return null;
  const s = String(key).trim();
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  if (mo < 1 || mo > 12) return null;
  return { y, mo };
}

function formatMonthKeyLabel(key) {
  const p = parseMonthKey(key);
  if (!p) return null;
  return new Date(p.y, p.mo - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function clampYear(y, minYear, maxYear) {
  return Math.min(maxYear, Math.max(minYear, y));
}

/**
 * Month–year only (no day). Value is '' or 'YYYY-MM'.
 */
export default function MonthYearPicker({ value, onChange, minYear, maxYear, disabled, id }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const [viewYear, setViewYear] = useState(() => clampYear(new Date().getFullYear(), minYear, maxYear));

  const syncViewFromValue = useCallback(() => {
    const p = parseMonthKey(value);
    const y = p?.y ?? new Date().getFullYear();
    setViewYear(clampYear(y, minYear, maxYear));
  }, [value, minYear, maxYear]);

  useEffect(() => {
    if (open) syncViewFromValue();
  }, [open, syncViewFromValue]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selectMonth = (monthIndex0) => {
    const key = `${viewYear}-${String(monthIndex0 + 1).padStart(2, '0')}`;
    onChange(key);
    setOpen(false);
  };

  const label = formatMonthKeyLabel(value);

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'block', width: '100%' }}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label ? `Drive month filter: ${label}` : 'Filter drives by month and year'}
        className="form-input"
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          width: '100%',
          minWidth: 0,
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
          <CalendarDays size={16} aria-hidden style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value ? label : 'Any month'}</span>
        </span>
        <span aria-hidden style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem', flexShrink: 0 }}>
          ▾
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Choose month and year"
          className="card"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '0.25rem',
            zIndex: 100,
            padding: '0.75rem',
            minWidth: '17rem',
            boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.25rem' }}
              aria-label="Previous year"
              onClick={() => setViewYear((y) => clampYear(y - 1, minYear, maxYear))}
              disabled={viewYear <= minYear}
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>{viewYear}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.25rem' }}
              aria-label="Next year"
              onClick={() => setViewYear((y) => clampYear(y + 1, minYear, maxYear))}
              disabled={viewYear >= maxYear}
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.35rem',
            }}
          >
            {MONTH_SHORT.map((name, i) => {
              const key = `${viewYear}-${String(i + 1).padStart(2, '0')}`;
              const selected = value === key;
              return (
                <button
                  key={name}
                  type="button"
                  className={selected ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
                  style={{ fontSize: '0.72rem', padding: '0.45rem 0.2rem', fontWeight: selected ? 700 : 500 }}
                  onClick={() => selectMonth(i)}
                >
                  {name}
                </button>
              );
            })}
          </div>
          {value ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: '0.55rem', fontSize: '0.8rem' }}
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Clear month
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
