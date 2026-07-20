const {
  escapeIcsText,
  foldIcsLine,
  ymdToIcsDate,
  buildEventUid,
  eventToIcsLines,
  buildCollegeCalendarIcs,
} = require('../icsExport');

describe('icsExport', () => {
  test('escapes ICS text special characters', () => {
    expect(escapeIcsText('A;B,C\\D\nE')).toBe('A\\;B\\,C\\\\D\\nE');
  });

  test('folds long lines', () => {
    const long = `SUMMARY:${'x'.repeat(90)}`;
    const folded = foldIcsLine(long);
    expect(folded.split('\r\n').length).toBeGreaterThan(1);
    expect(folded.split('\r\n')[1].startsWith(' ')).toBe(true);
  });

  test('converts ymd to ICS DATE', () => {
    expect(ymdToIcsDate('2026-07-19')).toBe('20260719');
  });

  test('prefers source_uid for UID', () => {
    expect(buildEventUid('abc', 'google-uid@x')).toBe('google-uid@x');
    expect(buildEventUid('drive-1')).toContain('@placementhub.local');
  });

  test('builds all-day VEVENT with exclusive DTEND', () => {
    const lines = eventToIcsLines({
      id: 'e1',
      title: 'End Sem Exam',
      event_type: 'exam',
      start_date: '2026-11-10',
      end_date: '2026-11-12',
      description: 'CSE batch',
      is_blocking: true,
    });
    expect(lines).toContain('DTSTART;VALUE=DATE:20261110');
    expect(lines).toContain('DTEND;VALUE=DATE:20261113');
    expect(lines.some((l) => l.startsWith('SUMMARY:End Sem Exam'))).toBe(true);
  });

  test('builds a full VCALENDAR document', () => {
    const ics = buildCollegeCalendarIcs(
      [
        {
          id: '1',
          title: 'Holiday',
          event_type: 'holiday',
          start_date: '2026-12-25',
          end_date: '2026-12-25',
        },
        {
          id: 'drive-9',
          title: 'TechCorp — Campus Drive',
          event_type: 'placement_drive',
          start_date: '2026-08-01',
          end_date: '2026-08-01',
          source: 'placement_drive',
        },
      ],
      { calendarName: 'IIT Madras — PlacementHub' },
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('X-WR-CALNAME:IIT Madras — PlacementHub');
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
  });
});
