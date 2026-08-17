'use client';

import { ShieldAlert, Send, Loader2 } from 'lucide-react';
import { resolveApplyBlockReason } from '@/lib/getApplyBlockReason';
import { programOpportunityFromRow } from '@/lib/studentApplyContext';
import { Button } from '@/components/ui/button';

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
    <div className="inline-flex items-center gap-1">
      {blockReason ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          title={blockReason}
          aria-label="Why am I not eligible?"
          onClick={() => onShowEligibility?.(row)}
        >
          <ShieldAlert />
        </Button>
      ) : null}
      <Button
        type="button"
        size="icon-sm"
        disabled={Boolean(blockReason) || applying}
        aria-disabled={blockReason || applying ? 'true' : undefined}
        title={blockReason || 'Apply'}
        aria-label={blockReason ? `Apply — ${blockReason}` : 'Apply'}
        onClick={() => {
          if (blockReason || applying) return;
          onApply(row.id, row.title);
        }}
      >
        {applying ? <Loader2 className="animate-spin" /> : <Send />}
      </Button>
    </div>
  );
}
