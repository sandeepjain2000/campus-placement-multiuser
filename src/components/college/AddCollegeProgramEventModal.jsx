'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, GraduationCap } from 'lucide-react';
import {
  COLLEGE_PROGRAM_EVENT_TYPES,
  defaultBlockingForEventType,
} from '@/lib/calendarClashDetection';
import { toDateOnlyString } from '@/lib/dateOnly';
import AdminFilterSelect from '@/components/AdminFilterSelect';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
            <DialogTitle id="add-college-program-title" className="flex items-center gap-2">
              <GraduationCap aria-hidden="true" />
              {isBlockMode ? 'Block dates for placements' : 'Add college program'}
            </DialogTitle>
            <DialogDescription>
              {isBlockMode
                ? 'Mark holidays or exam periods when placement drives should not be scheduled.'
                : 'Add exams, workshops, and other academic events to prevent drive clashes.'}
            </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="program-title">
              Title <span className="required">*</span>
            </FieldLabel>
            <Input
              id="program-title"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              placeholder={isBlockMode ? 'e.g. Diwali break' : 'e.g. End Semester Exam — CSE'}
              maxLength={255}
              required
            />
          </Field>

          {!isBlockMode ? (
            <Field>
              <FieldLabel htmlFor="program-type">
                Program type
              </FieldLabel>
              <AdminFilterSelect
                id="program-type"
                className="w-full"
                value={eventType}
                onValueChange={setEventType}
                emptyMapsToAll={false}
                items={programTypes.map((t) => ({ label: t.label, value: t.value }))}
              />
            </Field>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="program-start">
                Start date <span className="required">*</span>
              </FieldLabel>
              <Input
                id="program-start"
                type="date"
                value={startDate}
                onChange={(ev) => {
                  setStartDate(ev.target.value);
                  if (!endDate || endDate < ev.target.value) setEndDate(ev.target.value);
                }}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="program-end">
                End date
              </FieldLabel>
              <Input
                id="program-end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(ev) => setEndDate(ev.target.value)}
              />
            </Field>
          </div>

          {!isBlockMode ? (
            <Field orientation="horizontal">
              <FieldLabel className="items-start">
                <Checkbox
                  className="mt-0.5"
                  checked={isBlocking}
                  onCheckedChange={(v) => setIsBlocking(!!v)}
                />
                <span>
                  <span className="block text-sm font-medium">Block placement drives on these dates</span>
                  <span className="text-sm text-muted-foreground">
                    Recommended for exams and holidays. Drive approval will warn when dates overlap.
                  </span>
                </span>
              </FieldLabel>
            </Field>
          ) : null}

          <Field>
            <FieldLabel htmlFor="program-notes">
              Notes (optional)
            </FieldLabel>
            <Textarea
              id="program-notes"
              rows={2}
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              placeholder="Batch, department, or venue details"
            />
          </Field>
          </FieldGroup>

          {clashLoading ? (
            <p className="text-sm text-secondary" style={{ margin: '0 0 1rem' }}>Checking placement drive clashes…</p>
          ) : null}

          {!clashLoading && driveClashes.length > 0 ? (
            <Alert className="border-amber-500/40 bg-amber-500/5">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>
                    {driveClashes.length} placement drive{driveClashes.length === 1 ? '' : 's'} in this period
                </AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-disc pl-4">
                    {driveClashes.slice(0, 4).map((c) => (
                      <li key={c.id}>{c.title} · {c.driveDate} ({c.status})</li>
                    ))}
                    {driveClashes.length > 4 ? <li>…and {driveClashes.length - 4} more</li> : null}
                  </ul>
                </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isBlockMode ? 'Block dates' : 'Add program'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
