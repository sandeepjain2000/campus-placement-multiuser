'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toDateOnlyString } from '@/lib/dateOnly';
import { getInitialCalendarCursorFromIsoDates } from '@/lib/calendarInitialCursor';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { CampusCalendarGrid } from '@/components/calendar/CampusCalendarGrid';
import { collegeEventsToCalendarItems } from '@/lib/calendarItems';
import AddCollegeProgramEventModal from '@/components/college/AddCollegeProgramEventModal';
import { useToast } from '@/components/ToastProvider';
import useSWR from 'swr';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load events');
  return json;
};

export default function CollegeCalendarPage() {
  const { addToast } = useToast();
  const { data, error, mutate } = useSWR('/api/college/events', fetcher);
  const [modalMode, setModalMode] = useState(null);

  const events = useMemo(() => (Array.isArray(data?.events) ? data.events : []), [data]);
  const calItems = useMemo(() => collegeEventsToCalendarItems(events), [events]);

  const initialCursor = useMemo(
    () =>
      getInitialCalendarCursorFromIsoDates(
        (Array.isArray(data?.events) ? data.events : []).map((e) => toDateOnlyString(e.start_date)),
      ),
    [data],
  );

  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  useEffect(() => {
    if (!data?.events) return;
    setCurrentMonth(new Date(initialCursor.initialYear, initialCursor.initialMonth, 1));
  }, [data?.events, initialCursor.initialYear, initialCursor.initialMonth]);

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isSameMonth = useCallback(
    (ev) => {
      const d = String(ev.date || '').slice(0, 10);
      if (!d) return false;
      const [y, m] = d.split('-').map(Number);
      return y === currentMonth.getFullYear() && m === currentMonth.getMonth() + 1;
    },
    [currentMonth],
  );

  const handleProgramSaved = async ({ warning } = {}) => {
    await mutate();
    if (warning) {
      addToast(`Program saved. ${warning}`, 'warning');
    } else {
      addToast('College program added to calendar', 'success');
    }
  };

  const getScheduleCsv = useCallback(
    (_scope) => {
      const headers = ['Month', 'Day', 'Title', 'Type'];
      const rows = calItems
        .filter((ev) => isSameMonth(ev))
        .map((ev) => {
          const day = String(ev.date || '').slice(8, 10);
          return [monthName, day, ev.title, ev.type];
        });
      return { headers, rows };
    },
    [calItems, isSameMonth, monthName],
  );

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📅 Placement Calendar</h1>
          <p>Add exams and academic programs to avoid clashes with placement drives</p>
        </div>
        <div className="page-header-actions">
          <ExportCsvSplitButton
            filenameBase="interview_schedule"
            currentCount={calItems.filter((ev) => isSameMonth(ev)).length}
            fullCount={events.length}
            getRows={getScheduleCsv}
          />
          <button className="btn btn-primary" type="button" onClick={() => setModalMode('program')}>
            + Add program / exam
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setModalMode('block')}>
            + Block dates
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <CampusCalendarGrid
          items={calItems}
          initialYear={currentMonth.getFullYear()}
          initialMonth={currentMonth.getMonth()}
          viewMode="month"
          onCursorChange={(year, month) => setCurrentMonth(new Date(year, month, 1))}
        />
        {error && <p className="text-secondary" style={{ margin: '0.75rem 1.5rem 0' }}>Failed to load calendar events.</p>}

        <div style={{ display: 'flex', gap: '1.5rem', margin: '1rem 1.5rem 1.5rem', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--primary-100)' }} />
            Placement Drive
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--danger-100)' }} />
            Exam / Blocking program
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--success-100)' }} />
            Holiday
          </div>
        </div>
      </div>

      <AddCollegeProgramEventModal
        open={modalMode != null}
        mode={modalMode === 'block' ? 'block' : 'program'}
        onClose={() => setModalMode(null)}
        onSaved={handleProgramSaved}
      />
    </div>
  );
}
