'use client';

import { ShieldAlert, Send, Loader2 } from 'lucide-react';
import { resolveApplyBlockReason } from '@/lib/getApplyBlockReason';
import { programOpportunityFromRow } from '@/lib/studentApplyContext';

/**
 * Compact apply control for table rows (disabled upfront + eligibility hint).
 */
export default function StudentOpportunityApplyButton({
  row,
  currentStudent,
  applyOptions = {},
  globalBlockedReason = null,
  applyingId,
  onApply,
  onShowEligibility,
}) {
  const opportunity = programOpportunityFromRow(row);
  const blockReason = resolveApplyBlockReason(opportunity, currentStudent, {
    ...applyOptions,
    globalBlockedReason,
  });
  const applying = applyingId === row.id;

  return (
    <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
      {blockReason ? (
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          title={blockReason}
          aria-label="Why am I not eligible?"
          onClick={() => onShowEligibility?.(row)}
        >
          <ShieldAlert size={15} aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-primary btn-icon btn-sm"
        disabled={Boolean(blockReason) || applying}
        aria-disabled={blockReason || applying ? 'true' : undefined}
        title={blockReason || 'Apply'}
        aria-label={blockReason ? `Apply — ${blockReason}` : 'Apply'}
        onClick={() => {
          if (blockReason || applying) return;
          onApply(row.id, row.title);
        }}
      >
        {applying ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Send size={15} aria-hidden />}
      </button>
    </div>
  );
}
