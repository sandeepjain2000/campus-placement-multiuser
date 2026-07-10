'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { formatDate, formatCurrency } from '@/lib/utils';
import { isOfferDeadlinePassed, parseOfferDeadline } from '@/lib/offerDeadline';
import { canStudentRespondToOffer, normalizeOfferStatus } from '@/lib/offerStatusNormalize';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import StudentOfferRespondActions from '@/components/student/StudentOfferRespondActions';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load offers');
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
  const { data: offers, isLoading, mutate } = useSWR('/api/student/offers', fetcher);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  if (isLoading) return <PageLoading message="Loading your offers…" variant="skeleton-card" />;

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

              {(offer.renderedLetterHtml || offer.offerLetterUrl) && (
                <div style={{ margin: '0 0 1.25rem' }}>
                  {offer.renderedLetterHtml ? (
                    <div
                      style={{
                        padding: '1rem 1.25rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-lg)',
                        fontSize: '0.9rem',
                        lineHeight: 1.65,
                        whiteSpace: 'pre-wrap',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Offer letter
                      </div>
                      {offer.renderedLetterHtml}
                    </div>
                  ) : (
                    <a
                      href={offer.offerLetterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      📄 Open Offer Letter
                    </a>
                  )}
                </div>
              )}

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
