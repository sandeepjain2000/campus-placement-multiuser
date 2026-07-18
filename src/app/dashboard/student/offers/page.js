'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { formatDate, formatCurrency } from '@/lib/utils';
import { isOfferDeadlinePassed, parseOfferDeadline } from '@/lib/offerDeadline';
import { canStudentRespondToOffer, normalizeOfferStatus } from '@/lib/offerStatusNormalize';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import StudentOfferRespondActions from '@/components/student/StudentOfferRespondActions';
import { FileText } from 'lucide-react';
import {
  STUDENT_OFFER_LETTER_ERRORS,
} from '@/lib/studentOfferLetter';

const STUDENT_OFFERS_LIST_ERRORS = Object.freeze({
  LOAD_FAILED: 'We could not load your offers right now. Please try again in a moment.',
  NETWORK: STUDENT_OFFER_LETTER_ERRORS.NETWORK,
  UNAUTHORIZED: STUDENT_OFFER_LETTER_ERRORS.UNAUTHORIZED,
});

const fetcher = async (url) => {
  let res;
  try {
    res = await fetch(url);
  } catch {
    const err = new Error(STUDENT_OFFERS_LIST_ERRORS.NETWORK);
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      res.status === 401
        ? STUDENT_OFFERS_LIST_ERRORS.UNAUTHORIZED
        : STUDENT_OFFERS_LIST_ERRORS.LOAD_FAILED;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
};

function formatTimeLeft(deadline, now) {
  const end = parseOfferDeadline(deadline);
  if (!end) return null;
  const diff = end.getTime() - now;
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export default function StudentOffersPage() {
  const { data: offers, error, isLoading, mutate } = useSWR('/api/student/offers', fetcher, {
    shouldRetryOnError: false,
  });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  if (isLoading) return <PageLoading message="Loading your offers…" variant="skeleton-card" />;

  if (error) {
    const known = Object.values(STUDENT_OFFERS_LIST_ERRORS);
    const message = known.includes(error?.message)
      ? error.message
      : STUDENT_OFFERS_LIST_ERRORS.LOAD_FAILED;
    return (
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>My Offers</h1>
          </div>
        </div>
        <div
          className="card"
          role="alert"
          style={{ padding: '1.25rem 1.5rem', borderColor: 'var(--danger-200)', background: 'var(--danger-50)' }}
        >
          <p style={{ margin: '0 0 0.75rem', color: 'var(--danger-800)', lineHeight: 1.55 }}>{message}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => mutate()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🎉 My Offers</h1>
          <p>
            Formal offers live here — drafted offer letters, compensation terms, and your accept or decline response.
            Being <strong>selected</strong> on My Applications is an earlier step; you will get a separate email when a
            formal offer is published.
          </p>
        </div>
      </div>

      {offers?.length > 0 && !offers.some((o) => normalizeOfferStatus(o.status) === 'pending' && !isOfferDeadlinePassed(o.deadline, new Date(now))) ? (
        <div
          className="card"
          style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', borderColor: 'var(--border-default)' }}
        >
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            You have offer records on file, but none are waiting for your response. New offers must be created with status{' '}
            <strong>pending</strong> (employer bulk generate, Create offer, or college manual add). If you expected Accept / Decline buttons, ask your placement office to re-open the offer as pending.
          </p>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {offers && offers.length > 0 ? offers.map(offer => {
          const status = normalizeOfferStatus(offer.status);
          const isExpired = status === 'expired' || (status === 'pending' && isOfferDeadlinePassed(offer.deadline, new Date(now)));
          const timeLeft = formatTimeLeft(offer.deadline, now);
          const effectiveStatus = isExpired && status === 'pending' ? 'expired' : status;
          const canRespond = canStudentRespondToOffer(offer, new Date(now));
          const offerId = String(offer.id);

          return (
            <div key={offerId} className={`offer-card ${effectiveStatus === 'pending' ? 'highlight' : ''}`} style={{ opacity: effectiveStatus === 'expired' ? 0.75 : 1 }}>
              {effectiveStatus === 'pending' && (
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, right: 0, 
                  padding: '0.5rem 1.5rem', 
                  background: 'linear-gradient(90deg, var(--success-500), var(--success-600))',
                  color: 'white', fontSize: '0.8125rem', fontWeight: 600, textAlign: 'center',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
                >
                  ⏳ Action required — {timeLeft === 'Expired' ? 'Offer Expired' : `Respond before ${formatDate(offer.deadline)} (${timeLeft})`}
                </div>
              )}
              
              <div className="offer-card-header" style={{ marginTop: effectiveStatus === 'pending' ? '2rem' : 0 }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                    <CompanyNameLink name={offer.company} website={offer.website} />
                  </h3>
                  <p className="text-sm text-secondary">{offer.role}</p>
                </div>
                <span
                  className={`badge badge-${effectiveStatus === 'accepted' ? 'green' : effectiveStatus === 'pending' ? 'amber' : effectiveStatus === 'expired' ? 'gray' : effectiveStatus === 'revoked' ? 'red' : 'red'} badge-dot`}
                  style={{ padding: '0.375rem 1rem', fontSize: '0.8125rem' }}
                >
                  {effectiveStatus === 'accepted'
                    ? '✅ Accepted'
                    : effectiveStatus === 'pending'
                      ? '⏳ Pending'
                      : effectiveStatus === 'expired'
                        ? '⏱️ Expired'
                        : effectiveStatus === 'revoked'
                          ? '⛔ Revoked'
                          : '❌ Declined'}
                </span>
              </div>

              <div className="offer-details">
                <div className="offer-detail-item">
                  <div className="offer-detail-label">Annual CTC</div>
                  <div className="offer-detail-value" style={{ color: 'var(--success-600)', fontSize: '1.25rem' }}>
                    {formatCurrency(offer.salary)}
                  </div>
                </div>
                <div className="offer-detail-item">
                  <div className="offer-detail-label">Location</div>
                  <div className="offer-detail-value">📍 {offer.location}</div>
                </div>
                <div className="offer-detail-item">
                  <div className="offer-detail-label">Joining Date</div>
                  <div className="offer-detail-value">📅 {formatDate(offer.joiningDate)}</div>
                </div>
                <div className="offer-detail-item">
                  <div className="offer-detail-label">Offer Date</div>
                  <div className="offer-detail-value">{formatDate(offer.createdAt)}</div>
                </div>
              </div>

              <div style={{ margin: '0 0 1.25rem' }}>
                <Link
                  href={`/dashboard/student/offers/${encodeURIComponent(offerId)}/letter`}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <FileText size={14} />
                  Open Offer Letter
                </Link>
              </div>

              {canRespond ? (
                <StudentOfferRespondActions offer={offer} onUpdated={() => mutate()} />
              ) : null}

              {effectiveStatus === 'expired' && (
                <div style={{ 
                  padding: '0.75rem 1rem', background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', color: 'var(--text-tertiary)' 
                }}>
                  ⏱️ This offer expired on {formatDate(offer.deadline)}. Your response time lapsed.
                </div>
              )}

              {effectiveStatus === 'accepted' && (
                <div style={{ 
                  padding: '0.75rem 1rem', background: 'var(--success-50)', 
                  borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', color: 'var(--success-700)' 
                }}>
                  ✅ You accepted this offer on {formatDate(offer.acceptedAt)}. Congratulations! 🎊
                </div>
              )}

              {effectiveStatus === 'rejected' && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  You declined this offer{offer.rejectedAt ? ` on ${formatDate(offer.rejectedAt)}` : ''}.
                </div>
              )}

              {effectiveStatus === 'revoked' && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--danger-50)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '0.875rem',
                    color: 'var(--danger-700)',
                  }}
                >
                  This offer was revoked by the employer.
                </div>
              )}
            </div>
          );
        }) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>No offers yet.</div>
        )}
      </div>

    </div>
  );
}
