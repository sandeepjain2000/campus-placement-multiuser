'use client';
import { useState, useCallback, useMemo } from 'react';
import { toDateOnlyString } from '@/lib/dateOnly';
import { getInitialCalendarCursorFromIsoDates } from '@/lib/calendarInitialCursor';
import { CampusCalendarGrid } from '@/components/calendar/CampusCalendarGrid';
import { collegeEventsToCalendarItems } from '@/lib/calendarItems';
import AddCollegeProgramEventModal from '@/components/college/AddCollegeProgramEventModal';
import ImportCollegeCalendarModal from '@/components/college/ImportCollegeCalendarModal';
import DeleteImportedCalendarModal from '@/components/college/DeleteImportedCalendarModal';
import ExportCollegeCalendarButton from '@/components/college/ExportCollegeCalendarButton';
import CollegeCalendarCategoryFilter from '@/components/college/CollegeCalendarCategoryFilter';
import CollegeCalendarClashBanner from '@/components/college/CollegeCalendarClashBanner';
import { useToast } from '@/components/ToastProvider';
import useSWR from 'swr';
import { CalendarDays, CalendarPlus, FileDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [importOpen, setImportOpen] = useState(false);
  const [deleteImportedOpen, setDeleteImportedOpen] = useState(false);
  const [category, setCategory] = useState('all');

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

  const initialCursor = useMemo(
    () =>
      getInitialCalendarCursorFromIsoDates(
        (Array.isArray(data?.events) ? data.events : []).map((e) => toDateOnlyString(e.start_date)),
      ),
    [data],
  );

  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [cursorAppliedKey, setCursorAppliedKey] = useState('');
  const cursorKey = data?.events
    ? `${initialCursor.initialYear}-${initialCursor.initialMonth}`
    : '';
  // Adjust month when calendar data arrives (same outcome as the previous effect sync).
  if (cursorKey && cursorKey !== cursorAppliedKey) {
    setCursorAppliedKey(cursorKey);
    setCurrentMonth(new Date(initialCursor.initialYear, initialCursor.initialMonth, 1));
  }

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

  const handleCalendarImported = async (result) => {
    await mutate();
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
    const deleted = Number(result?.deleted) || 0;
    if (deleted > 0) {
      addToast(result?.message || `Deleted ${deleted} imported events`, 'success');
    } else {
      addToast(result?.message || 'No imported events deleted', 'warning');
    }
  };

  const getScheduleCsv = useCallback(
    (scope) => {
      const headers = ['Month', 'Day', 'Title', 'Type', 'Category'];
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
        return [label, day, ev.title, ev.type, ev.category || ''];
      });
      return { headers, rows };
    },
    [calItems, isSameMonth, monthName],
  );

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <CalendarDays className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Placement calendar
          </h1>
          <p className="text-muted-foreground m-0 text-sm">Add exams and academic programs to avoid clashes with placement drives.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportCollegeCalendarButton
            year={currentMonth.getFullYear()}
            month={currentMonth.getMonth()}
            currentCount={calItems.filter((ev) => isSameMonth(ev)).length}
            fullCount={calItems.length}
            getCsvRows={getScheduleCsv}
            filenameBase="placement_calendar"
          />
          <Button variant="outline" type="button" onClick={() => setImportOpen(true)}>
            <FileDown data-icon="inline-start" />
            Import calendar (.ics)
          </Button>
          <Button variant="ghost" type="button" onClick={() => setDeleteImportedOpen(true)}>
            <Trash2 data-icon="inline-start" />
            Delete imported
          </Button>
          <Button type="button" onClick={() => setModalMode('program')}>
            <CalendarPlus data-icon="inline-start" />
            Add program / exam
          </Button>
          <Button variant="outline" type="button" onClick={() => setModalMode('block')}>Block dates</Button>
        </div>
      </div>

      <div>
        <CollegeCalendarCategoryFilter
          value={category}
          onChange={setCategory}
          counts={categoryCounts}
        />
      </div>

      <CollegeCalendarClashBanner items={allCalItems} />

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-border border-b px-4 py-3">
          <CardTitle className="text-base">{monthName}</CardTitle>
          <CardDescription>{calItems.length} calendar item{calItems.length === 1 ? '' : 's'} in the selected scope</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <CampusCalendarGrid
            items={calItems}
            initialYear={currentMonth.getFullYear()}
            initialMonth={currentMonth.getMonth()}
            viewMode="month"
            onCursorChange={(year, month) => setCurrentMonth(new Date(year, month, 1))}
          />
          {error && <p className="text-muted-foreground mx-6 mt-3 text-sm">Failed to load calendar events.</p>}

          <div className="text-muted-foreground flex flex-wrap gap-6 px-6 py-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="bg-primary/20 size-3 rounded-sm" />
            Placement
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-amber-200 size-3 rounded-sm" />
            Imported
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-destructive/20 size-3 rounded-sm" />
            Exam / Blocking program
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-emerald-200 size-3 rounded-sm" />
            Holiday
          </div>
        </div>
        </CardContent>
      </Card>

      <AddCollegeProgramEventModal
        open={modalMode != null}
        mode={modalMode === 'block' ? 'block' : 'program'}
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
    </div>
  );
}
