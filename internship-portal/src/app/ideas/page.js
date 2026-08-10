'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import PageHeader from '@/components/ip/PageHeader';

export default function FeatureIdeasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/');
  }, [status, router]);

  async function load() {
    const res = await fetch('/api/ip/ideas');
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => { if (status === 'authenticated') load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/ip/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      setTitle('');
      setDescription('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(id) {
    await fetch(`/api/ip/ideas/${id}/vote`, { method: 'POST' });
    await load();
  }

  if (status !== 'authenticated') return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-svh bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Suggestions & Ideas"
          description="Vote up ideas you'd like to see built next."
          actions={
            <Button
              render={<Link href={session?.user?.role === 'employer' ? '/employer' : '/candidate'} />}
              variant="outline"
              size="sm"
            >
              Back to dashboard
            </Button>
          }
        />

        {session?.user?.role !== 'superadmin' ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Suggest an idea</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={submit}>
                <Field><FieldLabel>Title</FieldLabel><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
                <Field><FieldLabel>Description</FieldLabel><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required /></Field>
                <Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit idea'}</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          {items.map((idea) => (
            <Card key={idea.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{idea.title}</CardTitle>
                  <Badge variant="outline">{idea.status}</Badge>
                </div>
                <CardDescription>{idea.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">by {idea.author_name || 'Unknown'}</span>
                <Button size="sm" variant={idea.voted_by_me ? 'default' : 'outline'} onClick={() => vote(idea.id)}>
                  ▲ {idea.vote_count}
                </Button>
              </CardContent>
            </Card>
          ))}
          {!items.length ? <p className="text-sm text-muted-foreground">No ideas yet — be the first to suggest one.</p> : null}
        </div>
      </div>
    </div>
  );
}
