const {
  unfoldIcsLines,
  parseIcsProperty,
  icsDateToYmd,
  sanitizeImportedEventTitle,
  inferEventTypeFromSummary,
  expandSimpleRrule,
  parseIcsCalendar,
} = require('../icsParse');

describe('icsParse', () => {
  test('unfolds folded ICS lines', () => {
    const lines = unfoldIcsLines('SUMMARY:Hello\n world\nUID:abc');
    expect(lines).toEqual(['SUMMARY:Helloworld', 'UID:abc']);
  });

  test('parses property params and value', () => {
    const prop = parseIcsProperty('DTSTART;TZID=Asia/Kolkata:20251120T140000');
    expect(prop.name).toBe('DTSTART');
    expect(prop.params.TZID).toBe('Asia/Kolkata');
    expect(prop.value).toBe('20251120T140000');
  });

  test('converts UTC timed start into Asia/Kolkata calendar date', () => {
    const parsed = icsDateToYmd('20241106T043000Z', {}, 'Asia/Kolkata');
    expect(parsed).toEqual({ ymd: '2024-11-06', allDay: false });
  });

  test('parses all-day DATE values', () => {
    const parsed = icsDateToYmd('20251002', { VALUE: 'DATE' });
    expect(parsed).toEqual({ ymd: '2025-10-02', allDay: true });
  });

  test('sanitizes titles for placement calendar constraints', () => {
    expect(sanitizeImportedEventTitle('Internship between Sandeep & Sharvari!')).toMatch(/Internship between Sandeep/i);
    expect(sanitizeImportedEventTitle('')).toBe('Imported calendar event');
  });

  test('infers exam/holiday types from summary', () => {
    expect(inferEventTypeFromSummary('End Semester Exam CSE')).toBe('exam');
    expect(inferEventTypeFromSummary('Diwali holiday')).toBe('holiday');
    expect(inferEventTypeFromSummary('Coffee chat')).toBe('other');
  });

  test('expands weekly RRULE occurrences', () => {
    const dates = expandSimpleRrule('2025-11-03', 'FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4');
    expect(dates.length).toBe(4);
    expect(dates[0]).toBe('2025-11-03');
  });

  test('parses sample Google-style VEVENT block', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Campus Academic
X-WR-TIMEZONE:Asia/Kolkata
BEGIN:VEVENT
DTSTART:20261106T043000Z
DTEND:20261106T053000Z
UID:sample-event-1@google.com
SUMMARY:End Semester Exam — CSE
DESCRIPTION:Block placements
LOCATION:Main Hall
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261225
DTEND;VALUE=DATE:20261226
UID:holiday-1@google.com
SUMMARY:Christmas Holiday
END:VEVENT
END:VCALENDAR`;

    const result = parseIcsCalendar(ics, { fromDate: '2026-01-01', expandRrule: false });
    expect(result.calendarName).toBe('Campus Academic');
    expect(result.events.length).toBe(2);
    expect(result.events[0].title).toMatch(/End Semester Exam/i);
    expect(result.events[0].eventType).toBe('exam');
    expect(result.events[0].startDate).toBe('2026-11-06');
    expect(result.events[1].title).toMatch(/Christmas/i);
    expect(result.events[1].startDate).toBe('2026-12-25');
    expect(result.events[1].endDate).toBe('2026-12-25');
  });

  test('filters events before fromDate', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20240101T100000Z
DTEND:20240101T110000Z
UID:old@x
SUMMARY:Old Meeting
END:VEVENT
BEGIN:VEVENT
DTSTART:20261201T100000Z
DTEND:20261201T110000Z
UID:new@x
SUMMARY:Future Meeting
END:VEVENT
END:VCALENDAR`;
    const result = parseIcsCalendar(ics, { fromDate: '2026-01-01', expandRrule: false });
    expect(result.events.map((e) => e.uid)).toEqual(['new@x']);
  });

  test('reads the provided Google Calendar sample export', () => {
    const fs = require('fs');
    const path = require('path');
    const samplePath = path.join(
      __dirname,
      '../../../docs/sandeepjain200019@gmail.com.ics',
    );
    if (!fs.existsSync(samplePath)) return;
    const text = fs.readFileSync(samplePath, 'utf8');
    const result = parseIcsCalendar(text, {
      fromDate: '2026-07-01',
      expandRrule: false,
    });
    expect(result.parsed).toBeGreaterThan(100);
    expect(result.calendarName).toMatch(/sandeepjain/i);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.every((e) => e.startDate >= '2026-07-01')).toBe(true);
  });
});
