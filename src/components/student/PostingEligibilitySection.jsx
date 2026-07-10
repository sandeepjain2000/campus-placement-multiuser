'use client';

import { CheckCircle2, Circle, HelpCircle, XCircle } from 'lucide-react';
import { buildPostingEligibilityChecks } from '@/lib/buildPostingEligibilityChecks';

function StatusIcon({ met }) {
  if (met === true) return <CheckCircle2 size={18} style={{ color: 'var(--success-600)', flexShrink: 0 }} aria-hidden />;
  if (met === false) return <XCircle size={18} style={{ color: 'var(--danger-600)', flexShrink: 0 }} aria-hidden />;
  return <Circle size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} aria-hidden />;
}

/**
 * @param {{
 *   opportunity: object;
 *   student?: object | null;
 *   audience?: 'student' | 'college';
 *   openStatuses?: string[];
 *   title?: string;
 * }} props
 */
export default function PostingEligibilitySection({
  opportunity,
  student = null,
  audience,
  openStatuses,
  title = 'Eligibility',
}) {
  const resolvedAudience = audience || (student ? 'student' : 'college');
  const checks = buildPostingEligibilityChecks(opportunity, student, {
    audience: resolvedAudience,
    openStatuses,
  });

  if (!checks.length) return null;

  return (
    <section
      className="posting-eligibility-section"
      aria-labelledby="posting-eligibility-heading"
      style={{
        marginBottom: '1.25rem',
        padding: '1rem 1.1rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-secondary)',
      }}
    >
      <h3
        id="posting-eligibility-heading"
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.8rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        <HelpCircle size={15} aria-hidden />
        {title}
      </h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {checks.map((row) => (
          <li
            key={row.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              fontSize: '0.9rem',
              lineHeight: 1.45,
            }}
          >
            <StatusIcon met={row.met} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.label}</div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Required: {row.requirement}
                {row.detail ? ` · ${row.detail}` : ''}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {resolvedAudience === 'college' ? (
        <p className="text-xs text-tertiary" style={{ margin: '0.75rem 0 0', lineHeight: 1.5 }}>
          Students see whether they meet each criterion on their browse and detail screens before applying.
        </p>
      ) : null}
    </section>
  );
}
