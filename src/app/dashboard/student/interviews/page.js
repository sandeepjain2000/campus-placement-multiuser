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
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>👨‍🎓 My Interviews</h1>
          <p>Track date, time, company, and interview status.</p>
        </div>
        <div className="page-header-actions">
          <div className="view-toggle" role="group" aria-label="Interview view">
            <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
              List
            </button>
            <button type="button" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
              Calendar
            </button>
          </div>
        </div>
      </div>

      {view === 'calendar' ? (
        <EmployerCalendarGrid items={calItems} initialYear={initialYear} initialMonth={initialMonth} />
      ) : (
        <>
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
          <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Round</th>
                <th>Date</th>
                <th>Time</th>
                <th>Mode</th>
                <th>Location / venue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayInterviews.length === 0 && totalCount > 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-secondary">
                    No interviews match your search.
                  </td>
                </tr>
              ) : null}
              {displayInterviews.map((i) => (
                <tr key={i.id}>
                  <td className="font-semibold">
                    <CompanyNameLink name={i.company} website={i.website} />
                  </td>
                  <td>{i.round}</td>
                  <td>{formatDate(i.date)}</td>
                  <td>{i.time}</td>
                  <td>{i.mode}</td>
                  <td className="text-sm" style={{ maxWidth: '280px' }}>
                    {i.location}
                  </td>
                  <td>
                    <span className={`badge ${i.status === 'Completed' ? 'badge-green' : 'badge-blue'}`}>{i.status}</span>
                  </td>
                </tr>
              ))}
              {!isLoading && totalCount === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-secondary">
                    {error?.message || 'No interview schedule found. Try again later.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
