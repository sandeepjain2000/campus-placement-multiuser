'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { useToast } from '@/components/ToastProvider';
import { CLARIFICATION_RULES, loadClarifications, publishClarificationBatch } from '@/lib/demoClarifications';
import { ConvBubble, ConvThread } from '@/components/messaging/ConvBubble';

const OTHER_VALUE = '__other__';

const employersFetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load employers');
  if (Array.isArray(data?.employers)) return data.employers;
  return Array.isArray(data) ? data : [];
};

export default function CollegeClarificationsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const { data: employerRows = [], isLoading: employersLoading } = useSWR(
    '/api/college/employers',
    employersFetcher,
  );

  const approvedCompanies = useMemo(() => {
    return employerRows
      .filter((r) => String(r.status).toLowerCase() === 'approved' && r.name)
      .map((r) => String(r.name).trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [employerRows]);

  const [companyMode, setCompanyMode] = useState('list');
  const [companyFromList, setCompanyFromList] = useState('');
  const [companyCustom, setCompanyCustom] = useState('');
  const [postedBy, setPostedBy] = useState('');
  const [postedByTouched, setPostedByTouched] = useState(false);
  const [lines, setLines] = useState('');
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    const name = session?.user?.tenantName?.trim();
    if (!name || postedByTouched) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setPostedBy(`${name} — Placement Committee`);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.tenantName, postedByTouched]);

  useEffect(() => {
    if (employersLoading) return;
    const t = window.setTimeout(() => {
      if (approvedCompanies.length && !companyFromList) {
        setCompanyFromList(approvedCompanies[0]);
        setCompanyMode('list');
      } else if (!approvedCompanies.length) {
        setCompanyMode('other');
        setCompanyFromList('');
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [employersLoading, approvedCompanies, companyFromList]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await loadClarifications();
        if (!mounted) return;
        setBatches(data.batches || []);
      } catch (e) {
        if (!mounted) return;
        addToast(e.message || 'Failed to load clarifications', 'error');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [addToast]);

  const effectiveCompany = useMemo(() => {
    if (companyMode === 'other' || companyFromList === OTHER_VALUE) {
      return companyCustom.trim();
    }
    return companyFromList.trim();
  }, [companyMode, companyFromList, companyCustom]);

  const publish = async (e) => {
    e.preventDefault();
    const questionTexts = lines
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!questionTexts.length) {
      addToast('Add at least one question (one per line).', 'warning');
      return;
    }
    if (questionTexts.length > CLARIFICATION_RULES.maxQuestions) {
      addToast(`Maximum ${CLARIFICATION_RULES.maxQuestions} questions per batch. Extra lines were ignored.`, 'warning');
    }
    if (!postedBy.trim()) {
      addToast('Set “Posted as” (e.g. Your College — Placement Committee).', 'warning');
      return;
    }
    if (!effectiveCompany) {
      addToast('Choose an approved employer or enter a company name.', 'warning');
      return;
    }
    try {
      const data = await publishClarificationBatch({
        company: effectiveCompany,
        postedBy,
        questionTexts,
      });
      setBatches(data.batches || []);
      setLines('');
      addToast(
        `Published ${Math.min(questionTexts.length, CLARIFICATION_RULES.maxQuestions)} question(s) for ${effectiveCompany}.`,
        'success',
      );
    } catch (err) {
      addToast(err.message || 'Failed to publish batch', 'error');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>❓ Clarifications for companies</h1>
          <p>
            Publish a <strong>single batch</strong> of up to {CLARIFICATION_RULES.maxQuestions} questions on behalf of students for one company. Companies
            respond once per question — this is <strong>not</strong> an ongoing discussion board.
          </p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Publish question batch</h3>
          </div>
          <form onSubmit={publish} style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <label className="form-label">Company</label>
              <p className="text-xs text-secondary" style={{ margin: '0 0 0.35rem' }}>
                Prefer an employer with an <strong>approved</strong> tie-up to your campus, or enter any company name below.
              </p>
              {approvedCompanies.length > 0 ? (
                <select
                  className="form-select"
                  value={companyMode === 'other' ? OTHER_VALUE : companyFromList}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === OTHER_VALUE) {
                      setCompanyMode('other');
                      setCompanyFromList(OTHER_VALUE);
                    } else {
                      setCompanyMode('list');
                      setCompanyFromList(v);
                      setCompanyCustom('');
                    }
                  }}
                >
                  {approvedCompanies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value={OTHER_VALUE}>Other company (type below)…</option>
                </select>
              ) : (
                <p className="text-sm text-secondary">
                  No approved employer tie-ups yet. Use the field below to type the company name (e.g. after you approve them under Employers).
                </p>
              )}
              {(companyMode === 'other' || companyFromList === OTHER_VALUE || !approvedCompanies.length) && (
                <input
                  className="form-input"
                  style={{ marginTop: '0.5rem' }}
                  placeholder="Company name (e.g. Accenture, Deloitte)"
                  value={companyCustom}
                  onChange={(e) => setCompanyCustom(e.target.value)}
                />
              )}
            </div>
            <div>
              <label className="form-label">Posted as</label>
              <input
                className="form-input"
                value={postedBy}
                onChange={(e) => {
                  setPostedByTouched(true);
                  setPostedBy(e.target.value);
                }}
                placeholder="Fills from your college name when signed in — edit if needed"
              />
            </div>
            <div>
              <label className="form-label">Questions (one per line, max {CLARIFICATION_RULES.maxQuestions})</label>
              <textarea className="form-textarea" rows={8} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'Joining timeline?\nBond / service agreement?\n…'} />
            </div>
            <button className="btn btn-primary" type="submit">
              Publish batch to students &amp; company
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent batches (preview)</h3>
            <p className="text-xs text-secondary" style={{ margin: '0.25rem 0 0', fontWeight: 400 }}>
              Your published questions on the <strong>right</strong>; company answers on the <strong>left</strong>.
            </p>
          </div>
          <div style={{ display: 'grid', gap: '1rem', maxHeight: '560px', overflowY: 'auto' }}>
            {batches.map((b) => (
              <div key={b.id} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <div style={{ textAlign: 'left', marginBottom: '0.5rem' }}>
                  <div className="font-semibold text-sm">{b.company}</div>
                  <div className="text-xs text-tertiary">{b.postedAt}</div>
                  <div className="text-xs text-secondary">
                    {b.questions.filter((q) => q.answer).length}/{b.questions.length} answered
                  </div>
                </div>
                <ConvThread>
                  {b.questions.map((q) => (
                    <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <ConvBubble side="right" label="Your batch" meta={b.postedBy}>
                        {q.text}
                      </ConvBubble>
                      {q.answer ? (
                        <ConvBubble side="left" label={b.company} meta={q.answeredBy || 'Company'}>
                          {q.answer}
                        </ConvBubble>
                      ) : (
                        <div className="conv-row conv-row--start">
                          <div className="conv-bubble conv-bubble--peer" style={{ fontSize: '0.8125rem' }}>
                            Awaiting company response.
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </ConvThread>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
