'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { PartyPopper, CalendarDays } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load events');
  return json;
};

export default function CollegeEventsPage() {
  const { data, isLoading, error } = useSWR('/api/college/events', fetcher);
  const events = Array.isArray(data?.events) ? data.events : [];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PartyPopper size={22} aria-hidden /> Events
          </h1>
          <p className="text-secondary" style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>
            Talks, pre-placement sessions, and other tenant calendar events.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.25rem' }}>
        {isLoading ? (
          <p className="text-secondary" style={{ margin: 0 }}>Loading events...</p>
        ) : null}
        {error ? (
          <p style={{ margin: 0, color: 'var(--danger-600)' }}>{error.message || 'Could not load events.'}</p>
        ) : null}
        {!isLoading && !error && events.length === 0 ? (
          <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <CalendarDays size={18} style={{ flexShrink: 0, marginTop: '0.15rem' }} aria-hidden />
            <span>
              No calendar events found. Create one from{' '}
              <Link href="/dashboard/college/calendar">Calendar</Link>.
            </span>
          </p>
        ) : null}
        {!isLoading && !error && events.length > 0 ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Blocking</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="font-semibold">{ev.title || '—'}</td>
                    <td>{ev.event_type || 'event'}</td>
                    <td>{ev.start_date ? formatDate(ev.start_date) : '—'}</td>
                    <td>{ev.is_blocking ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
