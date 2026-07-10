'use client';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { EmployerCalendarGrid } from '@/components/employer/EmployerCalendarGrid';
import { formatDate } from '@/lib/utils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load interviews');
  return json;
};

export default function StudentInterviewsPage() {
  const [view, setView] = useState('list');
  const { data, isLoading, error } = useSWR('/api/student/interviews', fetcher);
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
        <EmployerCalendarGrid items={calItems} initialYear={2026} initialMonth={8} />
      ) : (
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
              {myInterviews.map((i) => (
                <tr key={i.id}>
                  <td className="font-semibold">{i.company}</td>
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
              {!isLoading && myInterviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-secondary">
                    {error?.message || 'No interview schedule found.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
