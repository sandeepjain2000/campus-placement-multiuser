'use client';

import { useState, useMemo, useEffect } from 'react';
import { formatDate } from '@/lib/utils';

const CHANNELS = [
  { id: 'web', label: 'Web' },
  { id: 'twitter', label: 'X' },
  { id: 'facebook', label: 'FB' },
  { id: 'instagram', label: 'IG' },
  { id: 'linkedin', label: 'LI' },
];

const SOCIAL_PLATFORMS = [
  { id: 'twitter', name: 'X (Twitter)', accent: '#000' },
  { id: 'facebook', name: 'Facebook', accent: '#1877f2' },
  { id: 'instagram', name: 'Instagram', accent: '#e4405f' },
  { id: 'linkedin', name: 'LinkedIn', accent: '#0a66c2' },
];

function emptyChannelsMap(bookings) {
  return Object.fromEntries(bookings.map((b) => [b.id, b.channels || []]));
}

function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const pad = first.getDay();
  const daysInMonth = last.getDate();
  const cells = [];
  for (let i = 0; i < pad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  return cells;
}

function bookingsForDay(bookings, year, monthIndex, day) {
  if (!day) return [];
  const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return bookings.filter((b) => b.date === iso);
}

export default function CollegeInfrastructurePage() {
  const [assets, setAssets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [channelToggles, setChannelToggles] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(7);

  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/college/infrastructure');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load infrastructure data');
        if (!mounted) return;
        const loadedAssets = Array.isArray(json.assets) ? json.assets : [];
        const loadedBookings = Array.isArray(json.bookings) ? json.bookings : [];
        setAssets(loadedAssets);
        setBookings(loadedBookings.sort((a, b) => new Date(a.date) - new Date(b.date)));
        setChannelToggles(emptyChannelsMap(loadedBookings));
      } catch (e) {
        if (!mounted) return;
        setErrorMsg(e.message || 'Failed to load infrastructure data');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const monthCells = useMemo(() => buildMonthGrid(calYear, calMonth), [calYear, calMonth]);
  const monthLabel = useMemo(
    () => new Date(calYear, calMonth, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    [calYear, calMonth],
  );

  const shiftMonth = (delta) => {
    const d = new Date(calYear, calMonth + delta, 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  };

  const toggleChannel = async (bookingId, ch) => {
    const cur = channelToggles[bookingId] || [];
    const has = cur.includes(ch);
    const next = has ? cur.filter((c) => c !== ch) : [...cur, ch];
    setChannelToggles((prev) => ({ ...prev, [bookingId]: next }));
    try {
      const res = await fetch('/api/college/infrastructure', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId, channels: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save channels');
    } catch (e) {
      setErrorMsg(e.message || 'Failed to save channels');
      setChannelToggles((prev) => ({ ...prev, [bookingId]: cur }));
    }
  };

  const bookingsForChannel = (ch) =>
    bookings.filter((b) => (channelToggles[b.id] || []).includes(ch));

  const checkOverlap = (rId, d, start, end) =>
    bookings.some((b) => {
      if (b.roomId === rId && b.date === d) {
        return start < b.endTime && end > b.startTime;
      }
      return false;
    });

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!roomId || !date || !startTime || !endTime || !company) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    if (startTime >= endTime) {
      setErrorMsg('End time must be after start time.');
      return;
    }

    if (checkOverlap(roomId, date, startTime, endTime)) {
      setErrorMsg('CLASH DETECTED: This room is already booked during the requested timeframe.');
      return;
    }

    const roomInfo = assets.find((a) => a.id === roomId);
    try {
      const res = await fetch('/api/college/infrastructure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          roomName: roomInfo?.name || 'Unknown Room',
          date,
          startTime,
          endTime,
          company,
          description,
          channels: [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create booking');
      const newBooking = json.booking;
      setBookings((prev) => [...prev, newBooking].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setChannelToggles((prev) => ({ ...prev, [newBooking.id]: [] }));
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create booking');
      return;
    }

    setShowForm(false);
    setErrorMsg('');
    setRoomId('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setCompany('');
    setDescription('');
  };

  const handleCancel = async (id) => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      try {
        const res = await fetch('/api/college/infrastructure', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to cancel booking');
      } catch (e) {
        setErrorMsg(e.message || 'Failed to cancel booking');
        return;
      }

      setBookings(bookings.filter((b) => b.id !== id));
      setChannelToggles((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="wireframe-banner" role="note">
        <span className="badge badge-gray" style={{ flexShrink: 0 }}>Wireframe</span>
        <div>
          <strong>Live bookings with visual previews.</strong>
          {' '}
          Bookings and channel selections persist to the database. Website and social cards remain visual previews only
          (they do not publish to external platforms yet).
        </div>
      </div>

      <div className="page-header">
        <div className="page-header-left">
          <h1>🏛️ Infrastructure & Logistics</h1>
          <p>Book rooms, labs, and auditoriums. Bookings persist and appear in calendar and preview channels.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel Creation' : '+ New Booking'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--primary-500)' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Create Infrastructure Booking</h3>
          {errorMsg && (
            <div className="badge badge-amber" style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', justifyContent: 'center' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <form className="grid grid-2" onSubmit={handleBooking}>
            <div className="form-group">
              <label className="form-label">Select Resource <span className="required">*</span></label>
              <select className="form-select" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                <option value="" disabled>-- Select a Room/Lab --</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Capacity: {a.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Corporate / Event Name <span className="required">*</span></label>
              <input className="form-input" placeholder="e.g. Google India Drive" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Date <span className="required">*</span></label>
              <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="form-group">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Start Time <span className="required">*</span></label>
                  <input className="form-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">End Time <span className="required">*</span></label>
                  <input className="form-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description / Remarks</label>
              <input className="form-input" placeholder="e.g. Need 2 projectors, specific internet access..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Reserve Resource</button>
            </div>
          </form>
        </div>
      )}

      {/* Calendar wireframe */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>Calendar view</h3>
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              Wireframe month grid — bookings shown as chips for layout only (not a synced calendar service).
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-gray">Wireframe</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">←</button>
            <span className="text-sm font-semibold" style={{ minWidth: '10rem', textAlign: 'center' }}>{monthLabel}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => shiftMonth(1)} aria-label="Next month">→</button>
          </div>
        </div>

        <div className="wireframe-panel">
          <div className="wireframe-panel-inner" style={{ padding: '0.75rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.35rem',
                marginBottom: '0.5rem',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} style={{ textAlign: 'center' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
              {monthCells.map((day, idx) => {
                const dayBookings = day ? bookingsForDay(bookings, calYear, calMonth, day) : [];
                return (
                  <div
                    key={idx}
                    className={`wireframe-calendar-cell ${day ? '' : 'wireframe-calendar-cell--muted'}`}
                  >
                    {day != null && <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{day}</span>}
                    {dayBookings.map((b) => (
                      <span key={b.id} className="wireframe-calendar-chip" title={b.description}>
                        {b.company}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Website wireframe */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>College website (preview)</h3>
          <span className="badge badge-gray">Wireframe</span>
        </div>
        <p className="text-sm text-secondary" style={{ marginTop: 0, marginBottom: '1rem' }}>
          Static browser chrome and placeholder blocks. Configure URLs under College Settings; no live site or API calls here.
        </p>
        <div className="wireframe-panel" style={{ overflow: 'hidden' }}>
          <div className="wireframe-browser-chrome">
            <div className="wireframe-browser-dots" aria-hidden>
              <span /><span /><span />
            </div>
            <div
              style={{
                flex: 1,
                padding: '0.25rem 0.75rem',
                background: 'var(--bg-primary)',
                borderRadius: '4px',
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              https://college.example.edu/placement — wireframe
            </div>
          </div>
          <div className="wireframe-panel-inner" style={{ borderRadius: 0, margin: 0 }}>
            <div className="wireframe-block" style={{ height: '3rem', width: '40%', marginBottom: '1rem' }} />
            <div className="wireframe-block" style={{ width: '85%' }} />
            <div className="wireframe-block" style={{ width: '70%' }} />
            <div className="wireframe-block" style={{ width: '90%' }} />
            <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
              <div className="text-xs text-tertiary" style={{ marginBottom: '0.5rem' }}>Wireframe “announcements” (from bookings with Web checked)</div>
              {bookingsForChannel('web').length === 0 ? (
                <div className="text-sm text-secondary">No items flagged for the website wireframe. Use the toggles in the booking list below.</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem' }}>
                  {bookingsForChannel('web').map((b) => (
                    <li key={b.id}>{b.company} — {formatDate(b.date)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Social wireframes */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>College social channels (preview)</h3>
          <p className="text-sm text-secondary" style={{ margin: 0 }}>
            Static post shells for X, Facebook, Instagram, and LinkedIn — labeled wireframe. No tokens, no posting, no feeds.
            Check channels on a booking to simulate copy that could appear in a future integration.
          </p>
        </div>
        <div className="grid grid-2" style={{ gap: '1rem' }}>
          {SOCIAL_PLATFORMS.map((p) => (
            <div key={p.id} className="wireframe-panel">
              <div className="wireframe-panel-inner">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span className="font-semibold text-sm" style={{ color: p.accent }}>{p.name}</span>
                  <span className="badge badge-gray">Wireframe</span>
                </div>
                <div className="wireframe-social-post">
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} aria-hidden />
                    <div style={{ flex: 1 }}>
                      <div className="wireframe-block" style={{ width: '45%' }} />
                      <div className="wireframe-block" style={{ width: '30%', height: '0.35rem' }} />
                    </div>
                  </div>
                  <div className="wireframe-block" style={{ width: '100%' }} />
                  <div className="wireframe-block" style={{ width: '92%' }} />
                  <div className="wireframe-block" style={{ width: '60%' }} />
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-default)' }}>
                    <div className="text-xs text-tertiary" style={{ marginBottom: '0.35rem' }}>Simulated cross-posts (this channel)</div>
                    {bookingsForChannel(p.id).length === 0 ? (
                      <span className="text-sm text-secondary">—</span>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem' }}>
                        {bookingsForChannel(p.id).map((b) => (
                          <li key={b.id}>{b.company} · {formatDate(b.date)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings list */}
      <div className="card">
        <h3 className="card-title">Existing Bookings Schedule</h3>
        <p className="text-sm text-secondary" style={{ marginTop: '0.35rem' }}>
          Wireframe channels: choose where a <strong>dummy</strong> preview would surface (website or social shells above). This does not publish or call APIs.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {bookings.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
              }}
            >
              <div style={{ flex: '0 0 120px' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{formatDate(b.date)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                  {b.startTime} - {b.endTime}
                </div>
              </div>

              <div style={{ flex: '1 1 200px', paddingLeft: '1rem', borderLeft: '3px solid var(--primary-500)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{b.company}</span>
                  <span className="badge badge-indigo">{b.roomName}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{b.description}</div>
                <div style={{ marginTop: '0.65rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="text-xs text-tertiary" style={{ marginRight: '0.25rem' }}>Wireframe publish targets:</span>
                  {CHANNELS.map((ch) => {
                    const on = (channelToggles[b.id] || []).includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        className={`btn btn-sm ${on ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}
                        onClick={() => toggleChannel(b.id, ch.id)}
                      >
                        {ch.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginLeft: 'auto' }}>
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-600)' }} onClick={() => handleCancel(b.id)}>
                  ✕ Cancel Booking
                </button>
              </div>
            </div>
          ))}
          {!isLoading && bookings.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No upcoming bookings scheduled.</p>
          )}
        </div>
      </div>
    </div>
  );
}
