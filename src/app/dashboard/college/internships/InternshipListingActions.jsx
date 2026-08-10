'use client';

import { Check, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function InternshipListingActions({
  row,
  busy,
  onApprove,
  onReject,
  onView,
  align = 'end',
  showView = true,
}) {
  const status = String(row.college_status || 'pending').toLowerCase();
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';

  return (
    <div
      className={cn(
        'inline-flex flex-nowrap items-center gap-1 whitespace-nowrap',
        align === 'start' ? 'justify-start' : 'justify-end'
      )}
    >
      {isPending || isRejected ? (
        <Button
          type="button"
          size="icon-sm"
          variant="default"
          disabled={busy}
          title={busy ? 'Approving…' : 'Approve for campus'}
          aria-label={busy ? 'Approving…' : 'Approve for campus'}
          onClick={() => onApprove(row.id)}
        >
          <Check />
        </Button>
      ) : null}
      {isPending ? (
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          disabled={busy}
          title="Reject"
          aria-label="Reject"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() => onReject(row.id)}
        >
          <X />
        </Button>
      ) : null}
      {showView ? (
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          title="View details"
          aria-label="View details"
          onClick={() => onView(row)}
        >
          <Eye />
        </Button>
      ) : null}
    </div>
  );
}
