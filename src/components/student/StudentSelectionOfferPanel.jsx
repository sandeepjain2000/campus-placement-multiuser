'use client';

import Link from 'next/link';
import StudentOfferRespondActions from '@/components/student/StudentOfferRespondActions';
import {
  resolveStudentSelectionOfferState,
  studentApplicationsHrefForType,
} from '@/lib/studentSelectionOffer';

/**
 * Explains selection vs formal offer on student application views.
 */
export default function StudentSelectionOfferPanel({
  application,
  offers,
  type = 'drives',
  compact = false,
  onOfferUpdated,
}) {
  const { kind, offer } = resolveStudentSelectionOfferState(application, offers, { type });
  if (kind === 'not_selected') return null;

  const appsHref = studentApplicationsHrefForType(type);

  if (kind === 'awaiting_formal_offer') {
    return (
      <div
        style={{
          marginBottom: compact ? 0 : '1.25rem',
          padding: compact ? '0.875rem 1rem' : '1rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--primary-200)',
          background: 'var(--primary-50)',
        }}
      >
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-900)' }}>
          Selected — awaiting formal offer
        </p>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          You cleared the employer&apos;s selection rounds. A <strong>formal offer</strong> is a separate step: your college or
          employer will publish a drafted offer letter, send you an email, and then you accept or decline on{' '}
          <Link href="/dashboard/student/offers" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
            My Offers
          </Link>
          . No action is required here until that arrives.
        </p>
      </div>
    );
  }

  if (kind === 'formal_offer_pending' && offer) {
    return (
      <div
        style={{
          marginBottom: compact ? 0 : '1.25rem',
          padding: compact ? '0.875rem 1rem' : '1rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--success-200)',
          background: 'var(--success-50)',
        }}
      >
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--success-800)' }}>
          Formal offer issued — action required
        </p>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Your formal offer letter has been published. Download the letter below, then accept or decline before the deadline.
        </p>
        <p style={{ margin: '0 0 0.75rem' }}>
          <Link
            href={`/dashboard/student/offers/${encodeURIComponent(String(offer.id))}/letter`}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            Open offer letter
          </Link>
        </p>
        <StudentOfferRespondActions offer={offer} compact onUpdated={onOfferUpdated} />
      </div>
    );
  }

  if (kind === 'formal_offer_accepted' && offer) {
    return (
      <div
        style={{
          marginBottom: compact ? 0 : '1.25rem',
          padding: '0.875rem 1rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--success-200)',
          background: 'var(--success-50)',
          fontSize: '0.875rem',
          color: 'var(--success-800)',
        }}
      >
        You accepted the formal offer for this role. View details on{' '}
        <Link href="/dashboard/student/offers" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
          My Offers
        </Link>
        .
      </div>
    );
  }

  if (kind === 'formal_offer_declined') {
    return (
      <div
        style={{
          marginBottom: compact ? 0 : '1.25rem',
          padding: '0.875rem 1rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          background: 'var(--bg-secondary)',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
        }}
      >
        You declined the formal offer for this role. Your application remains marked selected on{' '}
        <Link href={appsHref} style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
          My Applications
        </Link>
        .
      </div>
    );
  }

  return null;
}
