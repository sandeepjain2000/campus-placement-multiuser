'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { CLARIFICATION_RULES, loadClarifications, publishClarificationBatch } from '@/lib/demoClarifications';
import { ConvBubble, ConvThread } from '@/components/messaging/ConvBubble';

const COMPANIES = ['TCS', 'Infosys', 'TechCorp', 'GlobalSoft', 'Microsoft'];

export default function CollegeClarificationsPage() {
  const { addToast } = useToast();
  const [company, setCompany] = useState('TCS');
  const [postedBy, setPostedBy] = useState('IIT Madras — Placement Committee');
  const [lines, setLines] = useState('');

  const [batches, setBatches] = useState([]);

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
    try {
      const data = await publishClarificationBatch({ company, postedBy, questionTexts });
      setBatches(data.batches || []);
      setLines('');
      addToast(`Published ${Math.min(questionTexts.length, CLARIFICATION_RULES.maxQuestions)} question(s) for ${company}.`, 'success');
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
              <select className="form-select" value={company} onChange={(e) => setCompany(e.target.value)}>
                {COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Posted as</label>
              <input className="form-input" value={postedBy} onChange={(e) => setPostedBy(e.target.value)} placeholder="e.g. IIT Madras — Placement Committee" />
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
