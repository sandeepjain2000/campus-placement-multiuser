'use client';

import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';

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
      style={{
        display: 'inline-flex',
        gap: '0.25rem',
        alignItems: 'center',
        justifyContent: align === 'start' ? 'flex-start' : 'flex-end',
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap',
      }}
    >
      {(isPending || isRejected) ? (
        <StandardTableIconAction
          action="approve"
          variant="primary"
          showLabel={false}
          disabled={busy}
          onClick={() => onApprove(row.id)}
          tooltip={busy ? 'Approving…' : 'Approve for campus'}
        />
      ) : null}
      {isPending ? (
        <StandardTableIconAction
          action="reject"
          variant="danger"
          showLabel={false}
          disabled={busy}
          onClick={() => onReject(row.id)}
        />
      ) : null}
      {showView ? (
        <StandardTableIconAction action="view" showLabel={false} onClick={() => onView(row)} />
      ) : null}
    </div>
  );
}
