const {
  formatClashSummary,
  findPlacementImportedClashesFromItems,
  isDriveBlockingCalendarRow,
} = require('../calendarClashDetection');

describe('calendarClashDetection imported clashes', () => {
  test('treats exam and holiday as blocking', () => {
    expect(isDriveBlockingCalendarRow({ event_type: 'exam', is_blocking: false })).toBe(true);
    expect(isDriveBlockingCalendarRow({ event_type: 'holiday', is_blocking: false })).toBe(true);
    expect(isDriveBlockingCalendarRow({ event_type: 'workshop', is_blocking: false })).toBe(false);
    expect(isDriveBlockingCalendarRow({ event_type: 'other', is_blocking: true })).toBe(true);
  });

  test('formatClashSummary labels imported exams', () => {
    const summary = formatClashSummary([
      {
        kind: 'calendar',
        title: 'End Sem Exam CSE',
        eventType: 'exam',
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        imported: true,
      },
    ]);
    expect(summary).toMatch(/Imported exam/i);
    expect(summary).toMatch(/End Sem Exam CSE/);
  });

  test('finds placement vs imported exam overlaps from grid items', () => {
    const clashes = findPlacementImportedClashesFromItems([
      {
        id: 'drive-1',
        date: '2026-11-10',
        title: 'TechCorp Drive',
        type: 'placement_drive',
        category: 'placement',
      },
      {
        id: 'ev-1',
        date: '2026-11-10',
        endDate: '2026-11-12',
        title: 'End Sem Exam',
        type: 'exam',
        category: 'imported',
        imported: true,
        isBlocking: true,
      },
      {
        id: 'ev-2',
        date: '2026-12-01',
        title: 'Workshop',
        type: 'workshop',
        category: 'imported',
        imported: true,
        isBlocking: false,
      },
    ]);
    expect(clashes).toHaveLength(1);
    expect(clashes[0].driveTitle).toMatch(/TechCorp/);
    expect(clashes[0].eventTitle).toMatch(/End Sem Exam/);
    expect(clashes[0].imported).toBe(true);
  });
});
