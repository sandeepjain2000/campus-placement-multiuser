'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { loadClarifications, saveAnswer } from '@/lib/demoClarifications';
import { ConvBubble, ConvThread } from '@/components/messaging/ConvBubble';
import AppPageHeader from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

function companyFromSession(email, tenantName) {
  const e = (email || '').toLowerCase();
  const t = (tenantName || '').toLowerCase();
  if (e.includes('infosys') || t.includes('infosys')) return 'Infosys';
  if (e.includes('techcorp') || t.includes('techcorp')) return 'TechCorp';
  return null;
}

const CLARIFICATIONS_PATH = '/dashboard/employer/clarifications';
const DISCUSSIONS_PATH = '/dashboard/employer/discussions';

export default function EmployerClarificationsDiscussionsClient() {
  const pathname = usePathname();
  const mode = pathname === CLARIFICATIONS_PATH ? 'clarifications' : 'discussions';

  const { data: session } = useSession();
  const [collegeThreads, setCollegeThreads] = useState([]);
  const [activeCollegeId, setActiveCollegeId] = useState(null);
  const [collegeReply, setCollegeReply] = useState('');
  const [searchCollege, setSearchCollege] = useState('');
  const [activeCampusId, setActiveCampusId] = useState(null);

  const [batchesAll, setBatchesAll] = useState([]);
  const myCompany = companyFromSession(session?.user?.email, session?.user?.tenantName);
  const batches = useMemo(() => {
    if (!myCompany) return batchesAll;
    return batchesAll.filter((b) => b.company === myCompany);
  }, [batchesAll, myCompany]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('activeCampus');
      if (!stored) {
        setActiveCampusId(null);
        return;
      }
      const parsed = JSON.parse(stored);
      setActiveCampusId(parsed?.id || null);
      if (!parsed?.id) sessionStorage.removeItem('activeCampus');
    } catch {
      sessionStorage.removeItem('activeCampus');
      setActiveCampusId(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadThreads = async () => {
      if (!activeCampusId || mode !== 'discussions') return;
      try {
        const res = await fetch(`/api/discussions?campusId=${activeCampusId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load college discussions');
        if (!mounted) return;
        const list = Array.isArray(json.threads) ? json.threads : [];
        setCollegeThreads(list);
        setActiveCollegeId(list[0]?.id || null);
      } catch {
        if (!mounted) return;
        setCollegeThreads([]);
      }
    };
    loadThreads();
    return () => {
      mounted = false;
    };
  }, [activeCampusId, mode]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const payload = await loadClarifications();
        if (!mounted) return;
        setBatchesAll(payload.batches || []);
      } catch {
        if (!mounted) return;
        setBatchesAll([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const [answerDraft, setAnswerDraft] = useState({});

  const submitAnswer = async (batchId, qId) => {
    const key = `${batchId}:${qId}`;
    const text = (answerDraft[key] || '').trim();
    if (!text) return;
    try {
      const payload = await saveAnswer(batchId, qId, text, 'Recruitment Team');
      setBatchesAll(payload.batches || []);
      setAnswerDraft((d) => ({ ...d, [key]: '' }));
    } catch {
      // keep UI unchanged on failure
    }
  };

  const visibleCollege = useMemo(() => {
    const q = searchCollege.trim().toLowerCase();
    if (!q) return collegeThreads;
    return collegeThreads.filter((t) => t.campus.toLowerCase().includes(q) || t.topic.toLowerCase().includes(q));
  }, [collegeThreads, searchCollege]);

  const activeCollege = collegeThreads.find((t) => t.id === activeCollegeId) || visibleCollege[0];

  const sendCollegeReply = () => {
    if (!collegeReply.trim() || !activeCollege) return;
    fetch(`/api/discussions?campusId=${activeCampusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: activeCollege.id, text: collegeReply.trim(), campusId: activeCampusId }),
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) return;
        const list = Array.isArray(json.threads) ? json.threads : [];
        setCollegeThreads(list);
        setCollegeReply('');
      })
      .catch(() => {});
  };

  return (
    <div className="animate-fadeIn">
      <AppPageHeader title={mode === 'clarifications' ? 'Clarifications' : 'College discussions'}>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {mode === 'clarifications' ? (
              <>
                Official Q&amp;A batches from the placement committee: questions on the <strong>left</strong>, post your company&apos;s
                answer on the <strong>right</strong>. For live threads with a campus, open{' '}
                <Link href={DISCUSSIONS_PATH} style={{ fontWeight: 600 }}>
                  Discussions
                </Link>
                .
              </>
            ) : (
              <>
                Message threads with your <strong>active campus</strong>. College on the <strong>left</strong>, your team on the{' '}
                <strong>right</strong>. For published Q&amp;A batches, open{' '}
                <Link href={CLARIFICATIONS_PATH} style={{ fontWeight: 600 }}>
                  Clarifications
                </Link>
                .
              </>
            )}
          </p>
      </AppPageHeader>

      <Tabs value={mode} className="mb-4">
        <TabsList aria-label="Employer messaging">
          <TabsTrigger value="clarifications" render={<Link href={CLARIFICATIONS_PATH} />}>
            Clarifications (candidates)
          </TabsTrigger>
          <TabsTrigger value="discussions" render={<Link href={DISCUSSIONS_PATH} />}>
            Discussions (college)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === 'clarifications' ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {myCompany && (
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              Showing clarification batches for <strong>{myCompany}</strong> based on your account context.
            </p>
          )}
          {!myCompany && (
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              Showing all companies&apos; batches. Sign in as a company account to see a filtered view.
            </p>
          )}
          {batches.map((batch) => (
            <Card key={batch.id}>
              <CardContent>
              <div style={{ textAlign: 'left', marginBottom: '0.65rem' }}>
                <StatusBadge tone="indigo">{batch.company}</StatusBadge>
                <div className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
                  {batch.postedAt}
                </div>
                <div className="text-sm text-secondary">Posted by: {batch.postedBy}</div>
              </div>
              <ConvThread>
                {batch.questions.map((q) => (
                  <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <ConvBubble side="left" label="Placement committee" meta={batch.postedBy}>
                      {q.text}
                    </ConvBubble>
                    {q.answer ? (
                      <ConvBubble side="right" label={q.answeredBy || 'Recruitment Team'} meta="Official answer">
                        {q.answer}
                      </ConvBubble>
                    ) : (
                      <div className="conv-row conv-row--end">
                        <div className="conv-bubble conv-bubble--self" style={{ minWidth: 'min(100%, 20rem)' }}>
                          <div className="conv-bubble-label" style={{ color: 'rgba(255,255,255,0.9)' }}>
                            Your reply
                          </div>
                          <div className="conv-bubble-input">
                            <Input
                              placeholder="Official answer (one response)…"
                              value={answerDraft[`${batch.id}:${q.id}`] || ''}
                              onChange={(e) => setAnswerDraft((d) => ({ ...d, [`${batch.id}:${q.id}`]: e.target.value }))}
                            />
                            <Button type="button" variant="secondary" size="sm" onClick={() => submitAnswer(batch.id, q.id)}>
                              Post
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </ConvThread>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(260px,320px)_1fr]">
          {!activeCampusId ? (
            <div style={{ gridColumn: '1 / -1' }} className="text-sm text-secondary">
              Choose an <strong>active campus</strong> under{' '}
              <Link href="/dashboard/employer/select-campus" style={{ fontWeight: 600 }}>
                Campus partnerships
              </Link>{' '}
              to load discussion threads for that college.
            </div>
          ) : (
            <>
              <div style={{ borderRight: '1px solid var(--border-default)', paddingRight: '1rem' }}>
                <Input
                  placeholder="Search campus or topic…"
                  value={searchCollege}
                  onChange={(e) => setSearchCollege(e.target.value)}
                />
                <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                  {visibleCollege.map((t) => (
                    <Button
                      key={t.id}
                      type="button"
                      variant="outline"
                      className={cn(
                        'h-auto w-full justify-between text-left',
                        activeCollegeId === t.id && 'border-primary bg-muted',
                      )}
                      data-state={activeCollegeId === t.id ? 'active' : undefined}
                      onClick={() => setActiveCollegeId(t.id)}
                    >
                      <span>
                        <StatusBadge tone="blue">{t.campus}</StatusBadge>
                        <div className="text-sm" style={{ marginTop: '0.25rem' }}>
                          {t.topic}
                        </div>
                      </span>
                      <StatusBadge tone="gray">{(t.replies || []).length}</StatusBadge>
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                {activeCollege ? (
                  <>
                    <StatusBadge tone="blue">{activeCollege.campus}</StatusBadge>
                    <h3 style={{ marginTop: '0.5rem' }}>{activeCollege.topic}</h3>
                    <div className="text-sm text-secondary">Last activity: {activeCollege.lastActivity}</div>
                    <ConvThread>
                      {(activeCollege.replies || []).map((r, idx) => (
                        <ConvBubble
                          key={`${activeCollege.id}-${idx}`}
                          side={r.role === 'company' ? 'right' : 'left'}
                          label={r.role === 'company' ? 'Your organisation' : 'College'}
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
                          <Input
                            placeholder="Reply to college…"
                            value={collegeReply}
                            onChange={(e) => setCollegeReply(e.target.value)}
                          />
                          <Button type="button" variant="secondary" size="sm" onClick={sendCollegeReply}>
                            Send
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-tertiary">No thread selected.</div>
                )}
              </div>
            </>
          )}
        </CardContent>
        </Card>
      )}
    </div>
  );
}
