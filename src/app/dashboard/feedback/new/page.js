'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { useToast } from '@/components/ToastProvider';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { FIELD_IDS, validateFieldOrError } from '@/lib/inputConstraints';
import { MAX_FEEDBACK_TITLE_LENGTH } from '@/lib/validators';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const categories = ['Feature Request', 'Bug Report', 'General Feedback'];

export default function NewFeedbackPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Feature Request');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const titleErr = validateFieldOrError(FIELD_IDS.COMMON_TITLE, title, {
      label: 'Feedback title',
      maxLength: MAX_FEEDBACK_TITLE_LENGTH,
    });
    if (titleErr) {
      addToast(titleErr, 'warning');
      return;
    }
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(body.error || 'Could not submit feedback', 'warning');
        return;
      }
      addToast('Thanks — your feedback was saved.', 'info');
      await mutate((key) => typeof key === 'string' && key.startsWith('/api/feedback'));
      router.push('/dashboard/feedback');
    } catch {
      addToast('Network error. Try again.', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fadeIn mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Product feedback</p><h1 className="text-3xl font-bold tracking-tight">New feedback</h1><p className="mt-1 text-sm text-muted-foreground">Describe a feature, bug, or general note for the Super Admin team.</p></div><Link href="/dashboard/feedback" className={cn(buttonVariants({ variant: 'outline' }))}>Back to threads</Link></header>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Submit feedback</CardTitle><CardDescription>Provide enough context for the platform team to review your request.</CardDescription></CardHeader>
        <CardContent><form onSubmit={submit}><FieldGroup>
          <Field><FieldLabel>Title</FieldLabel><Input placeholder="Short summary" value={title} onChange={(e) => setTitle(e.target.value)} disabled={submitting} /></Field>
          <Field><FieldLabel>Category</FieldLabel><AdminFilterSelect className="w-full" value={category} onValueChange={setCategory} disabled={submitting} emptyMapsToAll={false} items={categories.map((c) => ({ label: c, value: c }))} /></Field>
          <Field><FieldLabel>Description</FieldLabel><Textarea placeholder="Describe your request or issue…" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} disabled={submitting} /></Field>
          <div className="flex justify-end gap-2"><Link href="/dashboard/feedback" className={cn(buttonVariants({ variant: 'outline' }))} aria-disabled={submitting}>Cancel</Link><Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit feedback'}</Button></div>
        </FieldGroup></form></CardContent>
      </Card>
    </div>
  );
}
