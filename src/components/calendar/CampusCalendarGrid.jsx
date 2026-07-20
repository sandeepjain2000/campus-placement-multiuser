'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MAX_VISIBLE_EVENTS = 2;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

/** Shared event colors — uses tokens defined in globals.css */
export function getCalendarEventColor(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'completed' || t === 'holiday') {
    return { bg: 'var(--success-100)', text: 'var(--success-700)', border: 'var(--success-500)' };
  }
  if (t === 'approved' || t === 'placement_drive' || t === 'drive' || t === 'on_campus' || t === 'booking') {
    return { bg: 'var(--primary-100)', text: 'var(--primary-700)', border: 'var(--primary-300)' };
  }
  if (t === 'interview' || t === 'virtual' || t === 'workshop') {
    return { bg: 'var(--info-100)', text: 'var(--info-600)', border: 'var(--info-500)' };
  }
  if (t === 'exam') {
    return { bg: 'var(--danger-100)', text: 'var(--danger-600)', border: 'var(--danger-500)' };
  }
  if (t === 'imported') {
    return { bg: 'var(--warning-100)', text: 'var(--warning-700)', border: 'var(--warning-500)' };
  }
  if (t === 'off_campus') {
    return { bg: 'var(--warning-100)', text: 'var(--warning-600)', border: 'var(--warning-500)' };
  }
  return { bg: 'var(--gray-100)', text: 'var(--gray-700)', border: 'var(--gray-300)' };
}

function eventTooltipLines(ev) {
  return [
    ev.time ? `Time: ${ev.time}` : null,
    ev.title,
    ev.college ? `Campus: ${ev.college}` : null,
    ev.meta || null,
  ].filter(Boolean);
}

function dayEventsTooltipLines(events, dayLabel) {
  if (!events?.length) return [];
  const lines = [dayLabel];
  events.forEach((ev, idx) => {
    if (idx > 0) lines.push('—');
    lines.push(...eventTooltipLines(ev));
  });
  return lines;
}

function monthPillLabel(ev) {
  const parts = [];
  if (ev.time) parts.push(ev.time);
  if (ev.title) parts.push(ev.title);
  return parts.join(' ') || 'Event';
}

export function CalendarHoverTooltip({ lines, children, wrapperClassName = 'campus-cal-month__pill-wrap' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchorRef = useRef(null);

  const show = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: Math.max(8, rect.top - 8),
      left: Math.min(rect.left, window.innerWidth - 200),
    });
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  if (!lines?.length) return children;

  return (
    <>
      <div
        ref={anchorRef}
        className={wrapperClassName}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              className="campus-cal-tooltip"
              style={{
                top: pos.top,
                left: pos.left,
                transform: 'translateY(-100%)',
              }}
            >
              {lines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontWeight: i === 1 ? 600 : 400,
                    color: i === 0 ? 'var(--text-secondary)' : 'inherit',
                    marginTop: i > 0 ? '0.2rem' : 0,
                    wordBreak: 'break-word',
                  }}
                >
                  {line}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MonthEventPill({ ev }) {
  const colors = getCalendarEventColor(ev.type);

  return (
    <CalendarHoverTooltip lines={eventTooltipLines(ev)}>
      <div
        className="campus-cal-month__pill"
        style={{
          background: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
        }}
        title=""
      >
        {monthPillLabel(ev)}
      </div>
    </CalendarHoverTooltip>
  );
}

/**
 * Shared month / week / year calendar grid.
 * @param {{ id: string|number, date: string, title: string, time?: string, meta?: string, type?: string, college?: string }} items
 */
export function CampusCalendarGrid({
  items,
  initialYear,
  initialMonth,
  viewMode = 'month',
  onCursorChange,
  onChangeView,
  onDaySelect,
  showToolbar = true,
}) {
  const now = new Date();
  const [cursor, setCursor] = useState(() => ({
    y: initialYear ?? now.getFullYear(),
    m: initialMonth ?? now.getMonth(),
    d: now.getDate(),
  }));

  useEffect(() => {
    if (initialYear !== undefined && initialMonth !== undefined) {
      setCursor((c) => ({ ...c, y: initialYear, m: initialMonth }));
    }
  }, [initialYear, initialMonth]);

  const updateCursor = (ny, nm, nd = 1) => {
    setCursor({ y: ny, m: nm, d: nd });
    if (onCursorChange) onCursorChange(ny, nm);
  };

  const byDay = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const k = (it.date || '').slice(0, 10);
      if (!k || k.length < 10) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    }
    return map;
  }, [items]);

  const { y, m, d } = cursor;

  const prev = () => {
    if (viewMode === 'year') {
      updateCursor(y - 1, m, d);
    } else if (viewMode === 'week') {
      const current = new Date(y, m, d);
      current.setDate(current.getDate() - 7);
      updateCursor(current.getFullYear(), current.getMonth(), current.getDate());
    } else {
      let nm = m - 1;
      let ny = y;
      if (nm < 0) {
        nm = 11;
        ny -= 1;
      }
      updateCursor(ny, nm, d);
    }
  };

  const next = () => {
    if (viewMode === 'year') {
      updateCursor(y + 1, m, d);
    } else if (viewMode === 'week') {
      const current = new Date(y, m, d);
      current.setDate(current.getDate() + 7);
      updateCursor(current.getFullYear(), current.getMonth(), current.getDate());
    } else {
      let nm = m + 1;
      let ny = y;
      if (nm > 11) {
        nm = 0;
        ny += 1;
      }
      updateCursor(ny, nm, d);
    }
  };

  const today = new Date();
  const isToday = (dy, dm, dd) => today.getFullYear() === dy && today.getMonth() === dm && today.getDate() === dd;

  const renderMonthView = () => {
    const first = new Date(y, m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startPad; i += 1) {
      cells.push({ type: 'pad', key: `pad-${i}` });
    }
    for (let dNum = 1; dNum <= daysInMonth; dNum += 1) {
      cells.push({ type: 'day', d: dNum, key: `day-${dNum}` });
    }

    return (
      <div style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            borderBottom: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
          }}
        >
          {weekdays.map((w) => (
            <div
              key={w}
              style={{
                padding: '0.75rem',
                textAlign: 'center',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="campus-cal-month">
          {cells.map((cell) =>
            cell.type === 'pad' ? (
              <div key={cell.key} className="campus-cal-month__pad" aria-hidden="true" />
            ) : (
              (() => {
                const dayKey = `${y}-${pad2(m + 1)}-${pad2(cell.d)}`;
                const dayEvents = byDay.get(dayKey) || [];
                const visible = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
                const hiddenCount = Math.max(0, dayEvents.length - MAX_VISIBLE_EVENTS);
                const moreLines = dayEvents.slice(MAX_VISIBLE_EVENTS).flatMap((ev, idx) => {
                  const block = eventTooltipLines(ev);
                  return idx === 0 ? block : ['—', ...block];
                });
                const todayCell = isToday(y, m, cell.d);

                return (
                  <div
                    key={cell.key}
                    className={`campus-cal-month__cell${todayCell ? ' campus-cal-month__cell--today' : ''}`}
                    onClick={() => {
                      updateCursor(y, m, cell.d);
                      if (onDaySelect) {
                        onDaySelect(y, m, cell.d);
                      } else if (onChangeView) {
                        onChangeView('week');
                      }
                    }}
                    onMouseOver={(e) => {
                      if (!todayCell) e.currentTarget.style.background = 'var(--bg-secondary)';
                    }}
                    onMouseOut={(e) => {
                      if (!todayCell) e.currentTarget.style.background = 'var(--bg-primary)';
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        fontSize: '0.8rem',
                        fontWeight: todayCell ? 700 : 500,
                        color: todayCell ? 'white' : 'var(--text-primary)',
                        background: todayCell ? 'var(--primary-600)' : 'transparent',
                        marginBottom: '0.25rem',
                        flexShrink: 0,
                      }}
                    >
                      {cell.d}
                    </div>
                    <div className="campus-cal-month__events">
                      {visible.map((ev) => (
                        <MonthEventPill key={ev.id} ev={ev} />
                      ))}
                      {hiddenCount > 0 ? (
                        <CalendarHoverTooltip
                          lines={[`${hiddenCount} more event${hiddenCount === 1 ? '' : 's'}`, ...moreLines]}
                        >
                          <div
                            style={{
                              fontSize: '0.68rem',
                              color: 'var(--text-secondary)',
                              paddingLeft: '0.15rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'default',
                            }}
                          >
                            +{hiddenCount} more
                          </div>
                        </CalendarHoverTooltip>
                      ) : null}
                    </div>
                  </div>
                );
              })()
            ),
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = getWeekStart(new Date(y, m, d));
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + i);
      cells.push(current);
    }

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '1px',
          background: 'var(--border-default)',
          minHeight: '500px',
          overflow: 'hidden',
        }}
      >
        {cells.map((date, idx) => {
          const cy = date.getFullYear();
          const cm = date.getMonth();
          const cd = date.getDate();
          const isCurrToday = isToday(cy, cm, cd);
          return (
            <div
              key={idx}
              style={{
                background: isCurrToday ? 'var(--primary-50)' : 'var(--bg-primary)',
                padding: '0.75rem',
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: isCurrToday ? '2px solid var(--primary-500)' : '1px solid var(--border-default)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    color: isCurrToday ? 'var(--primary-600)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                  }}
                >
                  {weekdays[date.getDay()]}
                </span>
                <span
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: isCurrToday ? 700 : 500,
                    color: isCurrToday ? 'var(--primary-700)' : 'var(--text-primary)',
                  }}
                >
                  {cd}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
                {(byDay.get(`${cy}-${pad2(cm + 1)}-${pad2(cd)}`) || []).map((ev) => {
                  const colors = getCalendarEventColor(ev.type);
                  return (
                    <CalendarHoverTooltip key={ev.id} lines={eventTooltipLines(ev)}>
                      <div
                        style={{
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-md)',
                          background: colors.bg,
                          borderLeft: `3px solid ${colors.border}`,
                          color: colors.text,
                          cursor: 'default',
                          minWidth: 0,
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.75rem', opacity: 0.8, marginBottom: '2px' }}>
                          {ev.time || 'All day'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ev.title}
                        </div>
                      </div>
                    </CalendarHoverTooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderYearView = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', padding: '1.5rem', background: 'var(--bg-inset)' }}>
        {months.map((monthName, idx) => {
          const first = new Date(y, idx, 1);
          const startPad = first.getDay();
          const daysInMonth = new Date(y, idx + 1, 0).getDate();

          let eventCount = 0;
          for (let dNum = 1; dNum <= daysInMonth; dNum++) {
            if (byDay.has(`${y}-${pad2(idx + 1)}-${pad2(dNum)}`)) {
              eventCount += byDay.get(`${y}-${pad2(idx + 1)}-${pad2(dNum)}`).length;
            }
          }

          return (
            <div
              key={monthName}
              className="card animate-fadeIn"
              style={{ cursor: 'pointer', padding: '1.25rem', transition: 'all 0.2s', border: '1px solid transparent' }}
              onClick={() => {
                updateCursor(y, idx, 1);
                if (onChangeView) onChangeView('month');
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'var(--primary-200)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <h4 style={{ margin: '0 0 1.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem', fontWeight: 700 }}>
                {monthName}
                {eventCount > 0 && (
                  <span className="badge badge-blue" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                    {eventCount} events
                  </span>
                )}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {weekdays.map((w) => (
                  <div key={w} style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                    {w.charAt(0)}
                  </div>
                ))}
                {Array.from({ length: startPad }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dNum = i + 1;
                  const dayKey = `${y}-${pad2(idx + 1)}-${pad2(dNum)}`;
                  const dayEvents = byDay.get(dayKey) || [];
                  const hasEvents = dayEvents.length > 0;
                  const isCurrToday = isToday(y, idx, dNum);
                  const dayLabel = `${monthName} ${dNum}, ${y}`;

                  const dayCell = (
                    <div
                      style={{
                        padding: '6px 0',
                        borderRadius: '4px',
                        background: isCurrToday ? 'var(--primary-600)' : hasEvents ? 'var(--primary-100)' : 'transparent',
                        color: isCurrToday ? 'white' : hasEvents ? 'var(--primary-700)' : 'inherit',
                        fontWeight: hasEvents || isCurrToday ? 700 : 500,
                        position: 'relative',
                      }}
                    >
                      {dNum}
                      {hasEvents && !isCurrToday ? (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '3px',
                            height: '3px',
                            borderRadius: '50%',
                            background: 'var(--primary-600)',
                          }}
                        />
                      ) : null}
                    </div>
                  );

                  if (!hasEvents) {
                    return <div key={dNum}>{dayCell}</div>;
                  }

                  return (
                    <CalendarHoverTooltip
                      key={dNum}
                      lines={dayEventsTooltipLines(dayEvents, dayLabel)}
                      wrapperClassName="campus-cal-year__day"
                    >
                      {dayCell}
                    </CalendarHoverTooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  let label = '';
  if (viewMode === 'year') {
    label = `${y}`;
  } else if (viewMode === 'week') {
    const startOfWeek = getWeekStart(new Date(y, m, d));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    label = `${startOfWeek.toLocaleString('default', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else {
    label = `${months[m]} ${y}`;
  }

  return (
    <div style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {showToolbar ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-default)' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{label}</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={prev}
              aria-label="Previous"
              style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)' }}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => updateCursor(today.getFullYear(), today.getMonth(), today.getDate())}
              style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-md)' }}
            >
              Today
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={next}
              aria-label="Next"
              style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)' }}
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}

      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'year' && renderYearView()}
    </div>
  );
}
