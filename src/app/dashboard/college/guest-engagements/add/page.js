'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Mic } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { FIELD_IDS, validateFieldOrError } from '@/lib/inputConstraints';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const KIND_LABEL = {
  guest_faculty: 'Guest faculty',
  guest_lecture: 'Guest lecture / session',
};

export default function CollegeGuestEngagementsAddPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    kind: 'guest_lecture',
    title: '',
    summary: '',
    requirements: '',
    timeHint: '',
    publishNow: false,
  });

  const create = async (e) => {
    e.preventDefault();
    const titleErr = validateFieldOrError(FIELD_IDS.COMMON_TITLE, form.title, { label: 'Listing title' });
    if (titleErr) {
      addToast(titleErr, 'error');
      return;
    }
    const title = form.title.trim();
    const summary = form.summary.trim();
    if (!summary) {
      addToast('Summary is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/college/engagement-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: form.kind,
          title,
          summary,
          requirements: form.requirements.trim(),
          timeHint: form.timeHint.trim(),
          status: form.publishNow ? 'published' : 'draft',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      addToast('Listing saved', 'success');
      router.push('/dashboard/college/guest-engagements');
    } catch (e2) {
      addToast(e2.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fadeIn flex max-w-3xl flex-col gap-6 pb-8">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/college/guest-engagements" />} className="w-fit">
            <ArrowLeft data-icon="inline-start" />
            Back to guest engagements
        </Button>
        <div>
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Mic className="text-muted-foreground size-7" />
            Add guest engagement
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create a listing for guest faculty or a lecture session. Published posts are visible to employer partners.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Engagement details</CardTitle>
          <CardDescription>Describe the session and the expertise your college needs.</CardDescription>
        </CardHeader>
        <CardContent>
        <form onSubmit={create}>
          <FieldGroup>
          <Field>
            <FieldLabel htmlFor="engagement-kind">Type</FieldLabel>
            <AdminFilterSelect
              id="engagement-kind"
              className="w-full"
              value={form.kind}
              onValueChange={(kind) => setForm({ ...form, kind })}
              emptyMapsToAll={false}
              items={[
                { label: KIND_LABEL.guest_lecture, value: 'guest_lecture' },
                { label: KIND_LABEL.guest_faculty, value: 'guest_faculty' },
              ]}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="engagement-title">Title</FieldLabel>
            <Input
              id="engagement-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="engagement-summary">Summary</FieldLabel>
            <Textarea
              id="engagement-summary"
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="engagement-requirements">Requirements / expertise needed</FieldLabel>
            <Textarea
              id="engagement-requirements"
              rows={3}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="engagement-timing">Preferred timing</FieldLabel>
            <Input
              id="engagement-timing"
              placeholder="e.g. March 2026, weekday mornings"
              value={form.timeHint}
              onChange={(e) => setForm({ ...form, timeHint: e.target.value })}
            />
          </Field>
          <Field orientation="horizontal">
            <Checkbox
              id="engagement-publish"
              checked={form.publishNow}
              onCheckedChange={(v) => setForm({ ...form, publishNow: !!v })}
            />
            <div>
              <FieldLabel htmlFor="engagement-publish">Publish immediately</FieldLabel>
              <FieldDescription>Make this listing visible to employer partners after saving.</FieldDescription>
            </div>
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save listing'}
            </Button>
            <Button type="button" variant="outline" render={<Link href="/dashboard/college/guest-engagements" />}>Cancel</Button>
          </div>
          </FieldGroup>
        </form>
        </CardContent>
      </Card>
    </div>
  );
}
