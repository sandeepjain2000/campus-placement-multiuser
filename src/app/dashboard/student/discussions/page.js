'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ConvBubble, ConvThread } from '@/components/messaging/ConvBubble';
import { fetchJson } from '@/lib/fetchJson';

export default function StudentDiscussionsPage() {
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const json = await fetchJson('/api/discussions', { credentials: 'same-origin' });
        if (!mounted) return;
        const list = Array.isArray(json.threads) ? json.threads : [];
        setThreads(list);
        setActiveId(list[0]?.id || null);
        setLoadError(null);
      } catch (err) {
        if (!mounted) return;
        setThreads([]);
        setLoadError(err instanceof Error ? err.message : 'Failed to load discussions');
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const visibleThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const company = (t.company || '').toLowerCase();
      const topic = (t.topic || '').toLowerCase();
      return company.includes(q) || topic.includes(q);
    });
  }, [threads, search]);

  const activeThread = threads.find((t) => t.id === activeId) || visibleThreads[0];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>💬 Discussions</h1>
          <p>
            Threads between your placement office and recruiters. For official Q&amp;A batches from the committee, use{' '}
            <Link href="/dashboard/student/clarifications" style={{ fontWeight: 600 }}>
              Clarifications
            </Link>
            .
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--danger-500)' }}>
          <p className="text-sm" style={{ margin: 0, color: 'var(--danger-600)' }}>
            {loadError}
          </p>
        </div>
      ) : null}

      <div
        className="card student-discussions-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 300px) 1fr',
          gap: '1rem',
        }}
      >
        <div style={{ borderRight: '1px solid var(--border-default)', paddingRight: '1rem', minWidth: 0 }}>
          <input
            className="form-input"
            placeholder="Search company or topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
            {visibleThreads.map((t) => (
              <button
                key={t.id}
                type="button"
                className="btn btn-ghost"
                style={{
                  justifyContent: 'space-between',
                  border: activeId === t.id ? '1px solid var(--primary-500)' : '1px solid var(--border-default)',
                  textAlign: 'left',
                }}
                onClick={() => setActiveId(t.id)}
              >
                <span>
                  <span className="badge badge-indigo">{t.company}</span>
                  <div className="text-sm" style={{ marginTop: '0.25rem' }}>
                    {t.topic}
                  </div>
                  <div className="text-xs text-tertiary">{t.lastActivity}</div>
                </span>
                <span className="badge badge-gray">{(t.replies || []).length}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {activeThread ? (
            <>
              <span className="badge badge-blue">{activeThread.company}</span>
              <h3 style={{ marginTop: '0.5rem' }}>{activeThread.topic}</h3>
              <div className="text-sm text-secondary">Last activity: {activeThread.lastActivity}</div>
              <ConvThread>
                {(activeThread.replies || []).map((r, idx) => (
                  <ConvBubble
                    key={`${activeThread.id}-${idx}`}
                    side={r.role === 'college' ? 'right' : 'left'}
                    label={r.role === 'college' ? 'Placement office' : 'Company'}
                    meta={r.by}
                  >
                    {r.text}
                  </ConvBubble>
                ))}
              </ConvThread>
              <p className="text-xs text-tertiary" style={{ marginTop: '1rem' }}>
                Replies are managed by your college and employers. You can follow the thread here; posting is not available on the student portal.
              </p>
            </>
          ) : (
            <div className="text-sm text-tertiary">No discussion threads yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
