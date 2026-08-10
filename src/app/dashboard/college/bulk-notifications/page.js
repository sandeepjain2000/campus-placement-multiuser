'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Bell, Mail, Megaphone, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { buildDriveReminderDefaults } from '@/lib/collegeBulkStudentNotifyShared';
import { useToast } from '@/components/ToastProvider';
import PageLoading from '@/components/PageLoading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

export default function CollegeBulkNotificationsPage() {
  const { addToast } = useToast();
  const { data: meta, error, isLoading } = useSWR('/api/college/bulk-notifications/meta', fetcher);

  const [driveId, setDriveId] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [allBranches, setAllBranches] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendAlert, setSendAlert] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [previewCount, setPreviewCount] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  const branches = useMemo(() => (Array.isArray(meta?.branches) ? meta.branches : []), [meta]);
  const batchYears = useMemo(() => (Array.isArray(meta?.batchYears) ? meta.batchYears : []), [meta]);
  const drives = useMemo(() => (Array.isArray(meta?.upcomingDrives) ? meta.upcomingDrives : []), [meta]);

  useEffect(() => {
    if (batchYears.length && !batchYear) {
      setBatchYear(String(batchYears[0]));
    }
  }, [batchYears, batchYear]);

  const selectedDrive = useMemo(
    () => drives.find((d) => d.id === driveId) || null,
    [drives, driveId],
  );

  const applyDriveDefaults = useCallback((drive) => {
    if (!drive) return;
    const defaults = buildDriveReminderDefaults({
      company: drive.company,
      title: drive.title,
      driveDate: drive.driveDate,
    });
    setTitle(defaults.alertTitle);
    setMessage(defaults.alertMessage);
  }, []);

  useEffect(() => {
    if (selectedDrive) applyDriveDefaults(selectedDrive);
  }, [selectedDrive, applyDriveDefaults]);

  const toggleBranch = (branch) => {
    setAllBranches(false);
    setPreviewCount(null);
    setSelectedBranches((prev) =>
      prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch],
    );
  };

  const onAllBranchesChange = (checked) => {
    setAllBranches(checked);
    if (checked) setSelectedBranches([]);
    setPreviewCount(null);
  };

  const audiencePayload = () => ({
    batchYear: Number(batchYear),
    allBranches,
    branches: selectedBranches,
  });

  const runPreview = async () => {
    if (!batchYear) {
      addToast('Choose a batch year.', 'warning');
      return;
    }
    if (!allBranches && !selectedBranches.length) {
      addToast('Select branches or choose all branches.', 'warning');
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch('/api/college/bulk-notifications/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audiencePayload()),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Preview failed');
      setPreviewCount(json.recipientCount);
      addToast(`${json.recipientCount} student(s) will receive this message.`, json.recipientCount ? 'success' : 'warning');
    } catch (e) {
      addToast(e.message || 'Preview failed', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const runSend = async () => {
    if (!batchYear) {
      addToast('Choose a batch year.', 'warning');
      return;
    }
    if (!allBranches && !selectedBranches.length) {
      addToast('Select branches or choose all branches.', 'warning');
      return;
    }
    if (!sendAlert && !sendEmail) {
      addToast('Enable at least one channel.', 'warning');
      return;
    }
    if (!title.trim() || !message.trim()) {
      addToast('Title and message are required.', 'warning');
      return;
    }
    if (!window.confirm(`Send to students matching batch ${batchYear}${allBranches ? ' (all branches)' : ''}?`)) {
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/college/bulk-notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...audiencePayload(),
          driveId: driveId || undefined,
          title: title.trim(),
          message: message.trim(),
          sendAlert,
          sendEmail,
          channels: { alert: sendAlert, email: sendEmail },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Send failed');
      addToast(json.message || 'Sent.', 'success');
      setPreviewCount(json.recipientCount ?? previewCount);
    } catch (e) {
      addToast(e.message || 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <PageLoading message="Loading audience options…" variant="skeleton-card" />;
  if (error) {
    return (
      <Alert variant="destructive"><AlertDescription>{error.message || 'Failed to load'}</AlertDescription></Alert>
    );
  }

  return (
    <div className="animate-fadeIn flex max-w-4xl flex-col gap-6 pb-12">
      <div className="flex max-w-3xl flex-col gap-1">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Megaphone className="text-muted-foreground size-7" strokeWidth={1.5} aria-hidden />
            Bulk campus notifications
          </h1>
          <p className="text-muted-foreground m-0 text-sm">
            Send drive reminders (or custom messages) to students by <strong>batch year</strong> and{' '}
            <strong>branch</strong>. Delivered as in-app alerts and/or email.
          </p>
      </div>

      <Card>
        <CardHeader><CardTitle>1 — Optional: upcoming drive</CardTitle><CardDescription>Choose a drive to prefill the reminder text.</CardDescription></CardHeader>
        <CardContent>
        <Field>
          <FieldLabel htmlFor="bulk-notification-drive">Placement drive</FieldLabel>
          <AdminFilterSelect
            id="bulk-notification-drive"
            className="w-full"
            value={driveId}
            emptyMapsToAll={false}
            onValueChange={(id) => {
              setDriveId(id);
              setPreviewCount(null);
            }}
            items={[
              { label: 'Custom message (no drive)', value: '' },
              ...drives.map((d) => ({
                label: `${d.company} — ${d.title}${d.driveDate ? ` (${formatDate(d.driveDate)})` : ''}`,
                value: String(d.id),
              })),
            ]}
          />
          <FieldDescription>
            Approved or scheduled drives with today&apos;s date or later. Students are linked to Browse Drives.
          </FieldDescription>
        </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2 — Audience</CardTitle><CardDescription>Target students by graduation year and branch.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-5">
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="bulk-notification-year">Batch / graduation year</FieldLabel>
            <AdminFilterSelect
              id="bulk-notification-year"
              className="w-full"
              value={batchYear}
              emptyMapsToAll={false}
              onValueChange={(year) => {
                setBatchYear(year);
                setPreviewCount(null);
              }}
              items={[
                { label: 'Select year', value: '' },
                ...batchYears.map((y) => ({ label: String(y), value: String(y) })),
              ]}
            />
          </Field>
          <Field>
            <FieldLabel>Branch scope</FieldLabel>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={allBranches}
                onCheckedChange={(v) => onAllBranchesChange(!!v)}
              />
              <span>All branches for this year</span>
            </label>
          </Field>
        </FieldGroup>

        {!allBranches && (
          <FieldSet>
            <FieldLegend variant="label">Branches (multi-select)</FieldLegend>
            {branches.length === 0 ? (
              <p className="text-sm text-secondary" style={{ margin: 0 }}>
                No branches on student profiles yet — import students with branch/department filled.
              </p>
            ) : (
              <div className="border-border flex max-h-[200px] flex-wrap gap-2 overflow-y-auto rounded-md border p-3">
                {branches.map((b) => {
                  const on = selectedBranches.includes(b);
                  return (
                    <Button
                      key={b}
                      type="button"
                      variant={on ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleBranch(b)}
                    >
                      {b}
                    </Button>
                  );
                })}
              </div>
            )}
          </FieldSet>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" disabled={previewing} onClick={runPreview}>
            <Users data-icon="inline-start" aria-hidden /> {previewing ? 'Counting…' : 'Preview audience'}
          </Button>
          {previewCount != null && (
            <span className="text-sm text-secondary">
              <strong>{previewCount}</strong> student(s) match
            </span>
          )}
        </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>3 — Message</CardTitle><CardDescription>Write the message and choose delivery channels.</CardDescription></CardHeader>
        <CardContent>
        <FieldGroup>
        <Field>
          <FieldLabel htmlFor="bulk-notification-title">Alert title</FieldLabel>
          <Input
            id="bulk-notification-title"
            value={title}
            maxLength={250}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="bulk-notification-message">Message body</FieldLabel>
          <Textarea
            id="bulk-notification-message"
            rows={6}
            value={message}
            maxLength={4000}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Field>
        <FieldSet>
        <FieldLegend variant="label">Channels</FieldLegend>
        <div className="flex flex-wrap gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={sendAlert} onCheckedChange={(v) => setSendAlert(!!v)} />
            <Bell size={16} aria-hidden /> In-app alert
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(!!v)} />
            <Mail size={16} aria-hidden /> Email
          </label>
        </div>
        </FieldSet>
        </FieldGroup>
        </CardContent>
      </Card>

      <Button type="button" className="w-fit" disabled={sending} onClick={runSend}>
        {sending ? 'Sending…' : 'Send to selected students'}
      </Button>
    </div>
  );
}
