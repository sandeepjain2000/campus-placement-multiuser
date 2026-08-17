'use client';
import { useEffect, useMemo, useState } from 'react';
import { ConvBubble, ConvThread } from '@/components/messaging/ConvBubble';
import { MessageSquare, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
    <div className="animate-fadeIn flex flex-col gap-5 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <MessageSquare className="text-muted-foreground size-7" strokeWidth={1.5} /> Discussions
        </h1>
        <p className="text-muted-foreground m-0 text-sm">
          Company messages on the <strong>left</strong>; your placement office replies on the <strong>right</strong>.
        </p>
      </div>

      <Card className="grid min-h-[34rem] grid-cols-[minmax(260px,320px)_1fr] gap-0 overflow-hidden py-0">
        <div className="border-border flex flex-col gap-3 border-r p-4">
          <Input aria-label="Search discussions" placeholder="Search company or topic…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-col gap-2">
            {visibleThreads.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant={activeId === t.id ? 'secondary' : 'ghost'}
                className="h-auto justify-between whitespace-normal px-3 py-2 text-left"
                onClick={() => setActiveId(t.id)}
              >
                <span className="min-w-0">
                  <Badge>{t.company}</Badge>
                  <span className="mt-1 block text-sm font-medium">{t.topic}</span>
                  <span className="text-muted-foreground block text-xs">{t.lastActivity}</span>
                </span>
                <Badge variant="secondary">{(t.replies || []).length}</Badge>
              </Button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeThread ? (
            <>
              <Badge variant="secondary">{activeThread.company}</Badge>
              <CardTitle className="mt-2">{activeThread.topic}</CardTitle>
              <CardDescription>Last activity: {activeThread.lastActivity}</CardDescription>
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
              <div className="border-border mt-4 flex gap-2 border-t pt-4">
                    <Input aria-label="Reply to company" placeholder="Reply to company…" value={reply} onChange={(e) => setReply(e.target.value)} />
                    <Button size="sm" type="button" onClick={addReply}>
                      <Send data-icon="inline-start" />
                      Send
                    </Button>
              </div>
            </>
          ) : (
            <CardContent className="text-muted-foreground flex h-full items-center justify-center text-sm">No thread selected.</CardContent>
          )}
        </div>
      </Card>
    </div>
  );
}
