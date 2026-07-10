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
    <div className="animate-fadeIn">
      {/* Premium Hero Banner */}
      <div 
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: 'var(--banner-gradient)',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Abstract Background Elements */}
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '5%', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <div style={{ 
          padding: '2.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ color: 'white' }}>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CalendarDays size={32} style={{ opacity: 0.9 }} /> Employer Events
              </h1>
              <p style={{ fontSize: '1.05rem', opacity: 0.9, margin: 0, fontWeight: 500, maxWidth: '600px' }}>
                Manage company events, interviews, campus drives, and milestones.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(10px)' }}>
                <ExportCsvSplitButton
                  filenameBase="employer_events"
                  currentCount={events.length}
                  fullCount={events.length}
                  getRows={getCalendarCsv}
                />
              </div>
              <button 
                className="btn" 
                disabled
                style={{ 
                  background: 'white', 
                  color: 'var(--primary-700)', 
                  fontWeight: 600,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  opacity: 0.5,
                  cursor: 'not-allowed'
                }}
              >
                + Add Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Toolbar & Filters */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
          {/* View Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="view-toggle" role="group" aria-label="View mode" style={{ background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
              <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="List View" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <ListIcon size={15} /> List
              </button>
              <button type="button" className={view === 'month' ? 'active' : ''} onClick={() => setView('month')} title="Monthly View" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <CalendarIcon size={15} /> Month
              </button>
              <button type="button" className={view === 'week' ? 'active' : ''} onClick={() => setView('week')} title="Weekly View" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <CalendarDays size={15} /> Week
              </button>
              <button type="button" className={view === 'year' ? 'active' : ''} onClick={() => setView('year')} title="Annual View" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <CalendarRange size={15} /> Year
              </button>
            </div>
            <span className="badge badge-gray" style={{ fontSize: '0.85rem' }}>
              {filteredEvents.length} events
            </span>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            <div className="search-box" style={{ position: 'relative', minWidth: '220px', flex: '1 1 auto', maxWidth: '300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="form-input form-input-sm"
                placeholder="Search events or colleges..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: 'var(--radius-md)' }}
              />
            </div>
            
            <div style={{ position: 'relative' }}>
              <Filter size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <select
                className="form-select form-input-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ paddingLeft: '2.25rem', width: '140px', borderRadius: 'var(--radius-md)' }}
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <select
              className="form-select form-input-sm"
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              style={{ width: '130px', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">All Modes</option>
              <option value="on_campus">On Campus</option>
              <option value="virtual">Virtual</option>
            </select>

            <select
              className="form-select form-input-sm"
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              style={{ width: '180px', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">All Colleges</option>
              {collegeOptions.map((college) => (
                <option key={college} value={college}>{college}</option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
              <ValidatedDateInput
                fieldId={FIELD_IDS.DATE_RANGE_FROM}
                context={{ dateTo, maxSpanYears: 2 }}
                className="form-input form-input-sm"
                value={dateFrom}
                onChange={setDateFrom}
              />
              <span className="text-secondary text-sm">to</span>
              <ValidatedDateInput
                fieldId={FIELD_IDS.DATE_RANGE_TO}
                context={{ dateFrom, maxSpanYears: 2 }}
                className="form-input form-input-sm"
                value={dateTo}
                onChange={setDateTo}
              />
            </div>

            {(search || typeFilter || collegeFilter || modeFilter || dateFrom || dateTo) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('');
                  setCollegeFilter('');
                  setModeFilter('');
                  setDateFrom('');
                  setDateTo('');
                }}
                style={{ color: 'var(--danger-600)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? <div className="card" style={{ padding: '3rem', textAlign: 'center' }}><p className="text-secondary">Loading your calendar...</p></div> : null}
      {error ? <div className="card" style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: 'var(--danger-600)' }}>{error.message || 'Could not load events.'}</p></div> : null}
      
      {/* Calendar Grid Views */}
      {!isLoading && !error && view !== 'list' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <EmployerCalendarGrid 
            items={calItems} 
            initialYear={currentYear} 
            initialMonth={currentMonth} 
            viewMode={view} 
            onCursorChange={handleCursorChange} 
            onChangeView={setView}
          />
        </div>
      ) : null}

      {/* Modern List View */}
      {!isLoading && !error && view === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {eventsByMonth.length === 0 ? (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-600)' }}>
                <CalendarIcon size={32} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>No events found</h3>
                <p className="text-secondary" style={{ margin: 0 }}>Try adjusting your filters or search query.</p>
              </div>
            </div>
          ) : (
            eventsByMonth.map((group) => {
              const monthLabel = new Date(group.year, group.month).toLocaleString('default', { month: 'long', year: 'numeric' });
              return (
                <div key={`${group.year}-${group.month}`} className="animate-fadeIn">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ width: '4px', height: '24px', background: 'var(--primary-500)', borderRadius: '4px' }} />
                      {monthLabel}
                    </h2>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => {
                        setCurrentYear(group.year);
                        setCurrentMonth(group.month);
                        setView('month');
                      }}
                      style={{ color: 'var(--primary-600)', fontWeight: 600 }}
                    >
                      <CalendarIcon size={16} style={{ marginRight: '0.4rem' }} />
                      View in Calendar
                    </button>
                  </div>
                  
                  {/* Event Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
                    {group.events.map((e) => (
                      <div key={e.id} className="card card-hover" style={{ padding: '1.5rem', borderLeft: `4px solid ${e.type === 'completed' ? 'var(--green-500)' : e.type === 'approved' ? 'var(--blue-500)' : 'var(--gray-400)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, lineHeight: 1.3 }}>{e.title}</h4>
                          <span className={`badge badge-${e.type === 'completed' ? 'green' : e.type === 'approved' ? 'blue' : 'gray'}`} style={{ whiteSpace: 'nowrap' }}>
                            {formatStatus(e.type)}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {e.college && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <MapPin size={16} style={{ color: 'var(--primary-500)' }} />
                              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.college}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CalendarIcon size={16} style={{ opacity: 0.7 }} />
                            <span>{formatDate(e.date)}</span>
                          </div>
                          {e.time && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Clock size={16} style={{ opacity: 0.7 }} />
                              <span>{e.time}</span>
                            </div>
                          )}
                          {e.mode && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {e.mode === 'virtual' ? <Video size={16} style={{ opacity: 0.7 }} /> : <MapPin size={16} style={{ opacity: 0.7 }} />}
                              <span>{formatModeLabel(e.mode)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
