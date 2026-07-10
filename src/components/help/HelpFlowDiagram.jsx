'use client';

import { ArrowDown, ArrowRight } from 'lucide-react';

/**
 * Horizontal (desktop) / vertical (mobile) step flowchart for help docs.
 */
export default function HelpFlowDiagram({ steps = [], caption }) {
  if (!steps.length) return null;

  return (
    <figure style={{ margin: '1.25rem 0 0' }}>
      <div
        className="help-flow-diagram"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'stretch',
          gap: '0.5rem',
          padding: '1rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {steps.map((step, index) => (
          <div
            key={`${step.label}-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flex: '1 1 auto',
              minWidth: '7.5rem',
            }}
          >
            <div
              style={{
                flex: 1,
                padding: '0.65rem 0.75rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--primary-200)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{step.label}</div>
              {step.detail ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.2rem', lineHeight: 1.35 }}>
                  {step.detail}
                </div>
              ) : null}
            </div>
            {index < steps.length - 1 ? (
              <span className="help-flow-arrow-h" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} aria-hidden>
                <ArrowRight size={18} />
              </span>
            ) : null}
            {index < steps.length - 1 ? (
              <span className="help-flow-arrow-v" style={{ color: 'var(--text-tertiary)', flexShrink: 0, display: 'none' }} aria-hidden>
                <ArrowDown size={18} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {caption ? (
        <figcaption
          style={{
            marginTop: '0.65rem',
            fontSize: '0.85rem',
            color: 'var(--text-tertiary)',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          {caption}
        </figcaption>
      ) : null}
      <style>{`
        @media (max-width: 720px) {
          .help-flow-diagram { flex-direction: column; align-items: stretch; }
          .help-flow-diagram > div { flex-direction: column; align-items: stretch; min-width: 0; }
          .help-flow-arrow-h { display: none !important; }
          .help-flow-arrow-v { display: flex !important; justify-content: center; margin: 0.15rem 0; }
        }
      `}</style>
    </figure>
  );
}
