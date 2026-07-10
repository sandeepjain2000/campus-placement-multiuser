'use client';
import { useEffect, useMemo, useState } from 'react';
import { ConvBubble, ConvThread } from '@/components/messaging/ConvBubble';

export default function CollegeDiscussionsPage() {
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/discussions');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load discussions');
        if (!mounted) return;
        const list = Array.isArray(json.threads) ? json.threads : [];
        setThreads(list);
        setActiveId(list[0]?.id || null);
      } catch {
        if (!mounted) return;
        setThreads([]);
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
    return threads.filter((t) => t.company.toLowerCase().includes(q) || t.topic.toLowerCase().includes(q));
  }, [threads, search]);

  const activeThread = threads.find((t) => t.id === activeId) || visibleThreads[0];

  const addReply = async () => {
    if (!reply.trim() || !activeThread) return;
    try {
      const res = await fetch('/api/discussions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeThread.id, text: reply.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to send reply');
      const list = Array.isArray(json.threads) ? json.threads : [];
      setThreads(list);
      setReply('');
    } catch {
      // keep current UI state if save fails
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>💬 Discussions with companies</h1>
          <p>
            Company messages on the <strong>left</strong>; your placement office replies on the <strong>right</strong>.
          </p>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '1rem' }}>
        <div style={{ borderRight: '1px solid var(--border-default)', paddingRight: '1rem' }}>
          <input className="form-input" placeholder="Search company or topic…" value={search} onChange={(e) => setSearch(e.target.value)} />
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

        <div>
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
                    label={r.role === 'college' ? 'Your office' : 'Company'}
                    meta={r.by}
                  >
                    {r.text}
                  </ConvBubble>
                ))}
              </ConvThread>
              <div style={{ marginTop: '1rem' }} className="conv-row conv-row--end">
                <div className="conv-bubble conv-bubble--self" style={{ minWidth: 'min(100%, 22rem)' }}>
                  <div className="conv-bubble-label" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    Your reply
                  </div>
                  <div className="conv-bubble-input">
                    <input className="form-input" placeholder="Reply to company…" value={reply} onChange={(e) => setReply(e.target.value)} />
                    <button className="btn btn-secondary btn-sm" type="button" onClick={addReply}>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-tertiary">No thread selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}
