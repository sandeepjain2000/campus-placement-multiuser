'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { loadClarifications, saveAnswer } from '@/lib/demoClarifications';
import { ConvBubble, ConvThread } from '@/components/messaging/ConvBubble';

function companyFromSession(email, tenantName) {
  const e = (email || '').toLowerCase();
  const t = (tenantName || '').toLowerCase();
  if (e.includes('infosys') || t.includes('infosys')) return 'Infosys';
  if (e.includes('techcorp') || t.includes('techcorp')) return 'TechCorp';
  return null;
}

export default function EmployerDiscussionsPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState('clarifications');
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
    const stored = sessionStorage.getItem('activeCampus');
    if (stored) setActiveCampusId(JSON.parse(stored)?.id || null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadThreads = async () => {
      if (!activeCampusId) return;
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
  }, [activeCampusId]);

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
      <div className="page-header">
        <div className="page-header-left">
          <h1>💬 Clarifications &amp; college discussions</h1>
          <p>
            <strong>Clarifications</strong>: committee on the <strong>left</strong>, your official replies on the <strong>right</strong>.{' '}
            <strong>Discussions</strong>: college messages on the <strong>left</strong>, your team on the <strong>right</strong>.
          </p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button type="button" className={`tab ${tab === 'clarifications' ? 'active' : ''}`} onClick={() => setTab('clarifications')}>
          Clarifications (candidates)
        </button>
        <button type="button" className={`tab ${tab === 'college' ? 'active' : ''}`} onClick={() => setTab('college')}>
          Discussions (college)
        </button>
      </div>

      {tab === 'clarifications' ? (
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
            <div key={batch.id} className="card">
              <div style={{ textAlign: 'left', marginBottom: '0.65rem' }}>
                <span className="badge badge-indigo">{batch.company}</span>
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
                            <input
                              className="form-input"
                              placeholder="Official answer (one response)…"
                              value={answerDraft[`${batch.id}:${q.id}`] || ''}
                              onChange={(e) => setAnswerDraft((d) => ({ ...d, [`${batch.id}:${q.id}`]: e.target.value }))}
                            />
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => submitAnswer(batch.id, q.id)}>
                              Post
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </ConvThread>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '1rem' }}>
          <div style={{ borderRight: '1px solid var(--border-default)', paddingRight: '1rem' }}>
            <input className="form-input" placeholder="Search campus or topic…" value={searchCollege} onChange={(e) => setSearchCollege(e.target.value)} />
            <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
              {visibleCollege.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    justifyContent: 'space-between',
                    border: activeCollegeId === t.id ? '1px solid var(--primary-500)' : '1px solid var(--border-default)',
                    textAlign: 'left',
                  }}
                  onClick={() => setActiveCollegeId(t.id)}
                >
                  <span>
                    <span className="badge badge-blue">{t.campus}</span>
                    <div className="text-sm" style={{ marginTop: '0.25rem' }}>
                      {t.topic}
                    </div>
                  </span>
                  <span className="badge badge-gray">{(t.replies || []).length}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            {activeCollege ? (
              <>
                <span className="badge badge-blue">{activeCollege.campus}</span>
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
                      <input
                        className="form-input"
                        placeholder="Reply to college…"
                        value={collegeReply}
                        onChange={(e) => setCollegeReply(e.target.value)}
                      />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={sendCollegeReply}>
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
      )}
    </div>
  );
}
