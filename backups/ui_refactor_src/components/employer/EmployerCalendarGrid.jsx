'use client';

import { useMemo, useState } from 'react';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** @param {{ id: string|number, date: string, title: string, time?: string, meta?: string }} item */
export function EmployerCalendarGrid({ items, initialYear, initialMonth }) {
  const now = new Date();
  const [cursor, setCursor] = useState(() => ({
    y: initialYear ?? now.getFullYear(),
    m: initialMonth ?? now.getMonth(),
  }));

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

  const { y, m } = cursor;
  const first = new Date(y, m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const prev = () =>
    setCursor((c) => {
      let nm = c.m - 1;
      let ny = c.y;
      if (nm < 0) {
        nm = 11;
        ny -= 1;
      }
      return { y: ny, m: nm };
    });

  const next = () =>
    setCursor((c) => {
      let nm = c.m + 1;
      let ny = c.y;
      if (nm > 11) {
        nm = 0;
        ny += 1;
      }
      return { y: ny, m: nm };
    });

  const label = first.toLocaleString('default', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < startPad; i += 1) {
    cells.push({ type: 'pad', key: `pad-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ type: 'day', d, key: `day-${d}` });
  }

  const today = new Date();
  const isToday = (d) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;

  return (
    <div className="employer-cal-wrap">
      <div className="employer-cal-toolbar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={prev} aria-label="Previous month">
          ←
        </button>
        <h3 className="employer-cal-title">{label}</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={next} aria-label="Next month">
          →
        </button>
      </div>
      <div className="employer-cal-weekdays" role="row">
        {weekdays.map((w) => (
          <div key={w} className="employer-cal-weekday">
            {w}
          </div>
        ))}
      </div>
      <div className="employer-cal-grid" role="grid" aria-label="Calendar month">
        {cells.map((cell) =>
          cell.type === 'pad' ? (
            <div key={cell.key} className="employer-cal-cell employer-cal-cell--empty" aria-hidden="true" />
          ) : (
            <div
              key={cell.key}
              className={`employer-cal-cell${isToday(cell.d) ? ' employer-cal-cell--today' : ''}`}
            >
              <div className="employer-cal-daynum">{cell.d}</div>
              <div className="employer-cal-events">
                {(byDay.get(`${y}-${pad2(m + 1)}-${pad2(cell.d)}`) || []).slice(0, 4).map((ev) => (
                  <div
                    key={ev.id}
                    className="employer-cal-chip"
                    title={[ev.time, ev.meta, ev.title].filter(Boolean).join(' · ')}
                  >
                    <span className="employer-cal-chip-text">
                      {ev.time ? `${ev.time} ` : ''}
                      {ev.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
