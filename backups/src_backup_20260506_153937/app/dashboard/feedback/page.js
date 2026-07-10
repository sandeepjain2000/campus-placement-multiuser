'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/ToastProvider';
import PageError from '@/components/PageError';

const fetcher = (url) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to load feedback');
  return res.json();
});

const categories = ['Feature Request', 'Bug Report', 'General Feedback'];

export default function FeedbackPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/feedback', fetcher);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Feature Request');
  const [submitting, setSubmitting] = useState(false);

  const items = data?.items || [];

  const counts = useMemo(() => ({
    submitted: items.filter((i) => i.status === 'Submitted').length,
    review: items.filter((i) => i.status === 'Under Review').length,
    planned: items.filter((i) => i.status === 'Planned').length,
  }), [items]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
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
      setTitle('');
      setDescription('');
      setCategory('Feature Request');
      mutate();
      addToast('Thanks — your feedback was saved.', 'info');
    } catch {
      addToast('Network error. Try again.', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <PageError error={error} />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🧭 Product feedback</h1>
          <p>Submit requests and bugs. Entries are stored in the database for the Super Admin team.</p>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
        <div className="stats-card"><div className="stats-card-value">{counts.submitted}</div><div className="stats-card-label">Submitted</div></div>
        <div className="stats-card amber"><div className="stats-card-value">{counts.review}</div><div className="stats-card-label">Under review</div></div>
        <div className="stats-card green"><div className="stats-card-value">{counts.planned}</div><div className="stats-card-label">Planned</div></div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Submit feedback</h3></div>
          <form onSubmit={submit} style={{ display: 'grid', gap: '0.75rem' }}>
            <input className="form-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={submitting} />
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={submitting}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea className="form-input" placeholder="Describe your request or issue…" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} disabled={submitting} />
            <button className="btn btn-primary" type="submit" disabled={submitting || isLoading}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Public board</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isLoading && <p className="text-sm text-secondary">Loading…</p>}
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
                      {item.user_role ? ` (${item.user_role})` : ''}
                    </>
                  )}
                </div>
              </div>
            ))}
            {!isLoading && items.length === 0 && (
              <p className="text-sm text-secondary">No entries yet. Be the first to submit — or ensure the database migration has been applied.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
