'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, CalendarDays, AlertTriangle } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload aria-hidden />
            Import calendar (.ics)
          </DialogTitle>
          <DialogDescription>
            Upload a Google Calendar or Outlook export to add campus events in bulk.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="ics-file">
              ICS file <span className="required">*</span>
            </FieldLabel>
            <Input
              ref={inputRef}
              id="ics-file"
              type="file"
              accept=".ics,.ical,text/calendar"
              onChange={(e) => {
                const next = e.target.files?.[0] || null;
                setFile(next);
                setPreview(null);
                setError('');
              }}
            />
            <FieldDescription>
              Google Calendar: Settings → Import &amp; export → Export, then pick the calendar .ics file.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="ics-from">
              Import events from
            </FieldLabel>
            <Input
              id="ics-from"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPreview(null);
              }}
            />
            <FieldDescription>
              Defaults to today so historical personal events are not dumped onto the placement calendar.
            </FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel className="flex items-start gap-2">
              <Checkbox
                checked={expandRrule}
                onCheckedChange={(v) => {
                  setExpandRrule(!!v);
                  setPreview(null);
                }}
              />
              <span>
                <span className="block font-medium">
                  Expand weekly / daily recurring events
                </span>
                <span className="text-muted-foreground text-sm">
                  Creates individual dates for simple RRULE series (capped per series).
                </span>
              </span>
            </FieldLabel>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel className="flex items-start gap-2">
              <Checkbox
                checked={markBlocking}
                onCheckedChange={(v) => setMarkBlocking(!!v)}
              />
              <span>
                <span className="block font-medium">
                  Mark all imported events as blocking drives
                </span>
                <span className="text-muted-foreground text-sm">
                  Leave off unless this file is an official no-placement academic calendar.
                </span>
              </span>
            </FieldLabel>
          </Field>

          {preview ? (
            <Alert>
              <CalendarDays aria-hidden />
              <AlertTitle>
                    {preview.calendarName || 'Calendar file'} · {preview.wouldImport ?? 0} event
                    {(preview.wouldImport ?? 0) === 1 ? '' : 's'} to import
              </AlertTitle>
              <AlertDescription>
                  {Array.isArray(preview.preview) && preview.preview.length > 0 ? (
                    <ul className="mt-2 list-disc pl-4">
                      {preview.preview.map((row) => (
                        <li key={`${row.title}-${row.startDate}`}>
                          {row.title} · {row.startDate}
                          {row.endDate && row.endDate !== row.startDate ? ` → ${row.endDate}` : ''}
                          {row.eventType ? ` · ${row.eventType}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {preview?.hasDriveClashes ? (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden />
              <AlertTitle>
                    Placement drive clashes detected
              </AlertTitle>
              <AlertDescription>
                    {preview.warning ||
                      'Some imported exams/holidays overlap existing placement drives.'}
                  {Array.isArray(preview.clashByEvent) && preview.clashByEvent.length > 0 ? (
                    <ul className="mt-2 list-disc pl-4">
                      {preview.clashByEvent.slice(0, 4).map((row) => (
                        <li key={`${row.title}-${row.startDate}`}>
                          {row.title} ({row.startDate}) → {row.clashes?.[0]?.title || 'drive clash'}
                        </li>
                      ))}
                    </ul>
                  ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          ) : null}
        </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={runPreview} disabled={busy || !file}>
              {busy && !preview ? 'Reading…' : 'Preview'}
            </Button>
            <Button type="button" onClick={runImport} disabled={busy || !file}>
              {busy && preview ? 'Importing…' : 'Import events'}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
