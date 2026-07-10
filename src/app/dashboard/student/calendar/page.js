'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { List, CalendarDays, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';
import { CampusCalendarGrid } from '@/components/calendar/CampusCalendarGrid';
import { studentEventsToCalendarItems } from '@/lib/calendarItems';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load calendar');
  return json;
};

export default function StudentPlacementCalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('month'); // list, week, month, year

  const { data, isLoading } = useSWR('/api/student/calendar', fetcher);
  const events = useMemo(() => (Array.isArray(data?.events) ? data.events : []), [data]);

  const today = new Date();
  const calItems = useMemo(() => studentEventsToCalendarItems(events), [events]);

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CalendarIcon size={24} style={{ color: 'var(--primary-500)' }} />
            Placement Calendar
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            See when companies visit, deadlines land, and off-campus venues are scheduled.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
          {[
            { id: 'list', label: 'List', icon: List },
            { id: 'week', label: 'Week', icon: CalendarDays },
            { id: 'month', label: 'Month', icon: CalendarIcon },
            { id: 'year', label: 'Year', icon: LayoutGrid }
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.75rem', borderRadius: '6px', border: 'none',
                background: viewMode === v.id ? 'var(--bg-primary)' : 'transparent',
                color: viewMode === v.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: viewMode === v.id ? 600 : 500, fontSize: '0.85rem',
                boxShadow: viewMode === v.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              <v.icon size={14} />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: viewMode === 'list' ? '1.5rem' : 0, overflow: 'hidden' }}>
        {/* --- LIST VIEW --- */}
        {viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-default)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Upcoming Events</h3>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{events.length} total</div>
            </div>
            {isLoading ? (
              <div className="text-secondary text-sm">Loading...</div>
            ) : events.length === 0 ? (
              <div className="text-secondary text-sm" style={{ padding: '2rem 0', textAlign: 'center' }}>No upcoming events found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {events.sort((a,b) => new Date(a.date) - new Date(b.date)).map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
                    <div style={{ minWidth: '100px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                        {new Date(ev.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {new Date(ev.date).getFullYear() !== today.getFullYear() && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(ev.date).getFullYear()}</div>
                      )}
                    </div>
                    <div style={{ width: '1px', background: 'var(--border-default)', alignSelf: 'stretch' }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>{ev.title}</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className={`badge badge-${ev.type === 'virtual' ? 'blue' : 'indigo'} badge-dot`} style={{ fontSize: '0.75rem' }}>
                          {ev.type === 'virtual' ? 'Virtual' : 'On-Campus'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>•</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                          {ev.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode !== 'list' && !isLoading ? (
          <CampusCalendarGrid
            items={calItems}
            initialYear={currentDate.getFullYear()}
            initialMonth={currentDate.getMonth()}
            viewMode={viewMode}
            onCursorChange={(year, month) => setCurrentDate(new Date(year, month, 1))}
            onChangeView={setViewMode}
          />
        ) : null}
      </div>

      <p className="text-sm text-secondary" style={{ marginTop: '1rem' }}>
        Tip: Use <strong>Browse drives</strong> to apply to upcoming events. This calendar is a read-only snapshot for planning.
      </p>
    </div>
  );
}
