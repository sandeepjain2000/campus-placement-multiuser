'use client';

import { useCallback, useState } from 'react';
import { Download } from 'lucide-react';
import { rowsToCsv, downloadCsv } from '@/lib/csvExport';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';

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

  return (
    <>
      <Button className={className} size={size === 'sm' ? 'sm' : 'default'} variant="outline" disabled={busy} onClick={() => setMenuOpen(true)}>
        <Download data-icon="inline-start" />
        {busy ? 'Exporting…' : 'Export'}
      </Button>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export placement calendar</DialogTitle>
            <DialogDescription>Choose a file format and date scope.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="h-auto justify-between py-3" onClick={() => void exportCsv('current')}>
              CSV — this month <StatusBadge tone="gray">{currentCount}</StatusBadge>
            </Button>
            <Button variant="outline" className="h-auto justify-between py-3" onClick={() => void exportCsv('full')}>
              CSV — full calendar <StatusBadge tone="gray">{fullCount}</StatusBadge>
            </Button>
            <Button variant="outline" className="h-auto justify-between py-3" onClick={() => void exportIcs('month')}>
              ICS — this month <StatusBadge tone="blue">.ics</StatusBadge>
            </Button>
            <Button variant="outline" className="h-auto justify-between py-3" onClick={() => void exportIcs('full')}>
              ICS — full calendar <StatusBadge tone="blue">.ics</StatusBadge>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
