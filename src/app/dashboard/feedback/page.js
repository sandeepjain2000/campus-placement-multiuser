'use client';

import { useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';
import { formatFeedbackRole } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

const fetcher = (url) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to load feedback');
  return res.json();
});

export default function FeedbackPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.role === 'super_admin') {
      router.replace('/dashboard/admin/feedback');
    }
  }, [session?.user?.role, router]);

  const { data, error, isLoading } = useSWR('/api/feedback', fetcher);

  const items = data?.items || [];

  const counts = useMemo(() => {
    if (data?.statusCounts) {
      return {
        submitted: data.statusCounts.Submitted ?? 0,
        review: data.statusCounts['Under Review'] ?? 0,
        planned: data.statusCounts.Planned ?? 0,
      };
    }
    const list = data?.items || [];
    return {
      submitted: list.filter((i) => i.status === 'Submitted').length,
      review: list.filter((i) => i.status === 'Under Review').length,
      planned: list.filter((i) => i.status === 'Planned').length,
    };
  }, [data]);

  if (error) return <PageError error={error} />;

  return (
    <div className="animate-fadeIn mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Support</p><h1 className="text-3xl font-bold tracking-tight">Product feedback</h1><p className="mt-1 text-sm text-muted-foreground">Your threads with the Super Admin team.</p></div><Button render={<Link href="/dashboard/feedback/new" />}>New feedback</Button></header>
      <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm"><span><strong>{counts.submitted}</strong> submitted</span><span><strong>{counts.review}</strong> under review</span><span><strong>{counts.planned}</strong> planned</span></div>
      <Card>
        <CardHeader><CardTitle>Your feedback threads</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoading && <PageLoading message="Loading feedback…" inline />}
          {!isLoading && items.map((item) => (
            <article key={item.id} className="rounded-lg border p-4">
              <div className="flex justify-between gap-3">
                <h2 className="font-semibold">{item.title}</h2>
                <StatusBadge status={item.latest_reply ? 'completed' : item.status} showDot>{item.latest_reply ? 'Responded' : (item.status || '—')}</StatusBadge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              {item.latest_reply && (
                <div className="mt-3 rounded-md border bg-muted/30 p-3">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Super Admin reply
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{item.latest_reply}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.latest_reply_at ? `Updated ${new Date(item.latest_reply_at).toLocaleString()}` : ''}
                  </div>
                </div>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                {item.category}
                {(item.user_name || item.user_email) && (
                  <>
                    {' · '}
                    {item.user_name?.trim() || item.user_email}
                    {item.user_role ? ` (${formatFeedbackRole(item.user_role)})` : ''}
                  </>
                )}
                {item.organization_name ? (
                  <>
                    {' · '}
                    {item.organization_name}
                  </>
                ) : null}
              </div>
            </article>
          ))}
          {!isLoading && items.length === 0 && (
            <p className="text-sm text-secondary">
              No entries yet. Use <strong>New feedback</strong> to send the first one.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
