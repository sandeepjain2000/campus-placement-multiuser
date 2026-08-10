'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { List, CalendarDays, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';
import { CampusCalendarGrid } from '@/components/calendar/CampusCalendarGrid';
import { studentEventsToCalendarItems } from '@/lib/calendarItems';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <div className="animate-fadeIn flex flex-col gap-4 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <CalendarIcon className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            Placement Calendar
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            See when companies visit, deadlines land, and off-campus venues are scheduled.
          </p>
        </div>
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList aria-label="Calendar view">
          {[
            { id: 'list', label: 'List', icon: List },
            { id: 'week', label: 'Week', icon: CalendarDays },
            { id: 'month', label: 'Month', icon: CalendarIcon },
            { id: 'year', label: 'Year', icon: LayoutGrid }
          ].map((v) => (
            <TabsTrigger
              key={v.id}
              value={v.id}
            >
              <v.icon data-icon="inline-start" aria-hidden="true" />
              {v.label}
            </TabsTrigger>
          ))}
          </TabsList>
        </Tabs>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        {/* --- LIST VIEW --- */}
        {viewMode === 'list' && (
          <>
          <CardHeader className="border-border border-b">
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>{events.length} total</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 py-4">
            {isLoading ? (
              <p className="text-muted-foreground m-0 text-sm">Loading…</p>
            ) : events.length === 0 ? (
              <p className="text-muted-foreground m-0 py-8 text-center text-sm">No upcoming events found.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {[...events].sort((a,b) => new Date(a.date) - new Date(b.date)).map((ev, i) => (
                  <Card key={ev.id || i} size="sm" className="bg-muted/30">
                    <CardContent className="flex min-w-0 items-start gap-4">
                    <div className="min-w-24 shrink-0">
                      <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                        {new Date(ev.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-foreground font-semibold">
                        {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {new Date(ev.date).getFullYear() !== today.getFullYear() && (
                        <div className="text-muted-foreground text-xs">{new Date(ev.date).getFullYear()}</div>
                      )}
                    </div>
                    <div className="border-border min-w-0 flex-1 border-l pl-4">
                      <h3 className="text-foreground m-0 truncate font-medium" title={ev.title}>{ev.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={ev.type === 'virtual' ? 'blue' : 'indigo'} showDot>
                          {ev.type === 'virtual' ? 'Virtual' : 'On-Campus'}
                        </StatusBadge>
                        <StatusBadge status={ev.status} showDot>
                          {ev.status}
                        </StatusBadge>
                      </div>
                    </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
          </>
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
      </Card>

      <Card size="sm" className="bg-muted/30">
        <CardContent className="text-muted-foreground">
          Tip: Use <strong className="text-foreground">Browse Drives</strong> to apply to upcoming events. This calendar is a read-only snapshot for planning.
        </CardContent>
      </Card>
    </div>
  );
}
