'use client';
import { useState, useCallback, useMemo } from 'react';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { useToast } from '@/components/ToastProvider';
import useSWR from 'swr';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load events');
  return json;
};

export default function CollegeCalendarPage() {
  const { addToast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8)); // September 2026
  const { data, error, mutate } = useSWR('/api/college/events', fetcher);

  const events = useMemo(
    () => (Array.isArray(data?.events) ? data.events : []).map((e) => ({
      id: e.id,
      title: e.title,
      type: e.event_type,
      startDate: e.start_date ? new Date(e.start_date) : null,
      endDate: e.end_date ? new Date(e.end_date) : null,
    })),
    [data]
  );

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const cells = [];
  
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const shiftMonth = (delta) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const isSameMonth = useCallback(
    (date) => date && date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear(),
    [currentMonth]
  );

  const eventTypeClass = (type) => {
    if (type === 'placement_drive') return 'drive';
    if (type === 'exam') return 'exam';
    if (type === 'holiday') return 'holiday';
    return 'drive';
  };

  const createCalendarEntry = async ({ title, eventType, startDate, endDate, isBlocking }) => {
    const res = await fetch('/api/college/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        eventType,
        startDate,
        endDate,
        isBlocking,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to save event');
  };

  const addEvent = async () => {
    try {
      const title = window.prompt('Event title');
      if (!title) return;
      const startDate = window.prompt('Start date (YYYY-MM-DD)');
      if (!startDate) return;
      const eventType = window.prompt('Event type: placement_drive | exam | holiday | workshop | other', 'placement_drive') || 'other';
      await createCalendarEntry({ title, eventType, startDate, endDate: startDate, isBlocking: false });
      await mutate();
      addToast('Event added', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to add event', 'error');
    }
  };

  const blockDates = async () => {
    try {
      const title = window.prompt('Block title', 'Blocked Date');
      if (!title) return;
      const startDate = window.prompt('Start date (YYYY-MM-DD)');
      if (!startDate) return;
      const endDate = window.prompt('End date (YYYY-MM-DD)', startDate) || startDate;
      await createCalendarEntry({ title, eventType: 'holiday', startDate, endDate, isBlocking: true });
      await mutate();
      addToast('Dates blocked', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to block dates', 'error');
    }
  };

  const getScheduleCsv = useCallback(
    (_scope) => {
      const headers = ['Month', 'Day', 'Title', 'Type'];
      const rows = events
        .filter((ev) => isSameMonth(ev.startDate))
        .map((ev) => [
          monthName,
          String(ev.startDate.getDate()),
          ev.title,
          ev.type,
        ]);
      return { headers, rows };
    },
    [events, isSameMonth, monthName]
  );

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>📅 Placement Calendar</h1><p>Manage academic and placement schedules</p></div>
        <div className="page-header-actions">
          <ExportCsvSplitButton
            filenameBase="interview_schedule"
            currentCount={events.filter((ev) => isSameMonth(ev.startDate)).length}
            fullCount={events.length}
            getRows={getScheduleCsv}
          />
          <button className="btn btn-secondary" onClick={addEvent}>+ Add Event</button>
          <button className="btn btn-secondary" onClick={blockDates}>+ Block Dates</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <button className="btn btn-ghost btn-sm" onClick={() => shiftMonth(-1)}>← Prev</button>
          <h3 className="card-title">{monthName}</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => shiftMonth(1)}>Next →</button>
        </div>

        <div className="calendar-grid">
          {DAYS.map(d => <div key={d} className="calendar-header-cell">{d}</div>)}
          {cells.map((day, i) => {
            const dayEvents = day
              ? events.filter((e) => isSameMonth(e.startDate) && e.startDate.getDate() === day)
              : [];
            const isToday = day === 13;
            return (
              <div key={i} className={`calendar-cell ${!day ? 'other-month' : ''} ${isToday ? 'today' : ''}`}>
                {day && (
                  <>
                    <div className="calendar-date">{day}</div>
                    {dayEvents.map((ev, j) => (
                      <div key={j} className={`calendar-event ${eventTypeClass(ev.type)}`}>{ev.title}</div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
        {error && <p className="text-secondary" style={{ marginTop: '0.75rem' }}>Failed to load calendar events.</p>}

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.8125rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--primary-100)' }} />
            Placement Drive
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--danger-100)' }} />
            Exam
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--success-100)' }} />
            Holiday
          </div>
        </div>
      </div>
    </div>
  );
}
