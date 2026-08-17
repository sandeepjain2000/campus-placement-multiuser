'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Banknote,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { formatStatus } from '@/lib/utils';
import '@/components/ip/ip-offers-gemini.css';

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending') return { className: 'ip-of-badge--warn', label: 'Action Required' };
  if (s === 'accepted') return { className: 'ip-of-badge--ok', label: 'Offer Accepted' };
  if (s === 'declined') return { className: 'ip-of-badge--bad', label: 'Declined' };
  if (s === 'expired') return { className: 'ip-of-badge--muted', label: 'Expired' };
  return { className: 'ip-of-badge--muted', label: formatStatus(status) || status || '—' };
}

function stipendLabel(o) {
  if (o.stipend_inr) return `₹${o.stipend_inr}/mo`;
  return '—';
}

function modeLocation(o) {
  const mode = o.work_mode || o.location_mode || '';
  const loc = o.location || '';
  if (mode && loc) return `${mode} (${loc})`;
  return mode || loc || '—';
}

export default function CandidateOffersPage() {
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [rateFor, setRateFor] = useState(null);
  const [stars, setStars] = useState(5);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/ip/offers');
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((o) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    const hay = [
      o.role_title,
      o.title,
      o.company_name,
      o.status,
      o.location,
      o.work_mode,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(needle);
  });

  async function respond(id, status) {
    setBusyId(id);
    try {
      await fetch(`/api/ip/offers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusyId('');
    }
  }

  async function submitRating() {
    if (!rateFor?.employer_user_id) return;
    setBusyId(rateFor.id);
    try {
      await fetch('/api/ip/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: rateFor.employer_user_id,
          stars,
          internshipId: rateFor.internship_id,
        }),
      });
      setRateFor(null);
    } finally {
      setBusyId('');
    }
  }

  function shareToLinkedIn() {
    const shareUrl = `${window.location.origin}/candidate/offers`;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  return (
    <div className="ip-offers">
      <div className="ip-of-header">
        <div>
          <h1>Offers</h1>
          <p>Review, accept or decline offers from employers.</p>
        </div>
        <div className="ip-of-search">
          <span className="ip-of-search__icon" aria-hidden>
            <Search className="size-4" />
          </span>
          <input
            type="search"
            placeholder="Search offers..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search offers"
          />
        </div>
      </div>

      {!loading && !items.length ? (
        <div className="ip-of-empty">
          <div className="ip-of-empty__inner">
            <Inbox strokeWidth={1.5} />
            <h3>No offers yet</h3>
            <p>
              You haven&apos;t received any internship offers at the moment. Continue browsing and
              applying to open roles to increase your chances!
            </p>
            <Link href="/candidate/internships" className="ip-of-btn ip-of-btn--primary">
              <Search className="size-4" />
              Browse Internships
            </Link>
          </div>
        </div>
      ) : null}

      <div className="ip-of-list">
        {filtered.map((o) => {
          const pending = String(o.status).toLowerCase() === 'pending';
          const badge = statusBadge(o.status);
          return (
            <article key={o.id} className={`ip-of-card${pending ? ' is-pending' : ''}`}>
              <div className="ip-of-card__head">
                <div>
                  <div className="ip-of-card__title-row">
                    <h3>{o.role_title || o.title || 'Internship offer'}</h3>
                    <span className={`ip-of-badge ${badge.className}`}>{badge.label}</span>
                  </div>
                  <p className="ip-of-card__company">{o.company_name || 'Employer'}</p>
                </div>
                {pending && o.valid_until ? (
                  <div className="ip-of-expires">
                    <span>Offer expires on</span>
                    <strong>{new Date(o.valid_until).toLocaleDateString()}</strong>
                  </div>
                ) : null}
              </div>

              <div className="ip-of-body">
                <dl className="ip-of-grid">
                  <div className="ip-of-meta">
                    <dt>Stipend</dt>
                    <dd>
                      <Banknote className="size-4 text-slate-400" />
                      {stipendLabel(o)}
                    </dd>
                  </div>
                  <div className="ip-of-meta">
                    <dt>Work Mode</dt>
                    <dd>
                      <MapPin className="size-4 text-slate-400" />
                      {modeLocation(o)}
                    </dd>
                  </div>
                  <div className="ip-of-meta">
                    <dt>Start Date</dt>
                    <dd>
                      <Clock className="size-4 text-slate-400" />
                      {o.start_date ? new Date(o.start_date).toLocaleDateString() : '—'}
                    </dd>
                  </div>
                  <div className="ip-of-meta">
                    <dt>Documents</dt>
                    <dd>
                      {o.letter_url ? (
                        <a href={o.letter_url} target="_blank" rel="noreferrer">
                          <FileText className="size-4 text-slate-400" />
                          Offer letter
                        </a>
                      ) : (
                        <span style={{ fontWeight: 500, color: '#94a3b8' }}>—</span>
                      )}
                    </dd>
                  </div>
                </dl>

                {o.message ? <p className="ip-of-msg">{o.message}</p> : null}

                {pending ? (
                  <div className="ip-of-actions">
                    <button
                      type="button"
                      className="ip-of-btn ip-of-btn--success"
                      disabled={busyId === o.id}
                      onClick={() => respond(o.id, 'accepted')}
                    >
                      <CheckCircle2 className="size-4" />
                      Accept Offer
                    </button>
                    <button
                      type="button"
                      className="ip-of-btn ip-of-btn--danger"
                      disabled={busyId === o.id}
                      onClick={() => respond(o.id, 'declined')}
                    >
                      <X className="size-4" />
                      Decline
                    </button>
                    <div className="ip-of-actions__spacer" />
                    {o.letter_url ? (
                      <a
                        className="ip-of-btn ip-of-btn--outline"
                        href={o.letter_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Full Details
                      </a>
                    ) : o.internship_id ? (
                      <Link
                        className="ip-of-btn ip-of-btn--outline"
                        href={`/candidate/internships/${o.internship_id}`}
                      >
                        View Full Details
                      </Link>
                    ) : null}
                    <button type="button" className="ip-of-btn ip-of-btn--ghost" onClick={shareToLinkedIn}>
                      Share on LinkedIn
                    </button>
                  </div>
                ) : (
                  <div className="ip-of-actions">
                    <p className="ip-of-actions__note">
                      Status: {formatStatus(o.status) || o.status}
                      {o.updated_at
                        ? ` · updated ${new Date(o.updated_at).toLocaleDateString()}`
                        : ''}
                    </p>
                    <div className="ip-of-actions__spacer" />
                    {o.status === 'accepted' && o.employer_user_id ? (
                      <button
                        type="button"
                        className="ip-of-btn ip-of-btn--outline"
                        disabled={busyId === o.id}
                        onClick={() => {
                          setRateFor(o);
                          setStars(5);
                        }}
                      >
                        Rate employer
                      </button>
                    ) : null}
                    {o.letter_url ? (
                      <a
                        className="ip-of-btn ip-of-btn--outline"
                        href={o.letter_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Full Details
                      </a>
                    ) : null}
                    <button type="button" className="ip-of-btn ip-of-btn--ghost" onClick={shareToLinkedIn}>
                      Share on LinkedIn
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {rateFor ? (
        <div className="ip-of-rate">
          <h3>Rate {rateFor.company_name}</h3>
          <p>Mutual rating after accepted offer</p>
          <div className="ip-of-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={n <= stars ? 'is-on' : 'is-off'}
                onClick={() => setStars(n)}
                aria-label={`${n} stars`}
              >
                ★
              </button>
            ))}
          </div>
          <div className="ip-of-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
            <button
              type="button"
              className="ip-of-btn ip-of-btn--primary"
              disabled={busyId === rateFor.id}
              onClick={submitRating}
            >
              Submit rating
            </button>
            <button type="button" className="ip-of-btn ip-of-btn--ghost" onClick={() => setRateFor(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
