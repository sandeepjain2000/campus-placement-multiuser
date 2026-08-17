'use client';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { EmployerCalendarGrid } from '@/components/employer/EmployerCalendarGrid';
import { getInitialCalendarCursorFromIsoDates } from '@/lib/calendarInitialCursor';
import { formatDate } from '@/lib/utils';
import CompanyNameLink from '@/components/CompanyNameLink';
import { swrFetcher } from '@/lib/fetchJson';
import { CalendarDays, List } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function StudentInterviewsPage() {
  const [view, setView] = useState('list');
  const { data, isLoading, error } = useSWR('/api/student/interviews', swrFetcher);
  const myInterviews = Array.isArray(data?.interviews) ? data.interviews : [];

  const calItems = useMemo(
    () =>
      myInterviews.map((i) => ({
        id: i.id,
        date: i.date,
        title: `${i.company} — ${i.round}`,
        time: i.time,
        meta: `${i.mode} · ${i.location}`,
      })),
    [myInterviews],
  );

  const { initialYear, initialMonth } = useMemo(
    () => getInitialCalendarCursorFromIsoDates(myInterviews.map((i) => i.date)),
    [myInterviews],
  );

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayInterviews,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(myInterviews, {
    getSearchText: (i) => [i.company, i.round, i.mode, i.location, i.status].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <CalendarDays className="text-muted-foreground size-7" strokeWidth={1.5} />
            My Interviews
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">Track date, time, company, and interview status.</p>
        </div>
        <div className="bg-muted flex w-fit rounded-lg p-1" role="group" aria-label="Interview view">
            <Button type="button" size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <List data-icon="inline-start" />
              List
            </Button>
            <Button type="button" size="sm" variant={view === 'calendar' ? 'secondary' : 'ghost'} aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>
              <CalendarDays data-icon="inline-start" />
              Calendar
            </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load interviews</AlertTitle>
          <AlertDescription>{error.message || 'Try again later.'}</AlertDescription>
        </Alert>
      ) : null}

      {view === 'calendar' ? (
        <EmployerCalendarGrid items={calItems} initialYear={initialYear} initialMonth={initialMonth} />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-base">Interview schedule</CardTitle>
            <CardDescription>{isLoading ? 'Loading…' : `${filteredCount} of ${totalCount} interviews`}</CardDescription>
          {!isLoading && totalCount > 0 ? (
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search company, round, or status…"
              sort={sort}
              onSortChange={setSort}
              sortOptions={COMMON_SORT_OPTIONS}
              filteredCount={filteredCount}
              totalCount={totalCount}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
          ) : null}
          </CardHeader>
          <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Location / venue</TableHead>
                <TableHead className="min-w-[6.5rem]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayInterviews.length === 0 && totalCount > 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                    No interviews match your search.
                  </TableCell>
                </TableRow>
              ) : null}
              {displayInterviews.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-semibold" data-label="Company">
                    <CompanyNameLink name={i.company} website={i.website} />
                  </TableCell>
                  <TableCell data-label="Round">{i.round}</TableCell>
                  <TableCell data-label="Date">{formatDate(i.date)}</TableCell>
                  <TableCell data-label="Time">{i.time}</TableCell>
                  <TableCell data-label="Mode">{i.mode}</TableCell>
                  <TableCell className="max-w-[17.5rem] truncate text-sm" data-label="Location">{i.location || '—'}</TableCell>
                  <TableCell className="min-w-[6.5rem]" data-label="Status">
                    <StatusBadge status={i.status || 'scheduled'} showDot>{i.status || 'Scheduled'}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && totalCount === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">No interview schedule found.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
