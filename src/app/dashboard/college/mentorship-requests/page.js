'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { mentorshipStatusLabel } from '@/lib/studentMentorshipRequest';
import { Check, HandHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import AdminFilterSelect from '@/components/AdminFilterSelect';

function statusBadgeTone(status) {
  if (status === 'approved') return 'green';
  if (status === 'submitted') return 'amber';
  if (status === 'rejected') return 'red';
  return 'gray';
}

export default function CollegeMentorshipRequestsPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [review, setReview] = useState(null);
  const [collegeNote, setCollegeNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const res = await fetch(`/api/college/mentorship-requests${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReview = (item) => {
    setReview({
      id: item.id,
      title: item.title,
      summary: item.summary,
      topics: item.topics || '',
      preferredFormat: item.preferredFormat || '',
      timeHint: item.timeHint || '',
      student: item.student,
    });
    setCollegeNote('');
  };

  const patchReview = async (action) => {
    if (!review) return;
    if (action === 'reject' && !collegeNote.trim()) {
      addToast('Add a note for the student when rejecting', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/college/mentorship-requests/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          title: review.title,
          summary: review.summary,
          topics: review.topics,
          preferredFormat: review.preferredFormat,
          timeHint: review.timeHint,
          collegeNote: collegeNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      addToast(action === 'approve' ? 'Request approved' : 'Request rejected', 'success');
      setReview(null);
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => items, [items]);

  return (
    <div className="animate-fadeIn flex flex-col gap-6 pb-12">
      <div className="flex items-start gap-3">
        <span className="bg-primary/10 text-primary flex rounded-lg p-2">
          <HandHeart className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight">
            Student mentorship requests
          </h1>
          <p className="text-muted-foreground m-0 text-sm">
            Review informal mentor requests before they are visible to partnered employers.
          </p>
        </div>
      </div>

      <Card size="sm"><CardContent>
        <AdminFilterSelect
          aria-label="Filter mentorship requests by status"
          className="min-w-[200px]"
          value={statusFilter}
          onValueChange={setStatusFilter}
          items={[
            { label: 'All statuses', value: 'all' },
            { label: 'Pending review', value: 'submitted' },
            { label: 'Approved (open)', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'Closed', value: 'closed' },
            { label: 'Draft', value: 'draft' },
          ]}
        />
      </CardContent></Card>

      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="text-muted-foreground py-10 text-center">No requests in this filter.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardHeader>
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{item.title}</CardTitle>
                    <StatusBadge tone={statusBadgeTone(item.status)}>
                      {mentorshipStatusLabel(item.status) || '—'}
                    </StatusBadge>
                  </div>
                  {item.student && (
                    <CardDescription className="mt-1">
                      {item.student.name || 'Student'}
                      {item.student.rollNumber ? ` · ${item.student.rollNumber}` : ''}
                      {item.student.department ? ` · ${item.student.department}` : ''}
                    </CardDescription>
                  )}
                  <p className="mt-2 mb-0 text-sm">{item.summary}</p>
                  {item.status === 'approved' && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem' }}>
                      {item.volunteerCount || 0} volunteer{(item.volunteerCount || 0) === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
                {item.status === 'submitted' && (
                  <Button type="button" size="sm" onClick={() => openReview(item)}>
                    Review
                  </Button>
                )}
              </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(review)} onOpenChange={(open) => !open && setReview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Review request</DialogTitle>
              <DialogDescription>Edit request details before approving, or explain a rejection.</DialogDescription>
            </DialogHeader>
            {review && <>
            {review.student && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {review.student.name} {review.student.rollNumber ? `(${review.student.rollNumber})` : ''}
              </p>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="mentorship-review-title">Title (you may edit before approving)</FieldLabel>
                <Input id="mentorship-review-title"
                  value={review.title}
                  onChange={(e) => setReview((r) => ({ ...r, title: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mentorship-review-summary">Summary</FieldLabel>
                <Textarea id="mentorship-review-summary"
                  rows={4}
                  value={review.summary}
                  onChange={(e) => setReview((r) => ({ ...r, summary: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mentorship-review-topics">Topics</FieldLabel>
                <Input id="mentorship-review-topics"
                  value={review.topics}
                  onChange={(e) => setReview((r) => ({ ...r, topics: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mentorship-review-note">Note to student (required if rejecting)</FieldLabel>
                <Textarea id="mentorship-review-note"
                  rows={2}
                  value={collegeNote}
                  onChange={(e) => setCollegeNote(e.target.value)}
                  placeholder="Optional on approve; required on reject"
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                disabled={saving}
                onClick={() => patchReview('approve')}
              >
                <Check data-icon="inline-start" />
                Approve for employers
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => patchReview('reject')}
              >
                Reject
              </Button>
            </DialogFooter>
            </>}
        </DialogContent>
      </Dialog>

      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
        <Link href="/dashboard/college/overview">Back to overview</Link>
      </p>
    </div>
  );
}
