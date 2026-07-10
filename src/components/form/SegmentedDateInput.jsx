'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { parseYmdToLocalDate, toDateOnlyString } from '@/lib/dateOnly';

export const SEGMENT_ORDER = ['day', 'month', 'year'];

export function emptyDateParts() {
  return { day: '', month: '', year: '' };
}

/** @param {string} ymd */
export function partsFromValue(ymd) {
  const normalized = toDateOnlyString(ymd);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return emptyDateParts();
  return { year: match[1], month: match[2], day: match[3] };
}

/** @param {{ day: string, month: string, year: string }} parts */
export function composeYmd(parts) {
  const { day, month, year } = parts;
  if (!day || !month || !year) return '';
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return '';
  const ymd = `${year}-${month}-${day}`;
  return parseYmdToLocalDate(ymd) ? ymd : '';
}

/**
 * Backspace behavior: clear current segment, then move left and clear previous segments.
 * @param {'day' | 'month' | 'year'} segment
 * @param {{ day: string, month: string, year: string }} parts
 * @returns {{ parts: { day: string, month: string, year: string }, focus: 'day' | 'month' | 'year' | null }}
 */
export function applySegmentBackspace(segment, parts) {
  const current = parts[segment];
  if (current.length > 0) {
    return { parts: { ...parts, [segment]: '' }, focus: segment };
  }
  const idx = SEGMENT_ORDER.indexOf(segment);
  if (idx <= 0) {
    return { parts, focus: null };
  }
  const prev = SEGMENT_ORDER[idx - 1];
  return { parts: { ...parts, [prev]: '' }, focus: prev };
}

/**
 * DD / MM / YYYY segmented date field.
 * Backspace on year clears year; second backspace moves to month and clears it; third moves to day.
 */
export default function SegmentedDateInput({
  value = '',
  onChange,
  onBlur,
  className = '',
  disabled = false,
  id,
  min,
  max,
  showPicker = true,
  'aria-label': ariaLabel = 'Date',
}) {
  const autoId = useId();
  const groupId = id || autoId;
  const nativeDateRef = useRef(null);
  const dayRef = useRef(null);
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const refs = { day: dayRef, month: monthRef, year: yearRef };

  const [parts, setParts] = useState(() => partsFromValue(value));
  const lastEmittedRef = useRef(value || '');

  useEffect(() => {
    if ((value || '') === lastEmittedRef.current) return;
    setParts(partsFromValue(value));
    lastEmittedRef.current = value || '';
  }, [value]);

  const emit = useCallback(
    (nextParts) => {
      setParts(nextParts);
      const ymd = composeYmd(nextParts);
      lastEmittedRef.current = ymd;
      onChange?.(ymd);
    },
    [onChange],
  );

  const focusSegment = (segment) => {
    refs[segment]?.current?.focus();
    refs[segment]?.current?.select();
  };

  const handleSegmentChange = (segment, raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    const maxLen = segment === 'year' ? 4 : 2;
    const next = { ...parts, [segment]: digits.slice(0, maxLen) };
    emit(next);

    if (digits.length >= maxLen) {
      const idx = SEGMENT_ORDER.indexOf(segment);
      if (idx < SEGMENT_ORDER.length - 1) {
        focusSegment(SEGMENT_ORDER[idx + 1]);
      }
    }
  };

  const handleSegmentKeyDown = (segment, e) => {
    if (e.key === 'Backspace') {
      const result = applySegmentBackspace(segment, parts);
      if (result.focus !== null || parts[segment].length > 0) {
        e.preventDefault();
        emit(result.parts);
        if (result.focus && result.focus !== segment) {
          focusSegment(result.focus);
        }
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      const idx = SEGMENT_ORDER.indexOf(segment);
      if (idx > 0 && e.currentTarget.selectionStart === 0) {
        e.preventDefault();
        focusSegment(SEGMENT_ORDER[idx - 1]);
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      const idx = SEGMENT_ORDER.indexOf(segment);
      const el = e.currentTarget;
      if (idx < SEGMENT_ORDER.length - 1 && el.selectionStart === el.value.length) {
        e.preventDefault();
        focusSegment(SEGMENT_ORDER[idx + 1]);
      }
    }
  };

  const handleSegmentBlur = () => {
    requestAnimationFrame(() => {
      const active = document.activeElement;
      const stillInside = SEGMENT_ORDER.some((seg) => refs[seg].current === active);
      if (!stillInside) {
        onBlur?.();
      }
    });
  };

  const segmentClass = `segmented-date-input__segment form-input${className ? ` ${className}` : ''}`;

  const openNativePicker = () => {
    const el = nativeDateRef.current;
    if (!el || disabled) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        /* showPicker can throw if not user-gesture in some browsers */
      }
    }
    el.focus();
    el.click();
  };

  const handleNativeDateChange = (e) => {
    const next = e.target.value || '';
    setParts(partsFromValue(next));
    lastEmittedRef.current = next;
    onChange?.(next);
  };

  return (
    <div className={`segmented-date-input-wrap${disabled ? ' segmented-date-input-wrap--disabled' : ''}`}>
    <div
      className={`segmented-date-input${disabled ? ' segmented-date-input--disabled' : ''}`}
      role="group"
      aria-label={ariaLabel}
      data-min={min || undefined}
      data-max={max || undefined}
    >
      <input
        ref={dayRef}
        id={`${groupId}-day`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={segmentClass}
        placeholder="DD"
        maxLength={2}
        value={parts.day}
        disabled={disabled}
        aria-label="Day"
        onChange={(e) => handleSegmentChange('day', e.target.value)}
        onKeyDown={(e) => handleSegmentKeyDown('day', e)}
        onBlur={handleSegmentBlur}
      />
      <span className="segmented-date-input__sep" aria-hidden="true">
        /
      </span>
      <input
        ref={monthRef}
        id={`${groupId}-month`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={segmentClass}
        placeholder="MM"
        maxLength={2}
        value={parts.month}
        disabled={disabled}
        aria-label="Month"
        onChange={(e) => handleSegmentChange('month', e.target.value)}
        onKeyDown={(e) => handleSegmentKeyDown('month', e)}
        onBlur={handleSegmentBlur}
      />
      <span className="segmented-date-input__sep" aria-hidden="true">
        /
      </span>
      <input
        ref={yearRef}
        id={`${groupId}-year`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={segmentClass}
        placeholder="YYYY"
        maxLength={4}
        value={parts.year}
        disabled={disabled}
        aria-label="Year"
        onChange={(e) => handleSegmentChange('year', e.target.value)}
        onKeyDown={(e) => handleSegmentKeyDown('year', e)}
        onBlur={handleSegmentBlur}
      />
    </div>
    {showPicker ? (
      <div className="segmented-date-input__picker">
        <input
          ref={nativeDateRef}
          type="date"
          className="segmented-date-input__native"
          value={value || ''}
          min={min}
          max={max}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleNativeDateChange}
        />
        <button
          type="button"
          className="btn btn-ghost btn-icon segmented-date-input__picker-btn"
          disabled={disabled}
          aria-label={`${ariaLabel} — open calendar`}
          title="Open calendar"
          onClick={openNativePicker}
        >
          <CalendarDays size={18} aria-hidden />
        </button>
      </div>
    ) : null}
    </div>
  );
}
