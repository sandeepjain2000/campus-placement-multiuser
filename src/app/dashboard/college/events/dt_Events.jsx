'use client';

import useSWR from 'swr';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { PartyPopper, CalendarDays } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load events');
  return json;
};

export default function dt_Events() {
  const { data, isLoading, error } = useSWR('/api/college/events', fetcher);
  const events = Array.isArray(data?.events) ? data.events : [];

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayEvents,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(events, {
    getSearchText: (ev) => [ev.title, ev.event_type, ev.is_blocking ? 'blocking' : 'non-blocking'].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* Glassmorphic Hero */}
      <div style={{
        position: 'relative', background: 'var(--banner-gradient)',
        borderRadius: 'var(--radius-xl)', padding: '2.5rem', color: 'white', overflow: 'hidden',
        marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <h1 style={{ color: '#ffffff', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
          <PartyPopper size={28} /> Campus Events
        </h1>
        <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', margin: 0, position: 'relative', zIndex: 1 }}>
          Talks, pre-placement sessions, and other campus calendar events.
        </p>
      </div>

      {isLoading && <div className="skeleton skeleton-card" style={{ height: 200 }} />}
      {error && (
        <div className="card" style={{ padding: '1.5rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', marginBottom: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 600 }}>{error.message || 'Could not load events.'}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
          {totalCount === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <CalendarDays size={48} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No events scheduled</div>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.25rem' }}>Create events from the{' '}
                <Link href="/dashboard/college/calendar" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>Calendar</Link>.
              </p>
            </div>
          ) : (
            <>
              <DataTableToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search title or type…"
                sort={sort}
                onSortChange={setSort}
                sortOptions={COMMON_SORT_OPTIONS}
                filteredCount={filteredCount}
                totalCount={totalCount}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
                style={{ margin: '1rem 1rem 0', border: '1px solid var(--border-default)' }}
              />
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ paddingLeft: '1.5rem' }}>Title</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th style={{ paddingRight: '1.5rem' }}>Blocking</th>
                  </tr>
                </thead>
                <tbody>
                  {displayEvents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-secondary">
                        No events match your search.
                      </td>
                    </tr>
                  ) : null}
                  {displayEvents.map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ paddingLeft: '1.5rem', fontWeight: 600 }}>{ev.title || '—'}</td>
                      <td><span className="badge badge-indigo" style={{ fontSize: '0.75rem' }}>{ev.event_type || 'event'}</span></td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{ev.start_date ? formatDate(ev.start_date) : '—'}</td>
                      <td style={{ paddingRight: '1.5rem' }}>
                        {ev.is_blocking
                          ? <span className="badge badge-amber" style={{ fontSize: '0.75rem' }}>Blocking</span>
                          : <span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>Non-blocking</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
