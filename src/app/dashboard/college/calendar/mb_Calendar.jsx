'use client';
import { useState, useMemo, useCallback } from 'react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import useSWR from 'swr';
import { Plus, Calendar as CalendarIcon, Briefcase, GraduationCap, Building2, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CampusCalendarGrid } from '@/components/calendar/CampusCalendarGrid';
import { collegeEventsToCalendarItems } from '@/lib/calendarItems';
import AddCollegeProgramEventModal from '@/components/college/AddCollegeProgramEventModal';
import ImportCollegeCalendarModal from '@/components/college/ImportCollegeCalendarModal';
import DeleteImportedCalendarModal from '@/components/college/DeleteImportedCalendarModal';
import ExportCollegeCalendarButton from '@/components/college/ExportCollegeCalendarButton';
import CollegeCalendarCategoryFilter from '@/components/college/CollegeCalendarCategoryFilter';
import CollegeCalendarClashBanner from '@/components/college/CollegeCalendarClashBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

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
  const [importOpen, setImportOpen] = useState(false);
  const [deleteImportedOpen, setDeleteImportedOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const { data, error, mutate, isLoading } = useSWR('/api/college/events', fetcher);

  const events = useMemo(() => (Array.isArray(data?.events) ? data.events : []), [data]);
  const allCalItems = useMemo(() => collegeEventsToCalendarItems(events), [events]);
  const calItems = useMemo(() => {
    if (category === 'all') return allCalItems;
    return allCalItems.filter((ev) => ev.category === category);
  }, [allCalItems, category]);

  const categoryCounts = useMemo(() => {
    const counts = { all: allCalItems.length, placement: 0, imported: 0, program: 0 };
    for (const ev of allCalItems) {
      if (counts[ev.category] != null) counts[ev.category] += 1;
    }
    return counts;
  }, [allCalItems]);

  const selectedDayKey = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const selectedDayEvents = useMemo(() => {
    return calItems.filter((e) => e.date === selectedDayKey);
  }, [calItems, selectedDayKey]);

  const isSameMonth = useCallback(
    (ev) => {
      const d = String(ev.date || '').slice(0, 10);
      if (!d) return false;
      const [y, m] = d.split('-').map(Number);
      return y === currentMonth.getFullYear() && m === currentMonth.getMonth() + 1;
    },
    [currentMonth],
  );

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getScheduleCsv = useCallback(
    (scope) => {
      const headers = ['Month', 'Day', 'Title', 'Type'];
      const source = scope === 'full' ? calItems : calItems.filter((ev) => isSameMonth(ev));
      const rows = source.map((ev) => {
        const day = String(ev.date || '').slice(8, 10);
        const label =
          scope === 'full'
            ? (() => {
                const d = String(ev.date || '').slice(0, 10);
                if (!d) return '';
                const [y, m] = d.split('-').map(Number);
                return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              })()
            : monthName;
        return [label, day, ev.title, ev.type];
      });
      return { headers, rows };
    },
    [calItems, isSameMonth, monthName],
  );

  const getEventMeta = (type, eventCategory) => {
    if (eventCategory === 'imported' || type === 'imported') {
      return { color: 'var(--warning-700)', bg: 'var(--warning-50)', icon: <CalendarIcon size={14}/>, label: 'Imported' };
    }
    if (type === 'placement_drive' || eventCategory === 'placement') {
      return { color: 'var(--primary-600)', bg: 'var(--primary-50)', icon: <Briefcase size={14}/>, label: 'Placement' };
    }
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

  const handleCalendarImported = async (result) => {
    await mutate();
    setShowForm(false);
    const imported = Number(result?.imported) || 0;
    if (imported > 0) {
      setCategory('imported');
      if (result?.hasDriveClashes || result?.warning) {
        addToast(result?.message || result.warning, 'warning');
      } else {
        addToast(result?.message || `Imported ${imported} calendar events`, 'success');
      }
    } else {
      addToast(result?.message || 'No new events imported', 'warning');
    }
  };

  const handleImportedDeleted = async (result) => {
    await mutate();
    setShowForm(false);
    const deleted = Number(result?.deleted) || 0;
    if (deleted > 0) {
      addToast(result?.message || `Deleted ${deleted} imported events`, 'success');
    } else {
      addToast(result?.message || 'No imported events deleted', 'warning');
    }
  };

  return (
    <>
      <MobileHeader
        title="Calendar"
        action={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus data-icon="inline-start" /> Add
          </Button>
        }
      />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>

        <div style={{ marginBottom: '1rem' }}>
          <CollegeCalendarCategoryFilter
            value={category}
            onChange={setCategory}
            counts={categoryCounts}
          />
        </div>

        <CollegeCalendarClashBanner items={allCalItems} />

        {showForm && (
          <Card className="border-primary/30 mb-5 gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-base">Add to calendar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 px-4">
              <Button
                variant="outline"
                onClick={() => { setModalMode('program'); setShowForm(false); }}
                className="justify-start"
              >
                <GraduationCap data-icon="inline-start" /> Add exam / program
              </Button>
              <Button
                variant="outline"
                onClick={() => { setModalMode('block'); setShowForm(false); }}
                className="justify-start"
              >
                <Building2 data-icon="inline-start" /> Block dates
              </Button>
              <Button
                variant="outline"
                onClick={() => { setImportOpen(true); setShowForm(false); }}
                className="justify-start"
              >
                <CalendarIcon data-icon="inline-start" /> Import calendar (.ics)
              </Button>
              <Button
                variant="outline"
                onClick={() => { setDeleteImportedOpen(true); setShowForm(false); }}
                className="text-destructive justify-start"
              >
                <Trash2 data-icon="inline-start" /> Delete imported
              </Button>
              <div style={{ paddingTop: '0.25rem' }}>
                <ExportCollegeCalendarButton
                  year={currentMonth.getFullYear()}
                  month={currentMonth.getMonth()}
                  currentCount={calItems.filter((ev) => isSameMonth(ev)).length}
                  fullCount={events.length}
                  getCsvRows={getScheduleCsv}
                  filenameBase="placement_calendar"
                  size="sm"
                />
              </div>
              <Button variant="ghost" onClick={() => setShowForm(false)} className="justify-start">
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="mb-5 gap-0 overflow-hidden py-0">
          <CampusCalendarGrid
            items={calItems}
            initialYear={currentMonth.getFullYear()}
            initialMonth={currentMonth.getMonth()}
            viewMode="month"
            showToolbar
            onCursorChange={(year, month) => setCurrentMonth(new Date(year, month, 1))}
            onDaySelect={(year, month, day) => setSelectedDate(new Date(year, month, day))}
          />
        </Card>

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
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-8 text-center">
              <CalendarIcon className="text-muted-foreground mb-2" aria-hidden />
              <p className="text-muted-foreground">No events scheduled for this day</p>
            </CardContent>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedDayEvents.map(e => {
              const meta = getEventMeta(e.type, e.category);
              return (
                <Card key={e.id}>
                  <CardContent className="flex items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ background: meta.bg, color: meta.color }}>
                    {meta.icon}
                  </div>
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <StatusBadge className="mt-1" tone={e.category === 'imported' ? 'amber' : e.type === 'exam' ? 'red' : e.type === 'holiday' ? 'green' : 'indigo'} showDot>{meta.label}</StatusBadge>
                  </div>
                  </CardContent>
                </Card>
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
      <ImportCollegeCalendarModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleCalendarImported}
      />
      <DeleteImportedCalendarModal
        open={deleteImportedOpen}
        onClose={() => setDeleteImportedOpen(false)}
        onDeleted={handleImportedDeleted}
      />
    </>
  );
}
