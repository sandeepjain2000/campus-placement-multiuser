'use client';

import { useCallback, useEffect, useState } from 'react';
import { CLARIFICATION_RULES, loadClarifications } from '@/lib/demoClarifications';
import { ConvBubble, ConvThread } from '@/components/messaging/ConvBubble';

export default function StudentClarificationsPage() {
  const [data, setData] = useState({ batches: [] });

  const refresh = useCallback(async () => {
    try {
      const payload = await loadClarifications();
      setData(payload);
    } catch {
      setData({ batches: [] });
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>❓ Clarifications (companies)</h1>
          <p>
            Batched questions for each company, published by the <strong>TPO / Placement Committee</strong> (up to {CLARIFICATION_RULES.maxQuestions} per
            batch). Further detail happens during the in-person visit.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--primary-500)' }}>
        <p className="text-sm text-secondary" style={{ margin: 0 }}>
          <strong>Layout:</strong> committee questions appear on the <strong>left</strong>; official company answers on the <strong>right</strong> (your
          reading view).
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {data.batches.map((batch) => (
          <div key={batch.id} className="card">
            <div style={{ textAlign: 'left', marginBottom: '0.75rem' }}>
              <div className="font-semibold">{batch.company}</div>
              <div className="text-xs text-tertiary">{batch.postedAt}</div>
              <div className="text-sm text-secondary">Posted by: {batch.postedBy}</div>
              <div className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
                {batch.questions.length} question{batch.questions.length !== 1 ? 's' : ''} (max {CLARIFICATION_RULES.maxQuestions} per batch)
              </div>
            </div>

            <ConvThread>
              {batch.questions.map((q) => (
                <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <ConvBubble side="left" label="Placement committee" meta={batch.postedBy}>
                    {q.text}
                  </ConvBubble>
                  {q.answer ? (
                    <ConvBubble side="right" label={q.answeredBy || batch.company} meta="Official answer">
                      {q.answer}
                    </ConvBubble>
                  ) : (
                    <div className="conv-row conv-row--end">
                      <div className="conv-bubble conv-bubble--peer" style={{ maxWidth: '12rem', fontSize: '0.8125rem' }}>
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
  );
}
