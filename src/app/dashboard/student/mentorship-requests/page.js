'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { mentorshipStatusLabel } from '@/lib/studentMentorshipRequest';
import { HandHeart, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';

const EMPTY_FORM = {
  title: '',
  summary: '',
  topics: '',
  preferredFormat: '',
  timeHint: '',
};

function statusTone(status) {
  if (status === 'approved') return 'green';
  if (status === 'submitted') return 'amber';
  if (status === 'rejected') return 'red';
  return 'gray';
}

export default function StudentMentorshipRequestsPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student/mentorship-requests');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      addToast(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || '',
      summary: item.summary || '',
      topics: item.topics || '',
      preferredFormat: item.preferredFormat || '',
      timeHint: item.timeHint || '',
    });
    setShowForm(true);
  };

  const submitForm = async (submitNow) => {
    setSaving(true);
    try {
      const payload = { ...form, submit: submitNow };
      const url = editing
        ? `/api/student/mentorship-requests/${editing.id}`
        : '/api/student/mentorship-requests';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      addToast(submitNow ? 'Request submitted for college review' : 'Draft saved', 'success');
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitExisting = async (id) => {
    try {
      const res = await fetch(`/api/student/mentorship-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      addToast('Submitted for college review', 'success');
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    }
  };

  const closeRequest = async (id) => {
    if (!window.confirm('Close this mentorship request?')) return;
    try {
      const res = await fetch(`/api/student/mentorship-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      addToast('Request closed', 'success');
      setDetail(null);
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    }
  };

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [items],
  );

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <HandHeart className="text-muted-foreground size-7" strokeWidth={1.5} />
            Request a mentor
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm">
            Request informal guidance from partnered employers after your college reviews the topic.
          </p>
        </div>
        <Button type="button" onClick={openCreate}><Plus data-icon="inline-start" />New request</Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? 'Edit request' : 'New mentorship request'}</CardTitle>
            <CardDescription>Describe the outcome you want and how a mentor can help.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field><FieldLabel htmlFor="mentor-title">Title</FieldLabel><Input id="mentor-title" name="title" autoComplete="off" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Guidance on system design interviews…" /></Field>
              <Field><FieldLabel htmlFor="mentor-summary">What you need help with</FieldLabel><Textarea id="mentor-summary" name="summary" autoComplete="off" rows={4} value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} placeholder="Describe your goals and the guidance you need…" /></Field>
              <div className="grid gap-4 md:grid-cols-3">
                <Field><FieldLabel htmlFor="mentor-topics">Topics (optional)</FieldLabel><Input id="mentor-topics" name="topics" autoComplete="off" value={form.topics} onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))} placeholder="DSA, résumé, cloud…" /></Field>
                <Field><FieldLabel htmlFor="mentor-format">Preferred format</FieldLabel><Input id="mentor-format" name="preferredFormat" autoComplete="off" value={form.preferredFormat} onChange={(e) => setForm((f) => ({ ...f, preferredFormat: e.target.value }))} placeholder="30-minute video call…" /></Field>
                <Field><FieldLabel htmlFor="mentor-timing">Timing</FieldLabel><Input id="mentor-timing" name="timeHint" autoComplete="off" value={form.timeHint} onChange={(e) => setForm((f) => ({ ...f, timeHint: e.target.value }))} placeholder="Weekends…" /></Field>
              </div>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => submitForm(false)}>Save draft</Button>
            <Button type="button" disabled={saving} onClick={() => submitForm(true)}><Send data-icon="inline-start" />Submit to college</Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setShowForm(false)}>Cancel</Button>
          </CardFooter>
        </Card>
      ) : null}

      {loading ? <Card><CardContent className="text-muted-foreground py-10 text-center">Loading requests…</CardContent></Card> : sorted.length === 0 ? (
        <Card><CardContent className="text-muted-foreground py-10 text-center">No requests yet. Create one when you want informal guidance from an industry mentor.</CardContent></Card>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b px-4 py-3"><CardTitle className="text-base">Your requests</CardTitle><CardDescription>{sorted.length} mentorship request{sorted.length === 1 ? '' : 's'}</CardDescription></CardHeader>
          <CardContent className="divide-y p-0">
            {sorted.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-base font-semibold">{item.title}</h2><StatusBadge tone={statusTone(item.status)} showDot>{mentorshipStatusLabel(item.status) || '—'}</StatusBadge></div>
                  <p className="text-muted-foreground mt-1 mb-0 text-sm">{item.summary}</p>
                  {item.collegeNote ? <p className="mt-2 mb-0 text-sm"><strong>College note:</strong> {item.collegeNote}</p> : null}
                  {item.status === 'approved' && item.volunteerCount > 0 ? <p className="text-primary mt-1 mb-0 text-xs font-medium">{item.volunteerCount} mentor{item.volunteerCount === 1 ? '' : 's'} volunteered</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {(item.status === 'draft' || item.status === 'rejected') ? <><Button type="button" variant="outline" size="sm" onClick={() => openEdit(item)}>Edit</Button><Button type="button" size="sm" onClick={() => submitExisting(item.id)}>Submit</Button></> : null}
                  {item.status === 'approved' ? <><Button type="button" variant="outline" size="sm" onClick={() => setDetail(item)}>View volunteers</Button><Button type="button" variant="ghost" size="sm" onClick={() => closeRequest(item.id)}>Close</Button></> : null}
                  {item.status === 'submitted' ? <Button type="button" variant="ghost" size="sm" onClick={() => closeRequest(item.id)}>Withdraw</Button> : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mentor volunteers</DialogTitle><DialogDescription>{detail?.title}</DialogDescription></DialogHeader>
          {(detail?.volunteers || []).length === 0 ? <p className="text-muted-foreground m-0 text-sm">No volunteers yet. Check back after employers respond.</p> : (
            <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto">
              {detail?.volunteers.map((v) => <Card key={v.id} size="sm"><CardHeader><CardTitle>{v.companyName}</CardTitle><CardDescription>{v.volunteeredAt ? new Date(v.volunteeredAt).toLocaleString() : ''}</CardDescription></CardHeader>{v.message ? <CardContent className="text-sm">{v.message}</CardContent> : null}</Card>)}
            </div>
          )}
          <p className="text-muted-foreground m-0 text-xs">Coordinate follow-up directly with volunteers or through your placement office.</p>
        </DialogContent>
      </Dialog>

      <p className="text-muted-foreground m-0 text-xs">
        <Link href="/dashboard/student/overview">Back to overview</Link>
        {' · '}
        Looking for formal mentorship programs? See{' '}
        <Link href="/dashboard/student/applications/mentorship">Mentorship programs</Link>.
      </p>
    </div>
  );
}
