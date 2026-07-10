'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load calendar');
  return json;
};

export default function StudentPlacementCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8));
  const { data } = useSWR('/api/student/calendar', fetcher);
  const events = useMemo(() => (Array.isArray(data?.events) ? data.events : []), [data]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const cells = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const goPrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const goNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📅 Placement calendar</h1>
          <p>See when companies visit, deadlines land, and off-campus venues are scheduled (same view style as the college calendar).</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-ghost btn-sm" onClick={goPrevMonth}>
            ← Prev
          </button>
          <h3 className="card-title">{monthName}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={goNextMonth}>
            Next →
          </button>
        </div>

        <div className="calendar-grid">
          {DAYS.map((d) => (
            <div key={d} className="calendar-header-cell">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const dayEvents = day
              ? events.filter((e) => {
                if (!e.date) return false;
                const d = new Date(e.date);
                return d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth() && d.getDate() === day;
              })
              : [];
            const isToday = day === 13;
            return (
              <div key={i} className={`calendar-cell ${!day ? 'other-month' : ''} ${isToday ? 'today' : ''}`}>
                {day && (
                  <>
                    <div className="calendar-date">{day}</div>
                    {dayEvents.map((ev, j) => (
                      <div key={j} className={`calendar-event ${ev.type === 'off_campus' ? 'drive' : ev.type || 'drive'}`} title={ev.title}>
                        {ev.title}
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-secondary" style={{ marginTop: '1rem' }}>
        Tip: Use <strong>Browse drives</strong> to filter by date range and apply; this calendar is a read-only snapshot for planning.
      </p>
    </div>
  );
}
