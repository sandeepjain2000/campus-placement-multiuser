'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div ref={wrapRef} className="relative block w-full">
      <Button
        type="button"
        variant="outline"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label ? `Drive month filter: ${label}` : 'Filter drives by month and year'}
        className="w-full justify-between font-normal"
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="flex min-w-0 items-center gap-2 overflow-hidden">
          <CalendarDays data-icon="inline-start" aria-hidden />
          <span className="truncate">{value ? label : 'Any month'}</span>
        </span>
        <span aria-hidden className="text-muted-foreground">▾</span>
      </Button>
      {open && (
        <Card
          role="dialog"
          aria-label="Choose month and year"
          className="absolute top-full left-0 z-50 mt-1 min-w-68 shadow-xl"
        >
          <CardContent className="p-3">
          <div className="mb-3 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous year"
              onClick={() => setViewYear((y) => clampYear(y - 1, minYear, maxYear))}
              disabled={viewYear <= minYear}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <span className="text-sm font-semibold tabular-nums">{viewYear}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next year"
              onClick={() => setViewYear((y) => clampYear(y + 1, minYear, maxYear))}
              disabled={viewYear >= maxYear}
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_SHORT.map((name, i) => {
              const key = `${viewYear}-${String(i + 1).padStart(2, '0')}`;
              const selected = value === key;
              return (
                <Button
                  key={name}
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => selectMonth(i)}
                >
                  {name}
                </Button>
              );
            })}
          </div>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Clear month
            </Button>
          ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
