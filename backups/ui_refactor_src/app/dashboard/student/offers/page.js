'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load offers');
  return data;
};

function formatTimeLeft(deadline, now) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const diff = d - now;
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
  const { addToast } = useToast();

  const respondToOffer = async (id, action) => {
    try {
      const res = await fetch('/api/student/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to update offer');
      await mutate();
      addToast(action === 'accept' ? 'Offer accepted.' : 'Offer declined.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to update offer', 'error');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  if (isLoading) return <div className="skeleton skeleton-card" style={{ height: 200, margin: '2rem' }}></div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🎉 My Offers</h1>
          <p>
            This is the only place you <strong>accept or decline</strong> an offer; your choice updates the record your employer and college see on their Offers
            screens.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {offers && offers.length > 0 ? offers.map(offer => {
          const isExpired = offer.status === 'expired' || (offer.status === 'pending' && new Date(offer.deadline) <= now);
          const timeLeft = formatTimeLeft(offer.deadline, now);
          const effectiveStatus = isExpired && offer.status === 'pending' ? 'expired' : offer.status;

          return (
            <div key={offer.id} className={`offer-card ${effectiveStatus === 'pending' ? 'highlight' : ''}`} style={{ opacity: effectiveStatus === 'expired' ? 0.75 : 1 }}>
              {effectiveStatus === 'pending' && (
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, right: 0, 
                  padding: '0.5rem 1.5rem', 
                  background: 'linear-gradient(90deg, var(--success-500), var(--success-600))',
                  color: 'white', fontSize: '0.8125rem', fontWeight: 600, textAlign: 'center'
                }}>
                  ⏳ Action required — {timeLeft === 'Expired' ? 'Offer Expired' : `Respond before ${formatDate(offer.deadline)} (${timeLeft})`}
                </div>
              )}
              
              <div className="offer-card-header" style={{ marginTop: effectiveStatus === 'pending' ? '2rem' : 0 }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{offer.company}</h3>
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

              {effectiveStatus === 'pending' && (
                <div className="offer-actions">
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={() => respondToOffer(offer.id, 'accept')}>✅ Accept Offer</button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => respondToOffer(offer.id, 'decline')}>❌ Decline Offer</button>
                </div>
              )}

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
                  You declined this offer.
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
