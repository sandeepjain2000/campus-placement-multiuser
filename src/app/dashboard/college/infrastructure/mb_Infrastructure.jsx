'use client';
import { useState, useEffect } from 'react';
import MobileHeader from '@/components/mobile/MobileHeader';
import InfrastructureResourceManager from '@/components/college/InfrastructureResourceManager';
import { CalendarDays, MapPin, Trash2, Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';

export default function mb_Infrastructure() {
  const { addToast } = useToast();
  const [assets, setAssets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const res = await fetch('/api/college/infrastructure');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        if (!mounted) return;
        setAssets(Array.isArray(json.assets) ? json.assets : []);
        setBookings((Array.isArray(json.bookings) ? json.bookings : []).sort((a, b) => new Date(a.date) - new Date(b.date)));
      } catch (e) {
        if (!mounted) return;
        addToast(e.message || 'Failed to load infrastructure data', 'error');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [addToast]);

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
      addToast('Please fill out all required fields.', 'warning');
      return;
    }
    if (startTime >= endTime) {
      addToast('End time must be after start time.', 'warning');
      return;
    }
    if (checkOverlap(roomId, date, startTime, endTime)) {
      addToast('CLASH DETECTED: Room already booked during this time.', 'error');
      return;
    }

    const roomInfo = assets.find((a) => a.id === roomId);
    try {
      const res = await fetch('/api/college/infrastructure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId, roomName: roomInfo?.name || 'Unknown Room',
          date, startTime, endTime, company, description, channels: [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create booking');
      setBookings((prev) => [...prev, json.booking].sort((a, b) => new Date(a.date) - new Date(b.date)));
      addToast('Booking created successfully', 'success');
      setShowForm(false);
      setRoomId(''); setDate(''); setStartTime(''); setEndTime(''); setCompany(''); setDescription('');
    } catch (err) {
      addToast(err.message || 'Failed to create booking', 'error');
    }
  };

  const handleCancel = async (id) => {
    try {
      const res = await fetch('/api/college/infrastructure', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to cancel booking');
      setBookings(bookings.filter((b) => b.id !== id));
      addToast('Booking cancelled', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to cancel booking', 'error');
    }
  };

  return (
    <>
      <MobileHeader 
        title="Infrastructure" 
        action={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (!showForm && assets.length === 0) {
                addToast('Add a campus resource (room/lab) first.', 'warning');
                return;
              }
              setShowForm(!showForm);
            }}
          >
            <Plus size={16} /> {showForm ? 'Cancel' : 'Book'}
          </button>
        } 
      />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        <InfrastructureResourceManager assets={assets} onAssetsChange={setAssets} compact />

        {showForm && (
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--primary-300)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>New Booking</h3>
            <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select
                className="form-select"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={assets.length === 0}
              >
                <option value="" disabled>
                  {assets.length === 0 ? 'Add a resource above first' : '-- Select Room --'}
                </option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Cap: {a.capacity ?? '—'})
                  </option>
                ))}
              </select>
              <input className="form-input" placeholder="Event / Company Name" value={company} onChange={(e) => setCompany(e.target.value)} />
              <ValidatedDateInput
                fieldId={FIELD_IDS.COLLEGE_INFRA_DATE}
                value={date}
                onChange={setDate}
                aria-label="Booking date"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="text-xs text-secondary mb-1 block">Start Time</label>
                  <input className="form-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-secondary mb-1 block">End Time</label>
                  <input className="form-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
              <input className="form-input" placeholder="Remarks (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Reserve Resource</button>
            </form>
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: '12px' }} />)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CalendarDays size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No bookings yet</div>
            <p className="text-sm text-secondary" style={{ margin: '0 0 1rem' }}>
              Add a resource above, then tap Book to schedule a drive or event.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (assets.length === 0) {
                  addToast('Add a campus resource first.', 'warning');
                  return;
                }
                setShowForm(true);
              }}
            >
              <Plus size={14} style={{ marginRight: 4 }} />
              New booking
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {bookings.map((b) => (
              <div key={b.id} className="card" style={{ padding: '1rem', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{b.company}</div>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.25rem', color: 'var(--danger-500)', height: 'auto' }} onClick={() => setCancelTargetId(b.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarDays size={14} style={{ opacity: 0.7 }} />
                    <span>{formatDate(b.date)} • {b.startTime} - {b.endTime}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} style={{ opacity: 0.7 }} />
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{b.roomName}</span>
                  </div>
                </div>

                {b.description && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {b.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(cancelTargetId)}
        title="Cancel Booking"
        message="Are you sure you want to cancel this infrastructure booking?"
        confirmLabel="Cancel Booking"
        onCancel={() => setCancelTargetId(null)}
        onConfirm={async () => {
          if (!cancelTargetId) return;
          const id = cancelTargetId;
          setCancelTargetId(null);
          await handleCancel(id);
        }}
      />
    </>
  );
}
