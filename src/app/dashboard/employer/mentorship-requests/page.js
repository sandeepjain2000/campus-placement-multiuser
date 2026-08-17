'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { HandHeart, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

export default function EmployerMentorshipRequestsPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [volunteerItem, setVolunteerItem] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employer/mentorship-requests');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitVolunteer = async () => {
    if (!volunteerItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/employer/mentorship-requests/${volunteerItem.id}/volunteer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      addToast('Volunteer offer sent', 'success');
      setVolunteerItem(null);
      setMessage('');
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-5 pb-8">
      <div className="flex items-start gap-3">
        <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg border">
          <HandHeart aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Student Mentorship Requests</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Informal mentor opportunities at campuses you partner with. Volunteering is not a hiring
            commitment.
          </p>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="text-muted-foreground py-12 text-center">Loading requests…</CardContent></Card>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground m-0">
            No open requests at your partnered campuses right now.
          </p>
          <Button variant="outline" render={<Link href="/dashboard/employer/select-campus" />}>
            Manage Campus Partnerships
          </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  {item.student && (
                    <CardDescription className="mt-1">
                      {item.student.department || 'Student'}
                      {item.student.batchYear ? ` · Batch ${item.student.batchYear}` : ''}
                    </CardDescription>
                  )}
                </div>
                {item.hasVolunteered ? <Badge variant="secondary">You Volunteered</Badge> : (
                  <Button size="sm" onClick={() => { setVolunteerItem(item); setMessage(''); }}>
                    Volunteer
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm leading-6">{item.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {item.topics ? <Badge variant="outline">Topics: {item.topics}</Badge> : null}
                  {item.preferredFormat ? <Badge variant="outline">Format: {item.preferredFormat}</Badge> : null}
                  {item.timeHint ? <Badge variant="outline">Timing: {item.timeHint}</Badge> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(volunteerItem)} onOpenChange={(open) => { if (!open) setVolunteerItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Volunteer as Mentor</DialogTitle>
            <DialogDescription>{volunteerItem?.title}</DialogDescription>
          </DialogHeader>
          <Field>
              <FieldLabel htmlFor="mentor-message">Short message (optional)</FieldLabel>
              <Textarea
                id="mentor-message"
                name="mentor-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share how you can help and your availability…"
              />
              <FieldDescription>Include relevant experience or preferred times.</FieldDescription>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVolunteerItem(null)}>Cancel</Button>
            <Button disabled={saving} onClick={submitVolunteer}>
              <Send data-icon="inline-start" aria-hidden />
              Send volunteer offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="text-muted-foreground flex flex-wrap gap-3 text-sm">
        <Link href="/dashboard/employer/campus-guest-needs">Campus guest needs</Link>
        <Link href="/dashboard/employer/overview">Overview</Link>
      </div>
    </div>
  );
}
