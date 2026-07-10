'use client';

import { useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';
import { formatFeedbackRole } from '@/lib/utils';

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
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🧭 Product feedback</h1>
          <p>Your threads with the Super Admin team. Start a new item on a separate screen when you are ready.</p>
        </div>
        <Link href="/dashboard/feedback/new" className="btn btn-primary">
          New feedback
        </Link>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
        <div className="stats-card"><div className="stats-card-value">{counts.submitted}</div><div className="stats-card-label">Submitted</div></div>
        <div className="stats-card amber"><div className="stats-card-value">{counts.review}</div><div className="stats-card-label">Under review</div></div>
        <div className="stats-card green"><div className="stats-card-value">{counts.planned}</div><div className="stats-card-label">Planned</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Your feedback threads</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem 1rem 1rem' }}>
          {isLoading && <PageLoading message="Loading feedback…" inline />}
          {!isLoading && items.map((item) => (
            <div key={item.id} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div className="font-semibold">{item.title}</div>
                <span className={`badge ${item.latest_reply ? 'badge-green' : item.status === 'Planned' ? 'badge-green' : item.status === 'Under Review' ? 'badge-amber' : item.status === 'Closed' ? 'badge-gray' : 'badge-gray'}`}>
                  {item.latest_reply ? 'Responded' : item.status}
                </span>
              </div>
              <div className="text-sm text-secondary" style={{ marginTop: '0.25rem' }}>{item.description}</div>
              {item.latest_reply && (
                <div style={{ marginTop: '0.65rem', padding: '0.6rem 0.65rem', border: '1px solid var(--success-200)', borderRadius: 'var(--radius-md)', background: 'var(--success-50)' }}>
                  <div className="text-xs text-secondary" style={{ marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Super Admin reply
                  </div>
                  <div className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{item.latest_reply}</div>
                  <div className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
                    {item.latest_reply_at ? `Updated ${new Date(item.latest_reply_at).toLocaleString()}` : ''}
                  </div>
                </div>
              )}
              <div className="text-xs text-tertiary" style={{ marginTop: '0.5rem' }}>
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
            </div>
          ))}
          {!isLoading && items.length === 0 && (
            <p className="text-sm text-secondary">
              No entries yet. Use <strong>New feedback</strong> to send the first one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
