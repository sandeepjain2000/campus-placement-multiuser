'use client';
import { useCallback, useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { EmployerCalendarGrid } from '@/components/employer/EmployerCalendarGrid';
import { formatDate, formatStatus } from '@/lib/utils';
import { Search, Filter, Calendar as CalendarIcon, List as ListIcon, CalendarDays, CalendarRange, MapPin, Clock, Video } from 'lucide-react';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { reportClientApiFailure } from '@/lib/clientPlatformErrorReport';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const CALENDAR_API = '/api/employer/calendar';

const fetcher = async (url) => {
  let json = {};
  try {
    const res = await fetch(url);
    json = await res.json().catch(() => ({}));
    if (!res.ok) {
      void reportClientApiFailure({
        context: PLATFORM_ERROR_CONTEXT.EMPLOYER_CALENDAR,
        route: url,
        statusCode: res.status,
        responseBody: json,
      });
      throw new Error(json?.userMessage || json?.error || 'Failed to load calendar events');
    }
    return json;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Failed to load calendar')) throw err;
    void reportClientApiFailure({
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_CALENDAR,
      route: url,
      message: err instanceof Error ? err.message : 'Network error loading calendar',
    });
    throw err instanceof Error ? err : new Error('Failed to load calendar events');
  }
};

export default function EmployerCalendarPage() {
  const { data, isLoading, error } = useSWR(CALENDAR_API, fetcher);
  const events = Array.isArray(data?.events) ? data.events : [];
  const now = new Date();
  const [view, setView] = useState('list'); // 'list', 'month', 'week', 'year'
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const formatModeLabel = useCallback((mode) => {
    const raw = String(mode || '').trim().toLowerCase();
    if (!raw) return '—';
    if (raw === 'on_campus') return 'On Campus';
    if (raw === 'off_campus') return 'Off Campus';
    return formatStatus(raw);
  }, []);

  const collegeOptions = useMemo(() => {
    const uniq = Array.from(new Set(events.map((e) => String(e.college || '').trim()).filter(Boolean)));
    return uniq.sort((a, b) => a.localeCompare(b));
  }, [events]);

  const filteredEvents = useMemo(() => {
    let result = events;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e => 
        (e.title || '').toLowerCase().includes(q) || 
        (e.college || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter(e => e.type === typeFilter);
    }
    if (collegeFilter) {
      result = result.filter((e) => String(e.college || '') === collegeFilter);
    }
    if (modeFilter) {
      result = result.filter((e) => String(e.mode || '') === modeFilter);
    }
    if (dateFrom) {
      result = result.filter((e) => String(e.date || '') >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((e) => String(e.date || '') <= dateTo);
    }
    return result;
  }, [events, search, typeFilter, collegeFilter, modeFilter, dateFrom, dateTo]);

  const getCalendarCsv = useCallback(
    (_scope) => ({
      headers: ['Title', 'College', 'Date', 'Time', 'Type', 'Mode'],
      rows: filteredEvents.map((e) => [e.title, e.college, e.date, e.time, e.type, e.mode]),
    }),
    [filteredEvents],
  );

  const calItems = filteredEvents.map((e) => ({
    id: e.id,
    date: e.date,
    title: e.title,
    time: e.time,
    type: e.type,
    mode: e.mode,
    meta: `${formatStatus(e.type)} · ${formatModeLabel(e.mode)}`,
    college: e.college
  }));

  // Group filtered events by YYYY-MM for the list view
  const eventsByMonth = useMemo(() => {
    const groups = {};
    for (const e of filteredEvents) {
      if (!e.date) continue;
      const [y, m] = e.date.split('-');
      const key = `${y}-${m}`;
      if (!groups[key]) groups[key] = { year: parseInt(y, 10), month: parseInt(m, 10) - 1, events: [] };
      groups[key].events.push(e);
    }
    // Sort keys chronologically
    return Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [filteredEvents]);

  const handleCursorChange = useCallback((y, m) => {
    setCurrentYear(y);
    setCurrentMonth(m);
  }, []);

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <CalendarDays className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Employer events
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Manage company events, interviews, campus drives, and milestones.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportCsvSplitButton
            filenameBase="employer_events"
            currentCount={filteredEvents.length}
            fullCount={events.length}
            getRows={getCalendarCsv}
          />
          <Button disabled>+ Add event</Button>
        </div>
      </div>

      {/* Unified Toolbar & Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar Controls</CardTitle>
          <CardDescription>Choose a view and narrow events by campus, mode, or date.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={view} onValueChange={setView}>
              <TabsList aria-label="Calendar view">
                <TabsTrigger value="list"><ListIcon aria-hidden /> List</TabsTrigger>
                <TabsTrigger value="month"><CalendarIcon aria-hidden /> Month</TabsTrigger>
                <TabsTrigger value="week"><CalendarDays aria-hidden /> Week</TabsTrigger>
                <TabsTrigger value="year"><CalendarRange aria-hidden /> Year</TabsTrigger>
              </TabsList>
            </Tabs>
            <Badge variant="secondary">
              {filteredEvents.length} events
            </Badge>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Field className="min-w-[14rem] flex-[2] basis-[14rem]">
              <FieldLabel htmlFor="calendar-search">Search events</FieldLabel>
              <Input
                id="calendar-search"
                name="calendar-search"
                type="text"
                placeholder="Search events or colleges…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
            <Field className="min-w-[10rem] flex-1 basis-[10rem]">
              <FieldLabel htmlFor="calendar-status">Status</FieldLabel>
              <AdminFilterSelect
                id="calendar-status"
                className="h-9 w-full"
                value={typeFilter}
                onValueChange={setTypeFilter}
                items={[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Scheduled', value: 'scheduled' },
                  { label: 'Approved', value: 'approved' },
                  { label: 'Completed', value: 'completed' },
                ]}
              />
            </Field>
            <Field className="min-w-[10rem] flex-1 basis-[10rem]">
              <FieldLabel htmlFor="calendar-mode">Mode</FieldLabel>
              <AdminFilterSelect
                id="calendar-mode"
                className="h-9 w-full"
                value={modeFilter}
                onValueChange={setModeFilter}
                items={[
                  { label: 'All Modes', value: 'all' },
                  { label: 'On Campus', value: 'on_campus' },
                  { label: 'Virtual', value: 'virtual' },
                ]}
              />
            </Field>
            <Field className="min-w-[10rem] flex-1 basis-[10rem]">
              <FieldLabel htmlFor="calendar-college">College</FieldLabel>
              <AdminFilterSelect
                id="calendar-college"
                className="h-9 w-full"
                value={collegeFilter}
                onValueChange={setCollegeFilter}
                items={[
                  { label: 'All Colleges', value: 'all' },
                  ...collegeOptions.map((college) => ({ label: college, value: college })),
                ]}
              />
            </Field>
            <Field className="min-w-[18rem] flex-[2] basis-[18rem]">
              <FieldLabel>Date range</FieldLabel>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="min-w-[9.5rem] flex-1">
                  <ValidatedDateInput
                    fieldId={FIELD_IDS.DATE_RANGE_FROM}
                    context={{ dateTo, maxSpanYears: 2 }}
                    value={dateFrom}
                    onChange={setDateFrom}
                    className="w-full min-w-0"
                  />
                </div>
                <span className="text-muted-foreground text-sm">to</span>
                <div className="min-w-[9.5rem] flex-1">
                  <ValidatedDateInput
                    fieldId={FIELD_IDS.DATE_RANGE_TO}
                    context={{ dateFrom, maxSpanYears: 2 }}
                    value={dateTo}
                    onChange={setDateTo}
                    className="w-full min-w-0"
                  />
                </div>
              </div>
            </Field>
            <div className="flex shrink-0 items-end">
              <Button
                type="button"
                variant="ghost"
                disabled={!(search || typeFilter || collegeFilter || modeFilter || dateFrom || dateTo)}
                onClick={() => {
                  setSearch('');
                  setTypeFilter('');
                  setCollegeFilter('');
                  setModeFilter('');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? <Card><CardContent className="text-muted-foreground py-12 text-center">Loading your calendar…</CardContent></Card> : null}
      {error ? <Alert variant="destructive"><AlertDescription>{error.message || 'Could not load events.'}</AlertDescription></Alert> : null}
      
      {/* Calendar Grid Views */}
      {!isLoading && !error && view !== 'list' ? (
        <Card className="gap-0 overflow-hidden py-0">
          <EmployerCalendarGrid 
            items={calItems} 
            initialYear={currentYear} 
            initialMonth={currentMonth} 
            viewMode={view} 
            onCursorChange={handleCursorChange} 
            onChangeView={setView}
          />
        </Card>
      ) : null}

      {/* Modern List View */}
      {!isLoading && !error && view === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {eventsByMonth.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-16 text-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-600)' }}>
                <CalendarIcon size={32} />
              </div>
              <div>
                <CardTitle className="text-lg">No events found</CardTitle>
                <CardDescription className="mt-2">Try adjusting your filters or search query.</CardDescription>
              </div>
              </CardContent>
            </Card>
          ) : (
            eventsByMonth.map((group) => {
              const monthLabel = new Date(group.year, group.month).toLocaleString('default', { month: 'long', year: 'numeric' });
              return (
                <section key={`${group.year}-${group.month}`} className="animate-fadeIn">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {monthLabel}
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentYear(group.year);
                        setCurrentMonth(group.month);
                        setView('month');
                      }}
                    >
                      <CalendarIcon data-icon="inline-start" />
                      View in Calendar
                    </Button>
                  </div>
                  
                  {/* Event Cards Grid */}
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {group.events.map((e) => (
                      <Card key={e.id}>
                        <CardHeader className="flex-row items-start justify-between gap-3">
                          <CardTitle className="text-base">{e.title}</CardTitle>
                          <StatusBadge status={e.type} showDot>
                            {formatStatus(e.type) || '—'}
                          </StatusBadge>
                        </CardHeader>
                        <CardContent className="text-muted-foreground flex flex-col gap-3 text-sm">
                          {e.college && (
                            <div className="text-foreground flex items-center gap-2 font-medium">
                              <MapPin aria-hidden />
                              <span>{e.college}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <CalendarIcon aria-hidden />
                            <span>{formatDate(e.date)}</span>
                          </div>
                          {e.time && (
                            <div className="flex items-center gap-2">
                              <Clock aria-hidden />
                              <span>{e.time}</span>
                            </div>
                          )}
                          {e.mode && (
                            <div className="flex items-center gap-2">
                              {e.mode === 'virtual' ? <Video aria-hidden /> : <MapPin aria-hidden />}
                              <span>{formatModeLabel(e.mode)}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
