/**
 * Build Google/Outlook-compatible .ics exports from college calendar events.
 */

import { toDateOnlyString } from '@/lib/dateOnly';

/**
 * Add days to a YYYY-MM-DD using local calendar math (avoids UTC off-by-one).
 * @param {string} ymd
 * @param {number} days
 * @returns {string}
 */
export function addDaysLocalYmd(ymd, days) {
  const raw = toDateOnlyString(ymd);
  const m = String(raw || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw || '';
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Number(days || 0));
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/**
 * @param {string} value
 * @returns {string}
 */
export function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
}

/**
 * RFC 5545 line folding (soft break every 75 octets, continuation starts with space).
 * @param {string} line
 * @returns {string}
 */
export function foldIcsLine(line) {
  const s = String(line || '');
  if (s.length <= 75) return s;
  const parts = [];
  let rest = s;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

/**
 * @param {string} ymd
 * @returns {string}
 */
export function ymdToIcsDate(ymd) {
  const d = toDateOnlyString(ymd);
  return d ? d.replace(/-/g, '') : '';
}

/**
 * @param {Date} [date]
 * @returns {string}
 */
export function toIcsUtcStamp(date = new Date()) {
  const d = date instanceof Date ? date : new Date();
  const iso = d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return iso;
}

/**
 * @param {unknown} id
 * @param {string} [sourceUid]
 * @returns {string}
 */
export function buildEventUid(id, sourceUid) {
  const external = String(sourceUid || '').trim();
  if (external) return external.slice(0, 200);
  const safe = String(id || 'event')
    .replace(/[^A-Za-z0-9@._-]/g, '-')
    .slice(0, 120);
  return `${safe}@placementhub.local`;
}

/**
 * @param {{
 *   id?: unknown,
 *   title?: string,
 *   event_type?: string,
 *   eventType?: string,
 *   start_date?: unknown,
 *   end_date?: unknown,
 *   startDate?: unknown,
 *   endDate?: unknown,
 *   description?: string | null,
 *   is_blocking?: boolean,
 *   source_uid?: string | null,
 *   sourceUid?: string | null,
 *   source?: string,
 * }} event
 * @returns {string[]}
 */
export function eventToIcsLines(event) {
  const title = String(event?.title || 'Event').trim() || 'Event';
  const start = toDateOnlyString(event?.start_date ?? event?.startDate);
  if (!start) return [];
  let end = toDateOnlyString(event?.end_date ?? event?.endDate) || start;
  if (end < start) end = start;

  // All-day DTEND is exclusive
  const exclusiveEnd = addDaysLocalYmd(end, 1);
  const eventType = String(event?.event_type || event?.eventType || 'other');
  const blocking = Boolean(event?.is_blocking);
  const descriptionParts = [
    event?.description ? String(event.description) : '',
    eventType ? `Type: ${eventType}` : '',
    blocking ? 'Blocks placement drives: yes' : '',
    event?.source === 'placement_drive' ? 'Source: placement drive' : '',
  ].filter(Boolean);

  const uid = buildEventUid(event?.id, event?.source_uid || event?.sourceUid);
  const stamp = toIcsUtcStamp();
  const summary = escapeIcsText(title);
  const description = escapeIcsText(descriptionParts.join('\n'));
  const categories = escapeIcsText(eventType);

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymdToIcsDate(start)}`,
    `DTEND;VALUE=DATE:${ymdToIcsDate(exclusiveEnd)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : null,
    categories ? `CATEGORIES:${categories}` : null,
    'TRANSP:OPAQUE',
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ].filter(Boolean);
}

/**
 * @param {Array<object>} events
 * @param {{ calendarName?: string, timezone?: string }} [opts]
 * @returns {string}
 */
export function buildCollegeCalendarIcs(events, opts = {}) {
  const calendarName = String(opts.calendarName || 'PlacementHub Campus Calendar').trim();
  const timezone = String(opts.timezone || 'Asia/Kolkata').trim() || 'Asia/Kolkata';
  const list = Array.isArray(events) ? events : [];

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PlacementHub//Campus Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    `X-WR-TIMEZONE:${escapeIcsText(timezone)}`,
  ];

  for (const event of list) {
    lines.push(...eventToIcsLines(event));
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

/**
 * Trigger a browser download for an .ics string.
 * @param {string} filename
 * @param {string} icsText
 */
export function downloadIcs(filename, icsText) {
  const name = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
