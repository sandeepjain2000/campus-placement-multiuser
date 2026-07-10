'use client';
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { EmployerCalendarGrid } from '@/components/employer/EmployerCalendarGrid';
import { formatDate } from '@/lib/utils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load calendar');
  return json;
};

export default function EmployerCalendarPage() {
  const { data, isLoading, error } = useSWR('/api/employer/calendar', fetcher);
  const events = useMemo(() => (Array.isArray(data?.events) ? data.events : []), [data]);
  const [view, setView] = useState('list');

  const getCalendarCsv = useCallback(
    (_scope) => ({
      headers: ['Title', 'Date', 'Time', 'Type', 'Mode'],
      rows: events.map((e) => [e.title, e.date, e.time, e.type, e.mode]),
    }),
    [events],
  );

  const calItems = events.map((e) => ({
    id: e.id,
    date: e.date,
    title: e.title,
    time: e.time,
    meta: `${e.type} · ${e.mode}`,
  }));

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📅 Employer Events Calendar</h1>
          <p>Manage company events, interviews, and milestones.</p>
        </div>
        <div className="page-header-actions">
          <ExportCsvSplitButton
            filenameBase="employer_events"
            currentCount={events.length}
            fullCount={events.length}
            getRows={getCalendarCsv}
          />
          <button className="btn btn-primary" disabled>+ Add Event</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span className="text-sm text-secondary" style={{ fontWeight: 600 }}>
            View
          </span>
          <div className="view-toggle" role="group" aria-label="View mode">
            <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
              List
            </button>
            <button type="button" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
              Calendar
            </button>
          </div>
          <span className="text-sm text-secondary" style={{ marginLeft: 'auto' }}>
            {events.length} events
          </span>
        </div>
      </div>

      {isLoading ? <div className="card"><p className="text-secondary">Loading events...</p></div> : null}
      {error ? <div className="card"><p style={{ color: 'var(--danger-600)' }}>{error.message || 'Could not load events.'}</p></div> : null}
      {!isLoading && !error && view === 'calendar' ? (
        <EmployerCalendarGrid items={calItems} initialYear={2026} initialMonth={9} />
      ) : null}
      {!isLoading && !error && view === 'list' ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Time</th>
                <th>Type</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="font-semibold">{e.title}</td>
                  <td>{formatDate(e.date)}</td>
                  <td>{e.time}</td>
                  <td>
                    <span className="badge badge-blue">{e.type}</span>
                  </td>
                  <td>{e.mode}</td>
                </tr>
              ))}
              {events.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-secondary">No events available yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
