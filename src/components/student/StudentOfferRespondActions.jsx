'use client';

import { useState } from 'react';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/ToastProvider';
import { formatDate } from '@/lib/utils';
import { isOfferDeadlinePassed } from '@/lib/offerDeadline';
import { isPendingOfferStatus, normalizeOfferStatus } from '@/lib/offerStatusNormalize';
import { Button } from '@/components/ui/button';
import {
  STUDENT_OFFER_LETTER_ERRORS,
  resolveStudentOfferRespondErrorMessage,
} from '@/lib/studentOfferLetter';

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
        <p className="text-muted-foreground m-0 text-sm leading-relaxed">
          No pending offer is waiting for your response. If you received an offer letter, check{' '}
          <Link href="/dashboard/student/offers" className="text-primary font-semibold hover:underline">
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
      let res;
      try {
        res = await fetch('/api/student/offers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: offerId, action }),
        });
      } catch {
        addToast(STUDENT_OFFER_LETTER_ERRORS.NETWORK, 'error');
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(resolveStudentOfferRespondErrorMessage(res.status, json?.error), 'error');
        return;
      }
      await onUpdated?.();
      addToast(action === 'accept' ? 'Offer accepted.' : 'Offer declined.', 'success');
    } catch {
      addToast(STUDENT_OFFER_LETTER_ERRORS.RESPOND_FAILED, 'error');
    } finally {
      setResponding(false);
      setConfirmAction(null);
    }
  };

  if (!canRespond) {
    if (effectiveStatus === 'accepted') {
      return (
        <p className="m-0 text-sm text-green-600 dark:text-green-400">
          You accepted this offer.
        </p>
      );
    }
    if (effectiveStatus === 'rejected') {
      return (
        <p className="text-muted-foreground m-0 text-sm">
          You declined this offer.
        </p>
      );
    }
    if (effectiveStatus === 'expired') {
      return (
        <p className="text-muted-foreground m-0 text-sm">
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
        <p className="text-muted-foreground mb-3 text-xs">{deadlineHint}</p>
      ) : null}
      <div className={compact ? 'flex flex-wrap gap-2' : 'grid gap-2 sm:grid-cols-2'}>
        <Button
          type="button"
          className={compact ? undefined : 'w-full'}
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
        </Button>
        <Button
          type="button"
          variant="destructive"
          className={compact ? undefined : 'w-full'}
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
        </Button>
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
