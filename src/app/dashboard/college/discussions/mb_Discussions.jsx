'use client';
import { useEffect, useMemo, useState } from 'react';
import { ConvBubble, ConvThread } from '@/components/messaging/ConvBubble';
import MobileHeader from '@/components/mobile/MobileHeader';
import { MessageSquare, ArrowLeft, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
      <div className="flex min-h-screen flex-col">
        <MobileHeader 
          title={activeThread.company} 
          action={
            <Button variant="ghost" size="icon-sm" onClick={() => setActiveId(null)} aria-label="Back to discussions"><ArrowLeft /></Button>
          } 
        />
        
        <div className="bg-muted/40 border-border border-b p-4">
          <h3 className="m-0 text-base font-semibold">{activeThread.topic}</h3>
          <div className="text-muted-foreground mt-1 text-xs">Last active: {activeThread.lastActivity}</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
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
        <div className="bg-background border-border fixed right-0 bottom-[60px] left-0 border-t p-3">
          <div className="flex gap-2">
            <Input
              aria-label="Reply"
              placeholder="Reply..." 
              value={reply} 
              onChange={(e) => setReply(e.target.value)} 
              onKeyDown={(e) => { if(e.key === 'Enter') addReply(); }}
            />
            <Button size="icon" onClick={addReply} aria-label="Send reply"><Send /></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <MobileHeader title="Discussions" />
      <div className="animate-fadeIn flex flex-col gap-4 px-4 pt-4 pb-20">
        
        <Input aria-label="Search discussions" placeholder="Search discussions..." value={search} onChange={(e) => setSearch(e.target.value)} />

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : visibleThreads.length === 0 ? (
          <Card className="border-dashed"><CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center"><MessageSquare className="size-8 opacity-40" /><div className="font-medium">No discussions found</div></CardContent></Card>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleThreads.map((t) => (
              <Card
                key={t.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer gap-2 px-4 py-4"
                onClick={() => setActiveId(t.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveId(t.id); }}
              >
                <div className="flex items-start justify-between">
                  <Badge>{t.company}</Badge>
                  <Badge variant="secondary">{(t.replies || []).length} msg</Badge>
                </div>
                <div className="text-sm font-semibold leading-5">
                  {t.topic}
                </div>
                <div className="text-muted-foreground text-xs">{t.lastActivity}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
