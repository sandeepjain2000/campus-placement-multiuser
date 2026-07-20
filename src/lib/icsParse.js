/**
 * Parse Google / Outlook-style .ics (iCalendar) into placement calendar rows.
 * Handles folded lines, all-day DATE values, timed UTC/TZID, and simple RRULE expand.
 */

import { addDaysToYmd } from '@/lib/calendarClashDetection';
import { MIN_PLACEMENT_YEAR, toDateOnlyString } from '@/lib/dateOnly';

const MAX_EVENTS = 2500;
const MAX_RRULE_OCCURRENCES = 104;
const TITLE_MAX = 255;
const DESC_MAX = 4000;

/**
 * @param {string} text
 * @returns {string[]}
 */
export function unfoldIcsLines(text) {
  const normalized = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const out = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/**
 * @param {string} line
 * @returns {{ name: string, params: Record<string, string>, value: string } | null}
 */
export function parseIcsProperty(line) {
  const colon = line.indexOf(':');
  if (colon < 0) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = left.split(';');
  const name = String(parts[0] || '')
    .trim()
    .toUpperCase();
  if (!name) return null;
  /** @type {Record<string, string>} */
  const params = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq >= 0) {
      params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
    } else {
      params[p.toUpperCase()] = 'TRUE';
    }
  }
  return { name, params, value };
}

/**
 * @param {string} value
 * @param {Record<string, string>} params
 * @param {string} [calendarTz]
 * @returns {{ ymd: string, allDay: boolean } | null}
 */
export function icsDateToYmd(value, params = {}, calendarTz = 'UTC') {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const isDateOnly =
    String(params.VALUE || '').toUpperCase() === 'DATE' || (/^\d{8}$/.test(raw) && !raw.includes('T'));

  if (isDateOnly) {
    const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!m) return null;
    return { ymd: `${m[1]}-${m[2]}-${m[3]}`, allDay: true };
  }

  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/i);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  const ss = Number(m[6]);
  const isUtc = Boolean(m[7]);
  const tzid = params.TZID || calendarTz || 'UTC';

  let date;
  if (isUtc) {
    date = new Date(Date.UTC(y, mo - 1, d, hh, mm, ss));
  } else if (tzid && tzid !== 'UTC') {
    // Floating / TZID local: interpret components in that zone via Intl offset probe
    date = localWallTimeToUtcApprox(y, mo, d, hh, mm, ss, tzid);
  } else {
    date = new Date(Date.UTC(y, mo - 1, d, hh, mm, ss));
  }

  if (Number.isNaN(date.getTime())) return null;

  const ymd = date.toLocaleDateString('en-CA', {
    timeZone: isUtc ? tzid || 'UTC' : tzid || 'UTC',
  });
  // en-CA → YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return { ymd: toDateOnlyString(date), allDay: false };
  }
  return { ymd, allDay: false };
}

/**
 * Best-effort: build a UTC Date for wall time in `timeZone`.
 * @param {number} y
 * @param {number} mo
 * @param {number} d
 * @param {number} hh
 * @param {number} mm
 * @param {number} ss
 * @param {string} timeZone
 */
function localWallTimeToUtcApprox(y, mo, d, hh, mm, ss, timeZone) {
  const guess = new Date(Date.UTC(y, mo - 1, d, hh, mm, ss));
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(guess);
    const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    const offset = asUtc - guess.getTime();
    return new Date(guess.getTime() - offset);
  } catch {
    return guess;
  }
}

/**
 * Unescape ICS text values (\n, \, \; \,).
 * @param {string} value
 */
export function unescapeIcsText(value) {
  return String(value || '')
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeImportedEventTitle(raw) {
  let s = unescapeIcsText(raw)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TITLE_MAX);
  // Placement title validator is strict; strip exotic punctuation for DB/UI consistency.
  s = s
    .replace(/[^A-Za-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) s = 'Imported calendar event';
  if (s.length < 3) s = `${s} event`.trim().slice(0, TITLE_MAX);
  return s.slice(0, TITLE_MAX);
}

/**
 * @param {string} summary
 * @returns {'exam' | 'holiday' | 'festival' | 'workshop' | 'other'}
 */
export function inferEventTypeFromSummary(summary) {
  const s = String(summary || '').toLowerCase();
  if (/\b(exam|mid[- ]?sem|end[- ]?sem|semester exam|assessment|midterm|finals?|viva)\b/.test(s)) {
    return 'exam';
  }
  if (/\b(holiday|vacation|break|closure|no class|non[- ]working)\b/.test(s)) return 'holiday';
  if (/\b(festival|diwali|holi|eid|christmas|pongal)\b/.test(s)) return 'festival';
  if (/\b(workshop|training|seminar|orientation)\b/.test(s)) return 'workshop';
  return 'other';
}

/**
 * @param {string} rrule
 * @returns {Record<string, string>}
 */
function parseRrule(rrule) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const part of String(rrule || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    out[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  return out;
}

const WEEKDAY_INDEX = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/**
 * Expand simple DAILY / WEEKLY RRULEs into YYYY-MM-DD start dates (inclusive of DTSTART).
 * @param {string} startYmd
 * @param {string} rrule
 * @param {{ horizonYmd?: string }} [opts]
 * @returns {string[]}
 */
export function expandSimpleRrule(startYmd, rrule, opts = {}) {
  const rules = parseRrule(rrule);
  const freq = String(rules.FREQ || '').toUpperCase();
  if (freq !== 'DAILY' && freq !== 'WEEKLY') return [startYmd];

  const interval = Math.max(1, Number(rules.INTERVAL) || 1);
  const count = rules.COUNT ? Math.min(MAX_RRULE_OCCURRENCES, Number(rules.COUNT) || 1) : MAX_RRULE_OCCURRENCES;
  let untilYmd = opts.horizonYmd || null;
  if (rules.UNTIL) {
    const untilRaw = String(rules.UNTIL).trim();
    const untilParsed = icsDateToYmd(
      untilRaw,
      untilRaw.includes('T') ? {} : { VALUE: 'DATE' },
    );
    if (untilParsed?.ymd) untilYmd = untilParsed.ymd;
  }

  const byDays = String(rules.BYDAY || '')
    .split(',')
    .map((d) => d.replace(/[^A-Z]/gi, '').toUpperCase())
    .filter((d) => WEEKDAY_INDEX[d] != null);

  /** @type {string[]} */
  const dates = [];
  let cursor = startYmd;
  let guard = 0;

  if (freq === 'DAILY') {
    while (dates.length < count && guard < MAX_RRULE_OCCURRENCES * 2) {
      guard += 1;
      if (untilYmd && cursor > untilYmd) break;
      dates.push(cursor);
      cursor = addDaysToYmd(cursor, interval);
    }
    return dates;
  }

  // WEEKLY
  const start = new Date(`${startYmd}T12:00:00`);
  const wanted = byDays.length
    ? new Set(byDays.map((d) => WEEKDAY_INDEX[d]))
    : new Set([start.getDay()]);

  let weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday-based like WKST=SU default

  while (dates.length < count && guard < MAX_RRULE_OCCURRENCES * 14) {
    guard += 1;
    for (let dow = 0; dow < 7; dow += 1) {
      if (!wanted.has(dow)) continue;
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + dow);
      const ymd = toDateOnlyString(day);
      if (ymd < startYmd) continue;
      if (untilYmd && ymd > untilYmd) return dates;
      dates.push(ymd);
      if (dates.length >= count) return dates;
    }
    weekStart.setDate(weekStart.getDate() + 7 * interval);
  }
  return dates;
}

/**
 * @param {string} icsText
 * @param {{
 *   fromDate?: string,
 *   toDate?: string,
 *   expandRrule?: boolean,
 *   maxEvents?: number,
 * }} [opts]
 * @returns {{
 *   calendarName: string | null,
 *   timezone: string,
 *   events: Array<{
 *     uid: string,
 *     title: string,
 *     eventType: string,
 *     startDate: string,
 *     endDate: string,
 *     description: string,
 *     location: string,
 *     allDay: boolean,
 *   }>,
 *   skipped: number,
 *   parsed: number,
 * }}
 */
export function parseIcsCalendar(icsText, opts = {}) {
  const maxEvents = Math.min(MAX_EVENTS, Number(opts.maxEvents) || MAX_EVENTS);
  const expandRrule = opts.expandRrule !== false;
  const fromDate = opts.fromDate || null;
  const toDate = opts.toDate || null;

  const lines = unfoldIcsLines(icsText);
  let calendarName = null;
  let timezone = 'UTC';
  /** @type {Array<Record<string, { params: Record<string, string>, value: string }>>} */
  const vevents = [];
  /** @type {Record<string, { params: Record<string, string>, value: string }> | null} */
  let current = null;

  for (const line of lines) {
    if (!line || line.startsWith(' ')) continue;
    const prop = parseIcsProperty(line);
    if (!prop) continue;

    if (prop.name === 'BEGIN' && prop.value.toUpperCase() === 'VEVENT') {
      current = {};
      continue;
    }
    if (prop.name === 'END' && prop.value.toUpperCase() === 'VEVENT') {
      if (current) vevents.push(current);
      current = null;
      continue;
    }
    if (current) {
      current[prop.name] = { params: prop.params, value: prop.value };
      continue;
    }
    if (prop.name === 'X-WR-CALNAME') calendarName = unescapeIcsText(prop.value).trim() || null;
    if (prop.name === 'X-WR-TIMEZONE' || prop.name === 'TZID') {
      timezone = prop.value.trim() || timezone;
    }
  }

  /** @type {Array<{
   *   uid: string,
   *   title: string,
   *   eventType: string,
   *   startDate: string,
   *   endDate: string,
   *   description: string,
   *   location: string,
   *   allDay: boolean,
   * }>} */
  const events = [];
  let skipped = 0;
  let parsed = 0;

  for (const ev of vevents) {
    parsed += 1;
    const status = String(ev.STATUS?.value || '').toUpperCase();
    if (status === 'CANCELLED') {
      skipped += 1;
      continue;
    }
    if (!ev.DTSTART) {
      skipped += 1;
      continue;
    }

    const start = icsDateToYmd(ev.DTSTART.value, ev.DTSTART.params, timezone);
    if (!start?.ymd) {
      skipped += 1;
      continue;
    }

    let end = ev.DTEND
      ? icsDateToYmd(ev.DTEND.value, ev.DTEND.params, timezone)
      : { ymd: start.ymd, allDay: start.allDay };

    let startYmd = start.ymd;
    let endYmd = end?.ymd || start.ymd;

    // All-day DTEND is exclusive in RFC 5545
    if (start.allDay && end?.allDay && endYmd > startYmd) {
      endYmd = addDaysToYmd(endYmd, -1);
      if (endYmd < startYmd) endYmd = startYmd;
    }

    if (Number(startYmd.slice(0, 4)) < MIN_PLACEMENT_YEAR) {
      skipped += 1;
      continue;
    }

    const summary = unescapeIcsText(ev.SUMMARY?.value || '').trim() || 'Imported calendar event';
    const title = sanitizeImportedEventTitle(summary);
    const description = unescapeIcsText(ev.DESCRIPTION?.value || '').trim();
    const location = unescapeIcsText(ev.LOCATION?.value || '').trim();
    const uid = String(ev.UID?.value || `${title}-${startYmd}`).trim().slice(0, 500);
    const eventType = inferEventTypeFromSummary(summary);
    const rrule = ev.RRULE?.value || '';

    /** @type {string[]} */
    let occurrenceStarts = [startYmd];
    if (expandRrule && rrule) {
      const horizon = toDate || addDaysToYmd(toDateOnlyString(new Date()), 365 * 2);
      occurrenceStarts = expandSimpleRrule(startYmd, rrule, { horizonYmd: horizon });
      if (!occurrenceStarts.length) occurrenceStarts = [startYmd];
    }

    const spanDays = Math.max(
      0,
      Math.round(
        (new Date(`${endYmd}T12:00:00`).getTime() - new Date(`${startYmd}T12:00:00`).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );

    for (let i = 0; i < occurrenceStarts.length; i += 1) {
      if (events.length >= maxEvents) break;
      const occStart = occurrenceStarts[i];
      const occEnd = spanDays > 0 ? addDaysToYmd(occStart, spanDays) : occStart;

      if (fromDate && occEnd < fromDate) {
        skipped += 1;
        continue;
      }
      if (toDate && occStart > toDate) {
        skipped += 1;
        continue;
      }

      const occUid = i === 0 ? uid : `${uid}#${occStart}`;
      const notes = [location ? `Location: ${location}` : '', description]
        .filter(Boolean)
        .join('\n\n')
        .slice(0, DESC_MAX);

      events.push({
        uid: occUid,
        title,
        eventType,
        startDate: occStart,
        endDate: occEnd,
        description: notes,
        location,
        allDay: start.allDay,
      });
    }
    if (events.length >= maxEvents) break;
  }

  return {
    calendarName,
    timezone,
    events,
    skipped,
    parsed,
  };
}
