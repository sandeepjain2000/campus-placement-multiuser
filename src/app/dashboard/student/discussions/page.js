'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ConvBubble, ConvThread } from '@/components/messaging/ConvBubble';
import { fetchJson } from '@/lib/fetchJson';
import { MessageSquareText, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';

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
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <MessageSquareText className="text-muted-foreground size-7" strokeWidth={1.5} />
            Discussions
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm">
            Threads between your placement office and recruiters. For official Q&amp;A batches from the committee, use{' '}
            <Link href="/dashboard/student/clarifications" className="text-foreground font-medium hover:underline">
              Clarifications
            </Link>
            .
          </p>
      </div>

      {loadError ? <Alert variant="destructive"><AlertTitle>Could not load discussions</AlertTitle><AlertDescription>{loadError}</AlertDescription></Alert> : null}

      <Card className="student-discussions-grid gap-0 overflow-hidden py-0 lg:grid lg:grid-cols-[minmax(240px,300px)_1fr]">
        <div className="border-b p-4 lg:border-r lg:border-b-0">
          <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            name="discussion-search"
            aria-label="Search discussions"
            className="pl-9"
            placeholder="Search company or topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {visibleThreads.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant={activeId === t.id ? 'secondary' : 'outline'}
                className="h-auto w-full justify-between px-3 py-2 text-left whitespace-normal"
                onClick={() => setActiveId(t.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{t.company}</span>
                  <span className="text-muted-foreground mt-0.5 block truncate text-xs">{t.topic}</span>
                  <span className="text-muted-foreground block text-xs">{t.lastActivity}</span>
                </span>
                <StatusBadge tone="gray">{(t.replies || []).length}</StatusBadge>
              </Button>
            ))}
            {!loadError && visibleThreads.length === 0 ? <p className="text-muted-foreground m-0 py-6 text-center text-sm">No matching threads.</p> : null}
          </div>
        </div>

        <div className="min-w-0">
          {activeThread ? (
            <>
              <CardHeader className="border-b">
                <StatusBadge tone="blue" className="w-fit">{activeThread.company}</StatusBadge>
                <CardTitle>{activeThread.topic}</CardTitle>
                <CardDescription>Last activity: {activeThread.lastActivity}</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
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
              <p className="text-muted-foreground mt-4 mb-0 text-xs">
                Replies are managed by your college and employers. You can follow the thread here; posting is not available on the student portal.
              </p>
              </CardContent>
            </>
          ) : (
            <CardContent className="text-muted-foreground py-16 text-center">No discussion threads yet.</CardContent>
          )}
        </div>
      </Card>
    </div>
  );
}
