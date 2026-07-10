'use client';

import { useId, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import PostingEligibilitySection from '@/components/student/PostingEligibilitySection';
import { resolveApplyBlockReason } from '@/lib/getApplyBlockReason';

/**
 * Apply button with upfront disable, helper text, tooltip, and eligibility explainer.
 *
 * @param {{
 *   opportunity: object;
 *   student: object;
 *   applyLabel: string;
 *   onApply: () => void;
 *   applying?: boolean;
 *   blockReason?: string | null;
 *   globalBlockedReason?: string | null;
 *   openStatuses?: string[];
 *   internshipLocked?: boolean;
 *   size?: 'sm' | 'md';
 * }} props
 */
export default function StudentApplyEligibilityControls({
  opportunity,
  student,
  applyLabel,
  onApply,
  applying = false,
  blockReason: blockReasonProp = null,
  globalBlockedReason = null,
  openStatuses,
  internshipLocked = false,
  size = 'md',
}) {
  const [showWhy, setShowWhy] = useState(false);
  const helperId = useId();
  const blockReason =
    blockReasonProp ||
    resolveApplyBlockReason(opportunity, student, {
      globalBlockedReason,
      openStatuses,
      internshipLocked,
    });
  const blocked = Boolean(blockReason);
  const btnClass = size === 'sm' ? 'btn btn-primary btn-sm' : 'btn btn-primary';

  return (
    <div className="student-apply-eligibility-controls" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
        {blocked ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-expanded={showWhy}
            aria-controls={showWhy ? `${helperId}-panel` : undefined}
            onClick={() => setShowWhy((v) => !v)}
            title="Why am I not eligible?"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ShieldAlert size={16} aria-hidden />
            Why not eligible?
          </button>
        ) : null}
        <button
          type="button"
          className={btnClass}
          disabled={blocked || applying}
          aria-disabled={blocked || applying ? 'true' : undefined}
          title={blocked ? blockReason : undefined}
          aria-describedby={blocked ? helperId : undefined}
          onClick={() => {
            if (blocked || applying) return;
            onApply();
          }}
        >
          {applying ? 'Applying…' : applyLabel}
        </button>
      </div>

      {blocked ? (
        <p
          id={helperId}
          role="status"
          className="text-sm"
          style={{ margin: 0, color: 'var(--warning-700, #b45309)', lineHeight: 1.5, textAlign: 'right' }}
        >
          {blockReason}
        </p>
      ) : null}

      {blocked && showWhy ? (
        <div id={`${helperId}-panel`} style={{ marginTop: '0.25rem' }}>
          <PostingEligibilitySection
            opportunity={opportunity}
            student={student}
            audience="student"
            openStatuses={openStatuses}
            title="Your eligibility"
          />
        </div>
      ) : null}
    </div>
  );
}
