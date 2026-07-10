'use client';

import { useState } from 'react';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/ToastProvider';
import { formatDate } from '@/lib/utils';
import { isOfferDeadlinePassed } from '@/lib/offerDeadline';
import { isPendingOfferStatus, normalizeOfferStatus } from '@/lib/offerStatusNormalize';

/**
 * Accept / decline controls for a single pending student offer.
 * @param {{
 *   offer: { id: string, company?: string, role?: string, deadline?: string, status?: string },
 *   onUpdated?: () => void | Promise<void>,
 *   compact?: boolean,
 *   showMyOffersLink?: boolean,
 * }} props
 */
export default function StudentOfferRespondActions({
  offer,
  onUpdated,
  compact = false,
  showMyOffersLink = false,
}) {
  const { addToast } = useToast();
  const [responding, setResponding] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  if (!offer?.id) {
    if (showMyOffersLink) {
      return (
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          No pending offer is waiting for your response. If you received an offer letter, check{' '}
          <Link href="/dashboard/student/offers" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
            My Offers
          </Link>{' '}
          or ask your placement office to mark it as <strong>pending</strong>.
        </p>
      );
    }
    return null;
  }

  const status = normalizeOfferStatus(offer.status);
  const expired = status === 'expired' || (isPendingOfferStatus(status) && isOfferDeadlinePassed(offer.deadline));
  const effectiveStatus = expired && isPendingOfferStatus(status) ? 'expired' : status;
  const canRespond = effectiveStatus === 'pending';
  const offerId = String(offer.id);

  const respond = async (action) => {
    setResponding(true);
    try {
      const res = await fetch('/api/student/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offerId, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to update offer');
      await onUpdated?.();
      addToast(action === 'accept' ? 'Offer accepted.' : 'Offer declined.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to update offer', 'error');
    } finally {
      setResponding(false);
      setConfirmAction(null);
    }
  };

  if (!canRespond) {
    if (effectiveStatus === 'accepted') {
      return (
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--success-700)' }}>
          You accepted this offer.
        </p>
      );
    }
    if (effectiveStatus === 'rejected') {
      return (
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          You declined this offer.
        </p>
      );
    }
    if (effectiveStatus === 'expired') {
      return (
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
          This offer expired{offer.deadline ? ` on ${formatDate(offer.deadline)}` : ''}.
        </p>
      );
    }
    return null;
  }

  const deadlineHint =
    offer.deadline && !isOfferDeadlinePassed(offer.deadline)
      ? `Respond by ${formatDate(offer.deadline)}`
      : null;

  return (
    <>
      {!compact && deadlineHint ? (
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{deadlineHint}</p>
      ) : null}
      <div className={compact ? '' : 'offer-actions'} style={compact ? { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } : undefined}>
        <button
          type="button"
          className="btn btn-success"
          style={compact ? undefined : { flex: 1 }}
          disabled={responding}
          onClick={() =>
            setConfirmAction({
              action: 'accept',
              company: offer.company,
              role: offer.role,
            })
          }
        >
          {responding ? 'Saving…' : 'Accept offer'}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          style={compact ? undefined : { flex: 1 }}
          disabled={responding}
          onClick={() =>
            setConfirmAction({
              action: 'decline',
              company: offer.company,
              role: offer.role,
            })
          }
        >
          {responding ? 'Saving…' : 'Decline offer'}
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.action === 'accept' ? 'Accept this offer?' : 'Decline this offer?'}
        message={
          confirmAction
            ? `${confirmAction.action === 'accept' ? 'Accept' : 'Decline'} ${confirmAction.role || 'this role'} at ${confirmAction.company || 'the company'}? Your college and employer will see this decision.`
            : ''
        }
        confirmLabel={confirmAction?.action === 'accept' ? 'Accept offer' : 'Decline offer'}
        confirmTone={confirmAction?.action === 'accept' ? 'success' : 'danger'}
        loading={responding}
        onCancel={() => {
          if (responding) return;
          setConfirmAction(null);
        }}
        onConfirm={() => {
          if (!confirmAction || responding) return;
          void respond(confirmAction.action);
        }}
      />
    </>
  );
}
