'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { rowsToCsv, downloadCsv } from '@/lib/csvExport';
import { useToast } from '@/components/ToastProvider';

const PREPARE_MS = 400;

/**
 * Unified college calendar export: choose CSV or ICS, this month or full.
 *
 * @param {{
 *   year: number,
 *   month: number, // 0-11
 *   currentCount?: number,
 *   fullCount?: number,
 *   getCsvRows: (scope: 'current'|'full') => { headers: string[]; rows: string[][] },
 *   filenameBase?: string,
 *   className?: string,
 *   size?: 'sm'|'md',
 * }} props
 */
export default function ExportCollegeCalendarButton({
  year,
  month,
  currentCount = 0,
  fullCount = 0,
  getCsvRows,
  filenameBase = 'placement_calendar',
  className = '',
  size = 'md',
}) {
  const { addToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const exportCsv = useCallback(
    async (scope) => {
      setBusy(true);
      setMenuOpen(false);
      await new Promise((r) => setTimeout(r, PREPARE_MS));
      try {
        const payload = getCsvRows?.(scope);
        if (!payload || !Array.isArray(payload.headers)) {
          throw new Error('Export data is not ready yet');
        }
        const csv = rowsToCsv(payload.headers, payload.rows);
        const stamp = new Date().toISOString().slice(0, 10);
        const stem = scope === 'current' ? `${filenameBase}_month` : `${filenameBase}_full`;
        downloadCsv(`${stem}_${stamp}`, csv);
        addToast(scope === 'current' ? 'Exported this month as CSV' : 'Exported full calendar as CSV', 'success');
      } catch (err) {
        addToast(err?.message || 'CSV export failed', 'error');
      } finally {
        setBusy(false);
      }
    },
    [addToast, filenameBase, getCsvRows],
  );

  const exportIcs = useCallback(
    async (scope) => {
      setBusy(true);
      setMenuOpen(false);
      try {
        const qs = new URLSearchParams({ scope });
        if (scope === 'month' && year != null && month != null) {
          qs.set('year', String(year));
          qs.set('month', String(month + 1));
        }
        const res = await fetch(`/api/college/calendar/export?${qs.toString()}`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || 'Failed to export calendar');
        }
        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="([^"]+)"/i);
        const filename =
          match?.[1] || `placementhub_calendar_${new Date().toISOString().slice(0, 10)}.ics`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast(scope === 'month' ? 'Exported this month as .ics' : 'Exported full calendar as .ics', 'success');
      } catch (err) {
        addToast(err?.message || 'ICS export failed', 'error');
      } finally {
        setBusy(false);
      }
    },
    [addToast, month, year],
  );

  const sizeClass = size === 'sm' ? 'btn-sm' : '';

  return (
    <div className={`export-csv-wrap export-csv-split ${className}`} ref={wrapRef}>
      <div className="export-csv-split-inner">
        <button
          type="button"
          className={`btn export-csv-primary ${sizeClass}`}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          title="Export calendar as CSV or ICS"
        >
          {busy ? (
            <span className="export-csv-preparing">Exporting…</span>
          ) : (
            <>
              <span className="export-csv-icon" aria-hidden>
                ⬇
              </span>
              Export
              <span className="export-csv-chevron" aria-hidden>
                ▾
              </span>
            </>
          )}
        </button>
      </div>

      {menuOpen && !busy ? (
        <div className="export-csv-menu export-csv-menu-split" role="menu">
          <p className="export-csv-hint" role="note">
            Choose format
          </p>
          <button
            type="button"
            role="menuitem"
            className="export-csv-menu-item"
            onClick={() => void exportCsv('current')}
          >
            <span className="export-csv-menu-label">CSV — this month</span>
            <span className="export-csv-menu-meta font-mono">{currentCount}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="export-csv-menu-item"
            onClick={() => void exportCsv('full')}
          >
            <span className="export-csv-menu-label">CSV — full calendar</span>
            <span className="export-csv-menu-meta font-mono">{fullCount}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="export-csv-menu-item"
            onClick={() => void exportIcs('month')}
          >
            <span className="export-csv-menu-label">ICS — this month</span>
            <span className="export-csv-menu-meta">.ics</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="export-csv-menu-item"
            onClick={() => void exportIcs('full')}
          >
            <span className="export-csv-menu-label">ICS — full calendar</span>
            <span className="export-csv-menu-meta">.ics</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
