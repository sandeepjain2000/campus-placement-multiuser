'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Award } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import { ppoStatusLabel } from '@/lib/internshipPpo';
import { formatDate } from '@/lib/utils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

export default function StudentInternshipPpoPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/student/internship-ppo', fetcher);
  const [busyId, setBusyId] = useState(null);

  const items = Array.isArray(data?.items) ? data.items : [];

  const respond = async (programApplicationId, action) => {
    setBusyId(programApplicationId);
    try {
      const res = await fetch('/api/student/internship-ppo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programApplicationId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      addToast(json.message || 'Saved.', 'success');
      await mutate();
    } catch (e) {
      addToast(e.message || 'Failed to save', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return <PageLoading message="Loading PPO…" variant="skeleton-card" />;

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Award size={26} aria-hidden />
            Internship PPO
          </h1>
          <p className="text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>
            A Pre-Placement Offer (PPO) is not the same as being selected for an internship or receiving a formal job
            offer. Respond here when your employer confirms a PPO. If you accept, they may send a separate job offer on{' '}
            <Link href="/dashboard/student/offers">My Offers</Link>.
          </p>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: '1.5rem', color: 'var(--danger-600)' }}>{error.message}</div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map((row) => {
          const isBusy = busyId === row.programApplicationId;
          return (
            <div key={row.programApplicationId} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 600 }}>{row.companyName}</div>
              <div className="text-sm text-secondary" style={{ marginTop: '0.25rem' }}>
                {row.openingTitle}
              </div>
              {row.internshipStartDate ? (
                <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                  Internship start: {formatDate(row.internshipStartDate)}
                </div>
              ) : null}

              <div style={{ marginTop: '0.75rem' }}>
                <span className="badge badge-blue badge-dot">{ppoStatusLabel(row.ppo?.status)}</span>
              </div>

              {row.ppo?.employerNotes ? (
                <p className="text-sm" style={{ margin: '0.75rem 0 0', whiteSpace: 'pre-wrap' }}>
                  <strong>Employer note:</strong> {row.ppo.employerNotes}
                </p>
              ) : null}

              {row.ppo?.confirmedAt ? (
                <p className="text-xs text-tertiary" style={{ margin: '0.5rem 0 0' }}>
                  Confirmed {formatDate(row.ppo.confirmedAt)}
                </p>
              ) : null}

              {row.jobOfferIssued ? (
                <p className="text-sm text-secondary" style={{ margin: '0.75rem 0 0' }}>
                  A formal job offer was issued — respond on{' '}
                  <Link href="/dashboard/student/offers">My Offers</Link>.
                </p>
              ) : null}

              {row.canRespond ? (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={isBusy}
                    onClick={() => respond(row.programApplicationId, 'accept')}
                  >
                    Accept PPO
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={isBusy}
                    onClick={() => {
                      if (!window.confirm('Decline this PPO?')) return;
                      respond(row.programApplicationId, 'decline');
                    }}
                  >
                    Decline PPO
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}

        {!error && items.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No PPO confirmations yet. When an employer confirms a PPO during or after your internship, it will appear
            here.
          </div>
        ) : null}
      </div>
    </div>
  );
}
