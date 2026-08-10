'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';
import InfrastructureResourceManager from '@/components/college/InfrastructureResourceManager';
import { CampusCalendarGrid } from '@/components/calendar/CampusCalendarGrid';
import { infrastructureBookingsToCalendarItems } from '@/lib/calendarItems';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
const CHANNELS = [{
  id: 'web',
  label: 'Web'
}, {
  id: 'twitter',
  label: 'X'
}, {
  id: 'facebook',
  label: 'FB'
}, {
  id: 'instagram',
  label: 'IG'
}, {
  id: 'linkedin',
  label: 'LI'
}];
const SOCIAL_PLATFORMS = [{
  id: 'twitter',
  name: 'X (Twitter)',
  accent: '#000'
}, {
  id: 'facebook',
  name: 'Facebook',
  accent: '#1877f2'
}, {
  id: 'instagram',
  name: 'Instagram',
  accent: '#e4405f'
}, {
  id: 'linkedin',
  name: 'LinkedIn',
  accent: '#0a66c2'
}];
function normalizeExternalUrl(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
function emptyChannelsMap(bookings) {
  return Object.fromEntries(bookings.map(b => [b.id, b.channels || []]));
}
export default function CollegeInfrastructurePage() {
  const [assets, setAssets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [channelToggles, setChannelToggles] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [collegeComms, setCollegeComms] = useState({
    website: '',
    social: {
      twitter: '',
      facebook: '',
      instagram: '',
      linkedin: ''
    }
  });
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
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/college/settings');
        const json = await res.json();
        if (!res.ok || !mounted) return;
        setCollegeComms({
          website: (json.website || '').trim(),
          social: {
            twitter: json.social?.twitter || '',
            facebook: json.social?.facebook || '',
            instagram: json.social?.instagram || '',
            linkedin: json.social?.linkedin || ''
          }
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const websiteDisplay = useMemo(() => {
    const w = collegeComms.website;
    if (!w) return {
      href: '',
      label: ''
    };
    const href = normalizeExternalUrl(w);
    try {
      return {
        href,
        label: new URL(href).href.replace(/\/$/, '')
      };
    } catch {
      return {
        href,
        label: href
      };
    }
  }, [collegeComms.website]);
  const bookingCalItems = useMemo(() => infrastructureBookingsToCalendarItems(bookings), [bookings]);
  const toggleChannel = async (bookingId, ch) => {
    const cur = channelToggles[bookingId] || [];
    const has = cur.includes(ch);
    const next = has ? cur.filter(c => c !== ch) : [...cur, ch];
    setChannelToggles(prev => ({
      ...prev,
      [bookingId]: next
    }));
    try {
      const res = await fetch('/api/college/infrastructure', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: bookingId,
          channels: next
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save channels');
    } catch (e) {
      setErrorMsg(e.message || 'Failed to save channels');
      setChannelToggles(prev => ({
        ...prev,
        [bookingId]: cur
      }));
    }
  };
  const bookingsForChannel = ch => bookings.filter(b => (channelToggles[b.id] || []).includes(ch));
  const checkOverlap = (rId, d, start, end) => bookings.some(b => {
    if (b.roomId === rId && b.date === d) {
      return start < b.endTime && end > b.startTime;
    }
    return false;
  });
  const handleBooking = async e => {
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
    const roomInfo = assets.find(a => a.id === roomId);
    try {
      const res = await fetch('/api/college/infrastructure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId,
          roomName: roomInfo?.name || 'Unknown Room',
          date,
          startTime,
          endTime,
          company,
          description,
          channels: []
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create booking');
      const newBooking = json.booking;
      setBookings(prev => [...prev, newBooking].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setChannelToggles(prev => ({
        ...prev,
        [newBooking.id]: []
      }));
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
  const handleCancel = async id => {
    try {
      const res = await fetch('/api/college/infrastructure', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to cancel booking');
    } catch (e) {
      setErrorMsg(e.message || 'Failed to cancel booking');
      return;
    }
    setBookings(bookings.filter(b => b.id !== id));
    setChannelToggles(prev => {
      const next = {
        ...prev
      };
      delete next[id];
      return next;
    });
  };
  return <div className="animate-fadeIn">
      <div className="infra-context-note" role="note">
        <StatusBadge style={{
        flexShrink: 0
      }} tone="gray">Note</StatusBadge>
        <div>
          <strong>Room bookings are saved to your database.</strong>
          {' '}
          Use the calendar and sections below to see which bookings you have marked for your public website and social destinations
          configured in{' '}
          <Link href="/dashboard/college/settings" className="text-primary-600" style={{
          fontWeight: 600
        }}>
            College Settings
          </Link>
          . PlacementHub does not post to third-party platforms from this page.
        </div>
      </div>

      <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      marginBottom: '1.25rem',
      alignItems: 'center'
    }}>
        <Button type="button" onClick={() => {
        if (assets.length === 0) {
          setErrorMsg('Add at least one campus resource (room/lab) before booking.');
          return;
        }
        setShowForm(true);
        setErrorMsg('');
      }}>
          + New booking
        </Button>
        <Button type="button" onClick={() => setShowForm(false)} variant="outline">
          {showForm ? 'Hide booking form' : 'View calendar below'}
        </Button>
      </div>

      <InfrastructureResourceManager assets={assets} onAssetsChange={setAssets} />

      {/* Editorial page header */}
      <div style={{
      position: 'relative',
      background: 'var(--card)',
      borderRadius: 'var(--radius-xl)',
      padding: '2.5rem',
      color: 'var(--foreground)',
      overflow: 'hidden',
      marginBottom: '1.5rem',
      boxShadow: 'var(--shadow-xs)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1.5rem'
    }}>
        <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '250px',
        height: '250px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)',
        borderRadius: '50%'
      }} />
        <div style={{
        position: 'relative',
        zIndex: 1
      }}>
          <h1 style={{
          color: 'var(--foreground)',
          fontSize: '2.25rem',
          fontWeight: 800,
          margin: '0 0 0.5rem',
          letterSpacing: '-0.02em'
        }}>🏛️ Infrastructure & Logistics</h1>
          <p style={{
          fontSize: '1rem',
          color: 'var(--muted-foreground)',
          margin: 0
        }}>Book rooms, labs, and auditoriums. Tag each booking with announcement destinations.</p>
        </div>
        <Button type="button" onClick={() => {
        if (!showForm && assets.length === 0) {
          setErrorMsg('Add at least one campus resource above before booking.');
          return;
        }
        setShowForm(!showForm);
        if (!showForm) setErrorMsg('');
      }} style={{
        position: 'relative',
        zIndex: 1
      }}>
          {showForm ? 'Cancel' : '+ New Booking'}
        </Button>
      </div>

      {showForm && <Card style={{
      marginBottom: '1.5rem',
      border: '1px solid var(--primary-500)'
    }}><CardContent>
          <CardTitle style={{
          marginBottom: '1rem'
        }}>Create Infrastructure Booking</CardTitle>
          {errorMsg && <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>}

          <form className="grid grid-2" onSubmit={handleBooking}>
            <Field>
              <FieldLabel>Select Resource <span className="required">*</span></FieldLabel>
              <AdminFilterSelect
                className="w-full"
                value={roomId}
                onValueChange={setRoomId}
                disabled={assets.length === 0}
                items={[
                  { label: assets.length === 0 ? 'Add a resource above first' : '-- Select a Room/Lab --', value: 'all' },
                  ...assets.map((a) => ({
                    label: `${a.name} (Capacity: ${a.capacity})`,
                    value: a.id,
                  })),
                ]}
              />
            </Field>

            <Field>
              <FieldLabel>Corporate / Event Name <span className="required">*</span></FieldLabel>
              <Input placeholder="e.g. Google India Drive" value={company} onChange={e => setCompany(e.target.value)} />
            </Field>

            <Field>
              <FieldLabel>Date <span className="required">*</span></FieldLabel>
              <ValidatedDateInput fieldId={FIELD_IDS.COLLEGE_INFRA_DATE} value={date} onChange={setDate} aria-label="Booking date" />
            </Field>

            <Field>
              <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}>
                <div>
                  <FieldLabel>Start Time <span className="required">*</span></FieldLabel>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>End Time <span className="required">*</span></FieldLabel>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
            </Field>

            <Field style={{
            gridColumn: '1 / -1'
          }}>
              <FieldLabel>Description / Remarks</FieldLabel>
              <Input placeholder="e.g. Need 2 projectors, specific internet access..." value={description} onChange={e => setDescription(e.target.value)} />
            </Field>

            <div style={{
            gridColumn: '1 / -1',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem'
          }}>
              <Button type="button" onClick={() => setShowForm(false)} variant="outline">Cancel</Button>
              <Button type="submit">Reserve Resource</Button>
            </div>
          </form>
        </CardContent></Card>}

      {/* Calendar — defaults to current month */}
      <Card style={{
      marginBottom: '1.5rem'
    }}><CardContent>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div>
            <CardTitle style={{
              marginBottom: '0.25rem'
            }}>Infrastructure calendar</CardTitle>
            <p className="text-sm text-secondary" style={{
              margin: 0
            }}>
              Saved placement bookings on your campus schedule (PlacementHub only — not synced to external calendars).
            </p>
          </div>
        </div>

        <div className="infra-panel" style={{
          overflow: 'hidden'
        }}>
          <div className="infra-panel-inner" style={{
            padding: 0
          }}>
            <CampusCalendarGrid items={bookingCalItems} initialYear={calYear} initialMonth={calMonth} viewMode="month" showToolbar onCursorChange={(year, month) => {
              setCalYear(year);
              setCalMonth(month);
            }} />
          </div>
        </div>
      </CardContent></Card>

      {/* Website announcements */}
      <Card style={{
      marginBottom: '1.5rem'
    }}><CardContent>
        <CardTitle style={{
          marginBottom: '0.35rem'
        }}>Website announcements</CardTitle>
        <p className="text-sm text-secondary" style={{
          marginTop: 0,
          marginBottom: '1rem'
        }}>
          Public site URL from College Settings and bookings you mark for <strong>Web</strong>. This list is for coordination only — your live site is not loaded here.
        </p>
        {!collegeComms.website ? <p className="text-sm text-secondary" style={{
          margin: 0
        }}>
            No website URL saved yet.{' '}
            <Link href="/dashboard/college/settings" className="text-primary-600" style={{
            fontWeight: 600
          }}>
              Add one in College Settings
            </Link>{' '}
            to anchor this section.
          </p> : <div style={{
          marginBottom: '1rem'
        }}>
            <div className="text-xs text-tertiary" style={{
            marginBottom: '0.35rem'
          }}>Configured URL</div>
            <a href={websiteDisplay.href} target="_blank" rel="noopener noreferrer" className="infra-url-pill" style={{
            textDecoration: 'none',
            color: 'var(--primary-700, #4338ca)'
          }}>
              {websiteDisplay.label}
            </a>
          </div>}
        <div className="text-xs text-tertiary" style={{
          marginBottom: '0.5rem'
        }}>
          Bookings with <strong>Web</strong> selected
        </div>
        {bookingsForChannel('web').length === 0 ? <p className="text-sm text-secondary" style={{
          margin: 0
        }}>None yet — use <strong>Announcement destinations</strong> on a booking below.</p> : <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
            {bookingsForChannel('web').map(b => <Card key={b.id}><CardContent>
                <div style={{
                fontWeight: 600
              }}>{b.company}</div>
                <div className="text-xs text-tertiary">{formatDate(b.date)} · {b.startTime}–{b.endTime} · {b.roomName}</div>
                {b.description ? <div className="text-sm text-secondary" style={{
                marginTop: '0.35rem'
              }}>{b.description}</div> : null}
              </CardContent></Card>)}
          </div>}
      </CardContent></Card>

      {/* Channel distribution */}
      <Card style={{
      marginBottom: '1.5rem'
    }}><CardContent>
        <CardTitle style={{
          marginBottom: '0.35rem'
        }}>Channel distribution</CardTitle>
        <p className="text-sm text-secondary" style={{
          marginTop: 0,
          marginBottom: '1rem'
        }}>
          Your URLs from College Settings. Each card lists bookings you tagged for that destination — for internal planning only (no posting or feeds).
        </p>
        <div className="grid grid-2" style={{
          gap: '1rem'
        }}>
          {SOCIAL_PLATFORMS.map(p => {
            const url = (collegeComms.social?.[p.id] || '').trim();
            const href = url ? normalizeExternalUrl(url) : '';
            return <Card key={p.id}><CardContent>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  <span className="font-semibold text-sm" style={{
                    color: p.accent
                  }}>{p.name}</span>
                  {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{
                    flexShrink: 0,
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.7rem'
                  }}>
                      Open URL
                    </a> : <Link href="/dashboard/college/settings" className="text-xs text-tertiary" style={{
                    flexShrink: 0
                  }}>
                      Configure →
                    </Link>}
                </div>
                {!url ? <p className="text-xs text-secondary" style={{
                  margin: '0 0 0.75rem'
                }}>No URL saved for this channel.</p> : <div className="infra-url-pill" style={{
                  marginBottom: '0.75rem',
                  display: 'block'
                }}>{url}</div>}
                <div className="text-xs text-tertiary" style={{
                  marginBottom: '0.35rem'
                }}>Tagged bookings</div>
                {bookingsForChannel(p.id).length === 0 ? <span className="text-sm text-secondary">None — tag bookings below.</span> : <ul style={{
                  margin: 0,
                  paddingLeft: '1.1rem',
                  fontSize: '0.8125rem'
                }}>
                    {bookingsForChannel(p.id).map(b => <li key={b.id}>{b.company} · {formatDate(b.date)}</li>)}
                  </ul>}
              </CardContent></Card>;
          })}
        </div>
      </CardContent></Card>

      {/* Bookings list */}
      <Card><CardContent>
        <CardTitle>Existing Bookings Schedule</CardTitle>
        <p className="text-sm text-secondary" style={{
          marginTop: '0.35rem'
        }}>
          <strong>Announcement destinations:</strong> choose where each booking should appear in the website and channel lists above. Stored in PlacementHub only — no external APIs.
        </p>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginTop: '1rem'
        }}>
          {bookings.map(b => <div key={b.id} style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)'
          }}>
              <div style={{
              flex: '0 0 120px'
            }}>
                <div style={{
                fontWeight: 700,
                fontSize: '1rem'
              }}>{formatDate(b.date)}</div>
                <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
                marginTop: '0.2rem'
              }}>
                  {b.startTime} - {b.endTime}
                </div>
              </div>

              <div style={{
              flex: '1 1 200px',
              paddingLeft: '1rem',
            }}>
                <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap'
              }}>
                  <span style={{
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: 'var(--text-primary)'
                }}>{b.company}</span>
                  <StatusBadge tone="indigo">{b.roomName}</StatusBadge>
                </div>
                <div style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginTop: '0.4rem'
              }}>{b.description}</div>
                <div style={{
                marginTop: '0.65rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                  <span className="text-xs text-tertiary" style={{
                  marginRight: '0.25rem'
                }}>Announcement destinations:</span>
                  {CHANNELS.map(ch => {
                  const on = (channelToggles[b.id] || []).includes(ch.id);
                  return <Button key={ch.id} type="button" variant={on ? 'default' : 'outline'} size="sm" style={{
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.7rem'
                  }} onClick={() => toggleChannel(b.id, ch.id)}>
                        {ch.label}
                      </Button>;
                })}
                </div>
              </div>

              <div style={{
              marginLeft: 'auto'
            }}>
                <Button type="button" style={{
                color: 'var(--danger-600)'
              }} onClick={() => setCancelTargetId(b.id)} variant="ghost" size="sm">
                  ✕ Cancel Booking
                </Button>
              </div>
            </div>)}
          {!isLoading && bookings.length === 0 && <div style={{
            textAlign: 'center',
            padding: '1.5rem 0'
          }}>
              <p style={{
              color: 'var(--text-tertiary)',
              margin: '0 0 1rem'
            }}>No bookings yet.</p>
              <Button type="button" onClick={() => {
              if (assets.length === 0) {
                setErrorMsg('Add at least one campus resource before booking.');
                return;
              }
              setShowForm(true);
              setErrorMsg('');
            }}>
                + Create first booking
              </Button>
            </div>}
        </div>
      </CardContent></Card>

      <ConfirmDialog open={Boolean(cancelTargetId)} title="Cancel this booking?" message="This removes the booking from the infrastructure schedule." confirmLabel="Cancel booking" onCancel={() => setCancelTargetId(null)} onConfirm={async () => {
      if (!cancelTargetId) return;
      const id = cancelTargetId;
      setCancelTargetId(null);
      await handleCancel(id);
    }} />
    </div>;
}
