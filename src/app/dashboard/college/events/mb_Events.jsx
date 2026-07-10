'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { PartyPopper, CalendarDays } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import MobileHeader from '@/components/mobile/MobileHeader';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load events');
  return json;
};

export default function mb_Events() {
  const { data, isLoading, error } = useSWR('/api/college/events', fetcher);
  const events = Array.isArray(data?.events) ? data.events : [];

  return (
    <>
      <MobileHeader title="Campus Events" />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: '12px' }} />)}
          </div>
        )}
        {error && (
          <div className="card" style={{ padding: '1.25rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', marginBottom: '1rem' }}>
            <p style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 600 }}>{error.message || 'Could not load events.'}</p>
          </div>
        )}

        {!isLoading && !error && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-default)' }}>
            <CalendarDays size={40} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No events scheduled</div>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.25rem', fontSize: '0.9rem' }}>
              Create events from the{' '}
              <Link href="/dashboard/college/calendar" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>Calendar</Link>.
            </p>
          </div>
        )}

        {!isLoading && !error && events.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
              {events.length} event{events.length !== 1 ? 's' : ''}
            </p>
            {events.map((ev) => (
              <div key={ev.id} style={{ border: '1px solid var(--border-default)', borderRadius: '12px', padding: '1rem', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', flex: 1 }}>{ev.title || '—'}</div>
                  {ev.is_blocking
                    ? <span className="badge badge-amber" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Blocking</span>
                    : <span className="badge badge-gray" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Non-blocking</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>{ev.event_type || 'event'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CalendarDays size={12} /> {ev.start_date ? formatDate(ev.start_date) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
