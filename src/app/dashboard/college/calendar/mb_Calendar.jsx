'use client';
import { useState, useMemo } from 'react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import useSWR from 'swr';
import { Plus, Calendar as CalendarIcon, Briefcase, GraduationCap, Building2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CampusCalendarGrid } from '@/components/calendar/CampusCalendarGrid';
import { collegeEventsToCalendarItems } from '@/lib/calendarItems';
import AddCollegeProgramEventModal from '@/components/college/AddCollegeProgramEventModal';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load events');
  return json;
};

export default function mb_Calendar() {
  const { addToast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8));
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 8, 13));
  const [showForm, setShowForm] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const { data, error, mutate, isLoading } = useSWR('/api/college/events', fetcher);

  const events = useMemo(() => (Array.isArray(data?.events) ? data.events : []), [data]);
  const calItems = useMemo(() => collegeEventsToCalendarItems(events), [events]);

  const selectedDayKey = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const selectedDayEvents = useMemo(() => {
    return calItems.filter((e) => e.date === selectedDayKey);
  }, [calItems, selectedDayKey]);

  const getEventMeta = (type) => {
    if (type === 'placement_drive') return { color: 'var(--primary-600)', bg: 'var(--primary-50)', icon: <Briefcase size={14}/>, label: 'Placement' };
    if (type === 'exam') return { color: 'var(--danger-600)', bg: 'var(--danger-50)', icon: <GraduationCap size={14}/>, label: 'Exam' };
    if (type === 'holiday') return { color: 'var(--success-600)', bg: 'var(--success-50)', icon: <Building2 size={14}/>, label: 'Holiday' };
    return { color: 'var(--text-secondary)', bg: 'var(--bg-secondary)', icon: <CalendarIcon size={14}/>, label: 'Other' };
  };

  const handleProgramSaved = async ({ warning } = {}) => {
    await mutate();
    setShowForm(false);
    if (warning) {
      addToast(`Program saved. ${warning}`, 'warning');
    } else {
      addToast('College program added', 'success');
    }
  };

  return (
    <>
      <MobileHeader
        title="Calendar"
        action={
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Add
          </button>
        }
      />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>

        {showForm && (
          <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--primary-300)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Add to calendar</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => { setModalMode('program'); setShowForm(false); }}
                style={{ justifyContent: 'flex-start' }}
              >
                <GraduationCap size={16} /> Add exam / program
              </button>
              <button
                className="btn btn-outline"
                onClick={() => { setModalMode('block'); setShowForm(false); }}
                style={{ justifyContent: 'flex-start' }}
              >
                <Building2 size={16} /> Block dates
              </button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)} style={{ color: 'var(--danger-600)', borderColor: 'var(--danger-200)', justifyContent: 'flex-start' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 0, marginBottom: '1.25rem', overflow: 'hidden' }}>
          <CampusCalendarGrid
            items={calItems}
            initialYear={currentMonth.getFullYear()}
            initialMonth={currentMonth.getMonth()}
            viewMode="month"
            showToolbar
            onCursorChange={(year, month) => setCurrentMonth(new Date(year, month, 1))}
            onDaySelect={(year, month, day) => setSelectedDate(new Date(year, month, day))}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>
            {formatDate(selectedDate)}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton" style={{ height: 60, borderRadius: '8px' }} />
          </div>
        ) : selectedDayEvents.length === 0 ? (
          <div className="card" style={{ padding: '2rem 1rem', textAlign: 'center', borderStyle: 'dashed' }}>
            <CalendarIcon size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No events scheduled for this day</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedDayEvents.map(e => {
              const meta = getEventMeta(e.type);
              return (
                <div key={e.id} className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {meta.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{e.title}</div>
                    <div style={{ fontSize: '0.75rem', color: meta.color, fontWeight: 500, marginTop: '0.15rem' }}>{meta.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <AddCollegeProgramEventModal
        open={modalMode != null}
        mode={modalMode === 'block' ? 'block' : 'program'}
        initialStartDate={selectedDayKey}
        onClose={() => setModalMode(null)}
        onSaved={handleProgramSaved}
      />
    </>
  );
}
