'use client';
import { useEffect, useMemo, useState } from 'react';
import { ConvBubble, ConvThread } from '@/components/messaging/ConvBubble';
import MobileHeader from '@/components/mobile/MobileHeader';
import { MessageSquare, ArrowLeft, Send } from 'lucide-react';

export default function mb_Discussions() {
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
      } catch {
        if (!mounted) return;
        setThreads([]);
      } finally {
        if (mounted) setIsLoading(false);
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

  const activeThread = threads.find((t) => t.id === activeId);

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

  if (activeThread) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <MobileHeader 
          title={activeThread.company} 
          action={
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveId(null)} style={{ padding: '0.4rem', color: 'var(--text-secondary)' }}>
              <ArrowLeft size={18} />
            </button>
          } 
        />
        
        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{activeThread.topic}</h3>
          <div className="text-xs text-secondary">Last active: {activeThread.lastActivity}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1rem 5rem 1rem' }}>
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
        </div>

        {/* Input area fixed at bottom */}
        <div style={{ position: 'fixed', bottom: '60px', left: 0, right: 0, background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-default)', padding: '0.75rem 1rem', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              className="form-input" 
              placeholder="Reply..." 
              value={reply} 
              onChange={(e) => setReply(e.target.value)} 
              style={{ flex: 1, borderRadius: '999px', background: 'var(--surface-2)' }} 
              onKeyDown={(e) => { if(e.key === 'Enter') addReply(); }}
            />
            <button className="btn btn-primary" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={addReply}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <MobileHeader title="Discussions" />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <input className="form-input" placeholder="Search discussions..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', borderRadius: '999px', paddingLeft: '1rem' }} />
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: '12px' }} />)}
          </div>
        ) : visibleThreads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
            <MessageSquare size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No discussions found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {visibleThreads.map((t) => (
              <button
                key={t.id}
                type="button"
                className="card"
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '1px solid var(--border-default)',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  background: 'var(--surface)'
                }}
                onClick={() => setActiveId(t.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>{t.company}</span>
                  <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{(t.replies || []).length} msg</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {t.topic}
                </div>
                <div className="text-xs text-tertiary">{t.lastActivity}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
