'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { toDateOnlyString } from '@/lib/dateOnly';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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

  const count = Number(preview?.count) || 0;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 aria-hidden />
            Delete imported events
          </DialogTitle>
          <DialogDescription>
            Removes only events brought in via .ics import. Manually added programs and placement drives stay.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <FieldSet>
            <FieldLegend>What to delete</FieldLegend>
            <RadioGroup value={scope} onValueChange={setScope}>
              <Field orientation="horizontal">
                <FieldLabel className="items-start gap-2">
                  <RadioGroupItem value="range" />
                  <span>
                    <span className="block font-medium">Date range</span>
                    <span className="text-muted-foreground text-sm">
                      Delete imported events that overlap the selected dates.
                    </span>
                  </span>
                </FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <FieldLabel className="items-start gap-2">
                  <RadioGroupItem value="all" />
                  <span>
                    <span className="block font-medium">All imported events</span>
                    <span className="text-muted-foreground text-sm">Clear every ICS-imported event for this campus.</span>
                  </span>
                </FieldLabel>
              </Field>
            </RadioGroup>
          </FieldSet>

          {scope === 'range' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="delete-imported-from">
                  From
                </FieldLabel>
                <Input
                  id="delete-imported-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="delete-imported-to">
                  To
                </FieldLabel>
                <Input
                  id="delete-imported-to"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </Field>
            </div>
          ) : null}

          <Alert variant={count > 0 ? 'destructive' : 'default'}>
            <AlertTriangle aria-hidden />
            <AlertTitle>Imported event count</AlertTitle>
            <AlertDescription>
                {busy && !preview ? (
                  <span>Counting imported events…</span>
                ) : (
                  <>
                    <strong>{count}</strong> imported event{count === 1 ? '' : 's'} match
                    {scope === 'all' ? ' (all)' : ' this range'}
                    {preview?.earliest && preview?.latest ? (
                      <div className="mt-1">
                        Span: {preview.earliest}
                        {preview.latest !== preview.earliest ? ` → ${preview.latest}` : ''}
                      </div>
                    ) : null}
                  </>
                )}
            </AlertDescription>
          </Alert>

          {error ? (
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          ) : null}
        </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={busy || count === 0}
            >
              {busy ? 'Working…' : scope === 'all' ? 'Delete all imported' : 'Delete in range'}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
